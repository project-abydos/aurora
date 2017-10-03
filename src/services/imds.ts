import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';

import { D52MS_380_XML } from './mock-data-imds-screen-380';

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
    }
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
    EventDateTimeStamp:string;
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

    private _imds: BehaviorSubject<string> = new BehaviorSubject(D52MS_380_XML);

    public readonly imds: Observable<string> = this._imds.asObservable();

    // constructor() { }

}

export { IParsed380, IParsedEventDataRow, IParsedWorkcenterEventDataRow, IParsedDDRDataRow };
