import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { AnalyticsService, AnalyticsData, UserActivity } from '../../services/analytics.service';

type SpyObj<T> = {
  [P in keyof T]: T[P] extends Function ? jasmine.Spy : T[P];
};

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let analyticsService: SpyObj<AnalyticsService>;

  const mockAnalyticsData: AnalyticsData = {
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

  beforeEach(async () => {
    const analyticsServiceSpy = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', [
      'getAnalyticsData',
      'refreshAnalytics',
      'getNoteCreationTrends'
    ]);
    analyticsServiceSpy.getAnalyticsData.and.returnValue(of(mockAnalyticsData));
    analyticsServiceSpy.getNoteCreationTrends.and.returnValue(of(mockAnalyticsData.notesCreatedOverTime));

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        DashboardComponent
      ],
      providers: [
        { provide: AnalyticsService, useValue: analyticsServiceSpy }
      ]
    }).compileComponents();

    analyticsService = TestBed.inject(AnalyticsService) as unknown as SpyObj<AnalyticsService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load analytics data on init', () => {
    expect(analyticsService.getAnalyticsData).toHaveBeenCalled();
    expect(analyticsService.refreshAnalytics).toHaveBeenCalled();
    expect(component.analyticsData).toEqual(mockAnalyticsData);
  });

  it('should format activity correctly', () => {
    const activity: UserActivity = {
      userId: 'user1',
      action: 'create',
      timestamp: new Date(),
      noteId: 'note1'
    };

    expect(component.formatActivity(activity)).toBe('User user1 created a new note');
  });

  it('should return correct activity icon', () => {
    const activity: UserActivity = {
      userId: 'user1',
      action: 'create',
      timestamp: new Date(),
      noteId: 'note1'
    };

    expect(component.getActivityIcon(activity)).toBe('add_circle');
  });

  it('should calculate tag size correctly', () => {
    const size = component.getTagSize(15);
    const maxCount = Math.max(...mockAnalyticsData.topTags.map(tag => tag.count));
    const expected = 14 + (15 / maxCount) * (32 - 14);
    expect(size).toBe(expected);
  });

  it('should update chart data when timeframe changes', () => {
    const mockTrends = [
      { date: new Date(), count: 5 },
      { date: new Date(), count: 8 }
    ];
    analyticsService.getNoteCreationTrends.and.returnValue(of(mockTrends));

    component.selectedTimeframe = 'day';
    component.onTimeframeChange();

    expect(analyticsService.getNoteCreationTrends).toHaveBeenCalledWith('day');
    expect(component.chartData.datasets[0].data).toEqual(mockTrends.map(trend => trend.count));
  });

  it('should format date based on timeframe', () => {
    const date = new Date('2024-01-01T12:00:00Z');

    component.selectedTimeframe = 'day';
    expect(component['formatDate'](date)).toMatch(/\d{1,2}:\d{2}/);

    component.selectedTimeframe = 'week';
    expect(component['formatDate'](date)).toMatch(/[A-Za-z]{3}/);

    component.selectedTimeframe = 'month';
    expect(component['formatDate'](date)).toMatch(/[A-Za-z]{3} \d{1,2}/);
  });
}); 