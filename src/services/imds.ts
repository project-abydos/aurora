import { Utilities } from './utilities';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Parser } from 'xml2js';
import { Subject } from 'rxjs';
import { find, get, isArray, last, once, throttle } from 'lodash';

import { CrossDomainService } from './cross-domain';
import { IParsedDDRDataRow, IParsedDDRInformationRow, IParsedIMDSXML, ISharePointAppMetadata, ISharePointMDC } from 'app/types';
import { timer } from 'rxjs/observable/timer';
import { SharepointService } from './sharepoint';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

@Injectable()
export class IMDSService {

  private _imds: Subject<ISharePointMDC> = new Subject();
  private _syncTimestampValue: ISharePointAppMetadata;

  private _updateIMDSSyncTimestamp: Function = throttle(() => {
    if (this._syncTimestampValue) {
      this._syncTimestampValue.Data = (new Date()).getTime().toString();
      this._sharePointService.updateAppMetadata(this._syncTimestampValue).subscribe();
    }
  }, 2 * 60 * 1000);

  private _parser: Parser = new Parser({
    explicitRoot: false,
    explicitArray: false,
  });

  readonly syncTimestamp: Observable<ISharePointAppMetadata> = this._sharePointService.getAppMetadata('imds_sync_timestamp');
  readonly workcenters: BehaviorSubject<string[]> = new BehaviorSubject([]);
  readonly imds: Observable<ISharePointMDC> = this._imds.asObservable();

  fetch380: Function = once(() => {
    const SECOND: number = 1000;
    const MINUTE: number = 60 * SECOND;

    if (this._crossDomainService.imdsWindow) {
      this.syncTimestamp.subscribe(response => this._syncTimestampValue = response);
      this.workcenters.subscribe(workcenters =>
        timer(0, 10 * MINUTE).subscribe(() =>
          workcenters.forEach((workcenter, index) =>
            Utilities.imdsTick(() => this._crossDomainService.perform380SyncOperation(workcenter)),
          )));
    }
  });

  constructor(private _crossDomainService: CrossDomainService,
              private _sharePointService: SharepointService,) {
    _crossDomainService.receiveSyncData.subscribe(xml => this._processXML(xml));
    _sharePointService
      .getAppMetadata('imds_workcenter_list')
      .map(response => (response.Data || '').split('\n'))
      .subscribe(response => this.workcenters.next(response));
  }

  // Prevent running more than once every second
  fetchDDR(jcn: string): void {
    this._crossDomainService.performDDRSyncOperation(jcn);
  }

  private _processXML(xml: string): void {

    this._updateIMDSSyncTimestamp();

    this._parser.parseString(xml, (err, result: IParsedIMDSXML) => {

      if (result.EquipmentDataRow) {
        const workcenter: string = get(result, 'EquipmentDataRow.Workcenter');
        let {EventDataRow} = result.EquipmentDataRow;

        // handle nulls and single-job 380s
        EventDataRow = isArray(EventDataRow) ? EventDataRow :
          (EventDataRow ? [<any>EventDataRow] : []);

        console.log('380', EventDataRow);

        EventDataRow.forEach(job => this._imds.next({
          JCN: job.EventId,
          CC: job.EventSymbol,
          Discrepancy: Utilities.flatten(job, 'DiscrepancyNarrativeRow.DiscrepancyNarrative'),
          WorkCenter: workcenter,
          Timestamp: job.EventDateTimeStamp,
          EquipID: job.WorkcenterEventDataRow.EquipmentIdOrPartNumber,
          DelayCode: job.DeferCode,
        }));

        this._sharePointService.getMDC().subscribe(jobs => jobs
          .filter(job => !job.Closed && job.WorkCenter === workcenter)
          .forEach(({JCN}) => {
            if (JCN && !find(EventDataRow, {EventId: JCN})) {
              Utilities.imdsTick(() => this.fetchDDR(JCN));
            }
          }),
        );
      }

      if (result.EventDataRow) {
        console.log('DDR', result.EventDataRow);

        let {EventDataRow} = result;
        const {WorkcenterEventDataRow} = EventDataRow;
        const ddrInfoRow: IParsedDDRInformationRow | IParsedDDRInformationRow[] =
          get(EventDataRow, 'WorkcenterEventDataRow.DDRInformationDataRow') || [{}];
        const lastUpdate: IParsedDDRDataRow = ddrInfoRow instanceof Array ? last(ddrInfoRow).DDRDataRow : ddrInfoRow.DDRDataRow;

        this._imds.next({
          Closed: lastUpdate ? parseInt(lastUpdate.UnitsProduced, 10) > 0 : false,
          JCN: EventDataRow.EventId,
          DelayCode: WorkcenterEventDataRow.DeferCode,
          LastUpdate: Utilities.flatten(lastUpdate, 'CorrectiveActionNarrativeRow.CorrectiveActionNarrative'),
          NewJob: !lastUpdate,
          DDR: JSON.stringify(WorkcenterEventDataRow instanceof Array ? WorkcenterEventDataRow : [WorkcenterEventDataRow]),
          WUC: WorkcenterEventDataRow.WorkUnitCode,
          WhenDiscovered: String(get(lastUpdate, 'WhenDiscoveredCode') || ''),
        });
      }

    });
  }

}
