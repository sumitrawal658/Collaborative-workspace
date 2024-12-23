import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Skip authentication for OAuth endpoints
    if (this.isOAuthEndpoint(request.url)) {
      return next.handle(request);
    }

    // Add auth header
    request = this.addAuthHeader(request);

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Try to refresh the token
          return this.authService.refreshToken().pipe(
            switchMap(() => {
              // Retry the request with the new token
              request = this.addAuthHeader(request);
              return next.handle(request);
            }),
            catchError(refreshError => {
              // If refresh fails, log out the user
              this.authService.logout();
              return throwError(refreshError);
            })
          );
        }
        return throwError(error);
      })
    );
  }

  private isOAuthEndpoint(url: string): boolean {
    return (
      url.includes('accounts.google.com') ||
      url.includes('github.com') ||
      url.includes('/oauth2/') ||
      url.includes('/login')
    );
  }

  private addAuthHeader(request: HttpRequest<any>): HttpRequest<any> {
    const token = this.authService.getCurrentUser()?.id;
    if (token && request.url.startsWith(environment.apiUrl)) {
      return request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    return request;
  }
} 