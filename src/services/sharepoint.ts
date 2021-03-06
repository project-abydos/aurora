import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Headers, Http, RequestMethod, RequestOptions, RequestOptionsArgs } from '@angular/http';
import 'rxjs/add/operator/map';
import { get, includes, pick } from 'lodash';

import { ISharePointAppMetadata, ISharePointConfig, ISharePointMDC, ISharePointMetadata } from 'app/types';

@Injectable()
export class SharepointService {

  static CONFIG: ISharePointConfig = {};

  constructor(private http: Http) {

  }

  request(_url: string, _options?: RequestOptionsArgs): Observable<any> {

    const options: RequestOptionsArgs = _options || new RequestOptions({
      method: RequestMethod.Get,
    });

    const isPut: boolean = (options.method === RequestMethod.Put) && !!options.body.__metadata;
    const isPost: boolean = (options.method === RequestMethod.Post);
    const metadata: ISharePointMetadata = get(options, 'body.__metadata');
    const {body} = options;

    const url: string = `${SharepointService.CONFIG.BASE_URL}/${_url}`;

    options.headers = new Headers();
    options.headers.set('Accept', 'application/json');
    options.headers.set('Content-Type', 'application/json');

    if (body) {
      if (includes(url, '/Jobs')) {
        options.body = pick(body, SharepointService.CONFIG.JOB_FIELDS);
      }
      if (includes(url, '/AppMetadata')) {
        options.body = pick(body, SharepointService.CONFIG.METADATA_FIELDS);
      }
    }

    if (isPut) {
      options.method = RequestMethod.Post;
      options.headers.set('X-HTTP-Method', 'MERGE');
      // Always overwrite changes as we are not doing complex multi-user write operations
      options.headers.set('If-Match', '*');
      return this.http.request(metadata.uri, options).map(response => {
        // Tick the etag field for view updates (ignored by SharePoint)
        body.__metadata.etag = Math.random().toString();
        return body;
      });
    }

    return this.http.request(url, options).map(response => get(response, 'd.results') || get(response, 'd') || response);

  }

  getMDC(): Observable<ISharePointMDC[]> {
    const SELECT: string[] = [
      'ApprovalStatus',
      'CC',
      'Closed',
      'CFPComments',
      'Created',
      'DelayCode',
      'Discrepancy',
      'DownTimeCode',
      'ETIC',
      'EquipID',
      'Id',
      'JCN',
      'LastUpdate',
      'Modified',
      'NewJob',
      'StartDate',
      'Timestamp',
      'WUC',
      'WhenDiscovered',
      'WorkCenter',
    ];
    return this.request(`Jobs?$select=${SELECT}`);
  }

  getJobDDR(id: number): Observable<ISharePointMDC> {
    const SELECT: string[] = [
      'DDR',
      'Modified',
    ];
    return this.request(`Jobs(${id})?$select=${SELECT}`);
  }

  getAppMetadata(key: string): Observable<ISharePointAppMetadata> {
    return this.request('AppMetadata').map((response = []) =>
      response.find(test => test.Key === key),
    ).share();
  }

  createJob(job: ISharePointMDC): Observable<ISharePointMDC> {
    return this.request('Jobs', {
      method: RequestMethod.Post,
      body: job,
    });
  }

  updateJob(body: ISharePointMDC): Observable<void> {
    return this.request('Jobs', {
      method: RequestMethod.Put,
      body,
    });
  }

  updateAppMetadata(body: ISharePointAppMetadata): Observable<void> {
    return this.request('AppMetadata', {
      method: RequestMethod.Put,
      body,
    });
  }

}
