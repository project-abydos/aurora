
export interface ISharePointConfig {
    BASE_URL?: string;
    JOB_FIELDS?: string[];
    METADATA_FIELDS?: string[];
}

export interface ISharePointResponse<T> {
    d: {
        results: T[];
    };
}

export interface ISharePointMetadata {
    uri: string;
    etag: string;
    type: string;
}

export interface ISharePointAppMetadata {
    __metadata?: ISharePointMetadata;
    Key: string;
    Data: string;
}

export interface ISharePointMDC {
    __metadata?: ISharePointMetadata;
    EquipID?: string;
    JCN?: string;
    StartDate?: string;
    StartTime?: string;
    DownTimeCode?: string;
    WUC?: string;
    CC?: string;
    WhenDiscovered?: string;
    NameUserID?: string;
    DelayCode?: string;
    WorkCenter?: string;
    Discrepancy?: string;
    LastUpdate?: string;
    ETIC?: string;
    Location?: string;
    ApprovalStatus?: string;
    CFPComments?: string;
    LastModified?: string;
    CS?: string;
    Id?: number;
    Modified?: string;
    ModifiedById?: number;
    Timestamp?: string;
    DDR?: string;
}

export interface ICustomMDCData extends ISharePointMDC {
    dateRange: string;
    timeStampPretty: string;
    WhenDiscText?: string;
    DownTimeCodeText?: string;
    DelayCodeText?: string;
    eticDate?: Date;
    isExpanded?: boolean;
    updated?: boolean;
    CCText: any;
    search: string;
    over30Days?: boolean;
    firstOver30?: boolean;
    prettyJCN?: string;
    tags: {
        title?: string;
        search?: string;
        style?: string;
    }[];
    parsedDDR?: ICustomDDR[];
}

export interface ICustomDDR {
    DDR: number;
}

export interface IParsedDDRDataRow {
    ActionTakenCode: string;
    AirForceSpecialtyCodeIndicator: string;
    CategoryOfLaborCode: string;
    ChangeDate: string;
    ChangeTime: string;
    CorrectedByIMDSCDBUserId: string;
    CorrectiveActionNarrativeRow: {
        CorrectiveActionNarrative: string | string[];
    };
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

export interface IParsedWorkcenterEventDataRow {
    DeferCode: string;
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

export interface IParsedEventDataRow {
    DeferCode: string;
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

export interface IParsedDDRInformationRow {
    DDRDataRow: IParsedDDRDataRow;
}

export interface IParseDDREventDataRow {
    WorkcenterEvent: number;
    PerformingWorkcenter: string;
    EquipmentId: string;
    WorkUnitCode: string;
    WorkUnitCodeNarrative: string;
    JobFollowingIndicator: string;
    WorkcenterEventSymbol: string;
    StandardReportingDesignator: string;
    Inshop: string;
    WorkcenterEventStatus: string;
    WorkcenterEventStatusDate: string;
    DeferCode: string;
    DeferMessage: string;
    WorkcenterEventNarrativeRow: string;
    WorkcenterEventNarrative: string;
    EmbedTransaction2: string;
    DDRInformationDataRow: IParsedDDRInformationRow[];
}

export interface IParsedIMDSXML {
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
    EventDataRow: {
        Database: string;
        EventId: string;
        EquipmentId: string;
        UnitId: string;
        StandardReportingDesignator: string;
        WorkUnitCode: string;
        WorkUnitCodeNarrative: string;
        WhenDiscoveredCode: string;
        RepeatRecurFlag: string;
        EventSymbol: string;
        MaintenanceRepairPriority: string;
        EventStatus: string;
        EventStatusDate: string;
        DeferCode: string;
        DeferMessage: string;
        DiscrepancyNarrativeRow: {
            DiscrepancyNarrative: string[];
        };
        WorkcenterEventDataRow: IParseDDREventDataRow;
    };
    ReportAsOf: string;
    ReportOptions: string;
    ReportTitle: string;
    Transaction: string;
    TypeOutput: string;
}
