import { HttpAuthService } from '@backstage/backend-plugin-api';
import { InputError, NotFoundError } from '@backstage/errors';
import { z } from 'zod';
import express from 'express';
import Router from 'express-promise-router';
import { DatabaseHandler } from './services/UserLinksDatabase';

export async function createRouter({
  databaseHandler,
}: {
  httpAuth: HttpAuthService;
  databaseHandler: DatabaseHandler;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  const userLinkSchema = z.object({
    userId: z.string(),
    name: z.string().min(1),  
    link: z.string().url(),
    description: z.string().optional(),
  });

  // Route to create a new user link
  router.post('/user-links', async (req, res) => {
    const parsed = userLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }

    await databaseHandler.addUserLink(
      parsed.data.userId,
      parsed.data.name,  
      parsed.data.link,
      parsed.data.description,
    );
    res.status(201).json({ message: 'User link created successfully' });
  });

  router.get('/user-links/:userId', async (req, res) => {
    const userLinks = await databaseHandler.getUserLinks(req.params.userId);
    res.json(userLinks);
  });

  router.delete('/user-links/:id', async (req, res) => {
    const { id } = req.params;
    const deletedCount = await databaseHandler.deleteUserLink(Number(id));

    if (deletedCount === 0) {
      throw new NotFoundError(`User link with ID ${id} not found`);
    }

    res.status(200).json({ message: 'User link deleted successfully' });
  });

  return router;
}
