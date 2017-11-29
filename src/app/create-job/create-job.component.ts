import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { FormControl, Validators } from '@angular/forms';
import { WHEN_DISCOVERED_CODES, ICodes, DOWN_TIME_CODES } from 'app/contanstants';
import { keys } from 'lodash';
import { IMDSService } from 'services';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import * as moment from 'moment';
import { ISharePointMDC } from 'app/types';
import { Moment } from 'moment';

interface IJobForm {
  [key: string]: FormControl;
}

const TEXT_ONLY: RegExp = /^\w+$/i;
const TIME_INPUT: RegExp = /^\d+$/i;
const NOW: Moment = moment();

@Component({
  selector: 'mdrp-create-job',
  templateUrl: './create-job.component.html',
  styleUrls: ['./create-job.component.scss'],
})
export class CreateJobComponent {

  hours: string[] = [
    '00', '01', '02', '03', '04', '05', '06', '07', '08', '09',
    '10', '11', '12', '13', '14', '15', '16', '17', '18', '19',
    '20', '21', '22', '23',
  ];

  minutes: string[] = [
    '00', '05', '10', '15',
    '20', '25', '30', '35',
    '40', '45', '50', '55',
  ];

  whenDiscovered: ICodes = WHEN_DISCOVERED_CODES;
  downTimeCodes: ICodes = DOWN_TIME_CODES;
  timePicker: string[] = [];
  workcenters: BehaviorSubject<string[]> = this._imds.workcenters;
  keys: any = keys;
  conditionCode: string;

  job: { [key: string]: FormControl } = {
    CC: new FormControl('R'),
    WUC: new FormControl('', [
      Validators.required,
      Validators.pattern(TEXT_ONLY),
    ]),
    WhenDISC: new FormControl(''),
    DownTimeCode: new FormControl(''),
    WorkCenter: new FormControl(''),
    EquipID: new FormControl('', [
      Validators.required,
      Validators.pattern(TEXT_ONLY),
    ]),
    StartDate: new FormControl(NOW.toDate()),
    StartTime: new FormControl('07:30'),
    ETIC: new FormControl(NOW.add(4, 'weeks').toDate()),
  };

  constructor(
    public dialogRef: MatDialogRef<CreateJobComponent>,
    private _imds: IMDSService,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.hours.map(hour => this.minutes.map(mins => this.timePicker.push(`${hour}:${mins}`)));
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

}
