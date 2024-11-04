# AWS Health Backend

## Description
The AWS Health backend plugin retrieves AWS Health event data, including open issues, scheduled changes, and notifications. It enhances monitoring by integrating AWS Health API data into the Backstage platform, allowing for efficient AWS event tracking and management.

## Installation

1. Install the backend plugin:
   ```bash
   yarn --cwd packages/backend add @internal/backstage-plugin-aws-health-backend
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
   backend.add(import('@internal/backstage-plugin-aws-health-backend'));
   ```
