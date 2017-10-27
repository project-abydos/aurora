import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Http, Headers, RequestOptionsArgs, RequestOptions } from '@angular/http';
import 'rxjs/add/operator/map';
import { get } from 'lodash';

import { ISharePointConfig, ISharePointMDC } from 'app/types';

@Injectable()
export class SharepointService {

  static CONFIG: ISharePointConfig = {};

  constructor(private http: Http) {

  }

  request(url: string, options?: RequestOptionsArgs, deleteOperation: boolean = false): Observable<any> {

    const isUpdate: boolean = !!get(options, '__metadata.uri');

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

    return this.http.request(url, options).map(response => {
      const { d } = <any>response;
      return d.results || d;
    });

  }

  getMDC(): Observable<ISharePointMDC[]> {
    return this.request('Jobs');
  }

  createJob(job: ISharePointMDC): Observable<ISharePointMDC> {
    return this.request('Jobs', {
      method: 'post',
      body: job,
    });
  }

  updateJob(job: ISharePointMDC): Observable<ISharePointMDC> {
    return this.request('Jobs', {
      method: 'put',
      body: job,
    });
  }

}
