import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';

import { D51MS_XML, D52MS_XML } from './mock-data-imds-screen-100';

@Injectable()
export class IMDSService {

    private _imds: BehaviorSubject<string> = new BehaviorSubject(D52MS_XML);

    public readonly imds: Observable<string> = this._imds.asObservable();

    // constructor() { }

}

export { };
