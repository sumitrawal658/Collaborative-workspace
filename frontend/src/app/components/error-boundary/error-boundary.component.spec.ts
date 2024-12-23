import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorBoundaryComponent } from './error-boundary.component';
import { ErrorMonitoringService } from '../../services/error-monitoring.service';
import { ErrorHandler } from '@angular/core';

interface SpyObject<T> {
  [key: string]: jasmine.Spy;
}

describe('ErrorBoundaryComponent', () => {
  let component: ErrorBoundaryComponent;
  let fixture: ComponentFixture<ErrorBoundaryComponent>;
  let errorMonitoringService: SpyObject<ErrorMonitoringService>;
  let errorHandler: SpyObject<ErrorHandler>;

  beforeEach(async () => {
    const monitoringSpy = {
      monitorError: jasmine.createSpy('monitorError').and.returnValue('test-id')
    };
    const handlerSpy = {
      handleError: jasmine.createSpy('handleError')
    };

    await TestBed.configureTestingModule({
      declarations: [ ErrorBoundaryComponent ],
      providers: [
        { provide: ErrorMonitoringService, useValue: monitoringSpy },
        { provide: ErrorHandler, useValue: handlerSpy }
      ]
    }).compileComponents();

    errorMonitoringService = TestBed.inject(ErrorMonitoringService) as unknown as SpyObject<ErrorMonitoringService>;
    errorHandler = TestBed.inject(ErrorHandler) as unknown as SpyObject<ErrorHandler>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ErrorBoundaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle errors and show error UI', () => {
    const error = new Error('Test error');
    component.handleError(error);
    fixture.detectChanges();

    const errorElement = fixture.nativeElement.querySelector('.error-boundary');
    expect(errorElement).toBeTruthy();
    expect(errorElement.textContent).toContain('Something went wrong');
    expect(errorElement.textContent).toContain('Test error');
  });

  it('should monitor errors with correct severity', () => {
    const criticalError = new TypeError('Critical error');
    component.handleError(criticalError);

    expect(errorMonitoringService['monitorError']).toHaveBeenCalledWith(
      criticalError,
      'ErrorBoundary',
      jasmine.objectContaining({
        severity: 'critical',
        retryCount: 0
      })
    );
  });

  it('should forward errors to global error handler', () => {
    const error = new Error('Test error');
    component.handleError(error);

    expect(errorHandler['handleError']).toHaveBeenCalledWith(error);
  });

  it('should allow retrying up to maximum attempts', () => {
    const error = new Error('Test error');
    component.handleError(error);

    // First retry
    component.retry();
    expect(component.hasError).toBeFalsy();
    expect(component.retryCount).toBe(1);

    // Second retry
    component.handleError(error);
    component.retry();
    expect(component.retryCount).toBe(2);

    // Third retry
    component.handleError(error);
    component.retry();
    expect(component.retryCount).toBe(3);

    // Fourth retry (should not reset error state)
    component.handleError(error);
    component.retry();
    expect(component.hasError).toBeTruthy();
    expect(component.message).toContain('Maximum retry attempts reached');
  });

  it('should reset error state', () => {
    const error = new Error('Test error');
    component.handleError(error);

    const reloadSpy = spyOn(window.location, 'reload');
    component.reset();

    expect(component.hasError).toBeFalsy();
    expect(component.error).toBeNull();
    expect(component.errorDetails).toBe('');
    expect(component.retryCount).toBe(0);
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('should show error details when enabled', () => {
    component.showDetails = true;
    const error = new Error('Test error');
    component.handleError(error);
    fixture.detectChanges();

    const detailsElement = fixture.nativeElement.querySelector('.error-details');
    expect(detailsElement).toBeTruthy();
    expect(detailsElement.textContent).toContain(error.message);
    expect(detailsElement.textContent).toContain(error.stack);
  });

  it('should hide error details when disabled', () => {
    component.showDetails = false;
    const error = new Error('Test error');
    component.handleError(error);
    fixture.detectChanges();

    const detailsElement = fixture.nativeElement.querySelector('.error-details');
    expect(detailsElement).toBeFalsy();
  });

  it('should calculate correct error severity', () => {
    const testCases = [
      {
        error: new TypeError('Type error'),
        expectedSeverity: 'critical'
      },
      {
        error: new Error('Network timeout'),
        expectedSeverity: 'high'
      },
      {
        error: new Error('Validation failed'),
        expectedSeverity: 'medium'
      },
      {
        error: new Error('Generic error'),
        expectedSeverity: 'low'
      }
    ];

    testCases.forEach(({ error, expectedSeverity }) => {
      component.handleError(error);
      expect(errorMonitoringService['monitorError']).toHaveBeenCalledWith(
        error,
        'ErrorBoundary',
        jasmine.objectContaining({
          severity: expectedSeverity
        })
      );
    });
  });

  it('should handle window errors', () => {
    const handleErrorSpy = spyOn(component, 'handleError');
    const error = new Error('Window error');
    const event = new ErrorEvent('error', {
      error,
      message: error.message
    });

    window.dispatchEvent(event);
    expect(handleErrorSpy).toHaveBeenCalled();
  });

  it('should handle unhandled rejections', () => {
    const handleErrorSpy = spyOn(component, 'handleError');
    const error = new Error('Promise rejection');
    const event = new PromiseRejectionEvent('unhandledrejection', {
      reason: error,
      promise: Promise.reject(error)
    });

    window.dispatchEvent(event);
    expect(handleErrorSpy).toHaveBeenCalled();
  });

  it('should render custom title and message', () => {
    component.title = 'Custom Error';
    component.message = 'Custom error message';
    const error = new Error('Test error');
    component.handleError(error);
    fixture.detectChanges();

    const titleElement = fixture.nativeElement.querySelector('h2');
    const messageElement = fixture.nativeElement.querySelector('p');

    expect(titleElement.textContent).toContain('Custom Error');
    expect(messageElement.textContent).toContain('Custom error message');
  });
}); 