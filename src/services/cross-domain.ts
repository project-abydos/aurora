import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';

const IMDS_SYNC_HTML: string = `
    <html>
        <head>
            <title>MDRP <> IMDS Connection</title>
            <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
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

    private _connectionEnabled: BehaviorSubject<boolean> = new BehaviorSubject(false);
    private _receiveSyncData: BehaviorSubject<string> = new BehaviorSubject(undefined);
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

        event = event.data || {};
        const state: string = Object.keys(event)[0];
        const data: any = event[state];

        if (!this.imdsWindow && event.source !== window) {
            this.imdsWindow = event.source;
            this.imdsWindow.postMessage({ IMDS_SYNC_HTML }, '*');
            this._connectionEnabled.next(true);
        }

        if (state === 'SYNC') {
            this._receiveSyncData.next(data);
        }
    }

    peformSyncOperation = () => {
        this.imdsWindow.postMessage({ START_SYNC: true }, '*');
    }

}
