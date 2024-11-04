# AWS Resources

## Description
The AWS Resources plugin provides an overview of AWS resources across services like EC2, RDS, S3, DynamoDB, and more within Backstage. It displays resource counts, categorized listings, and provides direct links to the AWS Console for each resource, making it easy to monitor and manage AWS resources.

## Functionality
- Displays counts of AWS resources by service.
- Enables filtering by AWS regions.
- Allows users to view details for each resource, with direct links to the AWS Console.
- Customizable AWS regions to focus monitoring on specific geographical areas.

## Installation

### Frontend Setup

1. Install the frontend plugin in your Backstage app:
   ```bash
   yarn --cwd packages/app add @internal/backstage-plugin-aws-resources
   ```

2. Add the `AwsResourcesWidget` to the Backstage catalog `EntityPage`:
   ```typescript
   import { AwsResourcesWidget } from '@internal/backstage-plugin-aws-resources';
   // ...
   const entityPage = (
     <EntityLayout>
       <EntityLayout.Route path="/" title="Overview">
         <Grid container spacing={3}>
           ...
           <Grid item xs={12} md={6}>
             <AwsResourcesWidget />
           </Grid>
         </Grid>
       </EntityLayout.Route>
     </EntityLayout>
   );
   ```

### Backend Setup

1. Install the backend plugin in your Backstage backend:
   ```bash
   yarn --cwd packages/backend add @internal/backstage-plugin-aws-resources-backend
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
   backend.add(import('@internal/backstage-plugin-aws-resources-backend'));
   ```
