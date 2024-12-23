import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserActivity {
  userId: string;
  userName: string;
  documentEdits: number;
  commentsAdded: number;
  lastActive: Date;
  recentDocuments: string[];
}

export interface DocumentMetrics {
  totalDocuments: number;
  activeDocuments: number;
  documentsCreatedToday: number;
  documentsByTag: { [key: string]: number };
  averageDocumentLength: number;
}

export interface DocumentSentiment {
  documentId: string;
  title: string;
  sentimentScore: number;
  primarySentiment: string;
  detailedScores: {
    POSITIVE: number;
    NEGATIVE: number;
    NEUTRAL: number;
    MIXED: number;
  };
}

export interface SentimentMetrics {
  overallSentiment: { [key: string]: number };
  topPositiveDocuments: DocumentSentiment[];
  topNegativeDocuments: DocumentSentiment[];
  sentimentTrends: { [key: string]: number };
}

export interface Analytics {
  id: string;
  tenantId: string;
  type: 'USER_ACTIVITY' | 'DOCUMENT_METRICS' | 'SENTIMENT_ANALYSIS';
  data: {
    metrics?: DocumentMetrics | SentimentMetrics;
    activeUsers?: number;
    userActivities?: UserActivity[];
  };
  timestamp: Date;
  lastUpdated: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiUrl = `${environment.apiUrl}/analytics`;
  private eventSource: EventSource | null = null;
  
  private userActivitySubject = new BehaviorSubject<Analytics | null>(null);
  private documentMetricsSubject = new BehaviorSubject<Analytics | null>(null);
  private sentimentAnalysisSubject = new BehaviorSubject<Analytics | null>(null);

  constructor(private http: HttpClient) {}

  getUserActivityMetrics(tenantId: string): Observable<Analytics> {
    return this.http.get<Analytics>(`${this.apiUrl}/user-activity/${tenantId}`);
  }

  getDocumentMetrics(tenantId: string): Observable<Analytics> {
    return this.http.get<Analytics>(`${this.apiUrl}/document-metrics/${tenantId}`);
  }

  getSentimentAnalysis(tenantId: string): Observable<Analytics> {
    return this.http.get<Analytics>(`${this.apiUrl}/sentiment/${tenantId}`);
  }

  startRealtimeUpdates(tenantId: string) {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource(`${this.apiUrl}/stream/${tenantId}`);

    this.eventSource.addEventListener('user-activity', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      this.userActivitySubject.next(data);
    });

    this.eventSource.addEventListener('document-metrics', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      this.documentMetricsSubject.next(data);
    });

    this.eventSource.addEventListener('sentiment', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      this.sentimentAnalysisSubject.next(data);
    });

    this.eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      this.eventSource?.close();
      this.eventSource = null;

      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.startRealtimeUpdates(tenantId), 5000);
    };
  }

  stopRealtimeUpdates() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  getUserActivityUpdates(): Observable<Analytics | null> {
    return this.userActivitySubject.asObservable();
  }

  getDocumentMetricsUpdates(): Observable<Analytics | null> {
    return this.documentMetricsSubject.asObservable();
  }

  getSentimentAnalysisUpdates(): Observable<Analytics | null> {
    return this.sentimentAnalysisSubject.asObservable();
  }
}
