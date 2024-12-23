import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AnalyticsService, AnalyticsData, UserActivity } from './analytics.service';
import { environment } from '../../environments/environment';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/api/analytics`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AnalyticsService]
    });

    service = TestBed.inject(AnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAnalyticsData', () => {
    it('should return analytics data', () => {
      const mockData: AnalyticsData = {
        activeUsers: 10,
        totalNotes: 100,
        averageSentiment: 0.75,
        topTags: [
          { tag: 'work', count: 30 },
          { tag: 'personal', count: 20 }
        ],
        recentActivities: [
          {
            userId: 'user1',
            action: 'create',
            timestamp: new Date(),
            noteId: 'note1'
          }
        ],
        notesCreatedOverTime: [
          { date: new Date(), count: 5 }
        ]
      };

      service.refreshAnalytics();

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockData);

      service.getAnalyticsData().subscribe(data => {
        expect(data).toEqual(mockData);
      });
    });
  });

  describe('trackUserActivity', () => {
    it('should track user activity', () => {
      const activity: Omit<UserActivity, 'timestamp'> = {
        userId: 'user1',
        action: 'create',
        noteId: 'note1'
      };

      service.trackUserActivity(activity).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/activity`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        ...activity,
        timestamp: jasmine.any(Date)
      });
      req.flush(null);
    });
  });

  describe('getSentimentAnalysis', () => {
    it('should return sentiment score', () => {
      const noteId = 'note1';
      const mockScore = { score: 0.75 };

      service.getSentimentAnalysis(noteId).subscribe(score => {
        expect(score).toBe(mockScore.score);
      });

      const req = httpMock.expectOne(`${apiUrl}/sentiment/${noteId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockScore);
    });
  });

  describe('getTagAnalytics', () => {
    it('should return tag analytics', () => {
      const mockTags = [
        { tag: 'work', count: 30 },
        { tag: 'personal', count: 20 }
      ];

      service.getTagAnalytics().subscribe(tags => {
        expect(tags).toEqual(mockTags);
      });

      const req = httpMock.expectOne(`${apiUrl}/tags`);
      expect(req.request.method).toBe('GET');
      req.flush(mockTags);
    });
  });

  describe('getNoteCreationTrends', () => {
    it('should return note creation trends', () => {
      const mockTrends = [
        { date: '2024-01-01', count: 5 },
        { date: '2024-01-02', count: 8 }
      ];

      service.getNoteCreationTrends('week').subscribe(trends => {
        expect(trends).toEqual([
          { date: new Date('2024-01-01'), count: 5 },
          { date: new Date('2024-01-02'), count: 8 }
        ]);
      });

      const req = httpMock.expectOne(`${apiUrl}/trends?timeframe=week`);
      expect(req.request.method).toBe('GET');
      req.flush(mockTrends);
    });
  });

  describe('getRecentActivities', () => {
    it('should return recent activities', () => {
      const mockActivities = [
        {
          userId: 'user1',
          action: 'create',
          timestamp: '2024-01-01T12:00:00Z',
          noteId: 'note1'
        }
      ];

      service.getRecentActivities(5).subscribe(activities => {
        expect(activities).toEqual([
          {
            ...mockActivities[0],
            timestamp: new Date(mockActivities[0].timestamp)
          }
        ]);
      });

      const req = httpMock.expectOne(`${apiUrl}/recent-activities?limit=5`);
      expect(req.request.method).toBe('GET');
      req.flush(mockActivities);
    });
  });
}); 