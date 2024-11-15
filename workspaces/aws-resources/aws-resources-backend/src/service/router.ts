import { Router } from 'express';
import { Config } from '@backstage/config';
import { Logger } from 'winston';
import { AwsResourceService } from './AwsResourceService';
import fs from 'fs/promises';
import path from 'path';

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
      logger.info('Error fetching AWS resource counts', error);

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

  return router;
}