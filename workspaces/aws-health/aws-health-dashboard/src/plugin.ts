import {
  createApiFactory,
  createPlugin,
  discoveryApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import { awsHealthApiRef, AwsHealthClient } from './components/api/AwsHealthApi';

export const awsHealthDashboardPlugin = createPlugin({
  id: 'aws-health-dashboard',
  routes: {
    root: rootRouteRef,
  },
  apis: [
    createApiFactory({
      api: awsHealthApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        identityApi: identityApiRef,
      },
      factory: ({ discoveryApi, identityApi }) =>
        new AwsHealthClient({ discoveryApi, identityApi }),
    }),
  ],
});

