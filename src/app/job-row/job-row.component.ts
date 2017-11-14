import { Component, OnInit, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { cloneDeep, defaults, find } from 'lodash';
import * as moment from 'moment';

import { ISharePointMDC, ICustomMDCData } from 'app/types';
import { WHEN_DISCOVERED_CODES, DOWN_TIME_CODES, DELAY_CODES, ISelectOption } from 'app/contanstants';

@Component({
  selector: 'mdrp-job-row',
  templateUrl: './job-row.component.html',
  styleUrls: ['./job-row.component.scss'],
})
export class JobRowComponent {

  @Input() row: ICustomMDCData;
  @Output() onStatusChange: EventEmitter<string> = new EventEmitter<string>();
  loadingStatus: boolean;
  isExpanded: boolean;

  toggleExpanded(row: ICustomMDCData): void {
    this.isExpanded = !this.isExpanded;
  }

  changeJobStatus($event: MouseEvent): void {
    $event.stopImmediatePropagation();
    let { ApprovalStatus } = this.row;
    this.loadingStatus = true;
    switch (ApprovalStatus) {
      case 'In Work':
        ApprovalStatus = 'Done';
        break;

      case 'Done':
        ApprovalStatus = 'Pending';
        break;

      default:
        ApprovalStatus = 'In Work';
    }
    this.onStatusChange.next(ApprovalStatus);
  }

}
