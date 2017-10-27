import { IMDSService } from '../../services/imds';
import { SharepointService } from '../../services/sharepoint';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import * as moment from 'moment';
import { JsonPipe } from '@angular/common';
<<<<<<< Updated upstream
import { cloneDeep, defaults, find } from 'lodash';
=======
import * as xml2js from 'xml2js';
import { cloneDeep, defaults, find, findIndex, debounce, some, every } from 'lodash';
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
    this._sharePointService.getMDC().subscribe(mdc => {
      this.mdc = mdc;
=======
    this.reSyncJobs();
    const interval = 5 * 60 * 1000;
    const ping = timer(interval, interval);
    ping.subscribe(() => this.reSyncJobs());
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
>>>>>>> Stashed changes
      this.filter();
      this._loadingService.resolve('mdc');
      this.isLoaded = true;
    });
  }

  syncIMDS(): void {
    console.log('sync');
    this._imdsService.fetch380('test');

<<<<<<< Updated upstream
=======
    const workCenters = [
      '51ms',
      '52no',
      '51nt',
      '52ms',
      '52no',
    ];

    workCenters.forEach(workcenter =>
      this._imdsService.fetch(workcenter).subscribe(xml => this.processIMDS380(xml))
    );

  }

  processIMDS380(xml: string) {

    const parser: any = new xml2js.Parser({
      explicitRoot: false,
      explicitArray: false,
    });

    parser.parseString(xml, (err, parsedXML: IParsed380) => {

      const flatten: Function = (item: string[]): string => {
        return item.join ? item.join(' ') : String(item);
      };

      parsedXML.EquipmentDataRow.EventDataRow.forEach((row, index) => {

        if (row.EventSymbol !== 'R' && row.EventSymbol !== 'A') {
          // Ignore any jobs that aren't red or amber
          return;
        }

        const job: ISharePointMDC = {
          JCN: row.EventId,
          CC: row.EventSymbol,
          Discrepancy: flatten(row.DiscrepancyNarrativeRow.DiscrepancyNarrative),
          WorkCenter: parsedXML.EquipmentDataRow.Workcenter,
          Timestamp: row.EventDateTimeStamp,
          EquipID: row.WorkcenterEventDataRow.EquipmentIdOrPartNumber,
          DelayCode: row.DefereCode,
          LastUpdate: flatten(row.WorkcenterEventDataRow.WorkcenterEventNarrativeRow.WorkcenterEventNarrative),
        };

        const match: ISharePointMDC = find(this.mdc, { JCN: row.EventId });

        if (match) {

          // update job
          if (match.Timestamp !== job.Timestamp) {
            this._loadingService.register('imds-380', index);
            defaults(job, match);
            this._sharePointService
              .updateJob(job)
              .subscribe(updatedJob => {
                this.addOrUpdateJob(job, match);
                this._loadingService.resolve('imds-380', index);
              });
            this.debouncedFilter();
          }

        } else {

          // create job
          this._loadingService.register('imds-380', index);
          this._sharePointService
            .createJob(job)
            .subscribe(createdJob => {
              this.mdc.push(this.transformMDCRow(createdJob));
              this.debouncedFilter();
              this._loadingService.resolve('imds-380', index);
            });

        }
      });

    });

  }

  transformMDCRow(row: ISharePointMDC): ICustomMDCData {
    const _transform: ICustomMDCData = row;
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
      G: 'CC:Green'
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
      _transform.DDR ? _transform.DDR.map(row => row.Text).join(' ') : '',
      _transform.ApprovalStatus,
      _transform.WhenDiscText,
      _transform.DownTimeCodeText,
      _transform.DelayCodeText,
      _transform.eticDate
    ].join(' ').toUpperCase();

    return _transform;
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  filter(): void {
    console.log('filter');
    let newData: ISharePointMDC[] = [];
    newData = this._dataTableService.filterData(this.mdc, this.searchTerm, true);
    newData = this._dataTableService.sortData(newData, this.sortBy, this.sortOrder);
    this.filteredData = newData;
=======
  debouncedFilter = debounce(() => this.filter(), 200);

  filter() {
    let mdc = this.mdc.sort((a, b) => -a.Timestamp.localeCompare(b.Timestamp));
    if (this.searchTerms.length) {
      mdc = mdc.filter(row => every(this.searchTerms, term => row.search.indexOf(term) > -1));
    }
    this.filteredData = mdc;
>>>>>>> Stashed changes
  }

  trackByFn(index: number, item: ISharePointMDC): number {
    console.log('trackBy');
    return item.Id;
  }

}
