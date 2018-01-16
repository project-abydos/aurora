import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { get } from 'lodash';
import * as moment from 'moment';

import { ICustomDDR, ICustomDDRWCE, ICustomMDCData, IParsedDDRInformationRow, IParseDDREventDataRow, IStatusChange } from 'app/types';
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
  @Output() onStatusChange: EventEmitter<IStatusChange> = new EventEmitter<IStatusChange>();
  isExpanded: boolean;
  etic: string;
  jobData: ICustomDDRWCE[];

  constructor(private _sharePoint: SharepointService) {

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (get(changes, 'row.currentValue.__metadata.etag') !== get(changes, 'row.previousValue.__metadata.etag')) {
      this.jobData = undefined;
      console.log(this.row.eticDate);
      this.etic = this.row.eticDate ? moment(this.row.eticDate).format('YYDDDD') : 'None';
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

  copyText($event: MouseEvent): void {
    $event.stopImmediatePropagation();
    window.getSelection().selectAllChildren($event.srcElement);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
  }

  convertDDR(ddr: IParsedDDRInformationRow | IParsedDDRInformationRow[]): ICustomDDR[] {
    return (ddr ? (ddr instanceof Array ? ddr : [ddr]) : [])
      .map(({DDRDataRow}) => ({
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

}
