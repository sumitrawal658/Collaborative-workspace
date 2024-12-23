import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  constructor(private http: HttpClient) {
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  public get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  public getCurrentUserId(): string {
    return this.currentUser?.id || '';
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<User>('/api/auth/login', { email, password }).pipe(
      tap(user => {
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  refreshToken(): Observable<string> {
    return this.http.post<{ token: string }>('/api/auth/refresh-token', {}).pipe(
      map(response => response.token)
    );
  }

  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  updateUser(user: Partial<User>): Observable<User> {
    return this.http.put<User>(`/api/users/${this.getCurrentUserId()}`, user).pipe(
      tap(updatedUser => {
        const currentUser = this.currentUser;
        if (currentUser) {
          const mergedUser = { ...currentUser, ...updatedUser };
          localStorage.setItem('currentUser', JSON.stringify(mergedUser));
          this.currentUserSubject.next(mergedUser);
        }
      })
    );
  }
} 