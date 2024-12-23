# API Documentation

## Overview
This document provides detailed information about the Collaborative Workspace API endpoints, authentication, and usage.

## Base URL
```
https://api.workspace.com/v1
```

## Authentication
All API requests require authentication using OAuth2.0. Include the access token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Rate Limiting
- Rate limits are applied per user/tenant
- Default: 100 requests per minute
- Exceeded limits return 429 Too Many Requests

## Endpoints

### Authentication
#### OAuth2 Login
```http
POST /auth/login
```
Initiates OAuth2 authentication flow with supported providers (Google, GitHub).

#### Refresh Token
```http
POST /auth/refresh
```
Refreshes an expired access token using a valid refresh token.

### Notes
#### Create Note
```http
POST /notes
Content-Type: application/json

{
  "title": "string",
  "content": "string",
  "tags": ["string"],
  "isPrivate": boolean
}
```

Response:
```json
{
  "id": "string",
  "title": "string",
  "content": "string",
  "tags": ["string"],
  "isPrivate": boolean,
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "userId": "string"
}
```

#### Get Note
```http
GET /notes/{noteId}
```

#### Update Note
```http
PUT /notes/{noteId}
Content-Type: application/json

{
  "title": "string",
  "content": "string",
  "tags": ["string"],
  "isPrivate": boolean
}
```

#### Delete Note
```http
DELETE /notes/{noteId}
```

#### List Notes
```http
GET /notes?page=0&size=20&sort=updatedAt,desc
```

Query Parameters:
- `page`: Page number (0-based)
- `size`: Items per page
- `sort`: Sort field and direction

### Search
#### Search Notes
```http
GET /notes/search?q=query&tags=tag1,tag2&sentiment=positive
```

Query Parameters:
- `q`: Search query
- `tags`: Comma-separated list of tags
- `sentiment`: Filter by sentiment (positive, negative, neutral)

### Sharing
#### Share Note
```http
POST /notes/{noteId}/share
Content-Type: application/json

{
  "email": "string",
  "expiresIn": "duration",
  "permissions": ["READ", "WRITE"]
}
```

#### Get Share Link
```http
GET /notes/{noteId}/share/link
```

Response:
```json
{
  "url": "string",
  "expiresAt": "datetime"
}
```

### Real-time Collaboration
#### WebSocket Connection
```
ws://api.workspace.com/v1/ws/notes/{noteId}
```

Message Types:
1. User Joined:
```json
{
  "type": "USER_JOINED",
  "userId": "string",
  "username": "string"
}
```

2. Content Update:
```json
{
  "type": "CONTENT_UPDATE",
  "userId": "string",
  "content": "string",
  "version": number
}
```

3. Cursor Position:
```json
{
  "type": "CURSOR_POSITION",
  "userId": "string",
  "position": number
}
```

### Analytics
#### Get Note Analytics
```http
GET /notes/{noteId}/analytics
```

Response:
```json
{
  "views": number,
  "uniqueViewers": number,
  "averageReadTime": number,
  "sentiment": {
    "score": number,
    "label": "string"
  }
}
```

#### Get User Analytics
```http
GET /users/analytics
```

Response:
```json
{
  "totalNotes": number,
  "activeCollaborations": number,
  "totalShares": number,
  "storageUsed": number
}
```

## Error Handling

### Error Response Format
```json
{
  "status": number,
  "message": "string",
  "code": "string",
  "timestamp": "datetime",
  "path": "string",
  "errors": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

### Common Error Codes
- `RESOURCE_NOT_FOUND`: Requested resource does not exist
- `UNAUTHORIZED_ACCESS`: User not authorized to access resource
- `VALIDATION_FAILED`: Request validation failed
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `INTERNAL_SERVER_ERROR`: Unexpected server error

## Offline Support
The API supports offline operations with:
- Background sync for pending changes
- Conflict resolution based on timestamps
- Local storage for offline access

## Best Practices
1. Use appropriate HTTP methods
2. Include error handling
3. Implement rate limiting
4. Cache responses when appropriate
5. Use compression for large payloads
6. Validate input data
7. Handle timeouts gracefully
  </rewritten_file> 