import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Http, Headers, RequestOptionsArgs, RequestOptions, RequestMethod } from '@angular/http';
import 'rxjs/add/operator/map';
import { get, pick } from 'lodash';

import { ISharePointConfig, ISharePointMDC } from 'app/types';

@Injectable()
export class SharepointService {

  static CONFIG: ISharePointConfig = {};

  constructor(private http: Http) {

  }

  request(url: string, _options?: RequestOptionsArgs, deleteOperation: boolean = false): Observable<any> {

    const options: RequestOptionsArgs = _options || new RequestOptions({
      method: RequestMethod.Get,
    });

    const isPut: boolean = (options.method === RequestMethod.Put);
    const isPost: boolean = (options.method === RequestMethod.Post);

    options.headers = new Headers();
    options.headers.set('Accept', 'application/json');
    options.headers.set('Content-Type', 'application/json');

    if (isPut || isPost) {
      url = get(options, 'body.__metadata.uri');
      if (url.includes('/Jobs')) {
        options.body = pick(options.body, SharepointService.CONFIG.JOB_FIELDS);
      }
      options.headers.set('If-Match', options.body.__metadata.etag);
    } else {
      url = `${SharepointService.CONFIG.BASE_URL}/${url}`;
    }

    return this.http.request(url, options).map(response => {

      if (response && response.status === 204) {
        options.body.__metadata.etag = response.headers.get('ETag');
        response = <any>{
          d: options.body,
        };
      }

      // tslint:disable-next-line:no-string-literal
      return response['d'].results || response['d'] || response;

    });

  }

  getMDC(): Observable<ISharePointMDC[]> {
    return this.request('Jobs');
  }

  createJob(job: ISharePointMDC): Observable<ISharePointMDC> {
    return this.request('Jobs', {
      method: RequestMethod.Post,
      body: job,
    });
  }

  updateJob(job: ISharePointMDC): Observable<ISharePointMDC> {
    return this.request('Jobs', {
      method: RequestMethod.Put,
      body: job,
    });
  }

}
