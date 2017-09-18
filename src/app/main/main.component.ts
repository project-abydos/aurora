import { Component } from '@angular/core';
import { Router } from '@angular/router';
interface IRouteItem {
  title: string;
  route: string;
  icon: string;
}

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

  constructor(private _router: Router) { }

  logout(): void {
    this._router.navigate(['/login']);
  }
}
