import { Component, OnInit, ChangeDetectionStrategy, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { cloneDeep, defaults, find, get } from 'lodash';
import * as moment from 'moment';

import { ISharePointMDC, ICustomMDCData, IParsedDDRInformationRow, ICustomDDR, IParseDDREventDataRow } from 'app/types';
import { WHEN_DISCOVERED_CODES, DOWN_TIME_CODES, DELAY_CODES, ISelectOption } from 'app/contanstants';
import { Utilities } from 'services/utilities';
import { SharepointService } from 'services';
import { OnChanges } from '@angular/core/src/metadata/lifecycle_hooks';

@Component({
  selector: 'mdrp-job-row',
  templateUrl: './job-row.component.html',
  styleUrls: ['./job-row.component.scss'],
})
export class JobRowComponent implements OnChanges {

  @Input() row: ICustomMDCData;
  @Output() onStatusChange: EventEmitter<string> = new EventEmitter<string>();
  loadingStatus: boolean;
  isExpanded: boolean;
  ddr: ICustomDDR[];

  constructor(private _sharePoint: SharepointService) {

  }
  ngOnChanges(changes: SimpleChanges): void {
    this.ddr = undefined;
  }

  toggleExpanded(row: ICustomMDCData): void {
    this.isExpanded = !this.isExpanded;

    if (this.isExpanded && !this.ddr) {

      this._sharePoint.getJobDDR(this.row.Id).subscribe((response = {}) => {

        const parsedData: IParseDDREventDataRow[] = JSON.parse(response.DDR || '[]');
        console.log(parsedData, this.row);
        this.ddr = parsedData.map(wce => ({
          DeferCode: wce.DeferCode,
          DeferText: wce.DeferMessage,
          Narrative: Utilities.flatten(wce, 'WorkcenterEventNarrativeRow.WorkcenterEventNarrative'),
          DDR: wce.DDRInformationDataRow
            .map(({ DDRDataRow }) => ({
              ...DDRDataRow,
              DDR: parseInt(DDRDataRow.DDR, 10),
              StartDate: DDRDataRow.StatusDateTimeRow.Date,
              StartTime: DDRDataRow.StatusDateTimeRow.StartTime,
              StopTime: DDRDataRow.StatusDateTimeRow.StopTime,
              Text: Utilities.flatten(DDRDataRow, 'CorrectiveActionNarrativeRow.CorrectiveActionNarrative'),
              User: DDRDataRow.CorrectedByIMDSCDBUserId,
              Closed: parseInt(DDRDataRow.UnitsProduced, 10) === 1,
            }))
            .sort((a, b) => b.DDR - a.DDR),
        }));

      });

    }

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
