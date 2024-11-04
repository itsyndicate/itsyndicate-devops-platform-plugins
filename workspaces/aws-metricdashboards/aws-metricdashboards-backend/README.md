# AWS Metric Dashboards Backend

## Description
The AWS Metric Dashboards backend plugin retrieves and stores metric data for various AWS resources. It gathers metrics across AWS regions, allowing users to monitor and analyze AWS CloudWatch metrics for multiple services, including EC2, DynamoDB, EBS, RDS, and SQS.

## Installation

1. Install the backend plugin:
   ```bash
   yarn --cwd packages/backend add @internal/backstage-plugin-aws-metricdashboards-backend
   ```

2. Add AWS configuration to your environment or `app-config.yaml`:
   ```yaml
   aws:
     regions:
       - us-east-1
       - us-west-2
   ```

3. Set AWS access credentials as environment variables:
   ```bash
   export AWS_ACCESS_KEY_ID=your-access-key-id
   export AWS_SECRET_ACCESS_KEY=your-secret-access-key
   ```

4. Register the plugin in `packages/backend/src/index.ts`:
   ```typescript
   const backend = createBackend();
   // ...
   backend.add(import('@internal/backstage-plugin-aws-metricdashboards-backend'));
   ```