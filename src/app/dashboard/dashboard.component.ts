import { IMDSService } from '../../services/imds';
import { SharepointService } from '../../services/sharepoint';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { cloneDeep, concat, defaults, find, every, debounce, without, sumBy, memoize, MemoizedFunction, noop, get, findIndex, assignIn } from 'lodash';
import * as moment from 'moment';
import * as json2csv from 'json2csv';
import { saveAs } from 'file-saver';
import { Title } from '@angular/platform-browser';
import { TdLoadingService } from '@covalent/core';
import { Observable } from 'rxjs/Observable';
import { timer } from 'rxjs/observable/timer';
import { ActivatedRoute, Router } from '@angular/router';
import { Moment, CalendarSpec } from 'moment';
import { MatDialog, MatDialogRef } from '@angular/material';

import { APP_TITLE, ISelectOption, DELAY_CODES, WHEN_DISCOVERED_CODES, DOWN_TIME_CODES } from '../contanstants';
import { ISharePointMDC, ICustomMDCData } from 'app/types';
import { CreateJobComponent } from 'app/create-job/create-job.component';
import { Utilities } from 'services/utilities';
import { setTimeout } from 'timers';

interface IDashboardMetrics {
  red: number;
  amber: number;
  days90: number;
  days30: number;
}

