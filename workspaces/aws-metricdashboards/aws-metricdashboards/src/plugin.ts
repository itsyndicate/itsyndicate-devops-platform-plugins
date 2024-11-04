import {
  createApiFactory,
  createPlugin,
  discoveryApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import { automaticDashboardApiRef, AutomaticDashboardClient } from './components/AutoDashboardsApi';

export const automaticDashboardPlugin = createPlugin({
  id: 'automaticdashboard',
  routes: {
    root: rootRouteRef,
  },
  apis: [
  createApiFactory({
    api: automaticDashboardApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      identityApi: identityApiRef,
    },
    factory: ({ discoveryApi, identityApi }) =>
      new AutomaticDashboardClient(discoveryApi, identityApi),
  }),
  ],
});