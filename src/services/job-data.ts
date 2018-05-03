import { Injectable } from '@angular/core';
import { ICustomMDCData, ICustomMDCDataTag, IDashboardMetrics, IFilterResults, IOrgMetrics, ISharePointMDC } from 'app/types';
import { assignIn, cloneDeep, every, find, findIndex, map, sortBy, uniq } from 'lodash';
import { TdLoadingService } from '@covalent/core';
import { IMDSService } from './imds';
import { SharepointService} from './sharepoint';
import { Utilities } from './utilities';
import * as moment from 'moment';
import { Moment } from 'moment';
import * as json2csv from 'json2csv';
import { saveAs } from 'file-saver';
import { DELAY_CODES, DOWN_TIME_CODES, WHEN_DISCOVERED_CODES } from 'app/constants';
import { Observable } from 'rxjs';
import { cya } from './cya';

@Injectable()
export class JobDataService {

  private workcenters: string[] = [];
  private mdc: ICustomMDCData[] = [];

  constructor(private _imdsService: IMDSService,
    private _sharePointService: SharepointService,
    private _loadingService: TdLoadingService, ) {
    _imdsService.workcenters.subscribe(list => this.workcenters = list);
  }

  findJob(args: any): ICustomMDCData {
    return cloneDeep(find(this.mdc, args));
  }

  exportData(filteredData: ICustomMDCData[], searchTerms: string[]): void {

    const fields: string[] = [
      'Closed',
      'JCN',
      'EquipID',
      'WUC',
      'CC',
      'WhenDisc',
      'WorkCenter',
      'Discrepancy',
      'LastUpdate',
      'ETIC',
      'ApprovalStatus',
      'LastModified',
    ];

    const csvData: Blob = new Blob(
      [json2csv({ data: filteredData, fields })],
      { type: 'text/csv;charset=charset=utf-8' },
    );
    saveAs(csvData, `MAT Export${searchTerms.join('-')}.csv`);
  }

  addOrUpdateJob(job: ISharePointMDC, updateSharePoint: boolean): void {

    const match: ICustomMDCData = find(this.mdc, { JCN: job.JCN });

    if (job.CC === 'G' || job.CC === '-') {
      return;
    }

    if (updateSharePoint) {
      job.ApprovalStatus = job.JCN && job.NewJob ? 'Done' : 'Pending';
    }

    if (match) {

      // Matching job found
      const timestampChange: boolean = match.Timestamp !== job.Timestamp;
      const etagChange: boolean = job.__metadata && (match.__metadata.etag !== job.__metadata.etag);

      if (updateSharePoint && timestampChange && !job.DDR && job.JCN) {
        // Detected timestamp change, send a request to update DDR and skip for now
        Utilities.imdsTick(() => this._imdsService.fetchDDR(match.JCN));
        return;
      }

      if (timestampChange || etagChange) {
        // Job has been updated since last pull
        if (updateSharePoint) {
          // Also write the changes to SharePoint
          assignIn(match, job);
          job.__metadata = match.__metadata;
          this._sharePointService.updateJob(job).subscribe(update => this.transformMDCRow(match));
        } else {
          this.transformMDCRow(job);
        }
      }

    } else {
      // New job
      if (updateSharePoint) {
        if (!job.JCN || job.DDR) {
          this._sharePointService.createJob(job).subscribe(update => this.transformMDCRow(update) && this._loadingService.resolve('mdc'));
        } else {
          Utilities.imdsTick(() => this._imdsService.fetchDDR(job.JCN));
        }
      } else {
        this.transformMDCRow(job);
      }
    }

  }

  changeJobStatus(update: { status: string, jcn: string }, row: ICustomMDCData): Observable<void> {
    const job: ICustomMDCData = {
      __metadata: row.__metadata,
    };

    if (update.status) {
      job.ApprovalStatus = update.status;
    }

    if (update.jcn) {
      job.JCN = update.jcn;
    }

    return this._sharePointService.updateJob(job).map(response => {
      row.ApprovalStatus = job.ApprovalStatus;
      this.transformMDCRow(row);
    });
  }

