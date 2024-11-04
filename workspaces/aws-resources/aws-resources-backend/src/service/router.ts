import { Router } from 'express';
import { Config } from '@backstage/config';
import { Logger } from 'winston';
import { AwsResourceService } from './AwsResourceService';

interface RouterOptions {
  logger: Logger;
  config: Config;
  awsResourceService: AwsResourceService;
}

export async function createRouter({
  logger,
  config,
  awsResourceService,
}: RouterOptions): Promise<Router> {
  const router = Router();

  router.get('/count', async (req, res) => {
    try {
      logger.info('Fetching AWS resource counts...');
      const resourceCounts = await awsResourceService.getResourceCounts();

      // Log the final resource counts before sending
      logger.info(
        'Resource counts successfully fetched:',
        JSON.stringify(resourceCounts, null, 2),
      );

      res.json(resourceCounts);
    } catch (error: any) {
      logger.error('Error fetching AWS resource counts', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}