import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ErrorRetryService } from './error-retry.service';
import { Observable, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

describe('ErrorRetryService', () => {
  let service: ErrorRetryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ErrorRetryService]
    });
    service = TestBed.inject(ErrorRetryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should retry with exponential backoff', fakeAsync(() => {
    let attempts = 0;
    const maxRetries = 3;
    const error = new Error('Test error');

    const source = new Observable(subscriber => {
      attempts++;
      subscriber.error(error);
    });

    source.pipe(
      service.retryWithExponentialBackoff(maxRetries)
    ).subscribe({
      error: (e) => {
        expect(attempts).toBe(maxRetries + 1); // Initial attempt + retries
        expect(e).toBe(error);
      }
    });

    // Initial attempt (0ms)
    tick(0);

    // First retry (1000ms)
    tick(1000);

    // Second retry (2000ms)
    tick(2000);

    // Third retry (4000ms)
    tick(4000);
  }));

  it('should respect maximum retry delay', fakeAsync(() => {
    let attempts = 0;
    const maxRetries = 5;
    const maxDelay = 5000;
    const error = new Error('Test error');

    const source = new Observable(subscriber => {
      attempts++;
      subscriber.error(error);
    });

    source.pipe(
      service.retryWithExponentialBackoff(maxRetries, maxDelay)
    ).subscribe({
      error: () => {
        expect(attempts).toBe(maxRetries + 1);
      }
    });

    // Initial attempt
    tick(0);

    // Retries with capped delay
    for (let i = 1; i <= maxRetries; i++) {
      const delay = Math.min(Math.pow(2, i - 1) * 1000, maxDelay);
      tick(delay);
    }
  }));

  it('should apply jitter to retry delays', fakeAsync(() => {
    const delays: number[] = [];
    const maxRetries = 3;
    const error = new Error('Test error');

    const source = new Observable(subscriber => {
      const currentDelay = service.getCurrentRetryDelay();
      if (currentDelay > 0) {
        delays.push(currentDelay);
      }
      subscriber.error(error);
    });

    source.pipe(
      service.retryWithExponentialBackoff(maxRetries, undefined, true)
    ).subscribe({
      error: () => {
        expect(delays.length).toBe(maxRetries);
        // Check that delays are not exactly exponential due to jitter
        for (let i = 1; i < delays.length; i++) {
          const expectedDelay = Math.pow(2, i) * 1000;
          expect(delays[i]).not.toBe(expectedDelay);
        }
      }
    });

    // Initial attempt
    tick(0);

    // Retries with jitter
    for (let i = 1; i <= maxRetries; i++) {
      const maxDelay = Math.pow(2, i) * 1000;
      tick(maxDelay);
    }
  }));

  it('should retry only on retryable errors', fakeAsync(() => {
    let attempts = 0;
    const maxRetries = 3;
    const nonRetryableError = new HttpErrorResponse({
      error: 'Bad Request',
      status: 400,
      statusText: 'Bad Request'
    });

    const source = new Observable(subscriber => {
      attempts++;
      subscriber.error(nonRetryableError);
    });

    source.pipe(
      service.retryWithExponentialBackoff(maxRetries)
    ).subscribe({
      error: (e) => {
        expect(attempts).toBe(1); // No retries for 400 error
        expect(e).toBe(nonRetryableError);
      }
    });

    tick(5000); // Wait for potential retries
  }));

  it('should track retry attempts', fakeAsync(() => {
    const error = new Error('Test error');
    const retryAttempts: number[] = [];

    const source = new Observable(subscriber => {
      const attempt = service.getCurrentRetryAttempt();
      retryAttempts.push(attempt);
      subscriber.error(error);
    });

    source.pipe(
      service.retryWithExponentialBackoff(2)
    ).subscribe({
      error: () => {
        expect(retryAttempts).toEqual([0, 1, 2]); // Initial attempt (0) + 2 retries
      }
    });

    // Initial attempt
    tick(0);

    // First retry
    tick(1000);

    // Second retry
    tick(2000);
  }));

  it('should handle successful retry', fakeAsync(() => {
    let attempts = 0;
    const successfulAttempt = 2;

    const source = new Observable(subscriber => {
      attempts++;
      if (attempts === successfulAttempt) {
        subscriber.next('Success');
        subscriber.complete();
      } else {
        subscriber.error(new Error('Test error'));
      }
    });

    let result: string | undefined;
    source.pipe(
      service.retryWithExponentialBackoff(3)
    ).subscribe({
      next: (value: string) => result = value,
      complete: () => {
        expect(attempts).toBe(successfulAttempt);
        expect(result).toBe('Success');
      }
    });

    // Initial attempt
    tick(0);

    // First retry (successful)
    tick(1000);
  }));

  it('should reset retry state after completion', fakeAsync(() => {
    let attempts = 0;
    const error = new Error('Test error');

    const source = new Observable(subscriber => {
      attempts++;
      subscriber.error(error);
    });

    // First subscription
    source.pipe(
      service.retryWithExponentialBackoff(2)
    ).subscribe({
      error: () => {
        expect(attempts).toBe(3); // Initial + 2 retries
      }
    });

    // Complete first subscription
    tick(0);
    tick(1000);
    tick(2000);

    attempts = 0;

    // Second subscription
    source.pipe(
      service.retryWithExponentialBackoff(2)
    ).subscribe({
      error: () => {
        expect(attempts).toBe(3); // Should start fresh
      }
    });

    // Complete second subscription
    tick(0);
    tick(1000);
    tick(2000);
  }));
}); 