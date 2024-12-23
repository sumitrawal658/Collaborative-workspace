import { Component, Input, OnInit, ErrorHandler } from '@angular/core';
import { ErrorMonitoringService } from '../../services/error-monitoring.service';

@Component({
  selector: 'app-error-boundary',
  template: `
    <div *ngIf="hasError" class="error-boundary">
      <div class="error-content">
        <h2>{{ title }}</h2>
        <p>{{ message }}</p>
        <div class="error-actions">
          <button (click)="retry()" class="retry-button">
            Try Again
          </button>
          <button (click)="reset()" class="reset-button">
            Reset
          </button>
        </div>
        <div *ngIf="showDetails" class="error-details">
          <pre>{{ errorDetails }}</pre>
        </div>
      </div>
    </div>
    <ng-content *ngIf="!hasError"></ng-content>
  `,
  styles: [`
    .error-boundary {
      padding: 2rem;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      background-color: #f8d7da;
      color: #721c24;
      margin: 1rem 0;
    }

    .error-content {
      text-align: center;
    }

    .error-actions {
      margin-top: 1rem;
    }

    button {
      margin: 0 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font-weight: 500;
    }

    .retry-button {
      background-color: #007bff;
      color: white;
    }

    .retry-button:hover {
      background-color: #0056b3;
    }

    .reset-button {
      background-color: #6c757d;
      color: white;
    }

    .reset-button:hover {
      background-color: #545b62;
    }

    .error-details {
      margin-top: 1rem;
      text-align: left;
      background-color: #fff;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
    }

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  `]
})
export class ErrorBoundaryComponent implements OnInit {
  @Input() fallbackComponent?: any;
  @Input() title = 'Something went wrong';
  @Input() message = 'We\'re sorry, but an error occurred while processing your request.';
  @Input() showDetails = false;

  hasError = false;
  error: Error | null = null;
  errorDetails = '';
  retryCount = 0;
  private readonly maxRetries = 3;

  constructor(
    private errorMonitoringService: ErrorMonitoringService,
    private errorHandler: ErrorHandler
  ) {}

  ngOnInit(): void {
    window.onerror = (message, source, lineno, colno, error) => {
      this.handleError(error || new Error(message.toString()));
      return true;
    };

    window.onunhandledrejection = (event) => {
      this.handleError(event.reason);
    };
  }

  handleError(error: Error): void {
    this.hasError = true;
    this.error = error;
    this.errorDetails = this.formatError(error);

    // Monitor the error
    this.errorMonitoringService.monitorError(
      error,
      'ErrorBoundary',
      {
        severity: this.calculateErrorSeverity(error),
        retryCount: this.retryCount
      }
    );

    // Forward to global error handler
    this.errorHandler.handleError(error);
  }

  retry(): void {
    if (this.retryCount >= this.maxRetries) {
      this.message = 'Maximum retry attempts reached. Please try again later.';
      return;
    }

    this.retryCount++;
    this.hasError = false;
    this.error = null;
    this.errorDetails = '';
  }

  reset(): void {
    this.hasError = false;
    this.error = null;
    this.errorDetails = '';
    this.retryCount = 0;
    window.location.reload();
  }

  private formatError(error: Error): string {
    return `
Error: ${error.message}
Stack: ${error.stack}
Time: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim();
  }

  private calculateErrorSeverity(error: Error): 'critical' | 'high' | 'medium' | 'low' {
    if (error instanceof TypeError || error instanceof ReferenceError) {
      return 'critical';
    }
    if (error.message.toLowerCase().includes('network') || 
        error.message.toLowerCase().includes('timeout')) {
      return 'high';
    }
    if (error.message.toLowerCase().includes('validation') || 
        error.message.toLowerCase().includes('format')) {
      return 'medium';
    }
    return 'low';
  }
} 