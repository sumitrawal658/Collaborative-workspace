#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Setting up Frontend Project${NC}"
echo "------------------------------------------------"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm first.${NC}"
    exit 1
fi

# Install Angular CLI globally if not installed
if ! command -v ng &> /dev/null; then
    echo "Installing Angular CLI globally..."
    npm install -g @angular/cli
fi

# Create frontend directory if it doesn't exist
if [ ! -d "frontend" ]; then
    echo "Creating new Angular project..."
    ng new frontend \
        --routing=true \
        --style=scss \
        --strict=true \
        --skip-tests=false \
        --skip-git=true \
        --package-manager=npm \
        --directory=frontend
fi

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "Installing dependencies..."
npm install \
    @angular/material \
    @angular/cdk \
    @angular/flex-layout \
    rxjs \
    angular-oauth2-oidc \
    @stomp/stompjs \
    @types/sockjs-client \
    sockjs-client \
    ngx-monaco-editor \
    @ngrx/store \
    @ngrx/effects \
    @ngrx/entity \
    @ngrx/store-devtools \
    @ngrx/router-store \
    @aws-sdk/client-comprehend \
    @aws-sdk/client-s3 \
    chart.js \
    ng2-charts \
    date-fns

# Create core module structure
echo "Creating core module structure..."
ng generate module core
ng generate module shared
ng generate module features/auth --routing
ng generate module features/workspace --routing
ng generate module features/editor --routing
ng generate module features/analytics --routing

# Create core services
echo "Creating core services..."
ng generate service core/services/auth
ng generate service core/services/workspace
ng generate service core/services/editor
ng generate service core/services/analytics
ng generate service core/services/websocket

# Create auth components
echo "Creating auth components..."
ng generate component features/auth/login
ng generate component features/auth/callback
ng generate component features/auth/register

# Create workspace components
echo "Creating workspace components..."
ng generate component features/workspace/list
ng generate component features/workspace/detail
ng generate component features/workspace/create

# Create editor components
echo "Creating editor components..."
ng generate component features/editor/document
ng generate component features/editor/collaboration
ng generate component features/editor/presence

# Create analytics components
echo "Creating analytics components..."
ng generate component features/analytics/dashboard
ng generate component features/analytics/reports

# Create shared components
echo "Creating shared components..."
ng generate component shared/components/loading-spinner
ng generate component shared/components/error-message
ng generate component shared/components/confirm-dialog

# Update angular.json to use Material theme
echo "Updating angular.json for Material theme..."
sed -i '' 's/"styles": \[/&\n              "@angular\/material\/prebuilt-themes\/indigo-pink.css",/' angular.json

# Create environment files
echo "Creating environment files..."
mkdir -p src/environments
cat > src/environments/environment.ts <<EOL
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
  websocketUrl: 'ws://localhost:8080/ws',
  oauth: {
    issuer: 'http://localhost:8080',
    clientId: 'workspace-client',
    scope: 'openid profile email',
    redirectUri: 'http://localhost:4200/callback'
  }
};
EOL

cat > src/environments/environment.prod.ts <<EOL
export const environment = {
  production: true,
  apiUrl: 'https://api.workspace.com',
  websocketUrl: 'wss://api.workspace.com/ws',
  oauth: {
    issuer: 'https://api.workspace.com',
    clientId: 'workspace-client',
    scope: 'openid profile email',
    redirectUri: 'https://workspace.com/callback'
  }
};
EOL

# Update app.module.ts
echo "Updating app.module.ts..."
cat > src/app/app.module.ts <<EOL
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    CoreModule,
    SharedModule,
    StoreModule.forRoot({}),
    EffectsModule.forRoot([]),
    StoreDevtoolsModule.instrument({
      maxAge: 25,
      logOnly: environment.production
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
EOL

echo -e "${GREEN}Frontend setup completed successfully!${NC}"
echo "You can now run 'cd frontend && ng serve' to start the development server." 