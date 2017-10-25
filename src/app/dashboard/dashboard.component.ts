import { IMDSService, IParsed380 } from '../../services/imds';
import { SharepointService, ISharePointMDC } from '../../services/sharepoint';
import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { JsonPipe } from '@angular/common';
import { cloneDeep, defaults, find } from 'lodash';

import { Title } from '@angular/platform-browser';

import {
  TdDigitsPipe, TdDataTableService,
  TdDataTableSortingOrder, ITdDataTableColumn,
  ITdDataTableSortChangeEvent, IPageChangeEvent, TdLoadingService,
} from '@covalent/core';

import { APP_TITLE, APPROVAL_STATUS_OPTIONS, ISelectOption, DELAY_CODES, WHEN_DISCOVERED_CODES, DOWN_TIME_CODES } from '../contanstants';
import { Moment } from 'moment';
import { style, transition, trigger, animate } from '@angular/animations';
import { CrossDomainService } from 'services';

interface ICustomMDCData extends ISharePointMDC {
  dateRange: string;
  timeStampPretty: string;
  WhenDiscText?: string;
  DownTimeCodeText?: string;
  DelayCodeText?: string;
  eticDate?: Date;
  isExpanded?: boolean;
  updated?: boolean;
}

@Component({
  selector: 'qs-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  viewProviders: [],
  animations: [
    trigger(
      'slideToggle', [
        transition(':enter', [
          style({ maxHeight: '0' }),
          animate(250, style({ maxHeight: '100%' })),
        ]),
        transition(':leave', [
          animate(150, style({ height: '0' })),
        ]),
      ],
    ),
  ],
})
export class DashboardComponent implements OnInit {

  julianDate: string = moment().format('YYDDD');

  approvalOptions: ISelectOption[] = APPROVAL_STATUS_OPTIONS;
  // delayOptions: ISelectOption[] = DELAY_CODES;
  // discoveredOptions: ISelectOption[] = WHEN_DISCOVERED_CODES;
  // downTimeOptions: ISelectOption[] = DOWN_TIME_CODES;

  mdc: ICustomMDCData[] = [];

  isLoaded: boolean;

  view: any[] = [700, 400];

  colorScheme: any = {
    domain: ['#1565C0', '#2196F3', '#81D4FA', '#FF9800', '#EF6C00'],
  };

  filteredData: any[] = [];
  searchTerm: string = '';
  sortBy: string = 'Timestamp';
  sortOrder: TdDataTableSortingOrder = TdDataTableSortingOrder.Descending;

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

      const match: ICustomMDCData = find(this.mdc, { JCN: job.JCN });

      if (match) {
        if (match.Timestamp !== job.Timestamp) {
          // this._sharePointService.updateJob(job)
          defaults(job, match);
          match.updated = true;
          this.mapMDCRow(job);
        }
      } else {
        this._loadingService.register('imds-380', job.Id);
        // New record
        this._sharePointService
          .createJob(job)
          .subscribe(createdJob => {
            this.mapMDCRow(createdJob);
            this._loadingService.resolve('imds-380', job.Id);
          });
      }

    });

  }

  ngOnInit(): void {
    this._loadingService.register('mdc');
    this._sharePointService.getMDC().subscribe(mdc => {
      mdc.forEach(row => this.mapMDCRow(row));
      this.filter();
      this._loadingService.resolve('mdc');
      this.isLoaded = true;
    });
  }

  syncIMDS(): void {

    this._imdsService.fetch380('test');

  }

  mapMDCRow(row: ISharePointMDC): void {
    const newRow: ICustomMDCData = <ICustomMDCData>cloneDeep(row);
    const julianFormat: string = 'YYDDDHHmm';
    const humanFormat: string = 'l, HHmm';

    newRow.dateRange = [
      moment(row.StartDate + row.StartTime, julianFormat).format(humanFormat),
      moment(row.StopDate + row.StopTime, julianFormat).format(humanFormat),
    ].join(' - ');

    newRow.ApprovalStatus = row.ApprovalStatus || '-';
    newRow.timeStampPretty = moment(row.Timestamp, 'YYDDD HH:mm:ss').fromNow(true);
    newRow.WhenDiscText = row.WhenDISC ? `${row.WhenDISC} - ${WHEN_DISCOVERED_CODES[row.WhenDISC]}` : '';
    newRow.DownTimeCodeText = row.DownTimeCode ? `${row.DownTimeCode} - ${DOWN_TIME_CODES[row.DownTimeCode]}` : '';
    newRow.DelayCodeText = row.DelayCode ? `${row.DelayCode} - ${DELAY_CODES[row.DelayCode]}` : '';
    newRow.eticDate = moment(row.ETIC).toDate();

    this.mdc.push(newRow);
    this.filter();
  }

  sort(sortEvent: ITdDataTableSortChangeEvent): void {
    this.sortBy = sortEvent.name;
    this.sortOrder = sortEvent.order;
    this.filter();
  }

  search(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.filter();
  }

  filter(): void {
    let newData: ICustomMDCData[] = cloneDeep(this.mdc);
    newData = this._dataTableService.filterData(newData, this.searchTerm, true);
    newData = this._dataTableService.sortData(newData, this.sortBy, this.sortOrder);
    this.filteredData = newData;
  }

  toggleExpanded(row: ICustomMDCData): void {
    row.isExpanded = !row.isExpanded;
    console.log(row);
  }

}
