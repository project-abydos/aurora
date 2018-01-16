import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';
import { SharepointService } from './services/sharepoint';
import { AppModule } from './app/';

if (environment.production) {
  enableProdMode();
}

SharepointService.CONFIG.BASE_URL = 'https://cs2.eis.af.mil/sites/10383/mdt/_vti_bin/ListData.svc';
SharepointService.CONFIG.JOB_FIELDS = [
  'Closed',
  'EquipID',
  'JCN',
  'StartDate',
  'DownTimeCode',
  'WUC',
  'CC',
  'WhenDiscovered',
  'NameUserID',
  'DelayCode',
  'NewJob',
  'WorkCenter',
  'Discrepancy',
  'LastUpdate',
  'ETIC',
  'Location',
  'ApprovalStatus',
  'CFPComments',
  'LastModifier',
  'Id',
  'Timestamp',
  'DDR',
];
SharepointService.CONFIG.METADATA_FIELDS = [
  'Data',
];

platformBrowserDynamic().bootstrapModule(AppModule);
