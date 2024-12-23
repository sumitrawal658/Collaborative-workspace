import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (this.authService.isAuthenticated()) {
      // Check for required roles
      const requiredRoles = route.data['roles'] as Array<string>;
      if (requiredRoles) {
        const hasRequiredRole = requiredRoles.some(role => 
          this.authService.hasRole(role)
        );
        
        if (!hasRequiredRole) {
          console.error('User does not have required roles');
          this.router.navigate(['/unauthorized']);
          return false;
        }
      }
      return true;
    }

    // Not logged in, redirect to login page
    this.router.navigate(['/login'], { queryParams: { returnUrl: state.url }});
    return false;
  }
} 