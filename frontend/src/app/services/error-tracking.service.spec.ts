import { TestBed } from '@angular/core/testing';
import { ErrorTrackingService } from './error-tracking.service';
import { HttpErrorResponse } from '@angular/common/http';

describe('ErrorTrackingService', () => {
  let service: ErrorTrackingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ErrorTrackingService]
    });
    service = TestBed.inject(ErrorTrackingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should track error with context', () => {
    const error = new Error('Test error');
    const context = 'test-component';
    const metadata = { userId: '123', action: 'save' };

    service.trackError(error, context, metadata);
    const trackedErrors = service.getTrackedErrors();

    expect(trackedErrors.length).toBe(1);
    expect(trackedErrors[0].error).toBe(error);
    expect(trackedErrors[0].context).toBe(context);
    expect(trackedErrors[0].metadata).toEqual(metadata);
    expect(trackedErrors[0].timestamp).toBeDefined();
  });

  it('should track HTTP errors with status codes', () => {
    const httpError = new HttpErrorResponse({
      error: 'Server Error',
      status: 500,
      statusText: 'Internal Server Error'
    });

    service.trackError(httpError, 'api-call');
    const trackedErrors = service.getTrackedErrors();

    expect(trackedErrors[0].error).toBe(httpError);
    expect(trackedErrors[0].metadata?.statusCode).toBe(500);
  });

  it('should limit error history size', () => {
    const maxErrors = 100;
    for (let i = 0; i < maxErrors + 10; i++) {
      service.trackError(new Error(`Error ${i}`), 'test');
    }

    const trackedErrors = service.getTrackedErrors();
    expect(trackedErrors.length).toBe(maxErrors);
    expect(trackedErrors[maxErrors - 1].error.message).toBe(`Error ${maxErrors + 9}`);
  });

  it('should group similar errors', () => {
    const error = new Error('Duplicate error');
    for (let i = 0; i < 5; i++) {
      service.trackError(error, 'test');
    }

    const errorGroups = service.getErrorGroups();
    expect(Object.keys(errorGroups).length).toBe(1);
    expect(errorGroups[error.message].count).toBe(5);
  });

  it('should calculate error frequency', () => {
    const timeWindow = 1000; // 1 second
    const error = new Error('Frequent error');

    // Track errors within the time window
    for (let i = 0; i < 5; i++) {
      service.trackError(error, 'test');
    }

    const frequency = service.getErrorFrequency(timeWindow);
    expect(frequency).toBe(5);
  });

  it('should clear error history', () => {
    service.trackError(new Error('Test error'), 'test');
    expect(service.getTrackedErrors().length).toBe(1);

    service.clearErrorHistory();
    expect(service.getTrackedErrors().length).toBe(0);
    expect(service.getErrorGroups()).toEqual({});
  });

  it('should track error severity levels', () => {
    const criticalError = new Error('Critical error');
    const warningError = new Error('Warning');
    const infoError = new Error('Info message');

    service.trackError(criticalError, 'test', { severity: 'critical' });
    service.trackError(warningError, 'test', { severity: 'warning' });
    service.trackError(infoError, 'test', { severity: 'info' });

    const errorsBySeverity = service.getErrorsBySeverity();
    expect(errorsBySeverity.critical.length).toBe(1);
    expect(errorsBySeverity.warning.length).toBe(1);
    expect(errorsBySeverity.info.length).toBe(1);
  });

  it('should track error resolution status', () => {
    const error = new Error('Test error');
    const errorId = service.trackError(error, 'test');

    service.markErrorAsResolved(errorId, 'Fixed by retry');
    const trackedError = service.getTrackedErrors().find(e => e.id === errorId);

    expect(trackedError?.resolved).toBe(true);
    expect(trackedError?.resolutionDetails).toBe('Fixed by retry');
  });

  it('should generate error reports', () => {
    const error1 = new Error('Error 1');
    const error2 = new HttpErrorResponse({
      error: 'Error 2',
      status: 404,
      statusText: 'Not Found'
    });

    service.trackError(error1, 'component-1');
    service.trackError(error2, 'api-call');

    const report = service.generateErrorReport();
    expect(report.totalErrors).toBe(2);
    expect(report.errorsByType.Error).toBe(1);
    expect(report.errorsByType.HttpErrorResponse).toBe(1);
    expect(report.timeRange.start).toBeDefined();
    expect(report.timeRange.end).toBeDefined();
  });

  it('should handle error metadata updates', () => {
    const error = new Error('Test error');
    const errorId = service.trackError(error, 'test', { severity: 'warning' });

    service.updateErrorMetadata(errorId, { severity: 'critical', priority: 'high' });
    const trackedError = service.getTrackedErrors().find(e => e.id === errorId);

    expect(trackedError?.metadata?.severity).toBe('critical');
    expect(trackedError?.metadata?.priority).toBe('high');
  });
}); 