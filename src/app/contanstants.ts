export interface ISelectOption {
    value: string;
    label: string;
} 

export interface ICodes {
    [key: string]: string;
}

const APP_TITLE: string = 'Maintenance Documentation Reporting Platform';

const DELAY_CODES: ICodes = {
    '-': 'None',
    'A': 'Single Shift Maintenance',
    'B': 'Awaiting Flight Check',
    'C': 'Awaiting Technical Assistance From MAJCOM Or FOA, AFMC, AFC SC, Or Contractor',
    'D': 'Lack Of Funds',
    'E': 'Shift Change',
    'F': 'Flight Check',
    'G': 'Awaiting System Check',
    'H': 'Parts Awaiting Transportation',
    'I': 'Parts Research',
    'J': 'Supply Processing',
    'K': 'Off-Site Maintenance',
    'L': 'Reserved For Backorder Supply',
    'M': 'Supply, MICAP Backorders',
    'N': 'Supply, Other Backorders',
    'O': 'Host Base Support',
    'P': 'Supply, Local Purchase',
    'Q': 'Supply, Non - DoD',
    'R': 'Supply, Contractor Support',
    'S': 'Not Skill',
    'T': 'Travel Time',
    'U': 'Tools, Test Equipment, And Technical Data Not Available',
    'V': 'Military Priority',
    'W': 'Delay For Weather',
    'X': 'Awaiting Transportation',
    'Y': 'Supply, Delivery Time',
    'Z': 'Other N/A',
};

const DOWN_TIME_CODES: ICodes = {
    '-': 'None',
    'A': 'Retrofit Or Modification ',
    'B': 'Depot Maintenance Scheduled',
    'C': 'Test [Orientation Or Other]',
    'D': 'Reserved For [Scheduled Maintenance]',
    'E': 'Preventive Maintenance ',
    'F': 'Failed Flight Check Or Operational Systems Check ',
    'G': 'Vehicle Out Of Commission',
    'H': 'Host Base Action',
    'I': 'Scheduled Maintenance',
    'J': 'Damage Or Deterioration',
    'K': 'Relocating/Resiting',
    'L': 'Associated Equipment Malfunction',
    'M': 'Equipment Malfunction',
    'N': 'Power Failure',
    'O': 'Scheduled Software Maintenance',
    'P': 'Environmental Control',
    'Q': 'Cable Out',
    'R': 'Emergency Maintenance',
    'S': 'Software/Program Errors',
    'T': 'Training',
    'U': 'Unknown',
    'V': 'Military Priority',
    'W': 'Atmospheric Disturbance Or Weather ',
    'X': 'Jamming - Intentional/Unintentional',
    'Y': 'Personnel Error',
    'Z': 'Frequency Change',
};

const WHEN_DISCOVERED_CODES: ICodes = {
    '-': 'None',
    'C': 'In Flight-Abort/During Operation-Downtime',
    'D': 'In Flight-No Abort/Operation-No Down Time',
    'F': 'Between Flights-GRND Crew/Unsched Maint',
    'H': 'Thru-Flight Insp/Post Load/C-E Insp',
    'J': 'Preflight Or Daily/Shift Inspection',
    'L': 'During Training Or Maint On Train Equip',
    'P': 'Functional Check Flight/Systems Check',
    'Q': 'Special Inspection',
    'R': 'Quality Control Check',
    'S': 'Depot Level Maintenance',
    'T': 'During Scheduled Calibration',
    'U': 'Oil Analysis or NDI',
    'V': 'During Unchesduled Calibration',
    'W': 'Inshop Repair Or Disassembly',
    'X': 'Engine Test Cell/Mating De-Mating',
    'Y': 'Recipt/Withdrawl From Supply',
    'Z': 'AGM Underwing Check. N/A',
};

const APPROVAL_STATUS_OPTIONS: ISelectOption[] = [
    { value: '-', label: 'None' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Processed', label: 'Processed' },
    { value: 'Reviewed', label: 'Reviewed' },
    { value: 'Forecast', label: 'Forecast' },
];

export { APP_TITLE, DELAY_CODES, DOWN_TIME_CODES, WHEN_DISCOVERED_CODES, APPROVAL_STATUS_OPTIONS };
