// src:  https://github.com/davguij/angular-http-cache/blob/master/src/http-cache.service.ts

import { Injectable } from '@angular/core';
import { Http, ConnectionBackend, Headers, Request, RequestOptions, Response, RequestOptionsArgs } from '@angular/http';
import { Observable, Subscriber } from 'rxjs';

import { orderBy, isEqual } from 'lodash';
import * as localForage from 'localforage';
import { ISharePointMDC } from 'app/types';
import { Utilities } from 'services/utilities';

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
        const isSharePoint: boolean = url.includes('/_vti_bin/ListData.svc/');

        return new Observable((subscriber: Subscriber<Response>) => {

            Observable
                .fromPromise(localForage.getItem(url))
                .subscribe((localData: any) => {

                    if (localData) {
                        subscriber.next(localData);
                    }

                    if (isSharePoint) {
                        const data: ISharePointMDC[] = localData.d.results || localData.d;
                        const latest: ISharePointMDC = orderBy(data, ['Modified'], ['desc'])[0];
                        const lastModified: Date = Utilities.convertDate(latest.Modified);
                        const urlAppend: string = `?$filter=Modified gt datetime'${lastModified.toISOString()}'`;
                        if (typeof req === 'string') {
                            req += urlAppend;
                        } else {
                            req.url += urlAppend;
                        }
                    }

                    super
                        .request(req, options)
                        .map(resp => (typeof resp === 'object') ? resp.json() : resp)
                        .subscribe((remoteData: Response) => {
                            console.log(remoteData);
                            if (isEqual(remoteData, localData)) {
                                subscriber.complete();
                            } else {
                                // Observable.fromPromise(localForage.setItem(url, remoteData)).subscribe((saved) => {
                                //     subscriber.next(remoteData);
                                //     subscriber.complete();
                                // });
                            }
                        });

                });
        });

    }

}
