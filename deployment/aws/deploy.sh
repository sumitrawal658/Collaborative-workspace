#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Deploying AWS Infrastructure${NC}"
echo "------------------------------------------------"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo -e "${YELLOW}AWS CDK is not installed. Installing...${NC}"
    npm install -g aws-cdk
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS credentials not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Get deployment environment
if [ -z "$1" ]; then
    echo -e "${YELLOW}No environment specified. Using 'development'${NC}"
    ENVIRONMENT="development"
else
    ENVIRONMENT=$1
fi

# Get alert email
if [ -z "$ALERT_EMAIL" ]; then
    echo -e "${YELLOW}No alert email specified. Using default${NC}"
    export ALERT_EMAIL="admin@workspace.com"
fi

# Navigate to CDK directory
cd cdk

# Install dependencies
echo "Installing dependencies..."
npm install

# Bootstrap CDK (if not already done)
echo "Bootstrapping CDK..."
cdk bootstrap

# Deploy infrastructure
echo "Deploying infrastructure for ${ENVIRONMENT} environment..."
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${YELLOW}Production deployment requires approval. Please review the changes.${NC}"
    cdk deploy WorkspaceProdStack --require-approval=broadening
else
    cdk deploy WorkspaceDevStack
fi

# Get outputs
echo "Getting stack outputs..."
if [ "$ENVIRONMENT" = "production" ]; then
    STACK_NAME="WorkspaceProdStack"
else
    STACK_NAME="WorkspaceDevStack"
fi

# Save outputs to environment file
aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output text > ../../../backend/.env.${ENVIRONMENT}

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo "Environment variables have been saved to backend/.env.${ENVIRONMENT}"
echo "You can now run the application with:"
echo "export ENVIRONMENT=${ENVIRONMENT} && ./scripts/start-dev.sh" 