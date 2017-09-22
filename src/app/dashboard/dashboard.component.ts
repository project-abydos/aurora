import { SharepointService, ISharePointMDC } from './../../services/sharepoint';
import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { JsonPipe } from '@angular/common';

import { Title } from '@angular/platform-browser';

import {
  TdDigitsPipe, TdDataTableService,
  TdDataTableSortingOrder, ITdDataTableColumn,
  ITdDataTableSortChangeEvent, IPageChangeEvent,
} from '@covalent/core';

import { APP_TITLE, APPROVAL_STATUS_OPTIONS, ISelectOption, DELAY_CODES, WHEN_DISCOVERED_CODES, DOWN_TIME_CODES } from '../contanstants';
import { Moment } from 'moment';
import { style, transition, trigger, animate } from '@angular/animations';

interface ICustomMDCData extends ISharePointMDC {
  dateRange: string;
  WhenDiscText?: string;
  DownTimeCodeText?: string;
  DelayCodeText?: string;
  eticDate?: Date;
  isExpanded?: boolean;
}

interface ICustomColumns extends ITdDataTableColumn {
  styles?: string;
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
export class DashboardComponent {

  julianDate: string = moment().format('YYDDD');

  approvalOptions: ISelectOption[] = APPROVAL_STATUS_OPTIONS;
  // delayOptions: ISelectOption[] = DELAY_CODES;
  // discoveredOptions: ISelectOption[] = WHEN_DISCOVERED_CODES;
  // downTimeOptions: ISelectOption[] = DOWN_TIME_CODES;

  columns: ICustomColumns[] = [
    { name: 'JCN', label: 'JCN', sortable: true, filter: true },
    { name: 'WorkCenter', label: 'Shop', sortable: true, filter: true },
    { name: 'EquipID', label: 'EquipID', sortable: true, filter: true },
    { name: 'Discrepancy', label: 'Discrepancy', sortable: true, filter: true, styles: 'ellipses' },
    { name: 'CFPComments', label: 'Comments', sortable: true, filter: true, styles: 'ellipses' },
    { name: 'ETIC', label: 'ETIC', sortable: true, filter: true },
    { name: 'ApprovalStatus', label: 'Status', sortable: true, filter: true },

    // { name: 'dateRange', label: 'Dates', sortable: true, filter: true },
    // { name: 'WUC', label: 'WUC', sortable: true, filter: true },
    // { name: 'CC', label: 'CC', sortable: true, filter: true },
    // { name: 'Location', label: 'Location', sortable: true, filter: true },
    // { name: 'NameUserID', label: 'NameUserID', sortable: true, filter: true },
    // { name: 'LastUpdate', label: 'LastUpdate', sortable: true, filter: true },
    // { name: 'LastModifier', label: 'LastModifier', sortable: true, filter: true },
    // { name: 'Modified', label: 'Modified', sortable: true, filter: true },
  ];

  mdc: ICustomMDCData[];

  view: any[] = [700, 400];

  colorScheme: any = {
    domain: ['#1565C0', '#2196F3', '#81D4FA', '#FF9800', '#EF6C00'],
  };

  filteredData: any[];
  searchTerm: string = '';
  sortBy: string = 'name';
  sortOrder: TdDataTableSortingOrder = TdDataTableSortingOrder.Descending;

  appTitle: string = APP_TITLE;

  tableHeight: number = window.innerHeight - 250;

  constructor(private _dataTableService: TdDataTableService,
    private _titleService: Title,
    private _sharePointService: SharepointService) {

    this._titleService.setTitle(APP_TITLE);
    this._sharePointService.mdc.subscribe(mdc => {
      this.mdc = mdc.map(row => {
        const newRow: ICustomMDCData = <ICustomMDCData>row;
        const julianFormat: string = 'YYDDDHHmm';
        const humanFormat: string = 'l, HHmm';
        newRow.dateRange = [
          moment(row.StartDate + row.StartTime, julianFormat).format(humanFormat),
          moment(row.StopDate + row.StopTime, julianFormat).format(humanFormat),
        ].join(' - ');

        newRow.WhenDiscText = `${row.WhenDISC} - ${WHEN_DISCOVERED_CODES[row.WhenDISC]}`;
        newRow.DownTimeCodeText = `${row.DownTimeCode} - ${DOWN_TIME_CODES[row.DownTimeCode]}`;
        newRow.DelayCodeText = `${row.DelayCode} - ${DELAY_CODES[row.DelayCode]}`;
        newRow.eticDate = moment(row.ETIC).toDate();

        return newRow;
      });
      this.filter();
    });

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

  excludedColumns(): string[] {
    return this.columns
      .filter((column: ITdDataTableColumn) => {
        return ((column.filter === undefined && column.hidden === true) ||
          (column.filter !== undefined && column.filter === false));
      })
      .map((column: ITdDataTableColumn) => column.name);
  }

  filter(): void {
    let newData: any[] = this.mdc;
    newData = this._dataTableService.filterData(newData, this.searchTerm, true, this.excludedColumns());
    newData = this._dataTableService.sortData(newData, this.sortBy, this.sortOrder);
    this.filteredData = newData;
  }

  toggleExpanded(row: ICustomMDCData): void {
    row.isExpanded = !row.isExpanded;
    console.log(row);
  }

}
