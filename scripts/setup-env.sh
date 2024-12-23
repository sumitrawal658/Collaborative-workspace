#!/bin/bash

# Create environment files if they don't exist
mkdir -p frontend/src/environments

# Development environment
cat > frontend/src/environments/environment.ts << EOL
export const environment = {
    production: false,
    apiUrl: 'http://localhost:8080/api',
    wsUrl: 'ws://localhost:8080/ws',
    oauth: {
        google: {
            clientId: '${GOOGLE_CLIENT_ID}'
        },
        github: {
            clientId: '${GITHUB_CLIENT_ID}'
        }
    }
};
EOL

# Production environment
cat > frontend/src/environments/environment.prod.ts << EOL
export const environment = {
    production: true,
    apiUrl: '${API_URL}',
    wsUrl: '${WS_URL}',
    oauth: {
        google: {
            clientId: '${GOOGLE_CLIENT_ID}'
        },
        github: {
            clientId: '${GITHUB_CLIENT_ID}'
        }
    }
};
EOL

echo "Environment files created successfully!" 