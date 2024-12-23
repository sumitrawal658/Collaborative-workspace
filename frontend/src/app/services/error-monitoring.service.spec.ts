import { TestBed } from '@angular/core/testing';
import { ErrorMonitoringService } from './error-monitoring.service';
import { HttpErrorResponse } from '@angular/common/http';

describe('ErrorMonitoringService', () => {
  let service: ErrorMonitoringService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ErrorMonitoringService]
    });
    service = TestBed.inject(ErrorMonitoringService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should monitor error frequency', () => {
    const timeWindow = 1000; // 1 second
    const error = new Error('Test error');

    // Add multiple errors
    for (let i = 0; i < 5; i++) {
      service.monitorError(error, 'test-component');
    }

    const frequency = service.getErrorFrequency(timeWindow);
    expect(frequency).toBe(5);
  });

  it('should aggregate errors by type', () => {
    const error1 = new Error('Error 1');
    const error2 = new HttpErrorResponse({
      error: 'Server Error',
      status: 500,
      statusText: 'Internal Server Error'
    });

    service.monitorError(error1, 'component-1');
    service.monitorError(error2, 'api-call');

    const aggregation = service.getErrorAggregation();
    expect(aggregation.byType['Error']).toBe(1);
    expect(aggregation.byType['HttpErrorResponse']).toBe(1);
  });

  it('should track error trends', () => {
    const error = new Error('Trending error');
    const component = 'test-component';

    // Simulate errors over time
    for (let i = 0; i < 10; i++) {
      service.monitorError(error, component);
    }

    const trends = service.getErrorTrends();
    const componentTrend = trends.find(t => t.component === component);
    
    expect(componentTrend).toBeDefined();
    expect(componentTrend?.errorCount).toBe(10);
    expect(componentTrend?.trend).toBe('increasing');
  });

  it('should identify error patterns', () => {
    const error1 = new Error('Network timeout');
    const error2 = new Error('Network disconnected');
    const error3 = new Error('Database error');

    service.monitorError(error1, 'api-call');
    service.monitorError(error2, 'api-call');
    service.monitorError(error3, 'database');

    const patterns = service.getErrorPatterns();
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].category).toBe('network');
    expect(patterns[0].count).toBe(2);
  });

  it('should generate error reports', () => {
    const timeRange = {
      start: new Date(Date.now() - 3600000), // 1 hour ago
      end: new Date()
    };

    const error1 = new Error('Error 1');
    const error2 = new HttpErrorResponse({
      error: 'Error 2',
      status: 404,
      statusText: 'Not Found'
    });

    service.monitorError(error1, 'component-1');
    service.monitorError(error2, 'api-call');

    const report = service.generateReport(timeRange);
    expect(report.totalErrors).toBe(2);
    expect(report.uniqueErrors).toBe(2);
    expect(report.errorsByComponent['component-1']).toBe(1);
    expect(report.errorsByComponent['api-call']).toBe(1);
  });

  it('should track error resolution time', () => {
    const error = new Error('Test error');
    const errorId = service.monitorError(error, 'test-component');

    // Simulate time passing
    jest.advanceTimersByTime(5000);

    service.markErrorAsResolved(errorId);
    const metrics = service.getErrorMetrics();
    
    expect(metrics.averageResolutionTime).toBeGreaterThanOrEqual(5000);
  });

  it('should detect error spikes', () => {
    const error = new Error('Spike error');
    const threshold = 5;
    const timeWindow = 1000;

    // Create error spike
    for (let i = 0; i < 10; i++) {
      service.monitorError(error, 'test-component');
    }

    const spikes = service.detectErrorSpikes(threshold, timeWindow);
    expect(spikes.length).toBeGreaterThan(0);
    expect(spikes[0].errorCount).toBeGreaterThan(threshold);
  });

  it('should calculate error impact scores', () => {
    const criticalError = new HttpErrorResponse({
      error: 'Server Error',
      status: 500,
      statusText: 'Internal Server Error'
    });

    const minorError = new Error('Minor issue');

    service.monitorError(criticalError, 'api-call', { severity: 'critical' });
    service.monitorError(minorError, 'ui-component', { severity: 'low' });

    const impacts = service.getErrorImpacts();
    expect(impacts[0].score).toBeGreaterThan(impacts[1].score);
  });

  it('should track error recovery success rate', () => {
    const error = new Error('Recoverable error');
    const attempts = 3;

    for (let i = 0; i < attempts; i++) {
      const errorId = service.monitorError(error, 'test-component');
      if (i < 2) {
        service.markErrorAsRecovered(errorId);
      }
    }

    const recoveryRate = service.getErrorRecoveryRate();
    expect(recoveryRate).toBe(2/3); // 2 successful recoveries out of 3 attempts
  });

  it('should maintain error history with size limit', () => {
    const maxHistorySize = 100;
    const error = new Error('Test error');

    // Add more errors than the limit
    for (let i = 0; i < maxHistorySize + 10; i++) {
      service.monitorError(error, 'test-component');
    }

    const history = service.getErrorHistory();
    expect(history.length).toBe(maxHistorySize);
  });
}); 