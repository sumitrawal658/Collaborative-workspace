import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgChartsModule } from 'ng2-charts';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AnalyticsService, AnalyticsData, UserActivity } from '../../services/analytics.service';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatTabsModule,
    MatSelectModule,
    MatFormFieldModule,
    NgChartsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="dashboard-container">
      <h1>Analytics Dashboard</h1>

      <div class="metrics-grid">
        <!-- Active Users Card -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Active Users</mat-card-title>
            <mat-icon>group</mat-icon>
          </mat-card-header>
          <mat-card-content>
            <div class="metric-value">{{ analyticsData?.activeUsers || 0 }}</div>
            <div class="metric-label">Currently Online</div>
          </mat-card-content>
        </mat-card>

        <!-- Total Notes Card -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Total Notes</mat-card-title>
            <mat-icon>note</mat-icon>
          </mat-card-header>
          <mat-card-content>
            <div class="metric-value">{{ analyticsData?.totalNotes || 0 }}</div>
            <div class="metric-label">Notes Created</div>
          </mat-card-content>
        </mat-card>

        <!-- Sentiment Score Card -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Average Sentiment</mat-card-title>
            <mat-icon>mood</mat-icon>
          </mat-card-header>
          <mat-card-content>
            <div class="metric-value">{{ (analyticsData?.averageSentiment || 0) | number:'1.1-1' }}</div>
            <div class="metric-label">Sentiment Score</div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-tabs>
        <!-- Activity Timeline -->
        <mat-tab label="Recent Activity">
          <mat-list>
            <mat-list-item *ngFor="let activity of analyticsData?.recentActivities">
              <mat-icon matListItemIcon>{{ getActivityIcon(activity) }}</mat-icon>
              <div matListItemTitle>{{ formatActivity(activity) }}</div>
              <div matListItemLine>{{ activity.timestamp | date:'medium' }}</div>
            </mat-list-item>
          </mat-list>
        </mat-tab>

        <!-- Tag Analytics -->
        <mat-tab label="Popular Tags">
          <div class="tag-cloud">
            <div *ngFor="let tag of analyticsData?.topTags" 
                 class="tag-item"
                 [style.fontSize.px]="getTagSize(tag.count)">
              #{{ tag.tag }} ({{ tag.count }})
            </div>
          </div>
        </mat-tab>

        <!-- Note Creation Trends -->
        <mat-tab label="Creation Trends">
          <div class="chart-container">
            <canvas baseChart
                    [data]="chartData"
                    [options]="chartOptions"
                    [type]="'line'">
            </canvas>
          </div>
          <mat-form-field>
            <mat-label>Timeframe</mat-label>
            <mat-select [(value)]="selectedTimeframe" (selectionChange)="onTimeframeChange()">
              <mat-option value="day">Last 24 Hours</mat-option>
              <mat-option value="week">Last Week</mat-option>
              <mat-option value="month">Last Month</mat-option>
            </mat-select>
          </mat-form-field>
        </mat-tab>
      </mat-tabs>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 24px;
    }

    mat-card {
      padding: 16px;
    }

    .metric-value {
      font-size: 32px;
      font-weight: bold;
      margin: 16px 0;
    }

    .metric-label {
      color: #666;
    }

    .tag-cloud {
      padding: 24px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: center;
    }

    .tag-item {
      color: #1976d2;
      padding: 4px 8px;
      border-radius: 4px;
      background: #e3f2fd;
    }

    .chart-container {
      height: 400px;
      margin: 24px 0;
    }

    mat-form-field {
      margin: 16px;
    }

    mat-list-item {
      margin-bottom: 8px;
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  analyticsData: AnalyticsData | null = null;
  selectedTimeframe: 'day' | 'week' | 'month' = 'week';
  private destroy$ = new Subject<void>();

  chartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [{
      label: 'Notes Created',
      data: [],
      borderColor: '#1976d2',
      tension: 0.4
    }]
  };

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit() {
    this.analyticsService.getAnalyticsData()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: AnalyticsData | null) => {
        this.analyticsData = data;
        if (data?.notesCreatedOverTime) {
          this.updateChartData(data.notesCreatedOverTime);
        }
      });

    // Initial data load
    this.analyticsService.refreshAnalytics();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getActivityIcon(activity: UserActivity): string {
    switch (activity.action) {
      case 'create': return 'add_circle';
      case 'edit': return 'edit';
      case 'delete': return 'delete';
      case 'share': return 'share';
      default: return 'info';
    }
  }

  formatActivity(activity: UserActivity): string {
    switch (activity.action) {
      case 'create':
        return `User ${activity.userId} created a new note`;
      case 'edit':
        return `User ${activity.userId} edited note ${activity.noteId}`;
      case 'delete':
        return `User ${activity.userId} deleted note ${activity.noteId}`;
      case 'share':
        return `User ${activity.userId} shared note ${activity.noteId}`;
      default:
        return `User ${activity.userId} performed ${activity.action}`;
    }
  }

  getTagSize(count: number): number {
    // Normalize tag size between 14 and 32 pixels
    const min = 14;
    const max = 32;
    const maxCount = Math.max(...(this.analyticsData?.topTags || []).map((tag: {count: number}) => tag.count));
    return min + (count / maxCount) * (max - min);
  }

  onTimeframeChange() {
    this.analyticsService.getNoteCreationTrends(this.selectedTimeframe)
      .pipe(takeUntil(this.destroy$))
      .subscribe((trends: Array<{date: Date; count: number}>) => {
        this.updateChartData(trends);
      });
  }

  private updateChartData(trends: Array<{date: Date; count: number}>) {
    this.chartData = {
      labels: trends.map(trend => this.formatDate(trend.date)),
      datasets: [{
        label: 'Notes Created',
        data: trends.map(trend => trend.count),
        borderColor: '#1976d2',
        tension: 0.4
      }]
    };
  }

  private formatDate(date: Date): string {
    switch (this.selectedTimeframe) {
      case 'day':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'week':
        return date.toLocaleDateString([], { weekday: 'short' });
      case 'month':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      default:
        return date.toLocaleDateString();
    }
  }
} 