  changeJobETIC(ETIC: Date, row: ICustomMDCData): Observable<void> {
    const job: ICustomMDCData = {
      __metadata: row.__metadata,
      ETIC,
    };
    return this._sharePointService.updateJob(job).map(response => {
      row.ETIC = job.ETIC;
      this.transformMDCRow(row);
    });
  }

  transformMDCRow(row: ICustomMDCData): void {

    console.log('transform');

    if (!row) {
      return;
    }

    const G: string = 'G';
    const A: string = 'A';
    const R: string = 'R';

    // Map AGE CCs
    row.CC = {
      G, A, R,
      '-': G,
      '\\': A,
      'X': R,
    }[row.CC] || G;

    if (row.CC === G) {
      // Ignore all green jobs, because--well they're green and stuff
      return;
    }

    let searchTerms: string[] = [];
    const matchId: number = row && findIndex(this.mdc, { Id: row.Id }) || findIndex(this.mdc, { JCN: row.JCN });

    const now: Moment = moment();
    const _transform: ICustomMDCData = cloneDeep(row);
    const newJob: boolean = !_transform.JCN;
    const startDate: Moment = newJob ? moment.utc(Utilities.convertDate(_transform.StartDate)) : undefined;
    const discrepancyText: string = (_transform.Discrepancy || '').toUpperCase();
    const julianDate: Moment = newJob ? startDate : Utilities.parseJCN(_transform.JCN);
    const juliantDateDiff: number = now.diff(julianDate, 'days');
    const timestampMoment: Moment = Utilities.convertJobTimestamp(row.Timestamp);

    const isPMI: boolean = !newJob && !!_transform.JCN.match(/\d+[A-Z]\d+/);
    const isFCO: boolean = discrepancyText.includes('FCO');
    const isPDI: boolean = discrepancyText.includes('DEPLOYMENT INSPECTION');


    _transform.LastUpdate = row.LastUpdate || 'First IMDS Sync';
    _transform.ApprovalStatus = row.ApprovalStatus || 'Pending';
    _transform.timeStampPretty = newJob ? startDate.format('YYDDDD [at] HH:mm') : Utilities.prettyTimeDiff(timestampMoment);
    _transform.WhenDiscText = row.WhenDiscovered ? `${row.WhenDiscovered} - ${WHEN_DISCOVERED_CODES[row.WhenDiscovered]}` : '';
    _transform.DownTimeCodeText = row.DownTimeCode ? `${row.DownTimeCode} - ${DOWN_TIME_CODES[row.DownTimeCode]}` : '';
    _transform.DelayCodeText = row.DelayCode ? `${row.DelayCode} - ${DELAY_CODES[row.DelayCode]}` : '';
    _transform.prettyJCN = Utilities.prettyTimeDiff(julianDate, { sameDay: '[Today]' });
    _transform.tags = [];
    _transform.historical = (row.ApprovalStatus === 'Done' && row.Closed);

    _transform.CCText = {
      A: 'Amber Job',
      R: 'Red Job',
      G: 'Green Job',
    }[_transform.CC];

    const TAGS: { [key: string]: ICustomMDCDataTag } = {
      CLOSED: { title: 'Closed', style: 'dark' },
      NEEDS_UPDATE: { title: 'Needs Update', style: 'primary' },
      OPEN_90: { title: '90+ Open', style: 'accent' },
      PROJECTED: { title: 'Projected', style: 'semi-dark' },
      PMI: { title: 'PMI' },
      PDI: { title: 'PDI' },
      FCO: { title: 'FCO' },
    };

    if (row.Closed) {

      _transform.tags.push(TAGS.CLOSED);

    } else {

      if (row.ETIC) {
        _transform.eticDate = moment(row.ETIC).toDate();
      }

      if (now.diff(timestampMoment.startOf('day'), 'days') > 30) {
        _transform.over30Days = true;
        _transform.tags.push(TAGS.NEEDS_UPDATE);
      }

      if (juliantDateDiff > 89) {
        _transform.tags.push(TAGS.OPEN_90);
      }

      if (juliantDateDiff < 0) {
        _transform.tags.push(TAGS.PROJECTED);
        searchTerms.push('projected job');
      } else {
        if (!row.LastUpdate) {
          _transform.tags.push(TAGS.NEEDS_UPDATE);
        }
        searchTerms.push('active job');
      }

      if (newJob) {
        searchTerms.push('new job');
      }

      if (!isPMI && !isPDI && !isFCO) {
        searchTerms.push('unscheduled job');
      }
    }

    isPMI && _transform.tags.push(TAGS.PMI);
    isPDI && discrepancyText.includes('DEPLOYMENT INSPECTION') && _transform.tags.push(TAGS.PDI);
    isFCO && discrepancyText.includes('FCO') && _transform.tags.push(TAGS.FCO);

    _transform.tags = uniq(_transform.tags);

    _transform.search = searchTerms.concat([
      _transform.JCN,
      _transform.prettyJCN,
      _transform.CCText,
      _transform.CFPComments,
      _transform.Discrepancy,
      _transform.LastUpdate,
      _transform.WorkCenter,
      _transform.EquipID,
      _transform.NameUserID,
      `CFP ${_transform.ApprovalStatus === 'Done' ? 'Done' : 'Action'}`,
      _transform.WhenDiscText,
      _transform.DownTimeCodeText,
      _transform.DelayCodeText,
      cya(_transform.tags).map(tag => tag.search || tag.title).join(' '),
      _transform.eticDate || '',
    ]).join(' ').toUpperCase();

    if (matchId < 0) {
      this.mdc.push(_transform);
    } else {
      this.mdc[matchId] = _transform;
    }
  }

