#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WorkspaceStack } from '../lib/workspace-stack';

const app = new cdk.App();

// Development stack
new WorkspaceStack(app, 'WorkspaceDevStack', {
  environment: 'development',
  alertEmail: process.env.ALERT_EMAIL || 'admin@workspace.com',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2'
  },
  tags: {
    Environment: 'development',
    Project: 'Collaborative Workspace'
  }
});

// Production stack
new WorkspaceStack(app, 'WorkspaceProdStack', {
  environment: 'production',
  alertEmail: process.env.ALERT_EMAIL || 'admin@workspace.com',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2'
  },
  tags: {
    Environment: 'production',
    Project: 'Collaborative Workspace'
  }
}); 