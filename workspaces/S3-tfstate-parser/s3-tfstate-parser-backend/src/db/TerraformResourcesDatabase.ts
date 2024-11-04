import { Knex } from 'knex';
import { Logger } from 'winston';

export class TerraformResourcesDatabase {
  private readonly db: Knex;
  private readonly logger: Logger;

  constructor(db: Knex, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * Saves resources to the database.
   * @param resources - Array of resources to be saved.
   */
  async saveResources(resources: any[]): Promise<void> {
    try {
      // Remove duplicates from resources array based on 'id'
      const uniqueResources = resources.filter(
        (resource, index, self) => index === self.findIndex(r => r.id === resource.id)
      );
  
      // Prepare the resources for insertion
      const formattedResources = uniqueResources.map(resource => ({
        id: resource.id, // Ensure that these IDs are unique in your data
        name: resource.name,
        type: resource.type,
        url: resource.url,
        dependencies: JSON.stringify(resource.dependencies || []), // Store dependencies as string
      }));
  
      // Insert the new resources
      await this.db('terraform_resource')
        .insert(formattedResources)
        .onConflict('id') // 'id' is the unique key
        .merge({
          name: this.db.raw('excluded.name'),
          type: this.db.raw('excluded.type'),
          url: this.db.raw('excluded.url'),
          dependencies: this.db.raw('excluded.dependencies'),
        });
  
      this.logger.info(`Saved ${formattedResources.length} resources to the database.`);
    } catch (error) {
      this.logger.error(`Error saving resources: ${error.message}`);
      throw new Error(`Error saving resources: ${error.message}`);
    }
  }

  /**
   * Fetches all resources from the database.
   * @returns Array of resources.
   */
  async getResources(): Promise<any[]> {
    try {
      const results = await this.db('terraform_resource').select('*');
      const resources = results.map(resource => ({
        id: resource.id,
        name: resource.name,
        type: resource.type,
        url: resource.url,
        dependencies: JSON.parse(resource.dependencies), // Parsing dependencies back to JSON
      }));
      this.logger.info(`Fetched ${resources.length} resources from the database.`);
      return resources;
    } catch (error) {
      this.logger.error(`Error fetching resources: ${error.message}`);
      throw new Error(`Error fetching resources: ${error.message}`);
    }
  }

  /**
   * Clears all resources from the database.
   */
  async clearResources(): Promise<void> {
    try {
      await this.db('terraform_resource').truncate();
      this.logger.info('Cleared all resources from the database.');
    } catch (error) {
      this.logger.error(`Error clearing resources: ${error.message}`);
      throw new Error(`Error clearing resources: ${error.message}`);
    }
  }

  /**
   * Ensures the 'terraform_resources' table exists in the database.
   */
}
