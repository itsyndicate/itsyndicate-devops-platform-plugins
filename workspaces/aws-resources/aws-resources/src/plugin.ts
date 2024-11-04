import {
  createPlugin,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const awsAllResourcesPlugin = createPlugin({
  id: 'aws-resources',
  routes: {
    root: rootRouteRef,
  },
});
