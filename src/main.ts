import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';
import { SharepointService } from './services/sharepoint';
import { AppModule } from './app/';
import { hmrBootstrap } from './hmr';

if (environment.production) {
  enableProdMode();
}

SharepointService.CONFIG.BASE_URL = 'https://cs2.eis.af.mil/sites/10383/mdrp/_vti_bin/ListData.svc';
SharepointService.CONFIG.JOB_FIELDS = [
  '__metadata',
  'EquipID',
  'JCN',
  'StartDate',
  'StartTime',
  'StopDate',
  'StopTime',
  'DownTimeCode',
  'WUC',
  'CC',
  'WhenDISC',
  'NameUserID',
  'DelayCode',
  'WorkCenter',
  'Discrepancy',
  'LastUpdate',
  'ETIC',
  'Location',
  'ApprovalStatus',
  'CFPComments',
  'LastModifier',
  'CS',
  'Id',
  'Timestamp',
];

// tslint:disable
const bootstrap = () => platformBrowserDynamic().bootstrapModule(AppModule);

if (environment.hmr) {
  console.log(module);
  if (module['hot']) {
    hmrBootstrap(module, bootstrap);
  } else {
    console.error('HMR is not enabled for webpack-dev-server!');
    console.log('Are you using the --hmr flag for ng serve?');
  }
} else {
  bootstrap();
}