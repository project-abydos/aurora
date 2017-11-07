import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MainComponent } from './main/main.component';
import { DashboardComponent } from './dashboard/dashboard.component';

const routes: Routes = [
    {
        path: 'dashboard/:tokens',
        component: DashboardComponent,
    },
    { path: '**', redirectTo: '/dashboard/', pathMatch: 'full' },
];

@NgModule({
    imports: [
        RouterModule.forRoot(routes, { useHash: true }),
    ],
    exports: [
        RouterModule,
    ],
})
export class AppRoutingModule { }
export const routedComponents: any[] = [
    MainComponent,
    DashboardComponent,
];
