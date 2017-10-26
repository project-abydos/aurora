import { IMDSService } from '../../services/imds';
import { SharepointService } from '../../services/sharepoint';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import * as moment from 'moment';
import { JsonPipe } from '@angular/common';
import { cloneDeep, defaults, find } from 'lodash';

import { Title } from '@angular/platform-browser';

import {
  TdDataTableService,
  TdDataTableSortingOrder, ITdDataTableColumn,
  ITdDataTableSortChangeEvent, TdLoadingService,
} from '@covalent/core';

import { APP_TITLE, APPROVAL_STATUS_OPTIONS, ISelectOption, DELAY_CODES, WHEN_DISCOVERED_CODES, DOWN_TIME_CODES } from '../contanstants';
import { Moment } from 'moment';
import { CrossDomainService } from 'services';
import { ISharePointMDC } from 'app/types';

@Component({
  selector: 'qs-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  viewProviders: [],
})
export class DashboardComponent implements OnInit {

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
    this._sharePointService.getMDC().subscribe(mdc => {
      this.mdc = mdc;
      this.filter();
      this._loadingService.resolve('mdc');
      this.isLoaded = true;
    });
  }

  syncIMDS(): void {
    console.log('sync');
    this._imdsService.fetch380('test');

  }

  sort(sortEvent: ITdDataTableSortChangeEvent): void {
    console.log('sort');
    this.sortBy = sortEvent.name;
    this.sortOrder = sortEvent.order;
    this.filter();
  }

  search(searchTerm: string): void {
    console.log('search');
    this.searchTerm = searchTerm;
    this.filter();
  }

  filter(): void {
    console.log('filter');
    let newData: ISharePointMDC[] = [];
    newData = this._dataTableService.filterData(this.mdc, this.searchTerm, true);
    newData = this._dataTableService.sortData(newData, this.sortBy, this.sortOrder);
    this.filteredData = newData;
  }

  trackByFn(index: number, item: ISharePointMDC): number {
    console.log('trackBy');
    return item.Id;
  }

}