interface IFilterResults {
  mdc: ICustomMDCData[];
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
    'CFP ACTION',
    'CFP DONE',
    'NEEDS UPDATE',
    'NEW JOB',
    'PDI',
    'PMI',
    'RED JOB',
    'SCHEDULED JOB',
  ];
  searchTermPresets: string[] = [];
  julianDate: string = moment().format('YYDDD');
  mdc: ICustomMDCData[] = [];
  filteredData: ICustomMDCData[] = [];
  appTitle: string = APP_TITLE;
  debouncedFilter: Function = debounce(this.filterWrapper, 200);
  metrics: IDashboardMetrics;
  historical: boolean;

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

    _route.params.subscribe(({ tokens }) => {
      this.searchTerms = tokens ? tokens.toUpperCase().replace(/\-/g, ' ').split(',') : [];
      this.searchTermPresets = without(this.orignalSearchTermPresets, ...this.searchTerms);
      console.log('Search tags: ' + this.searchTerms.join(', '));
      this.filterWrapper();
    });

    _titleService.setTitle(APP_TITLE);

    const imdsCache: { [jcn: string]: ISharePointMDC } = {};

    _imdsService.imds.subscribe(job => {
      if (job.Timestamp) {
        imdsCache[job.JCN] = job;
      } else {
        if (!imdsCache[job.JCN]) {
          job.Timestamp = moment().local().format('YYDDDD HH:mm:ss');
          imdsCache[job.JCN] = cloneDeep(find(this.mdc, { JCN: job.JCN }));
        }
        assignIn(imdsCache[job.JCN], job);
      }
      this.addOrUpdateJob(imdsCache[job.JCN], true);
      this.debouncedFilter();
    });

    const SECOND: number = 1000;
    const MINUTE: number = 60 * SECOND;

    timer(15 * SECOND, 5 * MINUTE).subscribe(() =>
      _imdsService.syncTimestamp.subscribe(response => {
        const lastSync: Moment = moment(Number(response.Data));
        this.lastIMDSSync = lastSync.diff(moment(), 'minutes') > -10 ? 'a few minutes ago' : lastSync.fromNow();
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

  changeJobStatus(update: { status: string, jcn: string }, row: ICustomMDCData): void {
    const job: ICustomMDCData = {
      __metadata: row.__metadata,
    };

    if (update.status) {
      job.ApprovalStatus = update.status;
    }

    if (update.jcn) {
      job.JCN = update.jcn;
    }

    this._sharePointService.updateJob(job).subscribe(response => {
      row.ApprovalStatus = job.ApprovalStatus;
      this.transformMDCRow(row);
      this.filterWrapper();
    });
  }

  exportData(): void {
    const fields: string[] = [
      'Closed',
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
    saveAs(csvData, 'MDT Export' + (this.searchTerms.length ? ' ' + this.searchTerms.join('-') : '') + '.csv');
  }

  openJob(): void {
    this._dialog
      .open(CreateJobComponent, { width: '65vw' })
      .afterClosed()
      .subscribe(job => {
        if (job && job.Discrepancy) {
          this.addOrUpdateJob(job, true);
        }
      });
  }

  navigateSearch(): void {
    const token: string = this.searchTerms.join().toLowerCase().replace(/[^\w\,\*]/g, '-');
    this._router.navigate(['dashboard', token]);
  }

  addOrUpdateJob(job: ISharePointMDC, updateSharePoint: boolean): void {

    const match: ICustomMDCData = find(this.mdc, { JCN: job.JCN });

    if (job.CC === 'G' || job.CC === '-') {
      return;
    }

    if (match) {

      // Matching job found
      const timestampChange: boolean = match.Timestamp !== job.Timestamp;
      const etagChange: boolean = job.__metadata && (match.__metadata.etag !== job.__metadata.etag);

      if (updateSharePoint && timestampChange && !job.DDR && job.JCN) {
        // Detected timestamp change, send a request to update DDR and skip for now
        Utilities.imdsTick(() => this._imdsService.fetchDDR(match.JCN));
        return;
      }

      if (timestampChange || etagChange) {
        // Job has been updated since last pull
        if (updateSharePoint) {
          job.ApprovalStatus = 'Pending';
          // Also write the changes to SharePoint
          assignIn(match, job);
          job.__metadata = match.__metadata;
          this._sharePointService.updateJob(job).subscribe(update => this.transformMDCRow(match));
        } else {
          this.transformMDCRow(job);
        }
      }

    } else {
      // New job
      if (updateSharePoint) {
        this._sharePointService.createJob(job).subscribe(update => this.transformMDCRow(update));
        Utilities.imdsTick(() => this._imdsService.fetchDDR(job.JCN));
      } else {
        this.transformMDCRow(job);
      }
    }

  }

  reSyncJobs(): void {
    console.log('resync jobs');
    this._sharePointService.getMDC().subscribe(mdc => {
      mdc.forEach(row => this.addOrUpdateJob(row, false));
      this.filterWrapper();
      this._loadingService.resolve('mdc');
      setTimeout(() => this._imdsService.fetch380(), 5 * 1000);
    });
  }

  filterHistory(): void {
    this.historical = !this.historical;
    this.filterWrapper();
  }

  transformMDCRow(row: ICustomMDCData): void {

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
    const matchId: number = row && findIndex(this.mdc, { Id: row.Id }) || findIndex(this.mdc, { JCN: row.JCN });

    const now: Moment = moment();
    const _transform: ICustomMDCData = cloneDeep(row);
    const newJob: boolean = !_transform.JCN;
    const startDate: Moment = newJob ? moment.utc(Utilities.convertDate(_transform.StartDate)) : undefined;
    const discrepancyText: string = _transform.Discrepancy.toUpperCase();
    const julianDate: Moment = newJob ? startDate : Utilities.parseJCN(_transform.JCN);
    const juliantDateDiff: number = now.diff(julianDate, 'days');
    const timestampMoment: Moment = Utilities.convertJobTimestamp(row.Timestamp);

    _transform.LastUpdate = row.LastUpdate === 'undefined' ? 'First IMDS Sync' : row.LastUpdate;
    _transform.ApprovalStatus = row.ApprovalStatus || 'Pending';
    _transform.timeStampPretty = newJob ? startDate.format('YYDDDD [at] HH:mm') : Utilities.prettyTimeDiff(timestampMoment);
    _transform.WhenDiscText = row.WhenDiscovered ? `${row.WhenDiscovered} - ${WHEN_DISCOVERED_CODES[row.WhenDiscovered]}` : '';
    _transform.DownTimeCodeText = row.DownTimeCode ? `${row.DownTimeCode} - ${DOWN_TIME_CODES[row.DownTimeCode]}` : '';
    _transform.DelayCodeText = row.DelayCode ? `${row.DelayCode} - ${DELAY_CODES[row.DelayCode]}` : '';
    _transform.prettyJCN = Utilities.prettyTimeDiff(julianDate, { sameDay: '[Today]' });
    _transform.tags = [];
    _transform.historical = (row.ApprovalStatus === 'Done' && row.Closed);

    _transform.CCText = {
      A: 'Amber Job',
      R: 'Red Job',
      G: 'Green Job',
    }[_transform.CC];

    if (row.Closed) {

      _transform.tags.push({ title: 'Closed', style: 'dark' });

    } else {

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

      if (newJob) {
        searchTerms.push('new job');
      }

    }

    if (discrepancyText.includes('DEPLOYMENT INSPECTION')) {
      _transform.tags.push({ title: 'PDI' });
    }

    if (!newJob && _transform.JCN.match(/\d+[A-Z]\d+/)) {
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
      `CFP ${_transform.ApprovalStatus === 'Done' ? 'Done' : 'Action'}`,
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

      let once: boolean = false;
      let mdc: ICustomMDCData[] = <ICustomMDCData[]>cloneDeep(this.mdc)
        .sort((a, b) => -(a.Timestamp || '').localeCompare(b.Timestamp))
        .filter(row => this.historical ? row.historical : !row.historical);

      const metrics: IDashboardMetrics = {
        amber: 0,
        red: 0,
        days90: 0,
        days30: 0,
      };

      if (this.searchTerms.length) {
        // Always ensure all terms are uppercase first
        this.searchTerms = this.searchTerms.map(term => term.toUpperCase());
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
    cacheTest => this.historical + this.mdc.map(row => row.Id + row.__metadata.etag).join('\n') + this.searchTerms.join(','),
  );

  trackJobStateChange(index: number, job: ICustomMDCData): string {
    return job.Id + job.__metadata.etag;
  }
}
