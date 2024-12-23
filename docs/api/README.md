# API Documentation

## Authentication Endpoints

### POST /auth/token
Get JWT token after OAuth2 authentication

### POST /auth/refresh
Refresh expired JWT token

### GET /auth/user
Get current user information

## Workspace Endpoints

### GET /api/workspaces
List all workspaces for current user

### POST /api/workspaces
Create new workspace

### GET /api/workspaces/{id}
Get workspace details

## Notes Endpoints

### GET /api/notes
List all notes in workspace

### POST /api/notes
Create new note

### PUT /api/notes/{id}
Update note content

## Analytics Endpoints

### GET /api/analytics/workspace/{id}
Get workspace analytics

### GET /api/analytics/user/{id}
Get user activity analytics
