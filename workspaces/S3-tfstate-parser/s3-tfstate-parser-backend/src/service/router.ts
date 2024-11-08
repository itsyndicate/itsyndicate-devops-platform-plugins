import { Router } from 'express';
import { Logger } from 'winston';
import { Config } from '@backstage/config';
import { S3Client } from '@aws-sdk/client-s3';

import { TerraformService } from './TerraformService';

type RouterOptions = {
  logger: Logger;
  config: Config;
  terraformService: TerraformService;
};

export async function createRouter(
  options: RouterOptions, 
): Promise<Router> {
  const { logger, config, terraformService } = options;

  const router = Router();


  // Endpoint to fetch resources from S3
  router.get('/tfstate', async (req, res) => {
    try {
      const resources = await terraformService.fetchResourcesFromDb();
      res.json(resources);
    } catch (error: any) {
      logger.error('Error fetching resources from S3', error);
      res.status(500).json({ error: 'Failed to fetch resources from S3' });
    }
  });

  // Endpoint to update resources in S3
  router.post('/tfstate/update', async (req, res) => {
    try {
      await terraformService.updateResources();
      res.json({ message: 'Resources updated successfully' });
    } catch (error: any) {
      logger.error('Error updating resources from S3', error);
      res.status(500).json({ error: 'Failed to update resources from S3' });
    }
  });

  return router;
}
