import { Component, OnInit, OnDestroy } from '@angular/core';
import { AnalyticsService, Analytics, UserActivity, DocumentMetrics, SentimentMetrics } from '../../../core/services/analytics.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-analytics-dashboard',
  template: `
    <div class="analytics-dashboard">
      <mat-card>
        <mat-card-header>
          <mat-card-title>User Activity</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="metrics-grid">
            <div class="metric-item">
              <h3>Active Users</h3>
              <div class="metric-value">{{ activeUsers }}</div>
            </div>
            <div class="metric-item">
              <h3>Total Document Edits</h3>
              <div class="metric-value">{{ totalDocumentEdits }}</div>
            </div>
          </div>
          <ngx-charts-bar-vertical
            [results]="userActivityData"
            [xAxis]="true"
            [yAxis]="true"
            [showXAxisLabel]="true"
            [showYAxisLabel]="true"
            xAxisLabel="User"
            yAxisLabel="Document Edits">
          </ngx-charts-bar-vertical>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>Document Metrics</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="metrics-grid">
            <div class="metric-item">
              <h3>Total Documents</h3>
              <div class="metric-value">{{ documentMetrics?.totalDocuments || 0 }}</div>
            </div>
            <div class="metric-item">
              <h3>Created Today</h3>
              <div class="metric-value">{{ documentMetrics?.documentsCreatedToday || 0 }}</div>
            </div>
          </div>
          <ngx-charts-pie-chart
            [results]="tagDistributionData"
            [legend]="true"
            [labels]="true">
          </ngx-charts-pie-chart>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>Sentiment Analysis</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="metrics-grid">
            <div class="metric-item">
              <h3>Overall Sentiment</h3>
              <div class="sentiment-indicator" [ngClass]="overallSentimentClass">
                {{ overallSentiment }}
              </div>
            </div>
          </div>
          <ngx-charts-line-chart
            [results]="sentimentTrendsData"
            [xAxis]="true"
            [yAxis]="true"
            [showXAxisLabel]="true"
            [showYAxisLabel]="true"
            xAxisLabel="Time"
            yAxisLabel="Sentiment Score">
          </ngx-charts-line-chart>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .analytics-dashboard {
      padding: 20px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }

    .metric-item {
      text-align: center;
      padding: 16px;
      background: rgba(0, 0, 0, 0.04);
      border-radius: 8px;
    }

    .metric-value {
      font-size: 24px;
      font-weight: bold;
      margin-top: 8px;
    }

    .sentiment-indicator {
      padding: 8px 16px;
      border-radius: 16px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .sentiment-positive {
      background-color: #4caf50;
      color: white;
    }

    .sentiment-negative {
      background-color: #f44336;
      color: white;
    }

    .sentiment-neutral {
      background-color: #9e9e9e;
      color: white;
    }

    mat-card {
      height: 100%;
    }

    ngx-charts-bar-vertical,
    ngx-charts-pie-chart,
    ngx-charts-line-chart {
      height: 300px;
    }
  `]
})
export class AnalyticsDashboardComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];
  private tenantId: string = '';

  // User Activity Metrics
  activeUsers: number = 0;
  totalDocumentEdits: number = 0;
  userActivityData: any[] = [];

  // Document Metrics
  documentMetrics: DocumentMetrics | null = null;
  tagDistributionData: any[] = [];

  // Sentiment Metrics
  overallSentiment: string = 'NEUTRAL';
  overallSentimentClass: string = 'sentiment-neutral';
  sentimentTrendsData: any[] = [];

  constructor(
    private analyticsService: AnalyticsService,
    private authService: AuthService
  ) {
    this.tenantId = this.authService.getCurrentUser()?.tenantId || '';
  }

  ngOnInit() {
    if (!this.tenantId) {
      console.error('No tenant ID available');
      return;
    }

    // Start real-time updates
    this.analyticsService.startRealtimeUpdates(this.tenantId);

    // Subscribe to user activity updates
    this.subscriptions.push(
      this.analyticsService.getUserActivityUpdates().subscribe(data => {
        if (data) {
          this.updateUserActivityMetrics(data);
        }
      })
    );

    // Subscribe to document metrics updates
    this.subscriptions.push(
      this.analyticsService.getDocumentMetricsUpdates().subscribe(data => {
        if (data) {
          this.updateDocumentMetrics(data);
        }
      })
    );

    // Subscribe to sentiment analysis updates
    this.subscriptions.push(
      this.analyticsService.getSentimentAnalysisUpdates().subscribe(data => {
        if (data) {
          this.updateSentimentMetrics(data);
        }
      })
    );
  }

  ngOnDestroy() {
    this.analyticsService.stopRealtimeUpdates();
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private updateUserActivityMetrics(data: Analytics) {
    const activities = data.data.userActivities || [];
    this.activeUsers = data.data.activeUsers || 0;
    this.totalDocumentEdits = activities.reduce((sum, user) => sum + user.documentEdits, 0);

    this.userActivityData = activities
      .sort((a, b) => b.documentEdits - a.documentEdits)
      .slice(0, 10)
      .map(user => ({
        name: user.userName,
        value: user.documentEdits
      }));
  }

  private updateDocumentMetrics(data: Analytics) {
    const metrics = data.data.metrics as DocumentMetrics;
    this.documentMetrics = metrics;

    this.tagDistributionData = Object.entries(metrics.documentsByTag || {})
      .map(([name, value]) => ({ name, value }));
  }

  private updateSentimentMetrics(data: Analytics) {
    const metrics = data.data.metrics as SentimentMetrics;
    
    // Calculate overall sentiment
    const sentiments = metrics.overallSentiment || {};
    const maxSentiment = Object.entries(sentiments)
      .reduce((a, b) => a[1] > b[1] ? a : b);
    
    this.overallSentiment = maxSentiment[0];
    this.overallSentimentClass = `sentiment-${maxSentiment[0].toLowerCase()}`;

    // Update sentiment trends
    this.sentimentTrendsData = [
      {
        name: 'Positive',
        series: Object.entries(metrics.sentimentTrends || {})
          .map(([name, value]) => ({
            name,
            value: value
          }))
      }
    ];
  }
} 