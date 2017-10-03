import { IMDSService, IParsed380 } from '../../services/imds';
import { SharepointService, ISharePointMDC } from '../../services/sharepoint';
import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { JsonPipe } from '@angular/common';
import * as xml2js from 'xml2js';
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
  ) {

    this._titleService.setTitle(APP_TITLE);

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

    const parser: any = new xml2js.Parser({
      explicitRoot: false,
      explicitArray: false,
    });

    this._loadingService.register('imds-380');

    this._imdsService.imds.subscribe(xml => parser.parseString(xml, (err, result: IParsed380) => {

      console.clear();
      console.log(result.EquipmentDataRow);

      const flatten: Function = (item: string[]): string => {
        return item.join ? item.join(' ') : String(item);
      };

      result.EquipmentDataRow.EventDataRow.forEach(row => {

        const job: ISharePointMDC = {
          JCN: row.EventId,
          CC: row.EventSymbol,
          Discrepancy: flatten(row.DiscrepancyNarrativeRow.DiscrepancyNarrative),
          WorkCenter: result.EquipmentDataRow.Workcenter,
          Timestamp: row.EventDateTimeStamp,
          EquipID: row.WorkcenterEventDataRow.EquipmentIdOrPartNumber,
          DelayCode: row.DefereCode,
          LastUpdate: flatten(row.WorkcenterEventDataRow.WorkcenterEventNarrativeRow.WorkcenterEventNarrative),
        };

        console.log(job);

        const match: ICustomMDCData = find(this.mdc, { JCN: job.JCN });

        if (match) {
          if (match.Timestamp !== job.Timestamp) {
            // this._sharePointService.updateJob(job)
            defaults(job, match);
            match.updated = true;
            this.mapMDCRow(job);
          }
        } else {
          // New record
          this._sharePointService
            .createJob(job)
            .subscribe(createdJob => this.mapMDCRow(createdJob));
        }
      });

      setTimeout(() =>
        this._loadingService.resolve('imds-380'), 2000);

    }));

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
    newRow.timeStampPretty = moment(row.Timestamp, 'YYDDD HH:mm:ss').fromNow();
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
    let newData: ICustomMDCData[];
    newData = this._dataTableService.filterData(this.mdc, this.searchTerm, true);
    newData = this._dataTableService.sortData(this.mdc, this.sortBy, this.sortOrder);
    this.filteredData = newData;
  }

  toggleExpanded(row: ICustomMDCData): void {
    row.isExpanded = !row.isExpanded;
    console.log(row);
  }

}
