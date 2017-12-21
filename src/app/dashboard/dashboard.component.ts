import { IMDSService } from '../../services/imds';
import { SharepointService } from '../../services/sharepoint';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { cloneDeep, concat, defaults, find, every, debounce, without, sumBy, memoize, MemoizedFunction, noop, get, findIndex, assignIn } from 'lodash';
import * as moment from 'moment';
import { TdLoadingService } from '@covalent/core';
import { Observable } from 'rxjs/Observable';
import { timer } from 'rxjs/observable/timer';
import { ActivatedRoute, Router } from '@angular/router';
import { Moment, CalendarSpec } from 'moment';
import { MatDialog, MatDialogRef } from '@angular/material';

import { ISelectOption, DELAY_CODES, WHEN_DISCOVERED_CODES, DOWN_TIME_CODES } from '../contanstants';
import { ISharePointMDC, ICustomMDCData, IDashboardMetrics, IFilterResults } from 'app/types';
import { CreateJobComponent } from 'app/create-job/create-job.component';
import { Utilities } from 'services/utilities';
import { setTimeout } from 'timers';
import { JobDataService } from 'services/job-data.service';

const SECOND: number = 1000;
const MINUTE: number = 60 * SECOND;

@Component({
  selector: 'qs-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  viewProviders: [],
})
export class DashboardComponent implements OnInit {

  multi: any = [
    {
      "name": "Germany",
      'series': [
        {
          "name": "2010",
          "value": 7300000
        },
        {
          "name": "2011",
          "value": 8940000
        }
      ]
    },

    {
      "name": "USA",
      "series": [
        {
          "name": "2010",
          "value": 7870000
        },
        {
          'name': '2011',
          'value': 8270000
        }
      ]
    },

    {
      'name': 'France',
      'series': [
        {
          'name': '2010',
          'value': 5000002
        },
        {
          'name': '2011',
          'value': 5800000
        }
      ]
    }
  ];

  view: any[] = [700, 400];
  colorScheme: any = {
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA'],
  };

  lastIMDSSync: string;
  searchTerms: string[] = [];
  orignalSearchTermPresets: string[] = [
    'ACTIVE JOB',
    'AMBER JOB',
    'CFP ACTION',
    'CFP DONE',
    'NEEDS UPDATE',
    'NEW JOB',
    'PDI',
    'PMI',
    'RED JOB',
    'SCHEDULED JOB',
  ];
  searchTermPresets: string[] = [];
  julianDate: string = moment().format('YYDDD');
  filteredData: ICustomMDCData[] = [];
  debouncedFilter: Function = debounce(this.filterWrapper, 200);
  metrics: IDashboardMetrics;
  historical: boolean;

  constructor(
    private _imdsService: IMDSService,
    private _sharePointService: SharepointService,
    private _jobDataService: JobDataService,
    private _loadingService: TdLoadingService,
    private _route: ActivatedRoute,
    private _router: Router,
    private _cd: ChangeDetectorRef,
    private _dialog: MatDialog,
  ) {
    this.watchForSearchTagChanges();
    this.watchForIMDSSyncMessages();
    this.setupLastIMDSSyncIntervalCheck();
  }

  // Peform updates on route parameter changes
  watchForSearchTagChanges(): void {
    this._route.params.subscribe(({ tokens }) => {
      this.searchTerms = tokens ? tokens.toUpperCase().replace(/\-/g, ' ').split(',') : [];
      this.searchTermPresets = without(this.orignalSearchTermPresets, ...this.searchTerms);
      this.filterWrapper();
    });
  }

  // Subscribe to messages from IMDS syncing
  watchForIMDSSyncMessages(): void {
    const imdsCache: { [jcn: string]: ISharePointMDC } = {};
    this._imdsService.imds.subscribe(job => {
      if (job.Timestamp) {
        imdsCache[job.JCN] = job;
      } else {
        if (!imdsCache[job.JCN]) {
          job.Timestamp = moment().local().format('YYDDDD HH:mm:ss');
          imdsCache[job.JCN] = this._jobDataService.findJob({ JCN: job.JCN });
        }
        assignIn(imdsCache[job.JCN], job);
      }
      this._jobDataService.addOrUpdateJob(imdsCache[job.JCN], true);
      this.debouncedFilter();
    });
  }

  // Setup Inerval check for last IMDS sync timestamp
  setupLastIMDSSyncIntervalCheck(): void {
    timer(15 * SECOND, 5 * MINUTE).subscribe(() =>
      this._imdsService.syncTimestamp.subscribe(response => {
        const lastSync: Moment = moment(Number(response.Data));
        this.lastIMDSSync = lastSync.diff(moment(), 'minutes') > -10 ? 'a few minutes ago' : lastSync.fromNow();
      }),
    );
  }

  // Component initalization
  ngOnInit(): void {
    this._loadingService.register('mdc');
    timer(0, MINUTE).subscribe(() => this.reSyncJobs());
  }

  // Fired when search tags are added or removed
  navigateSearch(): void {
    const token: string = this.searchTerms.join().toLowerCase().replace(/[^\w\,\*]/g, '-');
    this._router.navigate(['dashboard', token]);
  }

  // Fires on changes from the dashboard searchbox
  refreshSearchItems(test: string): void {
    this.searchTermPresets = without(this.orignalSearchTermPresets, ...this.searchTerms)
      .filter(term => (term.toUpperCase().indexOf(test.toUpperCase()) > -1));
  }

  // Fires on click of data export button, generates CSV of currently visible data
  exportData(): void {
    this._jobDataService.exportData(this.filteredData, this.searchTerms);
  }

  // Launches create job modal dialog
  openJob(): void {
    this._dialog
      .open(CreateJobComponent, { width: '65vw' })
      .beforeClose()
      .subscribe(job => {
        if (job && job.Discrepancy) {
          this._jobDataService.addOrUpdateJob(job, true);
        }
      });
  }

  changeJobStatus(update: { status: string, jcn: string }, row: ICustomMDCData): void {
    this._jobDataService.changeJobStatus(update, row).subscribe(done => this.filterWrapper());
  }

  reSyncJobs(): void {
    this._sharePointService.getMDC().subscribe(mdc => {
      mdc.forEach(row => this._jobDataService.addOrUpdateJob(row, false));
      this.filterWrapper();
      this._loadingService.resolve('mdc');
      setTimeout(() => this._imdsService.fetch380(), 5 * 1000);
    });
  }

  filterHistory(): void {
    this.historical = !this.historical;
    this.filterWrapper();
  }

  filterWrapper(): void {
    const results: IFilterResults = this._jobDataService.filterData(this.historical, this.searchTerms);
    this.filteredData = results.mdc;
    this.metrics = results.metrics;
  }

  trackJobStateChange(index: number, job: ICustomMDCData): string {
    return job.Id + job.__metadata.etag;
  }
}
