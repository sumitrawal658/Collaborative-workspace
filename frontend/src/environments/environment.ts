export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
  wsUrl: 'ws://localhost:8080',
  websocketUrl: 'ws://localhost:8080/ws',
  oauth: {
    issuer: 'http://localhost:8080',
    clientId: 'workspace-client',
    scope: 'openid profile email',
    redirectUri: 'http://localhost:4200/callback',
    googleClientId: 'your-google-client-id',
    githubClientId: 'your-github-client-id'
  },
  aws: {
    region: 'us-east-1',
    cognitoUserPoolId: 'your-user-pool-id',
    cognitoClientId: 'your-client-id',
    s3Bucket: 'your-s3-bucket',
    sesRegion: 'us-east-1',
    comprehendRegion: 'us-east-1'
  },
  features: {
    realTimeCollaboration: true,
    offlineMode: true,
    analytics: true,
    sentimentAnalysis: true
  }
}; 