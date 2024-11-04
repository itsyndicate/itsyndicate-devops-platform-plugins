# AWS Metric Dashboards

## Description
The AWS Metric Dashboards plugin provides real-time metrics visualization for AWS resources. It displays charts and metrics across multiple AWS services, offering insights into the health and usage of AWS resources in specified regions.

## Functionality
- Displays dynamic metrics charts for AWS resources (EC2, DynamoDB, EBS, RDS, API Gateway, etc.).
- Allows filtering by AWS region to display metrics per region.
- Links to AWS Console for each resource for in-depth management.

## Installation
From your Backstage directory:

1. Add the plugin:
   ```bash
   yarn --cwd packages/app add @internal/backstage-plugin-aws-metricdashboards
   ```

2. Add the AWS Metric Dashboards component to `packages/app/src/components/catalog/EntityPage.tsx`:

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