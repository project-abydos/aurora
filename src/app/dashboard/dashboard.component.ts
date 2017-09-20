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

import { APP_TITLE } from '../contanstants';

interface ICustomMDCData extends ISharePointMDC {
  dateRange: string;
}

interface ICustomColumns extends ITdDataTableColumn {
  styles?: string;
}

@Component({
  selector: 'qs-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  viewProviders: [],
})
export class DashboardComponent {

  julianDate: string = moment().format('YYDDD');

  columns: ICustomColumns[] = [
    { name: 'JCN', label: 'JCN', sortable: true, filter: true },
    { name: 'WorkCenter', label: 'Shop', sortable: true, filter: true },
    { name: 'EquipID', label: 'EquipID', sortable: true, filter: true },
    { name: 'Discrepancy', label: 'Discrepancy', sortable: true, filter: true, styles: 'ellipses' },
    { name: 'CFPComments', label: 'Comments', sortable: true, filter: true, styles: 'ellipses' },
    { name: 'ApprovalStatus', label: 'Status', sortable: true, filter: true },

    // { name: 'DownTimeCode', label: 'DownTimeCode', sortable: true, filter: true },
    // { name: 'dateRange', label: 'Dates', sortable: true, filter: true },
    // { name: 'WUC', label: 'WUC', sortable: true, filter: true },
    // { name: 'CC', label: 'CC', sortable: true, filter: true },
    // { name: 'DelayCode', label: 'DelayCode', sortable: true, filter: true },  should be delay === not defer
    // { name: 'Location', label: 'Location', sortable: true, filter: true },
    // { name: 'WhenDISC', label: 'WhenDISC', sortable: true, filter: true },
    // { name: 'NameUserID', label: 'NameUserID', sortable: true, filter: true },
    // { name: 'LastUpdate', label: 'LastUpdate', sortable: true, filter: true },
    // { name: 'ETIC', label: 'ETIC', sortable: true, filter: true },
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

}
