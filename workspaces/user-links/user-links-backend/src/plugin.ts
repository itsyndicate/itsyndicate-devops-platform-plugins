import {
  coreServices,
  createBackendPlugin,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { catalogServiceRef } from '@backstage/plugin-catalog-node/alpha';
import { DatabaseHandler } from './services/UserLinksDatabase';

const migrationsDir = resolvePackagePath(
  '@itsyndicate/backstage-plugin-user-links-backend',
  'migrations',
);

/**
 * userLinksBackendPlugin backend plugin
 *
 * @public
 */
export const userLinksBackendPlugin = createBackendPlugin({
  pluginId: 'user-links-backend',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        auth: coreServices.auth,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        catalog: catalogServiceRef,
        database: coreServices.database,
      },
      async init({ httpAuth, httpRouter, database }) {
        const databaseHandler = await DatabaseHandler.create({ database });
        const client = await database.getClient();

        if (!database.migrations?.skip) {
          await client.migrate.latest({
            directory: migrationsDir,
          });
        }
        
        httpRouter.use(
          await createRouter({
            httpAuth,
            databaseHandler,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/user-links',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
