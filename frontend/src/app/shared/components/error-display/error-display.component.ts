import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ErrorHandlingService, ErrorState } from '../../../services/error-handling.service';

@Component({
  selector: 'app-error-display',
  template: `
    <div *ngIf="currentError" 
         class="error-container"
         [class.info]="currentError.severity === 'info'"
         [class.warning]="currentError.severity === 'warning'"
         [class.error]="currentError.severity === 'error'"
         [class.critical]="currentError.severity === 'critical'">
      
      <div class="error-header">
        <span class="error-icon" [ngSwitch]="currentError.severity">
          <i *ngSwitchCase="'info'" class="fas fa-info-circle"></i>
          <i *ngSwitchCase="'warning'" class="fas fa-exclamation-triangle"></i>
          <i *ngSwitchCase="'error'" class="fas fa-exclamation-circle"></i>
          <i *ngSwitchCase="'critical'" class="fas fa-times-circle"></i>
        </span>
        <span class="error-message">{{ currentError.message }}</span>
        <button class="close-button" (click)="dismissError()">&times;</button>
      </div>

      <div *ngIf="currentError.retryCount" class="error-details">
        <div class="retry-info">
          Attempt {{ currentError.retryCount }} of {{ maxRetries }}
        </div>
        <div class="progress-bar">
          <div class="progress" 
               [style.width.%]="(currentError.retryCount / maxRetries) * 100">
          </div>
        </div>
      </div>

      <div *ngIf="showDetails" class="error-details">
        <div class="timestamp">
          {{ currentError.timestamp | date:'medium' }}
        </div>
        <div *ngIf="currentError.code" class="error-code">
          Error Code: {{ currentError.code }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .error-container {
      margin: 10px;
      padding: 15px;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
    }

    .error-container.info {
      background-color: #e3f2fd;
      border-left: 4px solid #2196f3;
    }

    .error-container.warning {
      background-color: #fff3e0;
      border-left: 4px solid #ff9800;
    }

    .error-container.error {
      background-color: #ffebee;
      border-left: 4px solid #f44336;
    }

    .error-container.critical {
      background-color: #b71c1c;
      border-left: 4px solid #d50000;
      color: white;
    }

    .error-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .error-icon {
      font-size: 1.2em;
    }

    .error-message {
      flex: 1;
      font-weight: 500;
    }

    .close-button {
      background: none;
      border: none;
      font-size: 1.2em;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .close-button:hover {
      opacity: 1;
    }

    .error-details {
      margin-top: 10px;
      font-size: 0.9em;
      opacity: 0.8;
    }

    .retry-info {
      margin-bottom: 5px;
    }

    .progress-bar {
      height: 4px;
      background-color: rgba(0,0,0,0.1);
      border-radius: 2px;
      overflow: hidden;
    }

    .progress {
      height: 100%;
      background-color: currentColor;
      transition: width 0.3s ease;
    }

    .timestamp {
      font-size: 0.8em;
      opacity: 0.7;
    }

    .error-code {
      font-family: monospace;
      margin-top: 5px;
    }
  `]
})
export class ErrorDisplayComponent implements OnInit, OnDestroy {
  currentError: ErrorState | null = null;
  showDetails = false;
  maxRetries = this.errorService.MAX_RETRIES;
  private subscription: Subscription;

  constructor(private errorService: ErrorHandlingService) {}

  ngOnInit() {
    this.subscription = this.errorService.errorState$.subscribe(error => {
      this.currentError = error;
      if (error?.severity === 'critical') {
        this.showDetails = true;
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  dismissError() {
    this.errorService.clearError();
  }

  toggleDetails() {
    this.showDetails = !this.showDetails;
  }
} 