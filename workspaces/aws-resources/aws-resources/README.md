# AWS Resources

## Description
The AWS Resources plugin provides a visual overview of various AWS resources, displaying their counts and categories. Users can view details for each resource type and navigate to specific AWS Console links for detailed resource management.

## Functionality
- Fetches and categorizes AWS resources (EC2, ECS, S3, RDS, etc.).
- Provides resource counts and details for each AWS service.
- Opens a dialog with specific resource details and links to the AWS Console.
- Customizable to show resources from specific regions as defined in `app-config.yaml`.

## Installation
From your Backstage directory:

1. Add the plugin:
   ```bash
   yarn --cwd packages/app add @internal/backstage-plugin-aws-resources
   ```

2. Example: Add the AWS Resources widget to `packages/app/src/components/catalog/EntityPage.tsx`:

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