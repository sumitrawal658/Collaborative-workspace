#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
S3_BUCKET_NAME="workspace-frontend"
CLOUDFRONT_DISTRIBUTION_ID=${CLOUDFRONT_DISTRIBUTION_ID}

echo -e "${GREEN}Starting frontend deployment process...${NC}"

# Check AWS CLI installation
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install it first.${NC}"
    exit 1
fi

# Navigate to frontend directory
cd ../frontend

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the application
echo "Building Angular application..."
npm run build -- --configuration production

# Create S3 bucket if it doesn't exist
aws s3api head-bucket --bucket ${S3_BUCKET_NAME} 2>/dev/null || \
    aws s3api create-bucket --bucket ${S3_BUCKET_NAME} --region ${AWS_REGION}

# Configure bucket for static website hosting
aws s3 website s3://${S3_BUCKET_NAME} --index-document index.html --error-document index.html

# Set bucket policy for public access
echo "Configuring bucket policy..."
cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${S3_BUCKET_NAME}/*"
        }
    ]
}
EOF
aws s3api put-bucket-policy --bucket ${S3_BUCKET_NAME} --policy file:///tmp/bucket-policy.json

# Sync built files to S3
echo "Uploading files to S3..."
aws s3 sync dist/frontend s3://${S3_BUCKET_NAME} --delete

# Invalidate CloudFront cache
if [ ! -z "${CLOUDFRONT_DISTRIBUTION_ID}" ]; then
    echo "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
        --paths "/*"
fi

echo -e "${GREEN}Frontend deployment completed successfully!${NC}"
echo "Your application is now available at:"
echo "S3: http://${S3_BUCKET_NAME}.s3-website-${AWS_REGION}.amazonaws.com"
if [ ! -z "${CLOUDFRONT_DISTRIBUTION_ID}" ]; then
    CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution --id ${CLOUDFRONT_DISTRIBUTION_ID} --query 'Distribution.DomainName' --output text)
    echo "CloudFront: https://${CLOUDFRONT_DOMAIN}"
fi 