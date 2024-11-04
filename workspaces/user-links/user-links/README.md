# User Links

## Description
Welcome to the User Links plugin!
This extention add to your users editible custom links.
[photo]()

## Functionality
From user profile, add and remove associated links.

## Instalation
From backstage dir:

```
yarn --cwd packages/app add @internal/backstage-plugin-user-links
```
In ```packages/app/src/components/catalog/EntityPage.tsx``` update
```ts
import { UserLinksCard } @internal/backstage-plugin-user-links
...
const userPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        ...
        <Grid item xs={12} md={6}>
          <UserLinksCard/>
        </Grid>

      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);
```
