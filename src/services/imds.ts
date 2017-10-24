import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Parser } from 'xml2js';
import { defaults, find } from 'lodash';

import { D52MS_380_XML } from './mock-data-imds-screen-380';
import { CrossDomainService } from 'services';
import { ISharePointMDC } from 'services/sharepoint';
import { TdLoadingService } from '@covalent/core';

interface IParsedDDRDataRow {
    ActionTakenCode: string;
    AirForceSpecialtyCodeIndicator: string;
    CategoryOfLaborCode: string;
    ChangeDate: string;
    ChangeTime: string;
    CorrectedByIMDSCDBUserId: string;
    CorrectiveActionNarrativeRow: string | string[];
    CrewSize: string;
    DDR: string;
    HowMalfunctionCode: string;
    MajorCommandCode: string;
    StatusDateTimeRow: {
        Date: string;
        StartTime: string;
        StopTime: string;
    };
    Symbol: string;
    TypeMaintnenanceCode: string;
    UnitId: string;
    UnitsProduced: string;
    WhenDiscoveredCode: string;
    WorkUnitCode: string;
}

interface IParsedWorkcenterEventDataRow {
    DefereCode: string;
    DeferMessage: string;
    EmbedTransaction1: string;
    EquipmentIdOrPartNumber: string;
    Inshop: string;
    WorkcenterEvent: string;
    WorkcenterEventDateTimeStampe: string;
    WorkcenterEventIsStarted: string;
    WorkcenterEventNarrativeRow: {
        WorkcenterEventNarrative: string | string[];
    };
    WorkcenterEventNeedForm: string;
    WorkcenterEventStatus: string;
    WorkcenterEventStatusDate: string;
    WorkcenterEventStatusTime: string;
    WorkcenterEventSymbol: string;
}

interface IParsedEventDataRow {
    DefereCode: string;
    DeferMessage: string;
    DiscrepancyNarrativeRow: {
        DiscrepancyNarrative: string[];
    };
    EmbedTransaction1: string;
    EventDateTimeStamp: string;
    EventId: string;
    EventNeedForm: string;
    EventStatus: string;
    EventSymbol: string;
    NWRM: string;
    SortKey: string;
    TypeEvent: string;
    WorkcenterEventDataRow: IParsedWorkcenterEventDataRow;
}

interface IParsed380 {
    $: {
        elc: string;
        program_id: string;
        remote_id: string;
        txn_dt_tm: string;
        unit_id: string;
        user_id: string;
        version_date: string;
    };
    EquipmentDataRow: {
        EventDataRow: IParsedEventDataRow[];
        Workcenter: string;
    };
    ReportAsOf: string;
    ReportOptions: string;
    ReportTitle: string;
    Transaction: string;
    TypeOutput: string;
}

@Injectable()
export class IMDSService {

    private _imds: BehaviorSubject<ISharePointMDC> = new BehaviorSubject(undefined);

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

        this._crossDomainService.peformSyncOperation();

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
                    LastUpdate: this.flatten(row.WorkcenterEventDataRow.WorkcenterEventNarrativeRow.WorkcenterEventNarrative),
                }));

            this._loadingService.resolve('imds-380');

        });
    }

}

export { IParsed380, IParsedEventDataRow, IParsedWorkcenterEventDataRow, IParsedDDRDataRow };
