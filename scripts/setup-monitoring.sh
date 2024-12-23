#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
APP_NAME="workspace"
ALERT_EMAIL=${ALERT_EMAIL}

echo -e "${GREEN}Setting up monitoring and tracing...${NC}"

# Check AWS CLI installation
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Create CloudWatch Log Group
echo "Creating CloudWatch Log Group..."
aws logs create-log-group --log-group-name "/aws/ecs/${APP_NAME}"

# Set log retention period (14 days)
aws logs put-retention-policy \
    --log-group-name "/aws/ecs/${APP_NAME}" \
    --retention-in-days 14

# Create SNS Topic for alerts
echo "Creating SNS Topic for alerts..."
TOPIC_ARN=$(aws sns create-topic --name "${APP_NAME}-alerts" --output text --query 'TopicArn')

# Subscribe email to SNS topic
if [ ! -z "${ALERT_EMAIL}" ]; then
    echo "Subscribing ${ALERT_EMAIL} to SNS topic..."
    aws sns subscribe \
        --topic-arn ${TOPIC_ARN} \
        --protocol email \
        --notification-endpoint ${ALERT_EMAIL}
fi

# Create CloudWatch Dashboard
echo "Creating CloudWatch Dashboard..."
cat > /tmp/dashboard.json << EOF
{
    "widgets": [
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "AWS/ECS", "CPUUtilization", "ServiceName", "BackendService", "ClusterName", "WorkspaceCluster" ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "${AWS_REGION}",
                "title": "CPU Utilization"
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "AWS/ECS", "MemoryUtilization", "ServiceName", "BackendService", "ClusterName", "WorkspaceCluster" ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "${AWS_REGION}",
                "title": "Memory Utilization"
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "AWS/ApplicationELB", "RequestCount", "LoadBalancer", "app/workspace-lb/1234567890" ]
                ],
                "period": 300,
                "stat": "Sum",
                "region": "${AWS_REGION}",
                "title": "Request Count"
            }
        }
    ]
}
EOF

aws cloudwatch put-dashboard \
    --dashboard-name "${APP_NAME}-dashboard" \
    --dashboard-body file:///tmp/dashboard.json

# Create CloudWatch Alarms
echo "Creating CloudWatch Alarms..."

# CPU Utilization Alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "${APP_NAME}-high-cpu" \
    --alarm-description "CPU utilization exceeds 80%" \
    --metric-name CPUUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions ${TOPIC_ARN} \
    --dimensions Name=ServiceName,Value=BackendService Name=ClusterName,Value=WorkspaceCluster

# Memory Utilization Alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "${APP_NAME}-high-memory" \
    --alarm-description "Memory utilization exceeds 80%" \
    --metric-name MemoryUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions ${TOPIC_ARN} \
    --dimensions Name=ServiceName,Value=BackendService Name=ClusterName,Value=WorkspaceCluster

# Enable X-Ray
echo "Enabling X-Ray..."
aws xray create-sampling-rule --cli-input-json '{
    "SamplingRule": {
        "RuleName": "workspace-default",
        "Priority": 1000,
        "FixedRate": 0.05,
        "ReservoirSize": 1,
        "ServiceName": "*",
        "ServiceType": "*",
        "Host": "*",
        "HTTPMethod": "*",
        "URLPath": "*",
        "Version": 1
    }
}'

# Create X-Ray Group
aws xray create-group \
    --group-name "${APP_NAME}" \
    --filter-expression "service(\"${APP_NAME}\")"

echo -e "${GREEN}Monitoring and tracing setup completed successfully!${NC}"
echo "You can access the following resources:"
echo "1. CloudWatch Dashboard: https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=${APP_NAME}-dashboard"
echo "2. X-Ray Traces: https://${AWS_REGION}.console.aws.amazon.com/xray/home?region=${AWS_REGION}#/traces"
echo "3. CloudWatch Logs: https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#logsV2:log-groups"
echo ""
echo "Note: Please confirm the email subscription to receive monitoring alerts." 