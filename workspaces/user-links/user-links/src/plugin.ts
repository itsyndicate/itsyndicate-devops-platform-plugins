import {
  createPlugin,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const examplePluginPlugin = createPlugin({
  id: 'user-links',
  routes: {
    root: rootRouteRef,
  },
});
