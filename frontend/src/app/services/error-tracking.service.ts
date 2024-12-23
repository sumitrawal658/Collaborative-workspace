import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export interface TrackedError {
  id: string;
  error: Error | HttpErrorResponse;
  context: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolutionDetails?: string;
}

export interface ErrorGroup {
  count: number;
  lastOccurrence: Date;
  contexts: string[];
}

export interface ErrorReport {
  totalErrors: number;
  errorsByType: Record<string, number>;
  timeRange: {
    start: Date;
    end: Date;
  };
  errorGroups: Record<string, ErrorGroup>;
  severityDistribution: Record<string, number>;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorTrackingService {
  private readonly maxErrors = 100;
  private trackedErrors: TrackedError[] = [];
  private errorGroups: Record<string, ErrorGroup> = {};

  constructor() {}

  trackError(error: Error | HttpErrorResponse, context: string, metadata?: Record<string, any>): string {
    const errorId = this.generateErrorId();
    const trackedError: TrackedError = {
      id: errorId,
      error,
      context,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        ...(error instanceof HttpErrorResponse && { statusCode: error.status })
      }
    };

    this.trackedErrors.push(trackedError);
    this.updateErrorGroups(trackedError);
    this.enforceErrorLimit();

    return errorId;
  }

  getTrackedErrors(): TrackedError[] {
    return [...this.trackedErrors];
  }

  getErrorGroups(): Record<string, ErrorGroup> {
    return { ...this.errorGroups };
  }

  getErrorFrequency(timeWindow: number): number {
    const now = Date.now();
    return this.trackedErrors.filter(error => 
      now - error.timestamp.getTime() <= timeWindow
    ).length;
  }

  clearErrorHistory(): void {
    this.trackedErrors = [];
    this.errorGroups = {};
  }

  getErrorsBySeverity(): Record<string, TrackedError[]> {
    return this.trackedErrors.reduce((acc, error) => {
      const severity = error.metadata?.severity || 'unknown';
      if (!acc[severity]) {
        acc[severity] = [];
      }
      acc[severity].push(error);
      return acc;
    }, {} as Record<string, TrackedError[]>);
  }

  markErrorAsResolved(errorId: string, resolutionDetails: string): void {
    const error = this.trackedErrors.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      error.resolutionDetails = resolutionDetails;
    }
  }

  generateErrorReport(): ErrorReport {
    const now = new Date();
    const errorsByType: Record<string, number> = {};
    const severityDistribution: Record<string, number> = {};

    this.trackedErrors.forEach(error => {
      const errorType = error.error.constructor.name;
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;

      const severity = error.metadata?.severity || 'unknown';
      severityDistribution[severity] = (severityDistribution[severity] || 0) + 1;
    });

    return {
      totalErrors: this.trackedErrors.length,
      errorsByType,
      timeRange: {
        start: this.trackedErrors[0]?.timestamp || now,
        end: now
      },
      errorGroups: this.errorGroups,
      severityDistribution
    };
  }

  updateErrorMetadata(errorId: string, metadata: Record<string, any>): void {
    const error = this.trackedErrors.find(e => e.id === errorId);
    if (error) {
      error.metadata = {
        ...error.metadata,
        ...metadata
      };
    }
  }

  private generateErrorId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateErrorGroups(trackedError: TrackedError): void {
    const errorMessage = trackedError.error.message;
    if (!this.errorGroups[errorMessage]) {
      this.errorGroups[errorMessage] = {
        count: 0,
        lastOccurrence: trackedError.timestamp,
        contexts: []
      };
    }

    const group = this.errorGroups[errorMessage];
    group.count++;
    group.lastOccurrence = trackedError.timestamp;
    if (!group.contexts.includes(trackedError.context)) {
      group.contexts.push(trackedError.context);
    }
  }

  private enforceErrorLimit(): void {
    if (this.trackedErrors.length > this.maxErrors) {
      this.trackedErrors = this.trackedErrors.slice(-this.maxErrors);
    }
  }
} 