import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideRouterStore } from '@ngrx/router-store';

import { OAuthModule } from 'angular-oauth2-oidc';
import { MonacoEditorModule } from 'ngx-monaco-editor';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    // Angular Core Providers
    provideRouter(routes, withEnabledBlockingInitialNavigation()),
    provideClientHydration(),
    provideAnimations(),
    provideHttpClient(withFetch()),
    
    // Material Providers
    importProvidersFrom(MatSnackBarModule),
    
    // NgRx Providers
    provideStore(),
    provideEffects(),
    provideRouterStore(),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: environment.production,
      autoPause: true
    }),
    
    // Third-party Providers
    importProvidersFrom(
      OAuthModule.forRoot({
        resourceServer: {
          allowedUrls: [environment.apiUrl],
          sendAccessToken: true
        }
      }),
      MonacoEditorModule.forRoot()
    )
  ]
};
