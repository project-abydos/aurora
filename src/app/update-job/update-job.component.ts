import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ICustomMDCData, IStatusChange } from 'app/types';
import { get } from 'lodash';

@Component({
  selector: 'mat-update-job',
  templateUrl: './update-job.component.html',
  styleUrls: ['./update-job.component.scss'],
})
export class UpdateJobComponent {

  @Input() job: ICustomMDCData;
  @Output() onStatusChange: EventEmitter<IStatusChange> = new EventEmitter<IStatusChange>();
  loadingStatus: boolean;

  changeJobStatus($event: MouseEvent): void {
    $event.stopImmediatePropagation();
    let {ApprovalStatus} = this.job;
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
    this.onStatusChange.next({status: ApprovalStatus});
  }

  checkJCN($event: KeyboardEvent): void {
    if ($event.key === 'Enter') {
      this.onStatusChange.next({status: 'Done', jcn: get($event, 'target.value')});
    }
  }

}
