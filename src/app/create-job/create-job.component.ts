import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { DOWN_TIME_CODES, WHEN_DISCOVERED_CODES } from 'app/constants';
import { keys } from 'lodash';
import { IMDSService } from 'services';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import * as moment from 'moment';
import { Moment } from 'moment';
import { FormGroup } from '@angular/forms/src/model';
import { ICodes } from '../types';

const TEXT_ONLY: RegExp = /^\w+$/i;
const TIME_INPUT: RegExp = /^\d+$/i;
const NOW: Moment = moment();

@Component({
  selector: 'mdt-create-job',
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

  job: FormGroup = this._fb.group({
    CC: new FormControl('R'),
    WUC: new FormControl('', [
      Validators.required,
      Validators.pattern(TEXT_ONLY),
    ]),
    WhenDiscovered: new FormControl(''),
    DownTimeCode: new FormControl(''),
    WorkCenter: new FormControl(''),
    EquipID: new FormControl('', [
      Validators.required,
      Validators.pattern(TEXT_ONLY),
    ]),
    StartDate: new FormControl(NOW.toDate()),
    StartTime: new FormControl('07:30'),
    ETIC: new FormControl(NOW.clone().add(4, 'weeks').toDate()),
    Discrepancy: new FormControl(''),
  });

  constructor(public dialogRef: MatDialogRef<CreateJobComponent>,
              private _imds: IMDSService,
              private _fb: FormBuilder,
              @Inject(MAT_DIALOG_DATA) public data: any,) {
    this.hours.map(hour => this.minutes.map(mins => this.timePicker.push(`${hour}:${mins}`)));
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  createJob(): void {
    const {value} = this.job;
    value.StartDate.setHours(parseInt(value.StartTime.slice(0, 2), 10));
    value.StartDate.setMinutes(parseInt(value.StartTime.slice(3, 5), 10));
    value.Timestamp = NOW.clone().add(1, 'years').format('YYDDDD HH:mm:ss');
    this.dialogRef.close(value);
  }

}
