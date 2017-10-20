import { Injectable } from '@angular/core';

@Injectable()
export class CrossDomainService {

    imdsWindow: Window;

    constructor() {
        console.log('Connect cross-domain listener');
        window.addEventListener('message', this.receiveMessage, false);
    }

    receiveMessage = (event: MessageEvent): void => {
        console.log(event.origin, event.data);

        if (!this.imdsWindow && event.source !== window) {
            event.source.postMessage({ init: true }, '*');
            this.imdsWindow = event.source;

            setTimeout(() => {
                this.imdsWindow.postMessage('delay test', '*');
            }, 3000);

        }

    }

}
