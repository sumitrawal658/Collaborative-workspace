import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, timer } from 'rxjs';
import { retryWhen, mergeMap, finalize } from 'rxjs/operators';

export interface ErrorState {
  message: string;
  code?: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  retryCount?: number;
  context?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000;
  private readonly MAX_RETRY_DELAY = 10000;

  private errorState = new BehaviorSubject<ErrorState | null>(null);
  errorState$ = this.errorState.asObservable();

  private errorLog: ErrorState[] = [];

  constructor() {}

  /**
   * Handles HTTP errors with exponential backoff retry
   */
  handleHttpError(error: HttpErrorResponse, context?: string): Observable<never> {
    const errorState: ErrorState = {
      message: this.getErrorMessage(error),
      code: error.status.toString(),
      timestamp: new Date().toISOString(),
      severity: this.getErrorSeverity(error),
      context
    };

    this.logError(errorState);
    this.errorState.next(errorState);

    return throwError(() => error);
  }

  /**
   * Retry strategy with exponential backoff
   */
  retryWithBackoff(maxRetries: number = this.MAX_RETRIES, context?: string) {
    let retries = 0;

    return retryWhen(errors =>
      errors.pipe(
        mergeMap(error => {
          retries++;
          
          if (retries > maxRetries) {
            return throwError(() => error);
          }

          const delay = Math.min(
            this.INITIAL_RETRY_DELAY * Math.pow(2, retries - 1),
            this.MAX_RETRY_DELAY
          );

          this.errorState.next({
            message: `Retrying operation (${retries}/${maxRetries})...`,
            timestamp: new Date().toISOString(),
            severity: 'info',
            retryCount: retries,
            context
          });

          return timer(delay);
        }),
        finalize(() => {
          if (retries > 0) {
            this.errorState.next({
              message: retries > maxRetries 
                ? 'Operation failed after maximum retries'
                : 'Operation recovered after retry',
              timestamp: new Date().toISOString(),
              severity: retries > maxRetries ? 'error' : 'info',
              retryCount: retries,
              context
            });
          }
        })
      )
    );
  }

  /**
   * Gets user-friendly error message based on error type
   */
  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      return 'Network error occurred. Please check your connection.';
    }

    // Server-side error
    switch (error.status) {
      case 0:
        return 'Unable to connect to the server. Please check your internet connection.';
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'You need to log in to access this feature.';
      case 403:
        return 'You don\'t have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'A conflict occurred. Please refresh and try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error occurred. Our team has been notified.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Determines error severity based on error type
   */
  private getErrorSeverity(error: HttpErrorResponse): ErrorState['severity'] {
    if (error.status === 0 || error.status >= 500) {
      return 'critical';
    }
    if (error.status === 401 || error.status === 403) {
      return 'warning';
    }
    if (error.status === 404 || error.status === 409) {
      return 'info';
    }
    return 'error';
  }

  /**
   * Logs error for tracking and analytics
   */
  private logError(error: ErrorState): void {
    this.errorLog.push(error);
    
    // Log to console in development
    if (process.env['NODE_ENV'] === 'development') {
      console.error('Error:', error);
    }

    // Could integrate with error tracking service here
    // e.g., Sentry, LogRocket, etc.
  }

  /**
   * Gets error history for debugging
   */
  getErrorLog(): ErrorState[] {
    return [...this.errorLog];
  }

  /**
   * Clears current error state
   */
  clearError(): void {
    this.errorState.next(null);
  }

  /**
   * Clears error history
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }
} 