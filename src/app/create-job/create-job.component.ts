import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { FormControl, Validators } from '@angular/forms';
import { WHEN_DISCOVERED_CODES, ICodes } from 'app/contanstants';
import { keys } from 'lodash';
import { IMDSService } from 'services';
import { Observable } from 'rxjs/Observable';

const TEXT_ONLY: RegExp = /^\w+$/i;
const TIME_INPUT: RegExp = /^\d+$/i;

@Component({
  selector: 'mdrp-create-job',
  templateUrl: './create-job.component.html',
  styleUrls: ['./create-job.component.scss'],
})
export class CreateJobComponent {

  equipmentIdControl: FormControl = new FormControl('', [
    Validators.required,
    Validators.pattern(TEXT_ONLY),
  ]);

  workUnitCodeControl: FormControl = new FormControl('', [
    Validators.required,
    Validators.pattern(TEXT_ONLY),
  ]);

  startTimeControl: FormControl = new FormControl('', [
    Validators.required,
    Validators.pattern(TIME_INPUT),
  ]);

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

  timePicker: string[] = [];

  whenDiscovered: ICodes = WHEN_DISCOVERED_CODES;
  workcenters: Observable<string[]>;

  keys: any = keys;

  conditionCode: string;

  constructor(
    public dialogRef: MatDialogRef<CreateJobComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    _imds: IMDSService,
  ) {

    this.hours.map(hour => this.minutes.map(mins => this.timePicker.push(`${hour}:${mins}`)));

    this.workcenters = _imds.workcenters;
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

}
