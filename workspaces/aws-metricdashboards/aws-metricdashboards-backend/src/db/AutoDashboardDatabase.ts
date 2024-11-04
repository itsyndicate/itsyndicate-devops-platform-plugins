// plugins/aws-autodashboards-backend/src/service/AutoDashboardDatabase.ts

import { Knex } from 'knex';
import { Logger } from 'winston';

export class AutoDashboardDatabase {
  public static readonly CACHE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(private readonly db: Knex, private readonly logger: Logger) {}

  async fetchData(
    key: string,
  ): Promise<{ data: any; lastUpdated: Date } | null> {
    try {
      const row = await this.db('aws_automatic_dashboard').where({ key }).first();
      if (!row) {
        return null;
      }
      const lastUpdated = new Date(row.last_updated);
      const data = JSON.parse(row.data);
      return { data, lastUpdated };
    } catch (error) {
      this.logger.error(
        'Error fetching data from AWS CloudWatch database:',
        error,
      );
      throw new Error('Failed to fetch data from cache');
    }
  }

  async updateData(key: string, data: any): Promise<void> {
    try {
      await this.db('aws_automatic_dashboard')
        .insert({
          key,
          data: JSON.stringify(data),
          last_updated: new Date(),
        })
        .onConflict('key')
        .merge();
    } catch (error) {
      this.logger.error(
        'Error updating data in AWS CloudWatch database:',
        error,
      );
      throw new Error('Failed to update data in cache');
    }
  }
}
