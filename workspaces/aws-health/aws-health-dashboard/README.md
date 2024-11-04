# AWS Health

## Description
The AWS Health plugin provides real-time insights into AWS Health events, including ongoing issues, scheduled changes, and notifications. It enables users to monitor and manage AWS health events by displaying detailed information for each event.

## Functionality
- Fetches AWS health events across different categories: issues, scheduled changes, notifications, and event logs.
- Displays events with options to filter by type and view event details.
- Links directly to the AWS Health Console for more information on specific events.
- Allows customization of monitored AWS regions through the configuration file.

## Installation
From your Backstage directory:

1. Add the plugin:
   ```bash
   yarn --cwd packages/app add @internal/backstage-plugin-aws-health
   ```

2. Add the AWS Health component to `packages/app/src/components/catalog/EntityPage.tsx`:

   ```typescript
   import { AwsHealthComponent } from '@internal/backstage-plugin-aws-health';
   // ...
   const entityPage = (
     <EntityLayout>
       <EntityLayout.Route path="/" title="Overview">
         <Grid container spacing={3}>
           ...
           <Grid item xs={12} md={6}>
             <AwsHealthComponent />
           </Grid>
         </Grid>
       </EntityLayout.Route>
     </EntityLayout>
   );
   ```
