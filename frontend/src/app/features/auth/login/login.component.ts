import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="login-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Welcome to Collaborative Workspace</mat-card-title>
          <mat-card-subtitle>Please sign in to continue</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="login-buttons">
            <button mat-raised-button color="primary" (click)="loginWithGoogle()">
              <img src="assets/icons/google-logo.svg" alt="Google Logo" class="provider-logo">
              Sign in with Google
            </button>
            
            <button mat-raised-button color="accent" (click)="loginWithGithub()">
              <img src="assets/icons/github-logo.svg" alt="GitHub Logo" class="provider-logo">
              Sign in with GitHub
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f5f5f5;
      padding: 20px;
    }

    mat-card {
      max-width: 400px;
      width: 100%;
    }

    mat-card-header {
      text-align: center;
      margin-bottom: 20px;
    }

    .login-buttons {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 20px;
    }

    button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 48px;
      font-size: 16px;
    }

    .provider-logo {
      width: 24px;
      height: 24px;
    }
  `]
})
export class LoginComponent {
  constructor(private authService: AuthService) {}

  loginWithGoogle(): void {
    this.authService.loginWithGoogle();
  }

  loginWithGithub(): void {
    this.authService.loginWithGithub();
  }
}
