// plugins/aws-cloudwatch-backend/src/plugin.ts

import { createBackendPlugin, coreServices, resolvePackagePath } from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { AwsCloudWatchDashboards } from './services/AutoDashboard'

import { Router } from 'express'; // Import Router from express
const migrationsDir = resolvePackagePath(
  '@internal/backstage-plugin-aws-metricdashboards-backend',
  'migrations',
);
/**
 * awsCloudWatchPlugin backend plugin
 *
 * @public
 */ 
export const awsAutodashboardsPlugin = createBackendPlugin({
  pluginId: 'aws-metricdashboards',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        database: coreServices.database,
      },
      async init({ httpRouter, logger, config, database}) {
        const awsCloudWatchDashboards = new AwsCloudWatchDashboards(config, logger, database);
        const router: Router = await createRouter({
          logger,
          config,
          awsCloudWatchDashboards,
          database,
        });

        // Mount the router at /aws-cloudwatch
        httpRouter.use(router);

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
