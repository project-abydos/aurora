import { Component, OnInit, ChangeDetectionStrategy, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { cloneDeep, defaults, find, get } from 'lodash';
import * as moment from 'moment';

import { ISharePointMDC, ICustomMDCData, IParsedDDRInformationRow, ICustomDDR, IParseDDREventDataRow, ICustomDDRWCE } from 'app/types';
import { WHEN_DISCOVERED_CODES, DOWN_TIME_CODES, DELAY_CODES, ISelectOption } from 'app/contanstants';
import { Utilities } from 'services/utilities';
import { SharepointService } from 'services';
import { OnChanges } from '@angular/core/src/metadata/lifecycle_hooks';

@Component({
  selector: 'mdt-job-row',
  templateUrl: './job-row.component.html',
  styleUrls: ['./job-row.component.scss'],
})
export class JobRowComponent implements OnChanges {

  @Input() row: ICustomMDCData;
  @Output() onStatusChange: EventEmitter<string> = new EventEmitter<string>();
  loadingStatus: boolean;
  isExpanded: boolean;
  jobData: ICustomDDRWCE[];

  constructor(private _sharePoint: SharepointService) {

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (get(changes, 'row.currentValue.__metadata.etag') !== get(changes, 'row.previousValue.__metadata.etag')) {
      this.jobData = undefined;
    }
  }

  toggleExpanded(row: ICustomMDCData): void {
    this.isExpanded = !this.isExpanded;

    if (this.isExpanded && !this.jobData) {

      this._sharePoint.getJobDDR(this.row.Id).subscribe((response = {}) => {

        const parsedData: IParseDDREventDataRow[] = JSON.parse(response.DDR || '[]');

        this.jobData = parsedData.map(wce => ({
          DeferCode: wce.DeferCode,
          DeferText: wce.DeferMessage,
          Narrative: Utilities.flatten(wce, 'WorkcenterEventNarrativeRow.WorkcenterEventNarrative'),
          DDR: this.convertDDR(wce.DDRInformationDataRow),
        }));

      });

    }

  }

  convertDDR(ddr: IParsedDDRInformationRow | IParsedDDRInformationRow[]): ICustomDDR[] {
    return (ddr ? (ddr instanceof Array ? ddr : [ddr]) : [])
      .map(({ DDRDataRow }) => ({
        ...DDRDataRow,
        ddr: parseInt(DDRDataRow.DDR, 10),
        StartDate: DDRDataRow.StatusDateTimeRow.Date,
        StartTime: DDRDataRow.StatusDateTimeRow.StartTime,
        StopTime: DDRDataRow.StatusDateTimeRow.StopTime,
        Text: Utilities.flatten(DDRDataRow, 'CorrectiveActionNarrativeRow.CorrectiveActionNarrative'),
        User: DDRDataRow.CorrectedByIMDSCDBUserId,
        Closed: parseInt(DDRDataRow.UnitsProduced, 10) === 1,
      }))
      .sort((a, b) => b.ddr - a.ddr);
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
