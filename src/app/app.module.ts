import { NgModule, Type } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpModule, Http, XHRBackend, RequestOptions, ConnectionBackend } from '@angular/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import {
  MatAutocompleteModule,
  MatButtonModule,
  MatButtonToggleModule,
  MatCardModule,
  MatCheckboxModule,
  MatChipsModule,
  MatDatepickerModule,
  MatFormFieldModule,
  MatDialogModule,
  MatGridListModule,
  MatIconModule,
  MatListModule,
  MatMenuModule,
  MatNativeDateModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatRadioModule,
  MatRippleModule,
  MatSelectModule,
  MatSidenavModule,
  MatSliderModule,
  MatSlideToggleModule,
  MatSnackBarModule,
  MatTabsModule,
  MatToolbarModule,
  MatTooltipModule,
} from '@angular/material';

import { AppComponent } from './app.component';

import { CrossDomainService, IMDSService, SharepointService } from 'services';
import { routedComponents, AppRoutingModule } from './app-routing.module';

import { SharedModule } from './shared/shared.module';
import { JobRowComponent } from './job-row/job-row.component';
import { HttpCacheService } from 'services/http-cache';
import { CreateJobComponent } from './create-job/create-job.component';
import { UpdateJobComponent } from './update-job/update-job.component';
import { JobDataService } from 'services/job-data.service';
import { APP_BASE_HREF, HashLocationStrategy, LocationStrategy } from '@angular/common';
import { InspireService } from 'services/inspire.service';

// tslint:disable-next-line:typedef
export function httpCacheService(backend: ConnectionBackend, defaultOptions: RequestOptions) {
  return new HttpCacheService(backend, defaultOptions);
}

@NgModule({
  declarations: [
    AppComponent,
    routedComponents,
    JobRowComponent,
    CreateJobComponent,
    UpdateJobComponent,
  ],
  imports: [
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserModule,
    BrowserAnimationsModule,
    SharedModule,
    HttpModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDialogModule,
    MatGridListModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatRippleModule,
    MatSelectModule,
    MatSidenavModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTabsModule,
    MatToolbarModule,
    MatTooltipModule,
    NgxChartsModule,
  ], // modules needed to run this module
  providers: [
    CrossDomainService,
    IMDSService,
    SharepointService,
    JobDataService,
    InspireService,
    Title,
    {
      provide: Http,
      deps: [XHRBackend, RequestOptions],
      useFactory: httpCacheService,
    },
    { provide: LocationStrategy, useClass: HashLocationStrategy },

  ], // additional providers needed for this module
  entryComponents: [
    CreateJobComponent,
  ],
  bootstrap: [AppComponent],
})

export class AppModule { }
