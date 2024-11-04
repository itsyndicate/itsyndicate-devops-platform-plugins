# User Links

## Description
The User Links plugin allows users to add, view, and manage custom links directly within Backstage. Each user can maintain a list of personal links, making it easy to access frequently used resources. The links are stored in the backend and can be edited or removed as needed.

## Functionality
- Enables users to add, delete, and view their custom links.
- Displays each link with an optional description and icon.
- Provides user-specific link management, with backend storage for persistence.

## Installation

### Frontend Setup

1. Install the frontend plugin in your Backstage app:
   ```bash
   yarn --cwd packages/app add @internal/backstage-plugin-user-links
   ```

2. Add the `UserLinksCard` component:
   ```typescript
   import { UserLinksCard } from '@internal/backstage-plugin-user-links';
   // ...
   const userPage = (
     <EntityLayout>
       <EntityLayout.Route path="/" title="Overview">
         <Grid container spacing={3}>
           ...
           <Grid item xs={12} md={6}>
             <UserLinksCard />
           </Grid>
         </Grid>
       </EntityLayout.Route>
     </EntityLayout>
   );
   ```

### Backend Setup

1. Install the backend plugin in your Backstage backend:
   ```bash
   yarn --cwd packages/backend add @internal/backstage-plugin-user-links-backend
   ```


2. Register the backend plugin in `packages/backend/src/index.ts`:
   ```typescript
   const backend = createBackend();
   // ...
   backend.add(import('@internal/backstage-plugin-user-links-backend'));
   ```