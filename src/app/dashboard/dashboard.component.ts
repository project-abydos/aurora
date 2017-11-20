import { IMDSService } from '../../services/imds';
import { SharepointService } from '../../services/sharepoint';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import * as moment from 'moment';
import { JsonPipe } from '@angular/common';
import { cloneDeep, concat, defaults, find, every, debounce, without, sumBy, memoize, MemoizedFunction, noop, get, findIndex } from 'lodash';
import * as json2csv from 'json2csv';
import { saveAs } from 'file-saver';

import { Title } from '@angular/platform-browser';

import { TdLoadingService } from '@covalent/core';

import { APP_TITLE, ISelectOption, DELAY_CODES, WHEN_DISCOVERED_CODES, DOWN_TIME_CODES } from '../contanstants';
import { Moment, CalendarSpec } from 'moment';
import { ISharePointMDC, ICustomMDCData } from 'app/types';
import { Observable } from 'rxjs/Observable';
import { timer } from 'rxjs/observable/timer';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material';
import { CreateJobComponent } from 'app/create-job/create-job.component';

interface IDashboardMetrics {
  red: number;
  amber: number;
  days90: number;
  days30: number;
}

interface IFilterResults {
  mdc: ISharePointMDC[];
  metrics: IDashboardMetrics;
}

@Component({
  selector: 'qs-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  viewProviders: [],
})
export class DashboardComponent implements OnInit {

  lastIMDSSync: string;
  searchTerms: string[] = [];
  orignalSearchTermPresets: string[] = [
    'ACTIVE JOB',
    'AMBER JOB',
    'CFP PENDING',
    'CFP IN WORK',
    'CFP DONE',
    'NEEDS UPDATE',
    'PDI',
    'PMI',
    'RED JOB',
    'SCHEDULED JOB',
  ];
  searchTermPresets: string[] = [];
  julianDate: string = moment().format('YYDDD');
  mdc: ISharePointMDC[] = [];
  filteredData: ISharePointMDC[] = [];
  appTitle: string = APP_TITLE;
  debouncedFilter: Function = debounce(this.filterWrapper, 200);
  metrics: IDashboardMetrics;

  constructor(
    private _titleService: Title,
    private _imdsService: IMDSService,
    private _sharePointService: SharepointService,
    private _loadingService: TdLoadingService,
    private _route: ActivatedRoute,
    private _router: Router,
    private _cd: ChangeDetectorRef,
    private _dialog: MatDialog,
  ) {
    this.openJob();
    _route.params.subscribe(({ tokens }) => {
      this.searchTerms = tokens ? tokens.toUpperCase().replace(/\-/g, ' ').split(',') : [];
      this.searchTermPresets = without(this.orignalSearchTermPresets, ...this.searchTerms);
      console.log('Search tags: ' + this.searchTerms.join(', '));
      this.filterWrapper();
    });

    _titleService.setTitle(APP_TITLE);

    _imdsService.imds.subscribe(job => {
      this.addOrUpdateJob(job, true);
      this.debouncedFilter();
    });

    const SECOND: number = 1000;

    timer(15 * SECOND, 300 * SECOND).subscribe(() =>
      _imdsService.syncTimestamp.subscribe(response => {
        const lastSync: Moment = moment(Number(get(response, '[0].Data')));
        this.lastIMDSSync = lastSync.diff(moment(), 'minutes') < 10 ? 'a few minutes ago' : lastSync.fromNow();
      }),
    );

  }

  ngOnInit(): void {
    this._loadingService.register('mdc');
    const oneMinute: number = 60 * 1000;
    timer(0, oneMinute).subscribe(() => this.reSyncJobs());
  }

  refreshSearchItems(test: string): void {
    this.searchTermPresets = without(this.orignalSearchTermPresets, ...this.searchTerms)
      .filter(term => (term.toUpperCase().indexOf(test.toUpperCase()) > -1));
  }

  changeJobStatus(statusUpdate: string, row: ISharePointMDC): void {
    const job: ISharePointMDC = {
      __metadata: row.__metadata,
      JCN: row.JCN,
      ApprovalStatus: statusUpdate,
    };

    this._sharePointService.updateJob(job).subscribe(update => {
      row.ApprovalStatus = statusUpdate;
      this.transformMDCRow(row);
      this.filterWrapper();
    });
  }

