# AWS Health

## Description
The AWS Health plugin provides monitoring and insights into AWS Health events directly within Backstage. It enables users to track issues, scheduled changes, and notifications across multiple AWS services and regions, with detailed event information and links to the AWS Console.

## Functionality
- Fetches AWS health events in categories like issues, scheduled changes, and notifications.
- Allows filtering by event type and displays detailed event information.
- Links directly to the AWS Health Console for each event.
- Customizable to monitor health events across specific AWS regions.

## Installation

### Frontend Setup

1. Install the frontend plugin in your Backstage app:
   ```bash
   yarn --cwd packages/app add @internal/backstage-plugin-aws-health
   ```


2. Add the `AwsHealthComponent` to the Backstage catalog `EntityPage`:
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

### Backend Setup

1. Install the backend plugin in your Backstage backend:
   ```bash
   yarn --cwd packages/backend add @internal/backstage-plugin-aws-health-backend
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
   backend.add(import('@internal/backstage-plugin-aws-health-backend'));
   ```
