import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Parser } from 'xml2js';
import { Subject } from 'rxjs';
import { defaults, find } from 'lodash';

import { D52MS_380_XML } from './mock-data-imds-screen-380';
import { CrossDomainService } from './cross-domain';
import { TdLoadingService } from '@covalent/core';
import { ISharePointMDC, IParsed380 } from 'app/types';

@Injectable()
export class IMDSService {

    private _imds: Subject<ISharePointMDC> = new Subject();

    private _parser: Parser = new Parser({
        explicitRoot: false,
        explicitArray: false,
    });

    readonly imds: Observable<ISharePointMDC> = this._imds.asObservable();

    constructor(private _crossDomainService: CrossDomainService, private _loadingService: TdLoadingService) {
        _crossDomainService.receiveSyncData.subscribe(xml => this._processXML(xml));
    }

    flatten(item: string[]): string {
        return item.join ? item.join(' ') : String(item);
    }

    fetch380(org: string): void {
        this._crossDomainService.peformSyncOperation(org);
    }

    private _processXML(xml: string): void {

        this._loadingService.register('imds-380');

        this._parser.parseString(xml, (err, result: IParsed380) => {

            console.clear();
            console.log(result.EquipmentDataRow);

            result.EquipmentDataRow.EventDataRow.forEach((row, index) =>
                this._imds.next({
                    JCN: row.EventId,
                    CC: row.EventSymbol,
                    Discrepancy: this.flatten(row.DiscrepancyNarrativeRow.DiscrepancyNarrative),
                    WorkCenter: result.EquipmentDataRow.Workcenter,
                    Timestamp: row.EventDateTimeStamp,
                    EquipID: row.WorkcenterEventDataRow.EquipmentIdOrPartNumber,
                    DelayCode: row.DefereCode,
                    LastUpdate: this.flatten(<string[]>row.WorkcenterEventDataRow.WorkcenterEventNarrativeRow.WorkcenterEventNarrative),
                }));

            this._loadingService.resolve('imds-380');

        });
    }

}
