import { IMDSService } from 'services/imds';
import { SharepointService } from 'services/sharepoint';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { assignIn, debounce, without } from 'lodash';
import * as moment from 'moment';
import { Moment } from 'moment';
import { TdLoadingService } from '@covalent/core';
import { timer } from 'rxjs/observable/timer';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material';
import { ICustomMDCData, IDashboardMetrics, IFilterResults, ISharePointMDC } from 'app/types';
import { CreateJobComponent } from 'app/create-job/create-job.component';
import { setTimeout } from 'timers';
import { JobDataService } from 'services/job-data.service';
import { InspireService, IQuote } from 'services/inspire.service';

const SECOND: number = 1000;
const MINUTE: number = 60 * SECOND;

@Component({
  selector: 'qs-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {

  multi: any = [];

  colorScheme: any = {
    domain: ['#c60000', '#ff9339', '#ef6c00', '#1976d2'],
  };

  graphIsVisible: boolean = !!localStorage.MDT_GRAPH_VISIBLE;
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
  julianDate: string = moment().format('YYDDDD');
  filteredData: ICustomMDCData[] = [];
  debouncedFilter: Function = debounce(this.filterWrapper, 200);
  metrics: IDashboardMetrics;
  historical: boolean;
  inspire: IQuote;

  constructor(private _imdsService: IMDSService,
              private _sharePointService: SharepointService,
              private _jobDataService: JobDataService,
              private _loadingService: TdLoadingService,
              private _route: ActivatedRoute,
              private _router: Router,
              private _cd: ChangeDetectorRef,
              private _dialog: MatDialog,
              private _quote: InspireService,) {
    this.watchForSearchTagChanges();
    this.watchForIMDSSyncMessages();
    this.setupLastIMDSSyncIntervalCheck();
  }

  // Perform updates on route parameter changes
  watchForSearchTagChanges(): void {
    this._route.params.subscribe(({tokens}) => {
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
          imdsCache[job.JCN] = this._jobDataService.findJob({JCN: job.JCN});
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

  // Show or hide the data visualizations
  toggleGraph(): void {
    this.graphIsVisible = !this.graphIsVisible;
    // Remeber the graph display state
    localStorage.MDT_GRAPH_VISIBLE = this.graphIsVisible || '';
  }

  // Launches create job modal dialog
  openJob(): void {
    this._dialog
      .open(CreateJobComponent, {width: '65vw'})
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
    this.inspire = this._quote.fetch();
    this._sharePointService.getMDC().subscribe(mdc => {
      mdc.forEach(row => this._jobDataService.addOrUpdateJob(row, false));
      this.filterWrapper();
      this.inspire = this._quote.fetch();
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
    this.multi = results.graph;
  }

  trackJobStateChange(index: number, job: ICustomMDCData): string {
    return job.Id + job.__metadata.etag;
  }
}
