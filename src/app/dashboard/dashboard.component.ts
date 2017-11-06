import { IMDSService } from '../../services/imds';
import { SharepointService } from '../../services/sharepoint';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import * as moment from 'moment';
import { JsonPipe } from '@angular/common';
import { cloneDeep, defaults, find, every, debounce } from 'lodash';

import { Title } from '@angular/platform-browser';

import {
  TdDataTableService,
  TdDataTableSortingOrder, ITdDataTableColumn,
  ITdDataTableSortChangeEvent, TdLoadingService,
} from '@covalent/core';

import { APP_TITLE, APPROVAL_STATUS_OPTIONS, ISelectOption, DELAY_CODES, WHEN_DISCOVERED_CODES, DOWN_TIME_CODES } from '../contanstants';
import { Moment } from 'moment';
import { ISharePointMDC, ICustomMDCData } from 'app/types';
import { Observable } from 'rxjs/Observable';
import { timer } from 'rxjs/observable/timer';

@Component({
  selector: 'qs-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  viewProviders: [],
})
export class DashboardComponent implements OnInit {

  searchTerms: string[] = [];

  julianDate: string = moment().format('YYDDD');

  // delayOptions: ISelectOption[] = DELAY_CODES;
  // discoveredOptions: ISelectOption[] = WHEN_DISCOVERED_CODES;
  // downTimeOptions: ISelectOption[] = DOWN_TIME_CODES;

  mdc: ISharePointMDC[] = [];

  isLoaded: boolean;

  view: any[] = [700, 400];

  colorScheme: any = {
    domain: ['#1565C0', '#2196F3', '#81D4FA', '#FF9800', '#EF6C00'],
  };

  filteredData: ISharePointMDC[] = [];
  searchTerm: string = '';

  appTitle: string = APP_TITLE;

  tableHeight: number = window.innerHeight - 250;

  debouncedFilter: Function = debounce(this.filter, 200);

  metrics: {
    red: number;
    amber: number;
    days90: number;
  };

  constructor(
    private _dataTableService: TdDataTableService,
    private _titleService: Title,
    private _imdsService: IMDSService,
    private _sharePointService: SharepointService,
    private _loadingService: TdLoadingService,
  ) {

    _titleService.setTitle(APP_TITLE);
    _imdsService.imds.subscribe(job => this.addOrUpdateJob(job, true));

  }

  ngOnInit(): void {
    this._loadingService.register('mdc');
    this.reSyncJobs();
    const interval: number = 60 * 1000;
    const ping: Observable<number> = timer(interval, interval);
    ping.subscribe(() => this.reSyncJobs());
  }

  addSearchTerm(searchTerm: string): void {
    this.searchTerms.push(searchTerm.toUpperCase());
    this.filter();
  }

  removeSearchTerm(searchTerm: string): void {
    this.searchTerms.splice(this.searchTerms.indexOf(searchTerm.toUpperCase()), 1);
    this.filter();
  }

