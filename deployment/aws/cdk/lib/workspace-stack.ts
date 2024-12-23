import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as opensearch from 'aws-cdk-lib/aws-opensearch';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as comprehend from 'aws-cdk-lib/aws-comprehend';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cw_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as applicationautoscaling from 'aws-cdk-lib/aws-applicationautoscaling';
import { Construct } from 'constructs';

export interface IWorkspaceStackProps extends cdk.StackProps {
  environment: string;
  alertEmail: string;
}

export class WorkspaceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IWorkspaceStackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'WorkspaceVPC', {
      maxAzs: 2,
      natGateways: 1,
      flowLogs: {
        s3: {
          destination: ec2.FlowLogDestination.toS3()
        }
      }
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'WorkspaceCluster', {
      vpc,
      containerInsights: true,
      enableFargateCapacityProviders: true
    });

    // Redis for real-time collaboration
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      subnetIds: vpc.privateSubnets.map((subnet: ec2.ISubnet) => subnet.subnetId),
      description: 'Subnet group for Redis cluster'
    });

    const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc,
      description: 'Security group for Redis cluster',
      allowAllOutbound: true
    });

    const redis = new elasticache.CfnCacheCluster(this, 'WorkspaceRedis', {
      engine: 'redis',
      cacheNodeType: 'cache.t3.micro',
      numCacheNodes: 1,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
      cacheSubnetGroupName: redisSubnetGroup.ref,
      autoMinorVersionUpgrade: true,
      preferredMaintenanceWindow: 'sun:05:00-sun:06:00'
    });

    // DynamoDB tables
    const sessionTable = new dynamodb.Table(this, 'SessionTable', {
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true
    });

    const analyticsTable = new dynamodb.Table(this, 'AnalyticsTable', {
      partitionKey: { name: 'entityId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      pointInTimeRecovery: true
    });

    // S3 buckets
    const storageBucket = new s3.Bucket(this, 'StorageBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
        allowedOrigins: ['*'],
        allowedHeaders: ['*']
      }],
      lifecycleRules: [{
        transitions: [{
          storageClass: s3.StorageClass.INFREQUENT_ACCESS,
          transitionAfter: cdk.Duration.days(90)
        }]
      }],
      metrics: [{
        id: 'EntireBucket'
      }]
    });

    const analyticsBucket = new s3.Bucket(this, 'AnalyticsBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [{
        transitions: [{
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(180)
        }]
      }]
    });

    // OpenSearch for full-text search
    const searchDomain = new opensearch.Domain(this, 'SearchDomain', {
      version: opensearch.EngineVersion.OPENSEARCH_2_5,
      vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      capacity: {
        dataNodes: 2,
        dataNodeInstanceType: 't3.small.search'
      },
      ebs: {
        volumeSize: 10
      },
      zoneAwareness: {
        enabled: true,
        availabilityZoneCount: 2
      },
      logging: {
        slowSearchLogEnabled: true,
        appLogEnabled: true,
        slowIndexLogEnabled: true
      }
    });

    // CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, 'WorkspaceLogGroup', {
      retention: logs.RetentionDays.TWO_WEEKS
    });

    // SNS Topic for Alerts
    const alertTopic = new sns.Topic(this, 'AlertTopic');
    alertTopic.addSubscription(new subscriptions.EmailSubscription(props.alertEmail));

    // CloudWatch Alarms
    const cpuUtilizationAlarm = new cloudwatch.Alarm(this, 'CpuUtilizationAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          ClusterName: cluster.clusterName,
          ServiceName: 'BackendService'
        },
        period: cdk.Duration.minutes(5),
        statistic: 'Average'
      }),
      threshold: 80,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    const memoryUtilizationAlarm = new cloudwatch.Alarm(this, 'MemoryUtilizationAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'MemoryUtilization',
        dimensionsMap: {
          ClusterName: cluster.clusterName,
          ServiceName: 'BackendService'
        },
        period: cdk.Duration.minutes(5),
        statistic: 'Average'
      }),
      threshold: 80,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    // Add alarm actions
    cpuUtilizationAlarm.addAlarmAction(new cw_actions.SnsAction(alertTopic));
    memoryUtilizationAlarm.addAlarmAction(new cw_actions.SnsAction(alertTopic));

    // CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'WorkspaceDashboard', {
      dashboardName: `${props.environment}-workspace-dashboard`
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'CPU Utilization',
        left: [cpuUtilizationAlarm.metric]
      }),
      new cloudwatch.GraphWidget({
        title: 'Memory Utilization',
        left: [memoryUtilizationAlarm.metric]
      })
    );

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'WorkspaceDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(storageBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
      }
    });

    // IAM role for Comprehend
    const comprehendRole = new iam.Role(this, 'ComprehendRole', {
      assumedBy: new iam.ServicePrincipal('comprehend.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('ComprehendFullAccess')
      ]
    });

    // Fargate Service
    const backendService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'BackendService', {
      cluster,
      memoryLimitMiB: 2048,
      cpu: 1024,
      desiredCount: 2,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset('../backend'),
        environment: {
          REDIS_HOST: redis.attrRedisEndpointAddress,
          REDIS_PORT: redis.attrRedisEndpointPort,
          DYNAMODB_SESSION_TABLE: sessionTable.tableName,
          DYNAMODB_ANALYTICS_TABLE: analyticsTable.tableName,
          S3_STORAGE_BUCKET: storageBucket.bucketName,
          S3_ANALYTICS_BUCKET: analyticsBucket.bucketName,
          OPENSEARCH_DOMAIN: searchDomain.domainEndpoint,
          ENVIRONMENT: props.environment,
          LOG_LEVEL: props.environment === 'production' ? 'INFO' : 'DEBUG'
        },
        logging: ecs.LogDrivers.awsLogs({
          streamPrefix: 'workspace',
          logGroup
        })
      },
      assignPublicIp: false,
      circuitBreaker: { rollback: true }
    });

    // Auto Scaling
    const scaling = backendService.service.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 10
    });

    // CPU-based scaling
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60)
    });

    // Memory-based scaling
    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60)
    });

    // Request count based scaling
    const requestCountMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'RequestCountPerTarget',
      dimensionsMap: {
        TargetGroup: backendService.targetGroup.targetGroupFullName,
        LoadBalancer: backendService.loadBalancer.loadBalancerFullName
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(1)
    });

    scaling.scaleOnMetric('RequestCountScaling', {
      metric: requestCountMetric,
      scalingSteps: [
        { upper: 100, change: -1 },
        { lower: 500, change: +1 },
        { lower: 1000, change: +2 },
        { lower: 2000, change: +3 }
      ],
      adjustmentType: applicationautoscaling.AdjustmentType.CHANGE_IN_CAPACITY,
      cooldown: cdk.Duration.seconds(60)
    });

    // Add CloudWatch alarms for scaling events
    new cloudwatch.Alarm(this, 'HighRequestCount', {
      metric: requestCountMetric,
      threshold: 2000,
      evaluationPeriods: 2,
      alarmDescription: 'High request count detected',
      actionsEnabled: true
    }).addAlarmAction(new cw_actions.SnsAction(alertTopic));

    // Add scaling metrics to dashboard
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Request Count per Target',
        left: [requestCountMetric]
      }),
      new cloudwatch.GraphWidget({
        title: 'Task Count',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ECS',
            metricName: 'RunningTaskCount',
            dimensionsMap: {
              ClusterName: cluster.clusterName,
              ServiceName: backendService.service.serviceName
            },
            statistic: 'Average',
            period: cdk.Duration.minutes(1)
          })
        ]
      })
    );

    // Allow backend to access Redis
    redisSecurityGroup.addIngressRule(
      backendService.service.connections.securityGroups[0],
      ec2.Port.tcp(6379),
      'Allow backend to access Redis'
    );

    // Grant permissions
    sessionTable.grantReadWriteData(backendService.taskDefinition.taskRole);
    analyticsTable.grantReadWriteData(backendService.taskDefinition.taskRole);
    storageBucket.grantReadWrite(backendService.taskDefinition.taskRole);
    analyticsBucket.grantReadWrite(backendService.taskDefinition.taskRole);
    searchDomain.grantReadWrite(backendService.taskDefinition.taskRole);
    logGroup.grantWrite(backendService.taskDefinition.taskRole);

    // Output values
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: backendService.loadBalancer.loadBalancerDnsName
    });

    new cdk.CfnOutput(this, 'CloudFrontDomain', {
      value: distribution.distributionDomainName
    });

    new cdk.CfnOutput(this, 'SearchDomainEndpoint', {
      value: searchDomain.domainEndpoint
    });

    new cdk.CfnOutput(this, 'DashboardURL', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`
    });
  }
} 