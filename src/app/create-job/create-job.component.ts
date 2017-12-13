import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { FormControl, Validators, FormBuilder } from '@angular/forms';
import { WHEN_DISCOVERED_CODES, ICodes, DOWN_TIME_CODES } from 'app/contanstants';
import { keys } from 'lodash';
import { IMDSService } from 'services';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import * as moment from 'moment';
import { ISharePointMDC } from 'app/types';
import { Moment } from 'moment';
import { FormGroup } from '@angular/forms/src/model';

interface IJobForm {
  [key: string]: FormControl;
}

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

  constructor(
    public dialogRef: MatDialogRef<CreateJobComponent>,
    private _imds: IMDSService,
    private _fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.hours.map(hour => this.minutes.map(mins => this.timePicker.push(`${hour}:${mins}`)));
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  createJob(): void {
    const { value } = this.job;
    value.StartDate.setHours(parseInt(value.StartTime.slice(0, 2), 10));
    value.StartDate.setMinutes(parseInt(value.StartTime.slice(3, 5), 10));
    value.Timestamp = NOW.add(1, 'years').format('YYDDD HH:mm:ss');
    this.dialogRef.close(value);
  }

}
