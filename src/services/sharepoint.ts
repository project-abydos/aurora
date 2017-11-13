import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Http, Headers, RequestOptionsArgs, RequestOptions, RequestMethod } from '@angular/http';
import 'rxjs/add/operator/map';
import { get, pick, includes } from 'lodash';

import { ISharePointConfig, ISharePointMDC } from 'app/types';

@Injectable()
export class SharepointService {

  static CONFIG: ISharePointConfig = {};

  constructor(private http: Http) {

  }

  request(url: string, _options?: RequestOptionsArgs): Observable<any> {

    const options: RequestOptionsArgs = _options || new RequestOptions({
      method: RequestMethod.Get,
    });

    const isPut: boolean = (options.method === RequestMethod.Put) && options.body.__metadata;
    const isPost: boolean = (options.method === RequestMethod.Post);

    url = `${SharepointService.CONFIG.BASE_URL}/${url}`;

    options.headers = new Headers();
    options.headers.set('Accept', 'application/json');
    options.headers.set('Content-Type', 'application/json');

    if (options.body) {
      if (includes(url, '/Jobs')) {
        options.body = pick(options.body, SharepointService.CONFIG.JOB_FIELDS);
      }
    }

    if (isPut) {
      url = options.body.__metadata.uri;
      options.headers.set('X-HTTP-Method', 'MERGE');
      options.headers.set('If-Match', options.body.__metadata.etag);
      return this.http.request(url, options);
    }

    return this.http.request(url, options).map(response => {
      return get(response, 'd.results') || get(response, 'd') || response;
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