  exportData(): void {
    const fields: string[] = [
      'JCN',
      'EquipID',
      'WUC',
      'CC',
      'WhenDisc',
      'WorkCenter',
      'Discrepancy',
      'LastUpdate',
      'ETIC',
      'ApprovalStatus',
      'LastModified',
    ];
    const csvTextData: string = json2csv({ data: this.filteredData, fields });
    const csvData: Blob = new Blob([csvTextData], {
      type: 'text/csv;charset=charset=utf-8',
    });
    saveAs(csvData, 'MDRP Export' + (this.searchTerms.length ? ' ' + this.searchTerms.join('-') : '') + '.csv');
  }

  openJob(): void {
    const dialogRef: MatDialogRef<CreateJobComponent> = this._dialog.open(CreateJobComponent, {
      width: '70vw',
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log(result);
    });
  }

  navigateSearch(): void {
    const token: string = this.searchTerms.join().toLowerCase().replace(/[^\w\,\*]/g, '-');
    this._router.navigate(['dashboard', token]);
  }

  addOrUpdateJob(job: ISharePointMDC, updateSharePoint: boolean): void {

    const match: ISharePointMDC = find(this.mdc, { JCN: job.JCN });

    if (job.CC === 'G' || job.CC === '-') {
      return;
    }

    if (match) {
      // Matching job found
      const timestampChange: boolean = match.Timestamp !== job.Timestamp;
      const etagChange: boolean = job.__metadata && (match.__metadata.etag !== job.__metadata.etag);
      if (timestampChange || etagChange) {
        // Job has been updated since last pull
        if (updateSharePoint) {
          // Also write the changes to SharePoint
          defaults(job, match);
          this._sharePointService.updateJob(job).subscribe(update => this.transformMDCRow(job));
        } else {
          this.transformMDCRow(job);
        }
      }
    } else {
      // New job
      if (updateSharePoint) {
        this._sharePointService.createJob(job).subscribe(update => this.transformMDCRow(update));
      } else {
        this.transformMDCRow(job);
      }
    }

  }

  reSyncJobs(): void {
    console.log('resync jobs');
    this._loadingService.register('imds-380');
    this._sharePointService.getMDC().subscribe(mdc => {
      mdc.forEach(row => this.addOrUpdateJob(row, false));
      this.filterWrapper();
      this._loadingService.resolve('mdc');
      this._loadingService.resolve('imds-380');
      this._imdsService.initIntervalSync();
    });
  }

