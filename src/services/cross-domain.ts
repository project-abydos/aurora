import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs';

const IMDS_SYNC_CSS: string = `
    body {
        background: #333;
    }
    .card {
        box-shadow: 0 2px 5px 0 rgba(0, 0, 0, .1), 0 2px 10px 0 rgba(0, 0, 0, .07);
        position: absolute;
        border-radius: 6px;
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
    .sync-progress {
        background: rgba(255, 255, 255, .1);
        margin-top: calc(50vh + 6em);
        margin-bottom: 3vh;
        height: auto;
        text-align: left;
        overflow-y: auto;
    }
`;

const IMDS_SYNC_HTML: string = `
    <html>
        <head>
            <title>MDT <> IMDS Connection</title>
        </head>
        <body>
            <style>${IMDS_SYNC_CSS}</style>
            <div class="card">
                <h1>Connected to MDT - <em>Please do not close this window</em></h1>
            </div>
            <div class="card sync-progress" id="sync-log">
            </div>
        </body>
    </html>
`;

const IMDS_CODE_380: string = 'GDMD';
const IMDS_CODE_DDR: string = 'GMSD';

@Injectable()
export class CrossDomainService {

  private _receiveSyncData: Subject<string> = new Subject();

  imdsWindow: Window;

  readonly receiveSyncData: Observable<string>;

  constructor() {
    console.log('Connect cross-domain listener');

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

      case 'IMDS_RECEIVE_DDR_XML':
        return this._receiveSyncData.next(data);

      default:
    }
  };

  perform380SyncOperation = (org: string): void => {
    if (this.imdsWindow) {
      this.imdsWindow.postMessage({SYNC_380: IMDS_CODE_380 + org}, '*');
    }
  };

  performDDRSyncOperation = (jcn: string): void => {
    if (this.imdsWindow) {
      this.imdsWindow.postMessage({SYNC_DDR: IMDS_CODE_DDR + jcn}, '*');
    }
  };

  private _bindWindow = (event: MessageEvent) => {
    if (!this.imdsWindow && event.source !== window) {
      this.imdsWindow = event.source;
      this.imdsWindow.postMessage({IMDS_SYNC_HTML}, '*');
    }
  };

}
