import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Http, Headers, RequestOptionsArgs, RequestOptions } from '@angular/http';
import 'rxjs/add/operator/map';
import { get } from 'lodash';

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
  __metadata?: ISharePointMetadata;
  EquipID?: string;
  JCN: string;
  StartDate?: string;
  StartTime?: string;
  StopDate?: string;
  StopTime?: string;
  DownTimeCode?: string;
  WUC?: string;
  CC?: string;
  WhenDISC?: string;
  NameUserID?: string;
  DelayCode?: string;
  WorkCenter?: string;
  Discrepancy?: string;
  LastUpdate?: string;
  ETIC?: string;
  Location?: string;
  ApprovalStatus?: string;
  CFPComments?: string;
  LastModifier?: string;
  CS?: string;
  Id?: number;
  Modified?: string;
  ModifiedById?: number;
  Timestamp?: string;
}

@Injectable()
export class SharepointService {

  static CONFIG: ISharePointConfig = {};

  constructor(private http: Http) {

  }

  request(url: string, options?: RequestOptionsArgs, deleteOperation = false): Observable<any> {

    const isUpdate = !!get(options, '__metadata.uri');

    options = options || new RequestOptions();
    options.headers = new Headers();
    options.headers.set('Accept', 'application/json');
    options.headers.set('Content-Type', 'application/json');

    if (isUpdate) {
      url = get(options, '__metadata.uri');
      options.headers.set('X-HTTP-Method', deleteOperation ? 'DELETE' : 'MERGE');
      options.headers.set('If-Match', url);
    } else {
      url = `${SharepointService.CONFIG.BASE_URL}/${url}`;
    }

    return this.http
      .request(url, options)
      .map(response => response.json().d.results);

  }

  getMDC(): Observable<ISharePointMDC[]> {
    return this.request('Jobs');
  }

  createJob(job: ISharePointMDC): Observable<ISharePointMDC[]> {
    return this.request('Jobs', {
      method: 'post',
      body: job
    });
  }

  updateJob(job: ISharePointMDC): Observable<ISharePointMDC[]> {
    return this.request('Jobs', {
      method: 'put',
      body: job
    });
  }

}

export { ISharePointResponse, ISharePointMetadata, ISharePointMDC };
