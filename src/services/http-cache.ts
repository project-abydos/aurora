// src:  https://github.com/davguij/angular-http-cache/blob/master/src/http-cache.service.ts

import { Injectable } from '@angular/core';
import { ConnectionBackend, Http, Request, RequestMethod, RequestOptions, RequestOptionsArgs, Response } from '@angular/http';
import { Observable, Subscriber } from 'rxjs';

import { cloneDeep, findIndex, orderBy } from 'lodash';
import * as localForage from 'localforage';
import { ISharePointMDC } from 'app/types';
import { Utilities } from 'services/utilities';

const CACHE_TIME: Date = new Date();

@Injectable()
export class HttpCacheService extends Http {

  constructor(backend: ConnectionBackend, defaultOptions: RequestOptions) {
    super(backend, defaultOptions);
    // Flush the cache on app load to prevent cache consistency issues
    localForage.clear().then(done =>
      localForage.config({
        name: 'mdt_cache_db',
        storeName: `sp_cache_data_2018_01_11`,
      }),
    );
  }

  request(req: string | Request, options?: RequestOptionsArgs): Observable<Response> {

    const url: string = typeof req === 'string' ? req : req.url;
    const isSharePointMDC: boolean = url.includes('/_vti_bin/ListData.svc/');
    const shouldCache: boolean = isSharePointMDC && (options.method === RequestMethod.Get) && !/ListData\.svc\/\w+\(\d+\)/.test(url);

    if (!shouldCache) {
      return super
        .request(req, options)
        .map(resp => (typeof resp === 'object') ? resp.json() : resp);
    }

    function addQMark(test: string): string {
      return test.includes('?') ? '&' : '?';
    }

    return new Observable((subscriber: Subscriber<any>) => {

      Observable
        .fromPromise(localForage.getItem(url))
        .subscribe((localData: any) => {

          let request: string | Request = cloneDeep(req);
          localData = localData || [];

          if (localData.length) {
            subscriber.next({d: {results: localData}});

            const latest: ISharePointMDC = orderBy(localData, ['Modified'], ['desc'])[0];
            const lastModified: Date = Utilities.convertDate(latest.Modified);
            const urlAppend: string = `$filter=Modified gt datetime'${lastModified.toISOString()}'`;

            if (typeof request === 'string') {
              request += addQMark(request) + urlAppend;
            } else {
              request.url += addQMark(request.url) + urlAppend;
            }

          }

          super
            .request(request, options)
            .map(resp => (typeof resp === 'object') ? resp.json() : resp)
            .subscribe((remoteData: any) => {

              const data: any = remoteData.d.results || remoteData.d || [];

              if (data instanceof Array) {
                data.forEach(row => {
                  const match: number = findIndex(localData, {Id: row.Id});
                  if (match > -1) {
                    localData[match] = row;
                  } else {
                    localData.push(row);
                  }
                });
                Observable.fromPromise(localForage.setItem(url, localData)).subscribe((saved) => {
                  subscriber.next({d: {results: localData}});
                  subscriber.complete();
                });
              } else {
                subscriber.next({d: {results: localData}});
                subscriber.complete();
              }

            });

        });
    });

  }

}
