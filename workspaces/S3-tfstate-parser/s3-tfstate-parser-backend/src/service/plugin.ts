import { createBackendPlugin, coreServices, resolvePackagePath } from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { TerraformService } from './TerraformService';
import cron from 'node-cron';
import { S3Client } from '@aws-sdk/client-s3';

// Path to the migrations directory
const migrationsDir = resolvePackagePath(
  '@itsyndicate/backstage-plugin-s3-tfstate-parser-backend',
  'migrations',
);

export const s3TfstatePlugin = createBackendPlugin({
  pluginId: 's3-tfstate-backend',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
        config: coreServices.rootConfig,
        database: coreServices.database,
      },
      
      async init({ logger, httpRouter, config, database }) {
        // AWS Configuration
        const awsRegion = config.getOptionalString('aws.region') || 'us-east-1';
        const bucketName = config.getString('aws.s3.bucketName');
        const s3Client = new S3Client({ region: awsRegion });

        // Initialize the Terraform Service
        const terraformService = new TerraformService(s3Client, bucketName, awsRegion, logger, database);
        await terraformService.initializeDatabase(database); // This ensures the database is ready

        // Apply database migrations if not skipped
        const client = await database.getClient();
        if (!database.migrations?.skip) {
          await client.migrate.latest({
            directory: migrationsDir,
          });
        }

        // Create and register the router
        const router = await createRouter({ logger, config, terraformService });
        httpRouter.use(router);
        httpRouter.addAuthPolicy({
          path: '/tfstate',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/tfstate/update',
          allow: 'unauthenticated',
        });
        // Set up a cron job to fetch and store Terraform resources every 10 minutes
        cron.schedule('*/10 * * * *', async () => {
          logger.info('Cron Job: Fetching and storing Terraform resources from S3.');
          try {
            // Ensure database is initialized before fetching resources
            if (!terraformService.isDatabaseInitialized()) {
              logger.error('Cron Job: Database is not initialized. Skipping this run.');
              return;
            }

            await terraformService.updateResources();
            logger.info('Cron Job: Successfully updated Terraform resources.');
          } catch (error) {
            logger.error('Cron Job: Error updating Terraform resources from S3.', error);
          }
        });

        logger.info('Terraform Plugin initialized successfully with cron job.');
      },
    });
  },
});

export default s3TfstatePlugin;