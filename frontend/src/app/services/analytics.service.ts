import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface UserActivity {
  userId: string;
  action: string;
  timestamp: Date;
  noteId?: string;
  metadata?: Record<string, any>;
}

export interface AnalyticsData {
  activeUsers: number;
  totalNotes: number;
  averageSentiment: number;
  topTags: Array<{tag: string; count: number}>;
  recentActivities: UserActivity[];
  notesCreatedOverTime: Array<{date: Date; count: number}>;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly apiUrl = `${environment.apiUrl}/api/analytics`;
  private analyticsData$ = new BehaviorSubject<AnalyticsData | null>(null);

  constructor(private http: HttpClient) {
    this.startPeriodicRefresh();
  }

  private startPeriodicRefresh() {
    // Refresh analytics data every 30 seconds
    setInterval(() => this.refreshAnalytics(), 30000);
  }

  refreshAnalytics(): void {
    this.http.get<AnalyticsData>(this.apiUrl).subscribe(
      data => this.analyticsData$.next(data),
      error => console.error('Error fetching analytics:', error)
    );
  }

  getAnalyticsData(): Observable<AnalyticsData | null> {
    return this.analyticsData$.asObservable();
  }

  trackUserActivity(activity: Omit<UserActivity, 'timestamp'>): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/activity`, {
      ...activity,
      timestamp: new Date()
    });
  }

  getSentimentAnalysis(noteId: string): Observable<number> {
    return this.http.get<{score: number}>(`${this.apiUrl}/sentiment/${noteId}`).pipe(
      map(response => response.score)
    );
  }

  getActiveUsers(): Observable<number> {
    return this.http.get<{count: number}>(`${this.apiUrl}/active-users`).pipe(
      map(response => response.count)
    );
  }

  getTagAnalytics(): Observable<Array<{tag: string; count: number}>> {
    return this.http.get<Array<{tag: string; count: number}>>(`${this.apiUrl}/tags`);
  }

  getNoteCreationTrends(timeframe: 'day' | 'week' | 'month' = 'week'): Observable<Array<{date: Date; count: number}>> {
    return this.http.get<Array<{date: string; count: number}>>(`${this.apiUrl}/trends`, {
      params: { timeframe }
    }).pipe(
      map(data => data.map(item => ({
        date: new Date(item.date),
        count: item.count
      })))
    );
  }

  getRecentActivities(limit: number = 10): Observable<UserActivity[]> {
    return this.http.get<UserActivity[]>(`${this.apiUrl}/recent-activities`, {
      params: { limit: limit.toString() }
    }).pipe(
      map(activities => activities.map(activity => ({
        ...activity,
        timestamp: new Date(activity.timestamp)
      })))
    );
  }
} 