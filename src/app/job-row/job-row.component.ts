import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';
import { cloneDeep, defaults, find } from 'lodash';
import * as moment from 'moment';

import { ISharePointMDC, ICustomMDCData } from 'app/types';
import { WHEN_DISCOVERED_CODES, DOWN_TIME_CODES, DELAY_CODES, APPROVAL_STATUS_OPTIONS, ISelectOption } from 'app/contanstants';

@Component({
  selector: 'mdrp-job-row',
  templateUrl: './job-row.component.html',
  styleUrls: ['./job-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobRowComponent {

  @Input() row: ICustomMDCData;
  job: ICustomMDCData;
  isExpanded: boolean;

  approvalOptions: ISelectOption[] = APPROVAL_STATUS_OPTIONS;

  toggleExpanded(row: ICustomMDCData): void {
    this.isExpanded = !this.isExpanded;
  }

}
