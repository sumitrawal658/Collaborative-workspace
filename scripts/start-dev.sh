#!/bin/bash

# Check if environment variables are set
if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GITHUB_CLIENT_ID" ]; then
    echo "Error: OAuth client IDs are not set!"
    echo "Please set the following environment variables:"
    echo "GOOGLE_CLIENT_ID"
    echo "GITHUB_CLIENT_ID"
    exit 1
fi

# Run the setup script
./scripts/setup-env.sh

# Install dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install
    cd ..
fi

# Start the frontend application
echo "Starting Angular development server..."
cd frontend && ng serve 