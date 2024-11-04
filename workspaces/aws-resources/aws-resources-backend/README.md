# AWS Resources Backend

## Description
The AWS Resources backend plugin fetches AWS resource data across specified regions, including VPCs, ECS Clusters, EC2 Instances, RDS Instances, Lambda functions, and more. It saves resource information to a database and caches data for optimized performance.

## Installation

1. Install the backend plugin:
   ```bash
   yarn --cwd packages/backend add @internal/backstage-plugin-aws-resources-backend
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
   backend.add(import('@internal/backstage-plugin-aws-resources-backend'));
   ```
