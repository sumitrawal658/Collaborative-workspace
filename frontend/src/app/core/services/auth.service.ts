import { Injectable } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  roles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private oauthService: OAuthService) {
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      this.currentUserSubject.next(JSON.parse(userStr));
    }
  }

  async loginWithGoogle(): Promise<void> {
    try {
      await this.oauthService.initLoginFlow('google');
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    }
  }

  async loginWithGithub(): Promise<void> {
    try {
      await this.oauthService.initLoginFlow('github');
    } catch (error) {
      console.error('GitHub login failed:', error);
      throw error;
    }
  }

  async handleCallback(): Promise<User> {
    try {
      const tokens = await this.oauthService.loadDiscoveryDocumentAndTryLogin();
      if (!tokens) {
        throw new Error('Authentication failed');
      }

      const userClaims = this.oauthService.getIdentityClaims();
      const user: User = {
        id: userClaims['sub'],
        email: userClaims['email'],
        name: userClaims['name'],
        tenantId: userClaims['tenant_id'],
        roles: userClaims['roles'] || ['USER']
      };

      localStorage.setItem('currentUser', JSON.stringify(user));
      this.currentUserSubject.next(user);
      return user;
    } catch (error) {
      console.error('Authentication callback failed:', error);
      throw error;
    }
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.oauthService.logOut();
  }

  isAuthenticated(): boolean {
    return this.oauthService.hasValidAccessToken();
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.roles.includes(role) || false;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  refreshToken(): Observable<boolean> {
    return new Observable(observer => {
      this.oauthService.refreshToken()
        .then(() => {
          observer.next(true);
          observer.complete();
        })
        .catch(error => {
          console.error('Token refresh failed:', error);
          observer.error(error);
        });
    });
  }
}

