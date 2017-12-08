import { Utilities } from './utilities';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Parser } from 'xml2js';
import { Subject, Subscription } from 'rxjs';
import { defaults, find, get, isArray, once, memoize, debounce, throttle, last } from 'lodash';
import * as moment from 'moment';

import { CrossDomainService } from './cross-domain';
import { ISharePointMDC, IParsedIMDSXML, IParsedEventDataRow, ISharePointAppMetadata, IParsedDDRDataRow, IParsedDDRInformationRow } from 'app/types';
import { timer } from 'rxjs/observable/timer';
import { SharepointService } from './sharepoint';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Moment } from 'moment';

@Injectable()
export class IMDSService {

    private _imds: Subject<ISharePointMDC> = new Subject();
    private _syncTimestampValue: ISharePointAppMetadata;

    private _parser: Parser = new Parser({
        explicitRoot: false,
        explicitArray: false,
    });

    private _updateIMDSSyncTimestamp: Function = throttle(() => {
        if (this._syncTimestampValue) {
            this._syncTimestampValue.Data = (new Date()).getTime().toString();
            this._sharePointService.updateAppMetadata(this._syncTimestampValue).subscribe();
        }
    }, 2 * 60 * 1000);

    readonly imds: Observable<ISharePointMDC> = this._imds.asObservable();
    readonly syncTimestamp: Observable<ISharePointAppMetadata> = this._sharePointService.getAppMetadata('imds_sync_timestamp');
    readonly workcenters: BehaviorSubject<string[]> = new BehaviorSubject([]);

    fetch380: Function = once(() => {
        const SECOND: number = 1000;
        const MINUTE: number = 60 * SECOND;

        if (this._crossDomainService.imdsWindow) {

            this.syncTimestamp.subscribe(response => this._syncTimestampValue = response);
            this.workcenters.subscribe(workcenters =>
                timer(0, 10 * MINUTE).subscribe(() =>
                    workcenters.forEach((workcenter, index) =>
                        setTimeout(() => this._crossDomainService.peform380SyncOperation(workcenter), 10 * SECOND * index))),
            );
            timer(MINUTE, 10 * MINUTE).subscribe(() =>
                this._sharePointService.getMDC().subscribe(jobs =>
                    jobs.forEach((job, index) => {
                        const over15Mins: boolean = Utilities.convertJobTimestamp(job.Timestamp).diff(moment(), 'minutes') > -10;
                        if (over15Mins) {
                            this.fetchDDR(job.JCN);
                        }
                    })),
            );
        }
    });

    // Prevent running more than once every second
    fetchDDR: Function = debounce((jcn: string) => this._crossDomainService.peformDDRSyncOperation(jcn), 1000);

    constructor(
        private _crossDomainService: CrossDomainService,
        private _sharePointService: SharepointService,
    ) {
        _crossDomainService.receiveSyncData.subscribe(xml => this._processXML(xml));
        _sharePointService
            .getAppMetadata('imds_workcenter_list')
            .map(response => (response.Data || '').split('\n'))
            .subscribe(response => this.workcenters.next(response));
    }


    private _processXML(xml: string): void {

        this._updateIMDSSyncTimestamp();

        this._parser.parseString(xml, (err, result: IParsedIMDSXML) => {

            if (result.EquipmentDataRow) {

                const workcenter: string = get(result, 'EquipmentDataRow.Workcenter');
                let { EventDataRow } = result.EquipmentDataRow;

                // handle nulls and single-job 380s
                EventDataRow = isArray(EventDataRow) ? EventDataRow :
                    (EventDataRow ? [<any>EventDataRow] : []);

                console.log(EventDataRow);

                EventDataRow.forEach((row, index) =>
                    this._imds.next({
                        JCN: row.EventId,
                        CC: row.EventSymbol,
                        Discrepancy: Utilities.flatten(row, 'DiscrepancyNarrativeRow.DiscrepancyNarrative'),
                        WorkCenter: workcenter,
                        Timestamp: row.EventDateTimeStamp,
                        EquipID: row.WorkcenterEventDataRow.EquipmentIdOrPartNumber,
                        DelayCode: row.DeferCode,
                        LastUpdate: Utilities.flatten(row, 'WorkcenterEventDataRow.WorkcenterEventNarrativeRow.WorkcenterEventNarrative'),
                    }));

            }

            if (result.EventDataRow) {

                console.log(result.EventDataRow);

                let { EventDataRow } = result;
                const { WorkcenterEventDataRow } = EventDataRow;
                const ddrInfoRow: IParsedDDRInformationRow | IParsedDDRInformationRow[] =
                    get(EventDataRow, 'WorkcenterEventDataRow.DDRInformationDataRow') || [{}];
                const lastUpdate: IParsedDDRDataRow = ddrInfoRow instanceof Array ? last(ddrInfoRow).DDRDataRow : ddrInfoRow.DDRDataRow;

                if (lastUpdate) {
                    this._imds.next({
                        JCN: EventDataRow.EventId,
                        DelayCode: WorkcenterEventDataRow.DeferCode,
                        LastUpdate: Utilities.flatten(lastUpdate, 'CorrectiveActionNarrativeRow.CorrectiveActionNarrative'),
                        DDR: JSON.stringify(WorkcenterEventDataRow instanceof Array ? WorkcenterEventDataRow : [WorkcenterEventDataRow]),
                        WUC: WorkcenterEventDataRow.WorkUnitCode,
                        WhenDiscovered: lastUpdate.WhenDiscoveredCode,
                    });
                }

            }

        });
    }

}
