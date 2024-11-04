import {
  createPlugin,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const s3TfstateResourcesPlugin = createPlugin({
  id: 's3-tfstate-resources',
  routes: {
    root: rootRouteRef,
  },
});
