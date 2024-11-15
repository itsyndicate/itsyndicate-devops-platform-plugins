import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston'; // Updated import
import { Config } from '@backstage/config'; // Import Config type
import { AWSHealthService } from './awsHealthClient';
import fs from 'fs/promises';
import path from 'path';

export interface RouterOptions {
  logger: Logger; // Updated type
  config: Config; // Updated type
}

async function readExampleFile(logger: Logger) {
  try {
    const exampleFilePath = path.join(__dirname, '../../assets/example.json');
    const exampleData = await fs.readFile(exampleFilePath, 'utf-8');
    return JSON.parse(exampleData);
  } catch (error) {
    logger.error('Error reading example.json file', error);
    return null;
  }
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config } = options;

  const router = Router();
  router.use(express.json());

  const awsHealthService = new AWSHealthService();

  router.get('/health', (_, res) => {
    logger.info('AWS Health plugin is running!');
    res.json({ status: 'ok' });
  });

  // Endpoint to fetch open and recent issues
  router.get('/issues', async (req, res, next) => {
    try {
      const events = await awsHealthService.getOpenAndRecentIssues();
      res.json(events);
    } catch (error) {
      logger.error(`Error fetching open and recent issues: ${error}`);
      const fallbackData = await readExampleFile(logger);
      if (fallbackData) {
        res.json(fallbackData);
      } else {
        next(error); // Pass the error to the next middleware
      }
    }
  });

  // Endpoint to fetch scheduled changes
  router.get('/scheduled-changes', async (req, res, next) => {
    try {
      const events = await awsHealthService.getScheduledChanges();
      res.json(events);
    } catch (error) {
      logger.error(`Error fetching scheduled changes: ${error}`);
      const fallbackData = await readExampleFile(logger);
      if (fallbackData) {
        res.json(fallbackData);
      } else {
        next(error);
      }
    }
  });

  // Endpoint to fetch other notifications
  router.get('/notifications', async (req, res, next) => {
    try {
      const events = await awsHealthService.getNotifications();
      res.json(events);
    } catch (error) {
      logger.error(`Error fetching notifications: ${error}`);
      const fallbackData = await readExampleFile(logger);
      if (fallbackData) {
        res.json(fallbackData);
      } else {
        next(error);
      }
    }
  });

  // Endpoint to fetch event log
  router.get('/event-log', async (req, res, next) => {
    try {
      const events = await awsHealthService.getEventLog();
      res.json(events);
    } catch (error) {
      logger.error(`Error fetching event log: ${error}`);
      const fallbackData = await readExampleFile(logger);
      if (fallbackData) {
        res.json(fallbackData);
      } else {
        next(error);
      }
    }
  });

  return router;
}
