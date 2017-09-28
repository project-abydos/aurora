import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Http, Headers, RequestOptionsArgs, RequestOptions } from '@angular/http';
import 'rxjs/add/operator/map';

interface ISharePointConfig {
  BASE_URL?: string;
}
interface ISharePointResponse<T> {
  d: {
    results: T[];
  };
}

interface ISharePointMetadata {
  uri: string;
  etag: string;
  type: string;
}

interface ISharePointMDC {
  __metadata: ISharePointMetadata;
  EquipID: string;
  JCN: string;
  StartDate: string;
  StartTime: string;
  StopDate: string;
  StopTime: string;
  DownTimeCode: string;
  WUC: string;
  CC: string;
  WhenDISC: string;
  NameUserID: string;
  DelayCode: string;
  WorkCenter: string;
  Discrepancy: string;
  LastUpdate: string;
  ETIC: string;
  Location: string;
  ApprovalStatus: string;
  CFPComments: string;
  LastModifier: string;
  CS: string;
  Id: number;
  Modified: string;
  ModifiedById: number;
}

@Injectable()
export class SharepointService {

  static CONFIG: ISharePointConfig = {};

  constructor(private http: Http) {

  }

  request(path: string, options?: RequestOptionsArgs): Observable<any> {

    const url: string = `${SharepointService.CONFIG.BASE_URL}/GetByTitle('${path}')/items`;

    options = options || new RequestOptions();
    options.headers = new Headers();
    options.headers.set('content-type', 'application/json;odata=verbose' );

    return this.http
      .request(url, options)
      .map(response => response.json().data.d);

  }

  getMDC(): Observable<ISharePointMDC[]> {
    return this.request('jobs');
  }

}

export { ISharePointResponse, ISharePointMetadata, ISharePointMDC };
