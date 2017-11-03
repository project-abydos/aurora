import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs';

const IMDS_SYNC_HTML: string = `
    <html>
        <head>
            <title>MDRP <> IMDS Connection</title>
        </head>
        <body>
            <style>
                body {
                    background: #333;
                }
                .card {
                    box-shadow: 0 2px 5px 0 rgba(0, 0, 0, .1), 0 2px 10px 0 rgba(0, 0, 0, .07);
                    position: absolute;
                    border-radius: 20px;
                    position: absolute;
                    width: 80vw;
                    height: 5em;
                    top: 0;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    margin: auto;
                    text-align: center;
                    background: #1976d2;
                    color: white;
                    padding: 20px;
                    font-variant: small-caps;
                }
            </style>
            <div class="card">
                <h1>Connected to MDRP - <em>Please do not close this window</em></h1>
            </div>
        </body>
    </html>
`;

@Injectable()
export class CrossDomainService {

    private _connectionEnabled: Subject<boolean> = new Subject();
    private _receiveSyncData: Subject<string> = new Subject();
    private imdsWindow: Window;

    readonly connectionEnabled: Observable<boolean>;
    readonly receiveSyncData: Observable<string>;

    constructor() {
        console.log('Connect cross-domain listener');
        this.connectionEnabled = this._connectionEnabled.asObservable();
        this.receiveSyncData = this._receiveSyncData.asObservable();
        window.addEventListener('message', this.receiveMessage, false);
    }

    receiveMessage = (event: MessageEvent): void => {
        const _event: any = event.data || {};
        const state: string = Object.keys(_event)[0];
        const data: any = _event[state];

        switch (state) {

            case 'ACTIVATE':
                return this._bindWindow(event);

            case 'IMDS_RECEIVE_380_XML':
                return this._receiveSyncData.next(data);

            default:
        }
    }

    peformSyncOperation = (org: string): void => {
        if (this.imdsWindow) {
            this.imdsWindow.postMessage({ START_SYNC: org }, '*');
        }
    }

    private _bindWindow = (event: MessageEvent) => {
        if (!this.imdsWindow && event.source !== window) {
            this.imdsWindow = event.source;
            this.imdsWindow.postMessage({ IMDS_SYNC_HTML }, '*');
            this._connectionEnabled.next(true);
            this._connectionEnabled.complete();
        }
    }

}
