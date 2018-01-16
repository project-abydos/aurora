import { Component } from '@angular/core';
import { IRouteItem } from '../types';

@Component({
  selector: 'qs-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent {

  routes: IRouteItem[] = [
    {
      title: 'Dashboard',
      route: '/',
      icon: 'dashboard',
    },
  ];

}
