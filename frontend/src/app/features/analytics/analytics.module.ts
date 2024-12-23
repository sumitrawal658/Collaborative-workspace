import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { AnalyticsDashboardComponent } from './analytics-dashboard/analytics-dashboard.component';

@NgModule({
  declarations: [
    AnalyticsDashboardComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: AnalyticsDashboardComponent }
    ]),
    MatCardModule,
    NgxChartsModule
  ],
  exports: [
    AnalyticsDashboardComponent
  ]
})
export class AnalyticsModule { }
