import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';

/**
 * awsHealthPlugin backend plugin
 *
 * @public
 */
export const awsHealthPlugin = createBackendPlugin({
  pluginId: 'aws-health',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({
        httpRouter,
        logger,
        config,
      }) {
        httpRouter.use(
          await createRouter({
            logger,
            config,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/issues',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/notifications',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/event-log',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/scheduled-changes',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
