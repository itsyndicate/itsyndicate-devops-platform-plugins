# S3 TFState Parser

## Description
The S3 TFState Parser plugin displays categorized resources managed by Terraform. It retrieves resources from Terraform state files stored in AWS S3 and provides search and filtering functionalities for easy access to resource information.

## Functionality
- Fetches Terraform-managed resources from AWS S3.
- Displays resources categorized by type in a table.
- Allows search by resource name, type, or ID.
- Provides direct links to the AWS Console for individual resources.

## Installation
From your Backstage directory:

```bash
yarn --cwd packages/app add @internal/backstage-plugin-s3-tfstate-parser
```
Example: Add to entity overview


In `packages/app/src/components/catalog/EntityPage.tsx`, update the layout to include the S3 TFState Parser card:

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