  addOrUpdateJob(job: ISharePointMDC, updateSharePoint: boolean): void {

    const match: ISharePointMDC = find(this.mdc, { JCN: job.JCN });

    if (job.CC === 'G' || job.CC === '-') {
      return;
    }

    if (match) {
      // Matching job found
      if (match.Timestamp !== job.Timestamp) {
        // Job has been updated since last pull
        const matchId: number = this.mdc.indexOf(match);
        if (updateSharePoint) {
          this._sharePointService.updateJob(match).subscribe(update => {
            const strBase: string = match.__metadata.etag.replace(/[^\d]/g, '');
            const base: number = parseInt(strBase, 10) || 0;
            match.__metadata.etag = `W/"${base + 1}"`;
            this.transformMDCRow(match, matchId);
          });
        } else {
          this.transformMDCRow(job, matchId);
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
    this._loadingService.register('imds-380');
    this._sharePointService.getMDC().subscribe(mdc => {
      mdc.forEach(row => this.addOrUpdateJob(row, false));
      this.filter();
      this._loadingService.resolve('mdc');
      this._loadingService.resolve('imds-380');
      this.isLoaded = true;
    });
  }

  transformMDCRow(row: ISharePointMDC, matchId?: number): void {

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

    const now: Moment = moment();
    const _transform: ICustomMDCData = <ICustomMDCData>cloneDeep(row);
    const discrepancyText: string = _transform.Discrepancy.toUpperCase();
    const julianDate: Moment = moment.utc(_transform.JCN.slice(0, 5), 'YYDDD').local();
    const juliantDateDiff: number = now.diff(julianDate, 'days');
    const timestampMoment: Moment = moment.utc(row.Timestamp, 'YYDDD HH:mm:ss').local();
    const diff: string = timestampMoment.calendar(undefined, {
      sameDay: '[Today at] HH:mm',
      nextDay: '[Tomorrow]',
      nextWeek: 'M-D-YYYY',
      lastDay: '[Yesterday]',
      lastWeek: 'M-D-YYYY',
      sameElse: 'M-D-YYYY',
    });

    _transform.ApprovalStatus = APPROVAL_STATUS_OPTIONS[row.ApprovalStatus] || 'Pending';
    _transform.timeStampPretty = diff;
    _transform.WhenDiscText = row.WhenDISC ? `${row.WhenDISC} - ${WHEN_DISCOVERED_CODES[row.WhenDISC]}` : '';
    _transform.DownTimeCodeText = row.DownTimeCode ? `${row.DownTimeCode} - ${DOWN_TIME_CODES[row.DownTimeCode]}` : '';
    _transform.DelayCodeText = row.DelayCode ? `${row.DelayCode} - ${DELAY_CODES[row.DelayCode]}` : '';
    _transform.CCText = {
      A: 'CC:Amber',
      R: 'CC:Red',
      G: 'CC:Green',
    }[_transform.CC];

    if (row.ETIC) {
      _transform.eticDate = moment(row.ETIC).toDate();
    }

    _transform.tags = [];

    if (juliantDateDiff > 89) {
      _transform.tags.push({ title: '90+ Days', style: 'accent' });
    }

    if (juliantDateDiff < 0) {
      _transform.tags.push({ title: 'Scheduled', style: 'primary' });
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
      _transform.CCText,
      _transform.CFPComments,
      _transform.Discrepancy,
      _transform.LastUpdate,
      _transform.WorkCenter,
      _transform.EquipID,
      _transform.NameUserID,
      _transform.DDR instanceof Array ? _transform.DDR.map(ddr => ddr.Text).join(' ') : '',
      _transform.ApprovalStatus,
      _transform.WhenDiscText,
      _transform.DownTimeCodeText,
      _transform.DelayCodeText,
      _transform.tags.map(tag => tag.search || tag.title).join(' '),
      _transform.eticDate || '',
    ]).join(' ').toUpperCase();

    if (isNaN(matchId)) {
      this.mdc.push(_transform);
    } else {
      this.mdc[matchId] = _transform;
    }
    this.debouncedFilter();
  }

  search(searchTerm: string): void {
    console.log('search');
    this.searchTerm = searchTerm;
    this.filter();
  }

  filter(): void {
    let mdc: ICustomMDCData[] = <ICustomMDCData[]>this.mdc.sort((a, b) => -a.Timestamp.localeCompare(b.Timestamp));
    if (this.searchTerms.length) {
      mdc = mdc.filter(row => every(this.searchTerms, term => row.search.indexOf(term) > -1));
    }
    this.metrics = {
      amber: 0,
      red: 0,
      days90: 0,
    };
    mdc.forEach(job => {
      switch (job.CC) {
        case 'R':
          this.metrics.red++;
          break;
        case 'A':
          this.metrics.amber++;
          break;
        default:
      }
      if (job.search.includes('90+ DAYS')) {
        this.metrics.days90++;
      }
    });
    this.filteredData = mdc;
  }

}
