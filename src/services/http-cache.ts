// src:  https://github.com/davguij/angular-http-cache/blob/master/src/http-cache.service.ts

import { Injectable } from '@angular/core';
import { Http, ConnectionBackend, Headers, Request, RequestOptions, Response, RequestOptionsArgs } from '@angular/http';
import { Observable, Subscriber } from 'rxjs';

import * as _ from 'lodash';
import * as localForage from 'localforage';

@Injectable()
export class HttpCacheService extends Http {

    constructor(backend: ConnectionBackend, defaultOptions: RequestOptions) {
        super(backend, defaultOptions);
        localForage.config({
            name: 'HttpCache',
            storeName: 'endpoints',
        });
    }

    request(req: string | Request, options?: RequestOptionsArgs): Observable<Response> {
        const url: string = typeof req === 'string' ? req : req.url;

        const reqResponse: Observable<Response> = new Observable((subscriber: Subscriber<Response>) => {
            Observable.fromPromise(localForage.getItem(url))
                .subscribe((localData: Response) => {
                    if (localData) {
                        subscriber.next(localData);
                    }
                    super.request(req, options)
                        .map(resp => {
                            if (typeof resp === 'object') {
                                return resp.json();
                            } else {
                                return resp;
                            }
                        })
                        .subscribe((remoteData: Response) => {
                            // TODO check if both remote and local data are different
                            // if they are, avoid saving remote data to localStorage and .next() on subject
                            if (_.isEqual(remoteData, localData)) {
                                subscriber.complete();
                            } else {
                                Observable.fromPromise(localForage.setItem(url, remoteData)).subscribe((saved) => {
                                    subscriber.next(remoteData);
                                    subscriber.complete();
                                });
                            }
                        });
                });
        });

        return reqResponse;
    }

}