  filterData(historical: boolean, searchTerms: string[]): IFilterResults {
    console.log('filter');

    let mdc: ICustomMDCData[] = cya(this.mdc).filter(row => historical ? row.historical : !row.historical);

    const metrics: IDashboardMetrics = {
      amber: 0,
      red: 0,
      days90: 0,
      days30: 0,
      fco: 0,
      pdi: 0,
      pmi: 0,
      org: {},
    };

    if (searchTerms.length) {
      // Always ensure all terms are uppercase first
      searchTerms = cya(searchTerms).map(term => term.toUpperCase());
      mdc = cya(mdc).filter(row => every(searchTerms, term => (row.search.indexOf(term) > -1)));
    }

    cya(mdc).forEach(job => {

      const orgMetrics: IOrgMetrics = setupWorkcenter(job.WorkCenter);

      if (job.CC === 'R') {
        metrics.red++;
        orgMetrics.red++;
      }

      if (job.CC === 'A') {
        metrics.amber++;
        orgMetrics.amber++;
      }

      if (job.search.includes('90+ OPEN')) {
        metrics.days90++;
        orgMetrics.days90++;
      }

      if (job.over30Days) {
        metrics.days30++;
        orgMetrics.days30++;
      }

    });

    mdc = cloneDeep(mdc.sort((a, b) => -(a.Timestamp || '').localeCompare(b.Timestamp)));

    function setupWorkcenter(workCenter: string): IOrgMetrics {
      metrics.org[workCenter] = metrics.org[workCenter] || {
        amber: 0,
        red: 0,
        days90: 0,
        days30: 0,
      };
      return metrics.org[workCenter];
    }

    // Organize data for visualization, sort by workcenter
    const graph: any = sortBy(map(metrics.org, (orgMetric: IOrgMetrics, name: string) => ({
      name,
      series: [
        {
          name: 'Red Jobs',
          value: orgMetric.red,
        },
        {
          name: 'Amber Jobs',
          value: orgMetric.amber,
        },
        {
          name: 'Opened 90+ Days Ago',
          value: orgMetric.days90,
        },
        {
          name: '30+ Days Without Update',
          value: orgMetric.days30,
        },
      ],
    })), 'name');

    return {
      mdc,
      metrics,
      graph,
    };
  }

  trackJobStateChange(index: number, job: ICustomMDCData): string {
    return job.Id + job.__metadata.etag;
  }

}