  transformMDCRow(row: ISharePointMDC): void {

    console.log('transform');

    if (!row) {
      return;
    }

    const G: string = 'G';
    const A: string = 'A';
    const R: string = 'R';

    // Map AGE CCs
    row.CC = {
      G, A, R,
      '-': G,
      '\\': A,
      'X': R,
    }[row.CC] || G;

    if (row.CC === G) {
      // Ignore all green jobs, because--well they're green and stuff
      return;
    }

    let searchTerms: string[] = [];
    const matchId: number = findIndex(this.mdc, { JCN: row.JCN });

    const diffMap: CalendarSpec = {
      sameDay: '[Today at] HH:mm',
      nextDay: '[Tomorrow]',
      nextWeek: '[Next Week]',
      lastDay: '[Yesterday]',
      lastWeek: 'M-D-YYYY',
      sameElse: 'M-D-YYYY',
    };

    const now: Moment = moment();
    const _transform: ICustomMDCData = <ICustomMDCData>cloneDeep(row);
    const discrepancyText: string = _transform.Discrepancy.toUpperCase();
    const julianDate: Moment = moment.utc(_transform.JCN.slice(0, 5), 'YYDDD').local();
    const juliantDateDiff: number = now.diff(julianDate, 'days');
    const timestampMoment: Moment = moment.utc(row.Timestamp, 'YYDDD HH:mm:ss').local();
    const timestampDiff: string = timestampMoment.calendar(undefined, diffMap);

    _transform.ApprovalStatus = row.ApprovalStatus || 'Pending';
    _transform.timeStampPretty = timestampDiff;
    _transform.WhenDiscText = row.WhenDISC ? `${row.WhenDISC} - ${WHEN_DISCOVERED_CODES[row.WhenDISC]}` : '';
    _transform.DownTimeCodeText = row.DownTimeCode ? `${row.DownTimeCode} - ${DOWN_TIME_CODES[row.DownTimeCode]}` : '';
    _transform.DelayCodeText = row.DelayCode ? `${row.DelayCode} - ${DELAY_CODES[row.DelayCode]}` : '';
    _transform.prettyJCN = julianDate.calendar(undefined, { ...diffMap, sameDay: '[Today]' });
    _transform.tags = [];
    _transform.CCText = {
      A: 'Amber Job',
      R: 'Red Job',
      G: 'Green Job',
    }[_transform.CC];

    if (row.ETIC) {
      _transform.eticDate = moment(row.ETIC).toDate();
    }

    if (now.diff(timestampMoment.startOf('day'), 'days') > 30) {
      _transform.over30Days = true;
      searchTerms.push('Needs Update');
    }

    if (juliantDateDiff > 89) {
      _transform.tags.push({ title: '90+ Open', style: 'accent' });
    }

    if (juliantDateDiff < 0) {
      _transform.tags.push({ title: 'Scheduled', style: 'primary' });
      searchTerms.push('scheduled job');
    } else {
      searchTerms.push('active job');
    }

    if (discrepancyText.includes('DEPLOYMENT INSPECTION')) {
      _transform.tags.push({ title: 'PDI' });
    }

    if (_transform.JCN.match(/\d+[A-Z]\d+/)) {
      _transform.tags.push({ title: 'PMI' });
    }

    _transform.search = searchTerms.concat([
      _transform.JCN,
      _transform.prettyJCN,
      _transform.CCText,
      _transform.CFPComments,
      _transform.Discrepancy,
      _transform.LastUpdate,
      _transform.WorkCenter,
      _transform.EquipID,
      _transform.NameUserID,
      _transform.DDR instanceof Array ? _transform.DDR.map(ddr => ddr.Text).join(' ') : '',
      `CFP ${_transform.ApprovalStatus}`,
      _transform.WhenDiscText,
      _transform.DownTimeCodeText,
      _transform.DelayCodeText,
      _transform.tags.map(tag => tag.search || tag.title).join(' '),
      _transform.eticDate || '',
    ]).join(' ').toUpperCase();

    if (matchId < 0) {
      this.mdc.push(_transform);
    } else {
      this.mdc[matchId] = _transform;
    }
  }

  filterWrapper(): void {
    const results: IFilterResults = this.filterData();
    this.filteredData = results.mdc;
    this.metrics = results.metrics;
  }

  // tslint:disable-next-line:member-ordering
  filterData: any = memoize(
    filterAction => {
      console.log('filter');

      let mdc: ICustomMDCData[] = <ICustomMDCData[]>cloneDeep(this.mdc).sort((a, b) => -a.Timestamp.localeCompare(b.Timestamp));
      let once: boolean = false;
      const metrics: IDashboardMetrics = {
        amber: 0,
        red: 0,
        days90: 0,
        days30: 0,
      };

      if (this.searchTerms.length) {
        mdc = mdc.filter(row => every(this.searchTerms, term => (row.search.indexOf(term) > -1)));
      }

      mdc.forEach(job => {

        job.CC === 'R' && metrics.red++;
        job.CC === 'A' && metrics.amber++;

        if (job.search.includes('90+ OPEN')) {
          metrics.days90++;
        }

        if (job.over30Days) {
          metrics.days30++;
          if (!once) {
            once = true;
            job.firstOver30 = true;
          }
        }

      });

      return {
        mdc,
        metrics,
      };
    },
    cacheTest => this.mdc.map(row => row.Id + row.__metadata.etag).join('-') + this.searchTerms.join(','),
  );

  trackJobStateChange(index: number, job: ICustomMDCData): string {
    return job.Id + job.__metadata.etag;
  }
}
