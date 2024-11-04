import { Knex } from 'knex';
import { Logger } from 'winston';

export class AwsResourceDatabase {
  private readonly db: Knex; // Use 'db' to represent the Knex instance
  private readonly logger: Logger;

  constructor(db: Knex, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  async fetchData(key: string): Promise<{ data: any; lastUpdated: Date } | null> {
    try {
      const row = await this.db('aws_resource_cache')
        .where('key', key)
        .first();
  
      if (row) {
        const deserializedData = JSON.parse(row.data); // Deserialize data from JSON string
        return {
          data: deserializedData,
          lastUpdated: new Date(row.last_updated), // Ensure lastUpdated is a Date object
        };
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Error fetching data from aws_resource_cache for key ${key}:`,
        error,
      );
      throw error;
    }
  }

  async updateData(key: string, data: any): Promise<void> {
    try {
      const now = new Date();
      const serializedData = JSON.stringify(data); // Serialize data to JSON string
  
      const exists = await this.db('aws_resource_cache')
        .where('key', key)
        .first();
  
      if (exists) {
        await this.db('aws_resource_cache')
          .where('key', key)
          .update({ data: serializedData, last_updated: now });
      } else {
        await this.db('aws_resource_cache').insert({
          key,
          data: serializedData,
          last_updated: now,
        });
      }
    } catch (error) {
      this.logger.error(
        `Error updating data in aws_resource_cache for key ${key}:`,
        error,
      );
      throw error;
    }
  }
}