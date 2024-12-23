import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { retryWhen, delay, tap, mergeMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ErrorRetryService {
  private currentRetryAttempt = 0;
  private currentRetryDelay = 0;

  constructor() {}

  retryWithExponentialBackoff<T>(
    maxRetries: number,
    maxDelay: number = 10000,
    useJitter: boolean = false
  ) {
    return (source: Observable<T>) =>
      source.pipe(
        retryWhen(errors =>
          errors.pipe(
            mergeMap((error, index) => {
              this.currentRetryAttempt = index + 1;

              if (this.currentRetryAttempt > maxRetries) {
                return throwError(() => error);
              }

              if (error instanceof HttpErrorResponse) {
                // Don't retry for client errors (4xx)
                if (error.status >= 400 && error.status < 500) {
                  return throwError(() => error);
                }
              }

              this.currentRetryDelay = this.calculateDelay(
                this.currentRetryAttempt,
                maxDelay,
                useJitter
              );

              console.log(
                `Retry attempt ${this.currentRetryAttempt} after ${this.currentRetryDelay}ms`
              );

              return this.delayRetry(this.currentRetryDelay);
            })
          )
        )
      );
  }

  getCurrentRetryAttempt(): number {
    return this.currentRetryAttempt;
  }

  getCurrentRetryDelay(): number {
    return this.currentRetryDelay;
  }

  private calculateDelay(
    retryAttempt: number,
    maxDelay: number,
    useJitter: boolean
  ): number {
    // Calculate exponential backoff
    let delay = Math.min(1000 * Math.pow(2, retryAttempt - 1), maxDelay);

    if (useJitter) {
      // Add random jitter between 0-100% of the delay
      const jitter = Math.random() * delay;
      delay = Math.min(delay + jitter, maxDelay);
    }

    return delay;
  }

  private delayRetry(delayMs: number): Observable<number> {
    return new Observable<number>(subscriber => {
      const timeout = setTimeout(() => {
        subscriber.next(delayMs);
        subscriber.complete();
      }, delayMs);

      return () => {
        clearTimeout(timeout);
      };
    });
  }

  resetRetryState(): void {
    this.currentRetryAttempt = 0;
    this.currentRetryDelay = 0;
  }

  isRetryableError(error: any): boolean {
    if (error instanceof HttpErrorResponse) {
      // Don't retry client errors (4xx) except for specific cases
      if (error.status >= 400 && error.status < 500) {
        // Retry on rate limiting (429) or temporary authentication issues (401)
        return error.status === 429 || error.status === 401;
      }
      // Retry all server errors (5xx)
      return error.status >= 500;
    }
    // Retry network errors and timeouts
    return error instanceof Error && (
      error.name === 'TimeoutError' ||
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('timeout')
    );
  }
} 