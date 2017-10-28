import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';
import { cloneDeep, defaults, find } from 'lodash';
import * as moment from 'moment';

import {
  TdDataTableService,
  TdDataTableSortingOrder, ITdDataTableColumn,
  ITdDataTableSortChangeEvent,
} from '@covalent/core';
import { ISharePointMDC, ICustomMDCData } from 'app/types';
import { WHEN_DISCOVERED_CODES, DOWN_TIME_CODES, DELAY_CODES } from 'app/contanstants';

@Component({
  selector: 'mdrp-job-row',
  templateUrl: './job-row.component.html',
  styleUrls: ['./job-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobRowComponent implements OnInit {

  @Input() row: ICustomMDCData;
  job: ICustomMDCData;
  isExpanded: boolean;

  ngOnInit(): void {
    console.log('job-init');
    // this.job = this.row;
  }

  toggleExpanded(row: ICustomMDCData): void {
    console.log('expand');
    this.isExpanded = !this.isExpanded;
  }

  // mapMDCRow(row: ISharePointMDC): ICustomMDCData {
  //   console.log('job-map-row');

  //   const newRow: ICustomMDCData = <ICustomMDCData>row;

  //   newRow.ApprovalStatus = row.ApprovalStatus || '-';
  //   newRow.timeStampPretty = moment(row.Timestamp, 'YYDDD HH:mm:ss').fromNow(true);
  //   newRow.WhenDiscText = row.WhenDISC ? `${row.WhenDISC} - ${WHEN_DISCOVERED_CODES[row.WhenDISC]}` : '';
  //   newRow.DownTimeCodeText = row.DownTimeCode ? `${row.DownTimeCode} - ${DOWN_TIME_CODES[row.DownTimeCode]}` : '';
  //   newRow.DelayCodeText = row.DelayCode ? `${row.DelayCode} - ${DELAY_CODES[row.DelayCode]}` : '';
  //   newRow.eticDate = moment(row.ETIC).toDate();

  //   return newRow;
  // }

}
