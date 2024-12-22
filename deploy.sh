#!/bin/bash

# Configuration
STACK_NAME="workspace-app"
AWS_REGION="us-west-2"
ECR_REPOSITORY="workspace-app"
ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: ./deploy.sh <environment>"
    echo "Environment can be: dev, staging, prod"
    exit 1
fi

# Build and push Docker image
echo "Building and pushing Docker image..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
docker build -t $ECR_REPOSITORY .
docker tag $ECR_REPOSITORY:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

# Deploy frontend to S3
echo "Deploying frontend to S3..."
aws s3 sync ./frontend/dist s3://$STACK_NAME-frontend-$AWS_ACCOUNT_ID --delete

# Deploy CloudFormation stack
echo "Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file aws/cloudformation.yaml \
    --stack-name $STACK_NAME-$ENVIRONMENT \
    --parameter-overrides \
        Environment=$ENVIRONMENT \
        DomainName=$DOMAIN_NAME \
    --capabilities CAPABILITY_IAM \
    --region $AWS_REGION

# Update ECS service
echo "Updating ECS service..."
aws ecs update-service \
    --cluster $STACK_NAME-cluster \
    --service $STACK_NAME-service \
    --force-new-deployment \
    --region $AWS_REGION

# Invalidate CloudFront cache
echo "Invalidating CloudFront cache..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='$STACK_NAME-$ENVIRONMENT'].Id" --output text)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

echo "Deployment completed successfully!" 