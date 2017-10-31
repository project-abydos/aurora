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
import { CrossDomainService } from 'services';
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

  approvalOptions: ISelectOption[] = APPROVAL_STATUS_OPTIONS;
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

  constructor(
    private _dataTableService: TdDataTableService,
    private _titleService: Title,
    private _imdsService: IMDSService,
    private _sharePointService: SharepointService,
    private _loadingService: TdLoadingService,
    public crossDomainService: CrossDomainService,
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

    if (match) {
      // Matching job found
      if (match.Timestamp !== job.Timestamp) {
        // Job has been updated since last pull
        const matchId: number = this.mdc.indexOf(match);
        if (updateSharePoint) {
          this._sharePointService.updateJob(match).subscribe(update => this.transformMDCRow(update, matchId));
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

  syncIMDS(): void {
    [
      '51ms',
      '52no',
      '51nt',
      '52ms',
      '52no',
    ].forEach((workcenter, index) => {
      setTimeout(() => this._imdsService.fetch380(workcenter), 3000 * index);
    });
  }

  transformMDCRow(row: ISharePointMDC, matchId?: number): void {

    if (row.CC === 'G') {
      // Ignore all green jobs, because--well they're green and stuff
      return;
    }

    const _transform: ICustomMDCData = <ICustomMDCData>cloneDeep(row);
    const julianFormat: string = 'YYDDDHHmm';
    const humanFormat: string = 'l, HHmm';
    const daysDiff: number = moment().diff(moment(row.Timestamp, 'YYDDD HH:mm:ss'), 'days');

    _transform.dateRange = [
      moment(row.StartDate + row.StartTime, julianFormat).format(humanFormat),
      moment(row.StopDate + row.StopTime, julianFormat).format(humanFormat),
    ].join(' - ');

    _transform.ApprovalStatus = row.ApprovalStatus || '-';
    _transform.timeStampPretty = daysDiff + ' days';
    _transform.WhenDiscText = row.WhenDISC ? `${row.WhenDISC} - ${WHEN_DISCOVERED_CODES[row.WhenDISC]}` : '';
    _transform.DownTimeCodeText = row.DownTimeCode ? `${row.DownTimeCode} - ${DOWN_TIME_CODES[row.DownTimeCode]}` : '';
    _transform.DelayCodeText = row.DelayCode ? `${row.DelayCode} - ${DELAY_CODES[row.DelayCode]}` : '';
    _transform.CCText = {
      A: 'CC:Amber',
      R: 'CC:Red',
      G: 'CC:Green',
    }[_transform.CC];
    _transform.eticDate = moment(row.ETIC).toDate();

    _transform.search = [
      _transform.JCN,
      _transform.CCText,
      _transform.CFPComments,
      _transform.Discrepancy,
      _transform.LastUpdate,
      _transform.WorkCenter,
      _transform.EquipID,
      _transform.NameUserID,
      _transform.DDR ? _transform.DDR.map(ddr => ddr.Text).join(' ') : '',
      _transform.ApprovalStatus,
      _transform.WhenDiscText,
      _transform.DownTimeCodeText,
      _transform.DelayCodeText,
      _transform.eticDate,
    ].join(' ').toUpperCase();

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
    this.filteredData = mdc;
  }

}
