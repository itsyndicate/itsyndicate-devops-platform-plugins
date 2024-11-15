import { Router } from 'express';
import { Logger } from 'winston';
import { Config } from '@backstage/config';
import fs from 'fs/promises';
import path from 'path';

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
      try {
        // Reading the example.json file
        const exampleFilePath = path.join(__dirname, '../../assets/example.json');
        const exampleData = await fs.readFile(exampleFilePath, 'utf-8');
        const parsedExampleData = JSON.parse(exampleData);

        // Sending the fallback response
        res.json(parsedExampleData);
      } catch (fileError) {
        // Logging and returning a generic error response if example.json fails
        logger.error('Error reading example.json file', fileError);
        res.status(500).json({ error: 'Internal Server Error' });
      }
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
