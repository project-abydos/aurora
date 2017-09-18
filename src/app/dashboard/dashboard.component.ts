import { SharepointService, ISharePointMDC } from './../../services/sharepoint';
import { Component, OnInit } from '@angular/core';

import { Title } from '@angular/platform-browser';

import {
  TdLoadingService, TdDigitsPipe, TdDataTableService,
  TdDataTableSortingOrder, ITdDataTableColumn,
  ITdDataTableSortChangeEvent, IPageChangeEvent,
} from '@covalent/core';

import { APP_TITLE } from '../contanstants';

const NUMBER_FORMAT: (v: any) => any = (v: number) => v;
const DECIMAL_FORMAT: (v: any) => any = (v: number) => v.toFixed(2);

@Component({
  selector: 'qs-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  viewProviders: [],
})
export class DashboardComponent implements OnInit {

  columns: ITdDataTableColumn[] = [
    { name: '__metadata', label: 'Metadata', hidden: true },
    { name: 'EquipID', label: 'EquipID', sortable: true, filter: true },
    { name: 'JCN', label: 'JCN', sortable: true, filter: true },
    { name: 'StartDate', label: 'StartDate', sortable: true, filter: true },
    { name: 'StartTime', label: 'StartTime', sortable: true, filter: true },
    { name: 'StopDate', label: 'StopDate', sortable: true, filter: true },
    { name: 'StopTime', label: 'StopTime', sortable: true, filter: true },
    { name: 'DownTimeCode', label: 'DownTimeCode', sortable: true, filter: true },
    { name: 'WUC', label: 'WUC', sortable: true, filter: true },
    { name: 'CC', label: 'CC', sortable: true, filter: true },
    { name: 'WhenDISC', label: 'WhenDISC', sortable: true, filter: true },
    { name: 'NameUserID', label: 'NameUserID', sortable: true, filter: true },
    { name: 'DelayCode', label: 'DelayCode', sortable: true, filter: true },
    { name: 'WorkCenter', label: 'WorkCenter', sortable: true, filter: true },
    { name: 'Discrepancy', label: 'Discrepancy', sortable: true, filter: true },
    { name: 'LastUpdate', label: 'LastUpdate', sortable: true, filter: true },
    { name: 'ETIC', label: 'ETIC', sortable: true, filter: true },
    { name: 'Location', label: 'Location', sortable: true, filter: true },
    { name: 'ApprovalStatus', label: 'ApprovalStatus', sortable: true, filter: true },
    { name: 'CFPComments', label: 'CFPComments', sortable: true, filter: true },
    { name: 'LastModifier', label: 'LastModifier', sortable: true, filter: true },
    { name: 'CS', label: 'CS', sortable: true, filter: true },
    { name: 'Id', label: 'Id', sortable: true, filter: true },
    { name: 'Modified', label: 'Modified', sortable: true, filter: true },
    { name: 'ModifiedById', label: 'ModifiedById', sortable: true, filter: true },
  ];

  mdc: ISharePointMDC[];

  view: any[] = [700, 400];

  colorScheme: any = {
    domain: ['#1565C0', '#2196F3', '#81D4FA', '#FF9800', '#EF6C00'],
  };

  filteredData: any[];
  searchTerm: string = '';
  sortBy: string = 'name';
  sortOrder: TdDataTableSortingOrder = TdDataTableSortingOrder.Descending;

  tableHeight: number = window.innerHeight - 250;

  constructor(private _dataTableService: TdDataTableService,
    private _titleService: Title,
    private _sharePointService: SharepointService,
    private _loadingService: TdLoadingService) {

  }

  ngOnInit(): void {
    this._titleService.setTitle(APP_TITLE);
    this._loadingService.register('mdc.load');
    this._sharePointService.mdc.subscribe(mdc => {
      this.mdc = mdc;
      this.filter();
      setTimeout(() => this._loadingService.resolve('mdc.load'), 250);
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

  filter(): void {
    let newData: any[] = this.mdc;
    let excludedColumns: string[] = this.columns
      .filter((column: ITdDataTableColumn) => {
        return ((column.filter === undefined && column.hidden === true) ||
          (column.filter !== undefined && column.filter === false));
      })
      .map((column: ITdDataTableColumn) => column.name);
    newData = this._dataTableService.filterData(newData, this.searchTerm, true, excludedColumns);
    newData = this._dataTableService.sortData(newData, this.sortBy, this.sortOrder);
    this.filteredData = newData;
  }

  // ngx transform using covalent digits pipe
  axisDigits(val: any): any {
    return new TdDigitsPipe().transform(val);
  }
}
