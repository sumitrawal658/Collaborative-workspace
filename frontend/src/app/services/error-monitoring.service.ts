import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export interface MonitoredError {
  id: string;
  error: Error | HttpErrorResponse;
  component: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: Date;
  recovered?: boolean;
}

export interface ErrorTrend {
  component: string;
  errorCount: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface ErrorPattern {
  category: string;
  count: number;
  examples: string[];
  components: string[];
}

export interface ErrorReport {
  totalErrors: number;
  uniqueErrors: number;
  errorsByComponent: Record<string, number>;
  errorsByType: Record<string, number>;
  patterns: ErrorPattern[];
  trends: ErrorTrend[];
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface ErrorSpike {
  timestamp: Date;
  errorCount: number;
  component: string;
  duration: number;
}

export interface ErrorImpact {
  error: MonitoredError;
  score: number;
  factors: {
    severity: number;
    frequency: number;
    userImpact: number;
  };
}

export interface ErrorMetrics {
  totalErrors: number;
  resolvedErrors: number;
  averageResolutionTime: number;
  recoveryRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorMonitoringService {
  private readonly maxHistorySize = 100;
  private errorHistory: MonitoredError[] = [];
  private errorPatterns: Map<string, ErrorPattern> = new Map();

  constructor() {}

  monitorError(
    error: Error | HttpErrorResponse,
    component: string,
    metadata?: Record<string, any>
  ): string {
    const errorId = this.generateErrorId();
    const monitoredError: MonitoredError = {
      id: errorId,
      error,
      component,
      timestamp: new Date(),
      metadata
    };

    this.errorHistory.push(monitoredError);
    this.updateErrorPatterns(monitoredError);
    this.enforceHistoryLimit();

    return errorId;
  }

  getErrorFrequency(timeWindow: number): number {
    const now = Date.now();
    return this.errorHistory.filter(error =>
      now - error.timestamp.getTime() <= timeWindow
    ).length;
  }

  getErrorAggregation(): { byType: Record<string, number> } {
    return {
      byType: this.errorHistory.reduce((acc, error) => {
        const type = error.error.constructor.name;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  getErrorTrends(): ErrorTrend[] {
    const trends: Map<string, ErrorTrend> = new Map();
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3600000);

    this.errorHistory.forEach(error => {
      if (error.timestamp >= hourAgo) {
        const component = error.component;
        if (!trends.has(component)) {
          trends.set(component, {
            component,
            errorCount: 0,
            trend: 'stable',
            timeRange: { start: hourAgo, end: now }
          });
        }
        const trend = trends.get(component)!;
        trend.errorCount++;
        trend.trend = this.calculateTrend(component, trend.errorCount);
      }
    });

    return Array.from(trends.values());
  }

  getErrorPatterns(): ErrorPattern[] {
    return Array.from(this.errorPatterns.values());
  }

  generateReport(timeRange: { start: Date; end: Date }): ErrorReport {
    const relevantErrors = this.errorHistory.filter(error =>
      error.timestamp >= timeRange.start && error.timestamp <= timeRange.end
    );

    const errorsByComponent: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};
    const uniqueErrors = new Set(relevantErrors.map(e => e.error.message)).size;

    relevantErrors.forEach(error => {
      errorsByComponent[error.component] = (errorsByComponent[error.component] || 0) + 1;
      const type = error.error.constructor.name;
      errorsByType[type] = (errorsByType[type] || 0) + 1;
    });

    return {
      totalErrors: relevantErrors.length,
      uniqueErrors,
      errorsByComponent,
      errorsByType,
      patterns: this.getErrorPatterns(),
      trends: this.getErrorTrends(),
      timeRange
    };
  }

  markErrorAsResolved(errorId: string): void {
    const error = this.errorHistory.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      error.resolvedAt = new Date();
    }
  }

  markErrorAsRecovered(errorId: string): void {
    const error = this.errorHistory.find(e => e.id === errorId);
    if (error) {
      error.recovered = true;
    }
  }

  detectErrorSpikes(threshold: number, timeWindow: number): ErrorSpike[] {
    const spikes: ErrorSpike[] = [];
    const now = Date.now();
    const components = new Set(this.errorHistory.map(e => e.component));

    components.forEach(component => {
      const componentErrors = this.errorHistory.filter(e =>
        e.component === component &&
        now - e.timestamp.getTime() <= timeWindow
      );

      if (componentErrors.length > threshold) {
        spikes.push({
          timestamp: new Date(),
          errorCount: componentErrors.length,
          component,
          duration: timeWindow
        });
      }
    });

    return spikes;
  }

  getErrorImpacts(): ErrorImpact[] {
    return this.errorHistory.map(error => {
      const severity = this.calculateSeverity(error);
      const frequency = this.calculateFrequency(error);
      const userImpact = this.calculateUserImpact(error);

      return {
        error,
        score: (severity + frequency + userImpact) / 3,
        factors: {
          severity,
          frequency,
          userImpact
        }
      };
    }).sort((a, b) => b.score - a.score);
  }

  getErrorMetrics(): ErrorMetrics {
    const resolvedErrors = this.errorHistory.filter(e => e.resolved);
    const recoveredErrors = this.errorHistory.filter(e => e.recovered);

    const totalResolutionTime = resolvedErrors.reduce((total, error) => {
      if (error.resolvedAt) {
        return total + (error.resolvedAt.getTime() - error.timestamp.getTime());
      }
      return total;
    }, 0);

    return {
      totalErrors: this.errorHistory.length,
      resolvedErrors: resolvedErrors.length,
      averageResolutionTime: resolvedErrors.length ? totalResolutionTime / resolvedErrors.length : 0,
      recoveryRate: this.errorHistory.length ? recoveredErrors.length / this.errorHistory.length : 0
    };
  }

  getErrorHistory(): MonitoredError[] {
    return [...this.errorHistory];
  }

  private generateErrorId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateErrorPatterns(error: MonitoredError): void {
    const category = this.categorizeError(error);
    if (!this.errorPatterns.has(category)) {
      this.errorPatterns.set(category, {
        category,
        count: 0,
        examples: [],
        components: []
      });
    }

    const pattern = this.errorPatterns.get(category)!;
    pattern.count++;
    if (!pattern.examples.includes(error.error.message)) {
      pattern.examples.push(error.error.message);
    }
    if (!pattern.components.includes(error.component)) {
      pattern.components.push(error.component);
    }
  }

  private categorizeError(error: MonitoredError): string {
    const message = error.error.message.toLowerCase();
    if (message.includes('network') || message.includes('timeout')) {
      return 'network';
    }
    if (message.includes('database') || message.includes('query')) {
      return 'database';
    }
    if (message.includes('auth') || message.includes('permission')) {
      return 'authentication';
    }
    return 'other';
  }

  private calculateTrend(
    component: string,
    currentCount: number
  ): 'increasing' | 'decreasing' | 'stable' {
    const previousHour = this.errorHistory.filter(e =>
      e.component === component &&
      e.timestamp >= new Date(Date.now() - 7200000) &&
      e.timestamp < new Date(Date.now() - 3600000)
    ).length;

    if (currentCount > previousHour * 1.2) {
      return 'increasing';
    }
    if (currentCount < previousHour * 0.8) {
      return 'decreasing';
    }
    return 'stable';
  }

  private calculateSeverity(error: MonitoredError): number {
    if (error.metadata?.['severity'] === 'critical') return 1;
    if (error.metadata?.['severity'] === 'high') return 0.8;
    if (error.metadata?.['severity'] === 'medium') return 0.6;
    if (error.metadata?.['severity'] === 'low') return 0.4;
    return 0.2;
  }

  private calculateFrequency(error: MonitoredError): number {
    const similar = this.errorHistory.filter(e =>
      e.error.message === error.error.message
    ).length;
    return Math.min(similar / 10, 1);
  }

  private calculateUserImpact(error: MonitoredError): number {
    if (error.error instanceof HttpErrorResponse) {
      if (error.error.status >= 500) return 1;
      if (error.error.status === 429) return 0.8;
      if (error.error.status === 401) return 0.6;
      return 0.4;
    }
    return 0.5;
  }

  private enforceHistoryLimit(): void {
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }
} 