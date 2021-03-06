import { NgModule } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ConnectionBackend, Http, HttpModule, RequestOptions, XHRBackend } from '@angular/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import {
  MatAutocompleteModule, MatButtonModule, MatButtonToggleModule, MatCardModule, MatCheckboxModule, MatChipsModule, MatDatepickerModule,
  MatDialogModule, MatGridListModule, MatIconModule, MatListModule, MatMenuModule, MatNativeDateModule, MatProgressBarModule,
  MatProgressSpinnerModule, MatRadioModule, MatRippleModule, MatSelectModule, MatSidenavModule, MatSliderModule, MatSlideToggleModule,
  MatSnackBarModule, MatTabsModule, MatToolbarModule, MatTooltipModule,
} from '@angular/material';

import { AppComponent } from './app.component';

import { CrossDomainService, IMDSService, SharepointService, HttpCacheService, JobDataService, InspireService } from 'services';
import { AppRoutingModule, routedComponents } from './app-routing.module';

import { SharedModule } from './shared/shared.module';
import { JobRowComponent } from './job-row/job-row.component';
import { CreateJobComponent } from './create-job/create-job.component';
import { UpdateJobComponent } from './update-job/update-job.component';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';

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

export class AppModule {
}
