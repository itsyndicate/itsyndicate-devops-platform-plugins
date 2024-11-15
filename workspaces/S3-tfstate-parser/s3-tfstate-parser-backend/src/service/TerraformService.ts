import { Logger } from 'winston';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { TerraformResourcesDatabase } from '../db/TerraformResourcesDatabase';
import { DatabaseService } from '@backstage/backend-plugin-api';
import fs from 'fs/promises';
import path from 'path';
// Define a list of resource types or names to be excluded from the response
const EXCLUDED_RESOURCES: { types: string[]; names: string[] } = {
  types: [
    // IAM Resources
    'aws_iam_user',
    'aws_iam_access_key',
    'aws_iam_user_policy',
    'aws_iam_user_login_profile',
    'aws_iam_group',
    'aws_iam_group_policy',
    'aws_iam_role_policy',
    'aws_iam_policy',
    'aws_iam_instance_profile',
    // Security and Secrets
    'aws_secretsmanager_secret',
    'aws_secretsmanager_secret_version',
    'aws_ssm_parameter',
    'aws_kms_key',
    'aws_kms_alias',
    // Logging and Monitoring
    'aws_cloudwatch_log_group',
    'aws_cloudwatch_log_stream',
    'aws_cloudtrail',
    'aws_config_configuration_recorder',
    'aws_config_delivery_channel',
    // Networking Details
    'aws_route',
    'aws_route_table_association',
    'aws_internet_gateway',
    'aws_nat_gateway',
    'aws_security_group',
    'aws_security_group_rule',
    // Elastic IPs and Networking Interfaces
    'aws_eip',
    'aws_network_interface',
    // Autoscaling and Launch Configurations
    'aws_autoscaling_group',
    'aws_launch_configuration',
    // Service Control Policies and Organizations
    'aws_organizations_policy',
    'aws_organizations_account',
    'aws_organizations_organization',
    // Miscellaneous
    'aws_network_acl',
    'aws_db_instance',
    'aws_db_subnet_group',
    'aws_elasticache_cluster',
    'aws_elasticache_subnet_group',
    'aws_redshift_cluster',
    'aws_redshift_subnet_group',
    // Backup and Recovery
    'aws_backup_plan',
    'aws_backup_selection',
    'aws_backup_vault',
    // Analytics and Data Pipelines
    'aws_glue_catalog_database',
    'aws_glue_catalog_table',
    'aws_data_pipeline_pipeline',
    // Code and Deployment Resources
    'aws_codecommit_repository',
    'aws_codedeploy_application',
    'aws_codedeploy_deployment_group',
    'aws_codepipeline',
    // Certificate Management
    'aws_acm_certificate',
    'aws_acm_certificate_validation',
    // CloudFront and Content Delivery
    'aws_cloudfront_distribution',
    'aws_cloudfront_origin_access_identity',
    // S3 Buckets (if sensitive)
    'aws_s3_bucket_policy',
    // API Gateway Details
    'aws_api_gateway_deployment',
    'aws_api_gateway_integration',
    'aws_api_gateway_resource',
    'aws_api_gateway_stage',
    // Lambda Permissions
    'aws_lambda_permission',
    'aws_subnet',
    'aws_iam_policy',
    'aws_efs_mount_target',
    'aws_efs_access_point',
    'aws_ecs_task_definition',
    'aws_iam_role_policy_attachment',
    'aws_api_gateway_usage_plan_key',
    'aws_lambda_event_source_mapping',
    'aws_api_gateway_usage_plan',
    'aws_api_gateway_base_path_mapping',
    'time_sleep',
  ],
  names: ['this', 'example'],
};

export class TerraformService {
  private s3Client: S3Client;
  private bucket: string;
  private awsRegion: string;
  private logger: Logger;
  private db: TerraformResourcesDatabase | null = null;

  constructor(s3Client: S3Client, bucket: string, awsRegion: string, logger: Logger,
    databaseManager: DatabaseService,) {
    this.s3Client = s3Client;
    this.bucket = bucket;
    this.awsRegion = awsRegion;
    this.logger = logger;
    this.initializeDatabase(databaseManager);
  }

  // Initialize the database
  public async initializeDatabase(databaseManager: DatabaseService): Promise<void> {
    try {
      const knexClient = await databaseManager.getClient();
      this.db = new TerraformResourcesDatabase(knexClient, this.logger);
      this.logger.info('Database initialized successfully for TerraformService.');
    } catch (error) {
      this.logger.error('Error initializing database for TerraformService:', error);
      throw error;
    }
  }

  // Check if the database has been initialized
  public isDatabaseInitialized(): boolean {
    return !!this.db;
  }

