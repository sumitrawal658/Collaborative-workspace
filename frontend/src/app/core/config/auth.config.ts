import { AuthConfig } from 'angular-oauth2-oidc';
import { environment } from '../../../environments/environment';

export const authConfig: AuthConfig = {
  issuer: environment.oauth.issuer,
  clientId: environment.oauth.clientId,
  redirectUri: environment.oauth.redirectUri,
  scope: environment.oauth.scope,
  responseType: 'code',
  showDebugInformation: !environment.production,
  strictDiscoveryDocumentValidation: false,
  requireHttps: environment.production,
  sessionChecksEnabled: true,
  clearHashAfterLogin: true,
  silentRefreshTimeout: 5000,
  timeoutFactor: 0.75,
  silentRefreshRedirectUri: `${window.location.origin}/silent-refresh.html`,
  useSilentRefresh: true,
  customQueryParams: {
    prompt: 'consent'
  }
};

export const googleAuthConfig: AuthConfig = {
  issuer: 'https://accounts.google.com',
  strictDiscoveryDocumentValidation: false,
  redirectUri: environment.oauth.redirectUri,
  clientId: environment.oauth.googleClientId,
  scope: 'openid profile email',
  showDebugInformation: !environment.production,
  sessionChecksEnabled: true
};

export const githubAuthConfig: AuthConfig = {
  issuer: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
  userinfoEndpoint: 'https://api.github.com/user',
  strictDiscoveryDocumentValidation: false,
  redirectUri: environment.oauth.redirectUri,
  clientId: environment.oauth.githubClientId,
  scope: 'read:user user:email',
  showDebugInformation: !environment.production,
  sessionChecksEnabled: true,
  customQueryParams: {
    allow_signup: 'true'
  }
}; 