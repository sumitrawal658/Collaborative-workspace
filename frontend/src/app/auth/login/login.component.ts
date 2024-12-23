import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Welcome Back</mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <div class="oauth-buttons">
            <button mat-raised-button color="primary" (click)="loginWithGoogle()">
              <mat-icon>google</mat-icon>
              Continue with Google
            </button>
            
            <button mat-raised-button color="accent" (click)="loginWithGithub()">
              <mat-icon>code</mat-icon>
              Continue with GitHub
            </button>
          </div>
          
          <div class="divider">
            <span>OR</span>
          </div>
          
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" required>
              <mat-error *ngIf="loginForm.get('email')?.hasError('required')">
                Email is required
              </mat-error>
              <mat-error *ngIf="loginForm.get('email')?.hasError('email')">
                Please enter a valid email
              </mat-error>
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" type="password" required>
              <mat-error *ngIf="loginForm.get('password')?.hasError('required')">
                Password is required
              </mat-error>
            </mat-form-field>
            
            <button mat-raised-button color="primary" type="submit" 
                    [disabled]="loginForm.invalid" class="full-width">
              Login
            </button>
          </form>
        </mat-card-content>
        
        <mat-card-actions align="end">
          <a mat-button routerLink="/auth/signup">Don't have an account? Sign up</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
    }
    
    mat-card {
      width: 100%;
      max-width: 400px;
      margin: 20px;
    }
    
    .oauth-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 20px 0;
    }
    
    .divider {
      text-align: center;
      margin: 20px 0;
      position: relative;
    }
    
    .divider::before,
    .divider::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 45%;
      height: 1px;
      background: #ddd;
    }
    
    .divider::before { left: 0; }
    .divider::after { right: 0; }
    
    .full-width {
      width: 100%;
      margin-bottom: 15px;
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Check if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  async loginWithGoogle() {
    try {
      await this.authService.loginWithGoogle();
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Google login failed:', error);
    }
  }

  async loginWithGithub() {
    try {
      await this.authService.loginWithGithub();
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('GitHub login failed:', error);
    }
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      try {
        await this.authService.login(
          this.loginForm.get('email')?.value,
          this.loginForm.get('password')?.value
        );
        this.router.navigate(['/dashboard']);
      } catch (error) {
        console.error('Login failed:', error);
      }
    }
  }
} 