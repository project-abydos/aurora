import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Parser } from 'xml2js';
import { Subject, Subscription } from 'rxjs';
import { defaults, find, get, isArray, once, memoize, debounce, throttle } from 'lodash';

import { CrossDomainService } from './cross-domain';
import { ISharePointMDC, IParsedIMDSXML, IParsedEventDataRow, ISharePointAppMetadata } from 'app/types';
import { timer } from 'rxjs/observable/timer';
import { SharepointService } from './sharepoint';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

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
        }
    });

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

    flatten(row: IParsedEventDataRow, path: string): string {
        const item: string[] | string = get(row, path);
        return item instanceof Array ? item.join(' ') : String(item);
    }

    fetchDDR(jcn: string): void {
        this._crossDomainService.peformDDRSyncOperation(jcn);
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
                        Discrepancy: this.flatten(row, 'DiscrepancyNarrativeRow.DiscrepancyNarrative'),
                        WorkCenter: workcenter,
                        Timestamp: row.EventDateTimeStamp,
                        EquipID: row.WorkcenterEventDataRow.EquipmentIdOrPartNumber,
                        DelayCode: row.DeferCode,
                        LastUpdate: this.flatten(row, 'WorkcenterEventDataRow.WorkcenterEventNarrativeRow.WorkcenterEventNarrative'),
                    }));

            }

            if (result.EventDataRow) {
                console.log(result.EventDataRow);
            }

        });
    }

}
