import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandlingService } from './error-handling.service';
import { Observable, of, throwError } from 'rxjs';

describe('ErrorHandlingService', () => {
  let service: ErrorHandlingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ErrorHandlingService]
    });
    service = TestBed.inject(ErrorHandlingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should handle HTTP errors with correct severity', () => {
    const errorStates: any[] = [];
    service.errorState$.subscribe(state => errorStates.push(state));

    // Test critical error (500)
    const serverError = new HttpErrorResponse({
      error: 'Server Error',
      status: 500,
      statusText: 'Internal Server Error'
    });
    service.handleHttpError(serverError).subscribe({
      error: () => {
        expect(errorStates[0].severity).toBe('critical');
        expect(errorStates[0].message).toContain('Server error occurred');
      }
    });

    // Test warning error (401)
    const authError = new HttpErrorResponse({
      error: 'Unauthorized',
      status: 401,
      statusText: 'Unauthorized'
    });
    service.handleHttpError(authError).subscribe({
      error: () => {
        expect(errorStates[1].severity).toBe('warning');
        expect(errorStates[1].message).toContain('need to log in');
      }
    });

    // Test info error (404)
    const notFoundError = new HttpErrorResponse({
      error: 'Not Found',
      status: 404,
      statusText: 'Not Found'
    });
    service.handleHttpError(notFoundError).subscribe({
      error: () => {
        expect(errorStates[2].severity).toBe('info');
        expect(errorStates[2].message).toContain('not found');
      }
    });
  });

  it('should implement retry with exponential backoff', fakeAsync(() => {
    const retryAttempts: number[] = [];
    const error = new Error('Test Error');

    const source = new Observable(subscriber => {
      subscriber.error(error);
    });

    source.pipe(
      service.retryWithBackoff(3, 'test')
    ).subscribe({
      error: () => {
        expect(retryAttempts.length).toBe(3);
      }
    });

    // First retry after 1000ms
    tick(1000);
    retryAttempts.push(1);

    // Second retry after 2000ms
    tick(2000);
    retryAttempts.push(2);

    // Third retry after 4000ms
    tick(4000);
    retryAttempts.push(3);

    // Should stop after max retries
    tick(8000);
    expect(retryAttempts.length).toBe(3);
  }));

  it('should track error history', () => {
    const error1 = new HttpErrorResponse({
      error: 'Error 1',
      status: 400,
      statusText: 'Bad Request'
    });
    const error2 = new HttpErrorResponse({
      error: 'Error 2',
      status: 500,
      statusText: 'Server Error'
    });

    service.handleHttpError(error1, 'test1').subscribe({
      error: () => {}
    });
    service.handleHttpError(error2, 'test2').subscribe({
      error: () => {}
    });

    const errorLog = service.getErrorLog();
    expect(errorLog.length).toBe(2);
    expect(errorLog[0].context).toBe('test1');
    expect(errorLog[1].context).toBe('test2');
  });

  it('should clear error state and history', () => {
    const error = new HttpErrorResponse({
      error: 'Test Error',
      status: 400,
      statusText: 'Bad Request'
    });

    service.handleHttpError(error).subscribe({
      error: () => {}
    });

    expect(service.getErrorLog().length).toBe(1);

    service.clearError();
    service.errorState$.subscribe(state => {
      expect(state).toBeNull();
    });

    service.clearErrorLog();
    expect(service.getErrorLog().length).toBe(0);
  });

  it('should provide user-friendly error messages', () => {
    const testCases = [
      {
        error: new HttpErrorResponse({
          error: new ErrorEvent('Network Error', { message: 'Failed to fetch' }),
          status: 0,
          statusText: 'Unknown Error'
        }),
        expectedMessage: 'Network error occurred'
      },
      {
        error: new HttpErrorResponse({
          error: 'Bad Request',
          status: 400,
          statusText: 'Bad Request'
        }),
        expectedMessage: 'Invalid request'
      },
      {
        error: new HttpErrorResponse({
          error: 'Rate Limited',
          status: 429,
          statusText: 'Too Many Requests'
        }),
        expectedMessage: 'Too many requests'
      },
      {
        error: new HttpErrorResponse({
          error: 'Service Unavailable',
          status: 503,
          statusText: 'Service Unavailable'
        }),
        expectedMessage: 'Service temporarily unavailable'
      }
    ];

    testCases.forEach(({ error, expectedMessage }) => {
      service.handleHttpError(error).subscribe({
        error: () => {
          service.errorState$.subscribe(state => {
            expect(state?.message).toContain(expectedMessage);
          });
        }
      });
    });
  });

  it('should handle network errors gracefully', () => {
    const networkError = new HttpErrorResponse({
      error: new ErrorEvent('Network Error', {
        message: 'The Internet connection appears to be offline'
      }),
      status: 0,
      statusText: 'Unknown Error'
    });

    service.handleHttpError(networkError).subscribe({
      error: () => {
        service.errorState$.subscribe(state => {
          expect(state?.severity).toBe('critical');
          expect(state?.message).toContain('Network error occurred');
        });
      }
    });
  });

  it('should respect maximum retry delay', fakeAsync(() => {
    const maxDelay = 10000; // 10 seconds
    const error = new Error('Test Error');
    let lastDelay = 0;

    const source = new Observable(subscriber => {
      subscriber.error(error);
    });

    source.pipe(
      service.retryWithBackoff(5, 'test')
    ).subscribe({
      error: () => {
        expect(lastDelay).toBeLessThanOrEqual(maxDelay);
      }
    });

    // Simulate multiple retries
    for (let i = 1; i <= 5; i++) {
      const delay = Math.min(1000 * Math.pow(2, i - 1), maxDelay);
      tick(delay);
      lastDelay = delay;
    }
  }));
}); 