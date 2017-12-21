import { Injectable } from '@angular/core';
import { ISharePointMDC, ICustomMDCData, IDashboardMetrics, IFilterProperties } from 'app/types';
import { find, assignIn, findIndex, cloneDeep, debounce, memoize, every } from 'lodash';
import { TdLoadingService } from '@covalent/core';
import { SharepointService, IMDSService } from 'services';
import { Utilities } from 'services/utilities';
import { Moment } from 'moment';
import * as moment from 'moment';
import * as json2csv from 'json2csv';
import { saveAs } from 'file-saver';
import { WHEN_DISCOVERED_CODES, DOWN_TIME_CODES, DELAY_CODES } from 'app/contanstants';
import { Observable } from 'rxjs';

@Injectable()
export class JobDataService {

  private mdc: ICustomMDCData[] = [];

  constructor(
    private _imdsService: IMDSService,
    private _sharePointService: SharepointService,
    private _loadingService: TdLoadingService,
  ) {

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
    saveAs(csvData, `MDT Export${searchTerms.join('-')}.csv`);
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
        if (job.DDR) {
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
    const discrepancyText: string = _transform.Discrepancy.toUpperCase();
    const julianDate: Moment = newJob ? startDate : Utilities.parseJCN(_transform.JCN);
    const juliantDateDiff: number = now.diff(julianDate, 'days');
    const timestampMoment: Moment = Utilities.convertJobTimestamp(row.Timestamp);

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

    if (row.Closed) {

      _transform.tags.push({ title: 'Closed', style: 'dark' });

    } else {

      if (row.ETIC) {
        _transform.eticDate = moment(row.ETIC).toDate();
      }

      if (now.diff(timestampMoment.startOf('day'), 'days') > 30) {
        _transform.over30Days = true;
        searchTerms.push('Needs Update');
      }

      if (juliantDateDiff > 89) {
        _transform.tags.push({ title: '90+ Open', style: 'accent' });
      }

      if (juliantDateDiff <= 0) {
        _transform.tags.push({ title: 'Scheduled', style: 'primary' });
        searchTerms.push('scheduled job');
      } else {
        searchTerms.push('active job');
      }

      if (newJob) {
        searchTerms.push('new job');
      }

      if (!newJob && _transform.JCN.match(/\d+[A-Z]\d+/)) {
        _transform.tags.push({ title: 'PMI' });
      }
    }

    discrepancyText.includes('FCO') && _transform.tags.push({ title: 'FCO' });
    discrepancyText.includes('DEPLOYMENT INSPECTION') && _transform.tags.push({ title: 'PDI' });

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
      _transform.tags.map(tag => tag.search || tag.title).join(' '),
      _transform.eticDate || '',
    ]).join(' ').toUpperCase();

    if (matchId < 0) {
      this.mdc.push(_transform);
    } else {
      this.mdc[matchId] = _transform;
    }
  }

  filterData(historical: boolean, searchTerms: string[]): { mdc: ICustomMDCData[], metrics: IDashboardMetrics } {
    console.log('filter');

    let once: boolean = false;
    let mdc: ICustomMDCData[] = this.mdc.filter(row => historical ? row.historical : !row.historical);

    const metrics: IDashboardMetrics = {
      amber: 0,
      red: 0,
      days90: 0,
      days30: 0,
    };

    if (searchTerms.length) {
      // Always ensure all terms are uppercase first
      searchTerms = searchTerms.map(term => term.toUpperCase());
      mdc = mdc.filter(row => every(searchTerms, term => (row.search.indexOf(term) > -1)));
    }

    mdc.forEach(job => {

      job.CC === 'R' && metrics.red++;
      job.CC === 'A' && metrics.amber++;

      if (job.search.includes('90+ OPEN')) {
        metrics.days90++;
      }

      if (job.over30Days) {
        metrics.days30++;
        if (!once) {
          once = true;
          job.firstOver30 = true;
        }
      }

    });

    mdc = cloneDeep(mdc.sort((a, b) => -(a.Timestamp || '').localeCompare(b.Timestamp)));

    return {
      mdc,
      metrics,
    };
  }

  trackJobStateChange(index: number, job: ICustomMDCData): string {
    return job.Id + job.__metadata.etag;
  }

}
