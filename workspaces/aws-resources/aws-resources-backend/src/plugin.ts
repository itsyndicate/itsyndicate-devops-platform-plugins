import {
  coreServices,
  createBackendPlugin,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';
import { AwsResourceService } from './service/AwsResourceService';
import { Logger } from 'winston';
const migrationsDir = resolvePackagePath(
  '@itsyndicate/backstage-plugin-aws-resources-backend',
  'migrations',
)
/**
 * awsResourcesPlugin backend plugin
 *
 * @public
 */
export const awsResourcesPlugin = createBackendPlugin({
  pluginId: 'aws-resources',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        database: coreServices.database,
      },
      async init({ httpRouter, logger, config, database }) {
        // Initialize AwsResourceService with the PluginDatabaseManager
        const awsResourceService = new AwsResourceService(config, logger, database);

        const router = await createRouter({
          logger,
          config,
          awsResourceService,
        });
        httpRouter.use(router);
        httpRouter.addAuthPolicy({
          path: '/count',
          allow: 'unauthenticated',
        });
        const client = await database.getClient();

        if (!database.migrations?.skip) {
          await client.migrate.latest({
            directory: migrationsDir,
          });
        }
      },
    });
  },
});
