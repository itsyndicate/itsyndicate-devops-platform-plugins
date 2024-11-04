import { Knex } from 'knex';
import { DatabaseService } from '@backstage/backend-plugin-api';

type Options = {
  database: DatabaseService;
};

interface UserLink {
  id?: number;
  user_id: string;
  name: string;
  link: string;
  description?: string;
  updated_at?: Date;
  created_at?: Date;
}

export class DatabaseHandler {
  static async create(options: Options): Promise<DatabaseHandler> {
    const { database } = options;
    const client = await database.getClient();
    return new DatabaseHandler(client);
  }

  private constructor(private readonly db: Knex) {}

  async addUserLink(userId: string, name: string, link: string, description?: string): Promise<void> {
    await this.db<UserLink>('user_links').insert({ user_id: userId, name, link, description });
  }

  async getUserLinks(userId: string): Promise<UserLink[]> {
    return await this.db<UserLink>('user_links').where('user_id', userId).select();
  }

  async deleteUserLink(id: number): Promise<number> {
    return await this.db('user_links').where({ id }).delete();
  }
}
