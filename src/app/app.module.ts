import { SharepointService } from './../services/sharepoint';
import { NgModule, Type } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpModule } from '@angular/http';

import { CovalentHighlightModule } from '@covalent/highlight';
import { MdButtonModule } from '@angular/material';

import { AppComponent } from './app.component';

import { routedComponents, AppRoutingModule } from './app-routing.module';

import { SharedModule } from './shared/shared.module';

@NgModule({
  declarations: [
    AppComponent,
    routedComponents,
  ],
  imports: [
    AppRoutingModule,
    BrowserModule,
    BrowserAnimationsModule,
    SharedModule,
    CovalentHighlightModule,
    HttpModule,
    MdButtonModule,
  ], // modules needed to run this module
  providers: [
    SharepointService,
    Title,
  ], // additional providers needed for this module
  entryComponents: [],
  bootstrap: [AppComponent],
})

export class AppModule { }
