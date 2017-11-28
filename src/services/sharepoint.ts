import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Http, Headers, RequestOptionsArgs, RequestOptions, RequestMethod } from '@angular/http';
import 'rxjs/add/operator/map';
import { get, pick, includes, find } from 'lodash';

import { ISharePointConfig, ISharePointMDC, ISharePointAppMetadata, ISharePointMetadata } from 'app/types';

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

    const url: string = `${SharepointService.CONFIG.BASE_URL}/${_url}`;

    options.headers = new Headers();
    options.headers.set('Accept', 'application/json');
    options.headers.set('Content-Type', 'application/json');

    if (options.body) {
      if (includes(url, '/Jobs')) {
        options.body = pick(options.body, SharepointService.CONFIG.JOB_FIELDS);
      }
      if (includes(url, '/AppMetadata')) {
        options.body = pick(options.body, SharepointService.CONFIG.METADATA_FIELDS);
      }
    }

    if (isPut) {
      options.method = RequestMethod.Post;
      options.headers.set('X-HTTP-Method', 'MERGE');
      // Always overwrite changes as we are not doing complex multi-user write operations
      options.headers.set('If-Match', '*');
      return this.http.request(metadata.uri, options);
    }

    return this.http.request(url, options).map(response => get(response, 'd.results') || get(response, 'd') || response);

  }

  getMDC(): Observable<ISharePointMDC[]> {
    return this.request('Jobs');
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
