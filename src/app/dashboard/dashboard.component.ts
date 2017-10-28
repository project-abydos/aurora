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

  constructor(
    private _dataTableService: TdDataTableService,
    private _titleService: Title,
    private _imdsService: IMDSService,
    private _sharePointService: SharepointService,
    private _loadingService: TdLoadingService,
    public crossDomainService: CrossDomainService,
  ) {

    _titleService.setTitle(APP_TITLE);

    _imdsService.imds.subscribe(job => {

      const match: ISharePointMDC = find(this.mdc, { JCN: job.JCN });

      if (match) {
        if (match.Timestamp !== job.Timestamp) {
          // this._sharePointService.updateJob(job)
          defaults(job, match);
          // this.mapMDCRow(job);
        }
      } else {
        this._loadingService.register('imds-380', job.Id);
        // New record
        this._sharePointService
          .createJob(job)
          .subscribe(createdJob => {
            this.mdc.push(createdJob);
            this._loadingService.resolve('imds-380', job.Id);
          });
      }

    });

  }

  ngOnInit(): void {
    console.log('init');
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

  addOrUpdateJob(row: ISharePointMDC, match?: ISharePointMDC): void {

    match = match || find(this.mdc, { JCN: row.JCN });

    if (match) {
      // Matching job found
      if (match.Timestamp !== row.Timestamp) {
        // Job has been updated since last pull
        this.mdc[this.mdc.indexOf(match)] = this.transformMDCRow(row);
      }
    } else {
      // New job
      this.mdc.push(this.transformMDCRow(row));
    }

  }

  reSyncJobs(): void {
    this._loadingService.register('imds-380');
    this._sharePointService.getMDC().subscribe(mdc => {
      mdc.forEach(row => this.addOrUpdateJob(row));
      this.filter();
      this._loadingService.resolve('mdc');
      this.isLoaded = true;
    });
  }

  syncIMDS(): void {
    console.log('sync');
    this._imdsService.fetch380('test');

    // const workCenters: string[] = [
    //   '51ms',
    //   '52no',
    //   '51nt',
    //   '52ms',
    //   '52no',
    // ];

    // workCenters.forEach(workcenter =>
    //   this._imdsService.fetch(workcenter).subscribe(xml => this.processIMDS380(xml))
    // );

  }

  transformMDCRow(row: ISharePointMDC): ICustomMDCData {
    const _transform: ICustomMDCData = <ICustomMDCData>row;
    const julianFormat: string = 'YYDDDHHmm';
    const humanFormat: string = 'l, HHmm';

    _transform.dateRange = [
      moment(row.StartDate + row.StartTime, julianFormat).format(humanFormat),
      moment(row.StopDate + row.StopTime, julianFormat).format(humanFormat),
    ].join(' - ');

    _transform.ApprovalStatus = row.ApprovalStatus || '-';
    _transform.timeStampPretty = moment(row.Timestamp, 'YYDDD HH:mm:ss').fromNow(true);
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

    return _transform;
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
