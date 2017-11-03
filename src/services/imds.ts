import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Parser } from 'xml2js';
import { Subject, Subscription } from 'rxjs';
import { defaults, find, isArray } from 'lodash';

import { CrossDomainService } from './cross-domain';
import { TdLoadingService } from '@covalent/core';
import { ISharePointMDC, IParsed380, IParsedEventDataRow } from 'app/types';

@Injectable()
export class IMDSService {

    private _syncInterval: number;

    private _imds: Subject<ISharePointMDC> = new Subject();

    private _parser: Parser = new Parser({
        explicitRoot: false,
        explicitArray: false,
    });

    readonly imds: Observable<ISharePointMDC> = this._imds.asObservable();

    constructor(private _crossDomainService: CrossDomainService, private _loadingService: TdLoadingService) {
        _crossDomainService.receiveSyncData.subscribe(xml => this._processXML(xml));
        _crossDomainService.connectionEnabled.subscribe(enabled => {
            window.clearInterval(this._syncInterval);
            if (enabled) {
                this.fetch380();
                this._syncInterval = window.setInterval(() => this.fetch380(), 600 * 1000);
            }
        });
    }

    flatten(item: string[]): string {
        return item.join ? item.join(' ') : String(item);
    }

    fetch380(): void {
        [
            '51ms',
            '51no',
            '51nt',
            '51pc',
            '51pr',

            '52ms',
            '52no',
            '52nt',
            '52pc',
            '52pr',

            '5tsl',
            '5xmp',
        ].forEach((workcenter, index) => {
            setTimeout(() => this._crossDomainService.peformSyncOperation(workcenter), 2000 * index);
        });
    }

    private _processXML(xml: string): void {

        this._loadingService.register('imds-380');

        this._parser.parseString(xml, (err, result: IParsed380) => {

            let { EventDataRow } = result.EquipmentDataRow;

            // handle nulls and single-job 380s
            EventDataRow = isArray(EventDataRow) ? EventDataRow : EventDataRow ? [<any>EventDataRow] : [];

            EventDataRow.forEach((row, index) =>
                this._imds.next({
                    JCN: row.EventId,
                    CC: row.EventSymbol,
                    Discrepancy: this.flatten(row.DiscrepancyNarrativeRow.DiscrepancyNarrative),
                    WorkCenter: result.EquipmentDataRow.Workcenter,
                    Timestamp: row.EventDateTimeStamp,
                    EquipID: row.WorkcenterEventDataRow.EquipmentIdOrPartNumber,
                    DelayCode: row.DeferCode,
                    LastUpdate: this.flatten(<string[]>row.WorkcenterEventDataRow.WorkcenterEventNarrativeRow.WorkcenterEventNarrative),
                }));

            this._loadingService.resolve('imds-380');

        });
    }

}
