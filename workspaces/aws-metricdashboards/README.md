# AWS Metric Dashboards

## Description
The AWS Metric Dashboards plugin provides real-time metrics visualization for AWS resources in Backstage. It enables users to view and analyze metrics for AWS services such as EC2, DynamoDB, EBS, RDS, API Gateway, and SQS, across multiple regions. This plugin includes a frontend for displaying metrics and a backend for retrieving data from AWS CloudWatch.

## Functionality
- Displays dynamic metrics charts for AWS resources with filtering by region.
- Includes metrics such as CPU usage, network activity, read/write capacities, and more.
- Links directly to the AWS Console for detailed resource management.
- Customizable regions to display metrics from specific AWS regions.

## Installation

### Frontend Setup

1. Install the frontend plugin in your Backstage app:
   ```bash
   yarn --cwd packages/app add @internal/backstage-plugin-aws-metricdashboards
   ```

2. EXAMPLE: Add the `DashboardsComponent` to the Backstage catalog `EntityPage`:
   ```typescript
   import { DashboardsComponent } from '@internal/backstage-plugin-aws-metricdashboards';
   // ...
   const entityPage = (
     <EntityLayout>
       <EntityLayout.Route path="/" title="Overview">
         <Grid container spacing={3}>
           ...
           <Grid item xs={12} md={6}>
             <DashboardsComponent />
           </Grid>
         </Grid>
       </EntityLayout.Route>
     </EntityLayout>
   );
   ```

### Backend Setup

1. Install the backend plugin in your Backstage backend:
   ```bash
   yarn --cwd packages/backend add @internal/backstage-plugin-aws-metricdashboards-backend
   ```

2. Add AWS region configurations in `app-config.yaml`:
   ```yaml
   aws:
     regions:
       - us-east-1
       - us-west-2
   ```

3. Set AWS credentials as environment variables:
   ```bash
   export AWS_ACCESS_KEY_ID=your-access-key-id
   export AWS_SECRET_ACCESS_KEY=your-secret-access-key
   ```

4. Register the backend plugin in `packages/backend/src/index.ts`:
   ```typescript
   const backend = createBackend();
   // ...
   backend.add(import('@internal/backstage-plugin-aws-metricdashboards-backend'));
   ```

---

With this setup, your AWS Metric Dashboards plugin is ready to display AWS CloudWatch metrics directly in Backstage! Let me know if you'd like further customization.