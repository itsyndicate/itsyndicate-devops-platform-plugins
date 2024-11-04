Here’s a combined README for the `s3-tfstate-parser` plugin, covering both frontend and backend setup.

---

# S3 TFState Parser

## Description
The S3 TFState Parser plugin provides insights into AWS resources managed through Terraform. It reads and categorizes resources from Terraform state files stored in S3, allowing users to easily view and manage Terraform-managed AWS resources directly within Backstage.

## Functionality
- Fetches and displays AWS resources from Terraform state files in an S3 bucket.
- Categorizes resources by type and allows users to search by name, type, or ID.
- Provides direct links to AWS Console for managing individual resources.
- Customizable AWS region configuration for flexibility.

## Installation

### Frontend Setup

1. Install the frontend plugin in your Backstage app:
   ```bash
   yarn --cwd packages/app add @internal/backstage-plugin-s3-tfstate-parser
   ```

2. Configure `aws.regions` in `app-config.yaml` to specify the AWS regions:
   ```yaml
   aws:
     regions:
       - us-east-1
       - us-west-2
   ```

3. Add the `Resources` component to the Backstage catalog `EntityPage`:
   ```typescript
   import { Resources } from '@internal/backstage-plugin-s3-tfstate-parser';
   // ...
   const entityPage = (
     <EntityLayout>
       <EntityLayout.Route path="/" title="Overview">
         <Grid container spacing={3}>
           ...
           <Grid item xs={12} md={6}>
             <Resources />
           </Grid>
         </Grid>
       </EntityLayout.Route>
     </EntityLayout>
   );
   ```

### Backend Setup

1. Install the backend plugin in your Backstage backend:
   ```bash
   yarn --cwd packages/backend add @internal/backstage-plugin-s3-tfstate-parser-backend
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
   backend.add(import('@internal/backstage-plugin-s3-tfstate-parser-backend'));
   ```

