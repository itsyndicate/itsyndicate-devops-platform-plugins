import { Router } from 'express';
import { Logger } from 'winston';
import { Config } from '@backstage/config';
import { AwsCloudWatchDashboards } from './services/AutoDashboard';
interface RouterOptions {
  logger: Logger;
  config: Config;
  awsCloudWatchDashboards: AwsCloudWatchDashboards;
}

export async function createRouter({
  logger,
  awsCloudWatchDashboards,
}: RouterOptions): Promise<Router> {
  const router = Router();
  router.get('/automatic-dashboards', async (req, res) => {
    try {
      const dashboards = await awsCloudWatchDashboards.getAutomaticDashboards();
      res.json(dashboards);
    } catch (error: any) {
      logger.error('Error fetching automatic dashboards', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