  // Fetch resources from the database
  public async fetchResourcesFromDb(): Promise<any[]> {
    if (!this.isDatabaseInitialized()) {
      throw new Error('Database is not initialized');
    }
  
    try {
      const resources = await this.db!.getResources();
      if (resources.length === 0) {
        this.logger.warn('No resources found in the database. Falling back to example data.');
  
        const exampleFilePath = path.join(__dirname, '../../assets/example.json');
        const exampleData = await fs.readFile(exampleFilePath, 'utf-8');
        const parsedExampleData = JSON.parse(exampleData);
  
        this.logger.info('Returning fallback example data.');
        return parsedExampleData;
      }
  
      this.logger.info(`Fetched ${resources.length} resources from the database.`);
      return resources;
    } catch (error) {
      this.logger.error('Error fetching resources from the database', error);
      throw error;
    }
  }

  // Save resources to the database
  private async saveResourcesToDb(resources: any[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    try {
      await this.db.clearResources();
      await this.db.saveResources(resources);
      this.logger.info('Resources saved to the database successfully.');
    } catch (error) {
      this.logger.error('Error saving resources to the database', error);
      throw error;
    }
  }

  // Filter out excluded resources
  private filterExcludedResources(resources: any[]): any[] {
    return resources.filter(resource => {
      const isExcludedType = EXCLUDED_RESOURCES.types.includes(resource.type);
      const isExcludedName = EXCLUDED_RESOURCES.names.includes(resource.name);
      return !(isExcludedType || isExcludedName);
    });
  }

  // Fetch and parse Terraform state files from S3
  public async fetchAndParseTfStateFiles(): Promise<any[]> {
    const resources = await this.fetchResourcesFromS3();
    const filteredResources = this.filterExcludedResources(resources);
    await this.saveResourcesToDb(filteredResources);
    return filteredResources;
  }

  // Fetch Terraform state files from S3
  private async fetchResourcesFromS3(): Promise<any[]> {
    const fileKeys = await this.fetchTfStateFiles();
    if (fileKeys.length === 0) {
      this.logger.warn('No .tfstate files found in S3 bucket');
      return [];
    }

    const allResources: any[] = [];
    for (const key of fileKeys) {
      try {
        this.logger.info(`Processing file: ${key}`);
        const tfJsonContent = await this.getObjectContent(key);
        const tfJson = JSON.parse(tfJsonContent);
        const resources = this.extractManagedResources(tfJson);
        allResources.push(...resources);
      } catch (error) {
        this.logger.error(`Error processing file ${key}:`, error);
      }
    }

    return allResources;
  }

  // Fetch .tfstate files from S3
  private async fetchTfStateFiles(): Promise<string[]> {
    let fileList: string[] = [];
    let continuationToken: string | undefined = undefined;

    do {
      const params = { Bucket: this.bucket, ContinuationToken: continuationToken };
      const command = new ListObjectsV2Command(params);
      const response = await this.s3Client.send(command);

      response.Contents?.forEach(item => {
        if (item.Key && item.Key.endsWith('.tfstate')) {
          fileList.push(item.Key);
        }
      });

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    this.logger.info(`Found ${fileList.length} .tfstate files`);
    return fileList;
  }

  // Get content of an object in S3
  private async getObjectContent(key: string): Promise<string> {
    const params = { Bucket: this.bucket, Key: key };
    const command = new GetObjectCommand(params);
    const data = await this.s3Client.send(command);

    if (data.Body) {
      return this.streamToString(data.Body as Readable);
    } else {
      throw new Error(`Empty body for object ${key}`);
    }
  }

  // Extract managed resources from Terraform JSON
  private extractManagedResources(tfJson: any): any[] {
    const resources: any[] = [];
    const processResource = (resource: any) => {
      if (resource.mode !== 'managed') return;

      const instances = resource.instances || [];
      instances.forEach((instance: any) => {
        const attributes = instance.attributes || {};
        const id = attributes.id || attributes.arn || null;
        const name = resource.name;
        const type = resource.type;
        const dependencies = instance.dependencies || [];
        const url = this.constructResourceUrl(type, attributes);

        resources.push({ name, type, id, url, dependencies });
      });
    };

    if (tfJson.values?.root_module?.resources) {
      tfJson.values.root_module.resources.forEach(processResource);
    } else if (tfJson.resources) {
      tfJson.resources.forEach(processResource);
    }

    return resources;
  }


  // Function to construct the AWS Console URL for a resource
  private constructResourceUrl(type: string, attributes: any): string | null {
    switch (type) {
      case 'aws_instance':
        if (attributes.id) {
          return `https://${this.awsRegion}.console.aws.amazon.com/ec2/v2/home?region=${this.awsRegion}#InstanceDetails:instanceId=${attributes.id}`;
        }
        break;
      case 'aws_s3_bucket':
        if (attributes.bucket) {
          return `https://s3.console.aws.amazon.com/s3/buckets/${attributes.bucket}?region=${this.awsRegion}`;
        }
        break;
      case 'aws_lambda_function':
        if (attributes.function_name) {
          return `https://${this.awsRegion}.console.aws.amazon.com/lambda/home?region=${this.awsRegion}#/functions/${attributes.function_name}`;
        }
        break;
      case 'aws_dynamodb_table':
        if (attributes.name) {
          return `https://${this.awsRegion}.console.aws.amazon.com/dynamodb/home?region=${this.awsRegion}#tables:selected=${attributes.name};tab=overview`;
        }
        break;
      case 'aws_iam_role':
        if (attributes.name) {
          return `https://${this.awsRegion}.console.aws.amazon.com/iam/home?region=${this.awsRegion}#/roles/${attributes.name}`;
        }
        break;
      case 'aws_api_gateway_rest_api':
        if (attributes.id) {
          return `https://${this.awsRegion}.console.aws.amazon.com/apigateway/main/apis/${attributes.id}/resources?api=${attributes.id}`;
        }
        break;
      case 'aws_vpc':
        if (attributes.id) {
          return `https://${this.awsRegion}.console.aws.amazon.com/vpc/home?region=${this.awsRegion}#vpcs:VpcId=${attributes.id}`;
        }
        break;
      case 'aws_efs_file_system':
        if (attributes.id) {
          return `https://${this.awsRegion}.console.aws.amazon.com/efs/home?region=${this.awsRegion}#/file-systems/${attributes.id}`;
        }
        break;
      case 'aws_route53_record':
        if (attributes.zone_id) {
          return `https://${this.awsRegion}.console.aws.amazon.com/route53/v2/hostedzones#${attributes.zone_id}/records`;
        }
        break;
      case 'aws_sfn_state_machine':
        if (attributes.id) {
          return `https://${this.awsRegion}.console.aws.amazon.com/states/home?region=${this.awsRegion}#/statemachines/view/${attributes.id}`;
        }
        break;
      case 'aws_sqs_queue':
        if (attributes.url) {
          return `https://${this.awsRegion}.console.aws.amazon.com/sqs/v2/home?region=${this.awsRegion}#/queues/${encodeURIComponent(attributes.url)}`;
        }
        break;
      case 'aws_globalaccelerator_accelerator':
        if (attributes.id) {
          return `https://${this.awsRegion}.console.aws.amazon.com/globalaccelerator/home?region=${this.awsRegion}#AcceleratorDetails:AcceleratorArn=${attributes.id}`;
        }
        break;
      case 'aws_lb_target_group':
        if (attributes.id) {
          return `https://${this.awsRegion}.console.aws.amazon.com/ec2/v2/home?region=${this.awsRegion}#LoadBalancers:search=${attributes.id}`;
        }
        break;
      case 'aws_sns_topic':
        if (attributes.id) {
          return `https://${this.awsRegion}.console.aws.amazon.com/sns/v3/home?region=${this.awsRegion}#/topic/${attributes.id}`;
        }
        break;
      case 'aws_route53_zone':
        if (attributes.id) {
          return `https://${this.awsRegion}.console.aws.amazon.com/route53/home?region=${this.awsRegion}#hosted-zone/id=${attributes.id}`;
        }
        break;
      case 'aws_api_gateway_method':
        if (attributes.rest_api_id && attributes.resource_id) {
          return `https://${this.awsRegion}.console.aws.amazon.com/apigateway/main/apis/${attributes.rest_api_id}/resources/${attributes.resource_id}?region=${this.awsRegion}`;
        }
        break;
      case 'aws_ecs_cluster':
        if (attributes.name) {
          return `https://${this.awsRegion}.console.aws.amazon.com/ecs/home?region=${this.awsRegion}#/clusters/${attributes.name}`;
        }
        break;
      case 'aws_ecs_service':
        if (attributes.cluster_name && attributes.name) {
          return `https://${this.awsRegion}.console.aws.amazon.com/ecs/home?region=${this.awsRegion}#/clusters/${attributes.cluster_name}/services/${attributes.name}/details`;
        }
        break;
      // More cases can be added here as needed.
      default:
        return null;
    }
    return null;
  }
  // Convert a stream to a string
  private async streamToString(stream: Readable): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const chunks: any[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
  }

  // Update resources by fetching from S3 and saving to the database
  public async updateResources(): Promise<void> {
    try {
      const resources = await this.fetchAndParseTfStateFiles();
      await this.saveResourcesToDb(resources);
      this.logger.info('Resources updated successfully.');
    } catch (error) {
      this.logger.error('Error updating resources from S3', error);
      throw error;
    }
  }
}
