// aws-resources-backend/src/service/AwsResourceService.ts

import {
  EC2Client,
  DescribeVpcsCommand,
  DescribeInstancesCommand,
  DescribeVolumesCommand,
  DescribeSnapshotsCommand,
  DescribeImagesCommand,
} from '@aws-sdk/client-ec2';
import { ECSClient, ListClustersCommand } from '@aws-sdk/client-ecs';
import { LambdaClient, ListFunctionsCommand } from '@aws-sdk/client-lambda';
import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import {
  EKSClient,
  ListClustersCommand as ListEKSClustersCommand,
} from '@aws-sdk/client-eks';
import {
  APIGatewayClient,
  GetRestApisCommand,
} from '@aws-sdk/client-api-gateway';
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { Config } from '@backstage/config';
import { Logger } from 'winston';
import { AwsResourceDatabase } from '../db/AwsResourceDatabase';
import { DatabaseService } from '@backstage/backend-plugin-api';

export class AwsResourceService {
  private regions: string[];
  private logger: Logger;
  private db: AwsResourceDatabase | null = null;
  private dbInitialized: Promise<void>;

  // Define the cache refresh interval as 5 minutes
  private static readonly CACHE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor(
    config: Config,
    logger: Logger,
    databaseManager: DatabaseService,
  ) {
    this.logger = logger;
    this.regions = config.getOptionalStringArray('aws.regions') || ['us-east-1'];

    // Initialize the database asynchronously and store the promise
    this.dbInitialized = this.initializeDatabase(databaseManager);
  }

  private async initializeDatabase(databaseManager: DatabaseService) {
    try {
      // Get the Knex client
      const knexClient = await databaseManager.getClient();

      // Initialize AwsResourceDatabase with the Knex client
      this.db = new AwsResourceDatabase(knexClient, this.logger);
    } catch (error) {
      this.logger.error('Error initializing AWS Resource database:', error);
    }
  }

  private async ensureDatabaseInitialized() {
    if (!this.db) {
      await this.dbInitialized;
    }
  }

  /**
   * Fetches AWS resource counts and details.
   * Implements caching logic with a refresh interval of 5 minutes.
   */
  async getResourceCounts(): Promise<any> {
    await this.ensureDatabaseInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const cachedData = await this.db.fetchData('awsResourceCounts');
      if (cachedData) {
        const { data, lastUpdated } = cachedData;
        const resourceDetails = data as any;
        const lastUpdatedDate = new Date(lastUpdated);
        if (
          new Date().getTime() - lastUpdatedDate.getTime() >=
          AwsResourceService.CACHE_REFRESH_INTERVAL
        ) {
          // Data is stale, update cache in the background
          this.updateResourceCounts().catch(error =>
            this.logger.error('Error updating resource counts in background:', error),
          );
        }
        return resourceDetails;
      } else {
        // No data in cache, fetch data and update cache
        const resourceDetails = await this.fetchResourceCountsFromAWS();
        await this.db.updateData('awsResourceCounts', resourceDetails);
        return resourceDetails;
      }
    } catch (error) {
      this.logger.error('Error fetching AWS resource counts', error);
      throw new Error('Failed to fetch AWS resource counts');
    }
  }

  private async updateResourceCounts(): Promise<void> {
    await this.ensureDatabaseInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const resourceDetails = await this.fetchResourceCountsFromAWS();
      await this.db.updateData('awsResourceCounts', resourceDetails);
    } catch (error) {
      this.logger.error('Error updating AWS resource counts in database', error);
    }
  }

  private async fetchResourceCountsFromAWS(): Promise<any> {
    try {
      const resourceDetails: any = {
        vpcs: { count: 0, resources: [] },
        ecsClusters: { count: 0, resources: [] },
        databases: { count: 0, resources: [] },
        kubernetes: { count: 0, resources: [] },
        lambdas: { count: 0, resources: [] },
        ec2Instances: { count: 0, resources: [] },
        ebsVolumes: { count: 0, resources: [] },
        s3Buckets: { count: 0, resources: [] },
        images: { count: 0, resources: [] },
        snapshots: { count: 0, resources: [] },
        apiGateways: { count: 0, resources: [] },
      };

      // Fetch S3 buckets (global service)
      const s3Buckets = await this.getS3BucketDetails();
      resourceDetails.s3Buckets.count += s3Buckets.count;
      resourceDetails.s3Buckets.resources.push(...s3Buckets.resources);

      for (const region of this.regions) {
        // Initialize AWS SDK clients for the given region
        const ec2 = new EC2Client({ region });
        const ecs = new ECSClient({ region });
        const lambda = new LambdaClient({ region });
        const rds = new RDSClient({ region });
        const eks = new EKSClient({ region });
        const apiGateway = new APIGatewayClient({ region });
        const dynamoDB = new DynamoDBClient({ region });

        // Fetch and accumulate resources
        await this.fetchAndAccumulateResources(
          resourceDetails,
          ec2,
          ecs,
          lambda,
          rds,
          eks,
          apiGateway,
          dynamoDB,
          region,
        );
      }

      return resourceDetails;
    } catch (error) {
      this.logger.error('Error fetching AWS resource counts from AWS', error);
      throw new Error('Failed to fetch AWS resource counts from AWS');
    }
  }

  private async fetchAndAccumulateResources(
    resourceDetails: any,
    ec2: EC2Client,
    ecs: ECSClient,
    lambda: LambdaClient,
    rds: RDSClient,
    eks: EKSClient,
    apiGateway: APIGatewayClient,
    dynamoDB: DynamoDBClient,
    region: string,
  ) {
    // Fetch VPCs
    const vpcs = await this.getVpcDetails(ec2, region);
    resourceDetails.vpcs.count += vpcs.count;
    resourceDetails.vpcs.resources.push(...vpcs.resources);

    // Fetch ECS Clusters
    const ecsClusters = await this.getEcsDetails(ecs, region);
    resourceDetails.ecsClusters.count += ecsClusters.count;
    resourceDetails.ecsClusters.resources.push(...ecsClusters.resources);

    // Fetch RDS Databases
    const dbInstances = await this.getRdsDetails(rds, region);
    resourceDetails.databases.count += dbInstances.count;
    resourceDetails.databases.resources.push(...dbInstances.resources);

    // Fetch DynamoDB Tables
    const dynamoTables = await this.getDynamoDBDetails(dynamoDB, region);
    resourceDetails.databases.count += dynamoTables.count;
    resourceDetails.databases.resources.push(...dynamoTables.resources);

    // Fetch EKS Clusters
    const eksClusters = await this.getEksDetails(eks, region);
    resourceDetails.kubernetes.count += eksClusters.count;
    resourceDetails.kubernetes.resources.push(...eksClusters.resources);

    // Fetch Lambdas
    const lambdas = await this.getLambdaDetails(lambda, region);
    resourceDetails.lambdas.count += lambdas.count;
    resourceDetails.lambdas.resources.push(...lambdas.resources);

    // Fetch EC2 Instances
    const ec2Instances = await this.getEc2Details(ec2, region);
    resourceDetails.ec2Instances.count += ec2Instances.count;
    resourceDetails.ec2Instances.resources.push(...ec2Instances.resources);

    // Fetch EBS Volumes
    const ebsVolumes = await this.getEbsVolumeDetails(ec2, region);
    resourceDetails.ebsVolumes.count += ebsVolumes.count;
    resourceDetails.ebsVolumes.resources.push(...ebsVolumes.resources);

    // Fetch AMIs
    const images = await this.getImageDetails(ec2, region);
    resourceDetails.images.count += images.count;
    resourceDetails.images.resources.push(...images.resources);

    // Fetch Snapshots
    const snapshots = await this.getSnapshotDetails(ec2, region);
    resourceDetails.snapshots.count += snapshots.count;
    resourceDetails.snapshots.resources.push(...snapshots.resources);

    // Fetch API Gateways
    const apiGateways = await this.getApiGatewayDetails(apiGateway, region);
    resourceDetails.apiGateways.count += apiGateways.count;
    resourceDetails.apiGateways.resources.push(...apiGateways.resources);
  }

  // Fetch S3 buckets only once (global service)
  private async getS3BucketDetails() {
    const s3 = new S3Client({ region: 'us-east-1' }); // S3 is a global service
    const data = await s3.send(new ListBucketsCommand({}));
    const buckets =
      data.Buckets?.map(bucket => ({
        id: bucket.Name,
        name: bucket.Name,
        link: `https://s3.console.aws.amazon.com/s3/buckets/${bucket.Name}`,
        region: 'global',
      })) || [];
    return { type: 's3Buckets', count: buckets.length, resources: buckets };
  }

  private async getVpcDetails(ec2: EC2Client, region: string) {
    const data = await ec2.send(new DescribeVpcsCommand({}));
    const vpcs =
      data.Vpcs?.map(vpc => ({
        id: vpc.VpcId,
        name: this.getTagName(vpc.Tags),
        link: `https://${region}.console.aws.amazon.com/vpc/home?region=${region}#VpcDetails:VpcId=${vpc.VpcId}`,
        region,
      })) || [];
    return { type: 'vpcs', count: vpcs.length, resources: vpcs };
  }

  private async getEcsDetails(ecs: ECSClient, region: string) {
    const data = await ecs.send(new ListClustersCommand({}));
    const clusters =
      data.clusterArns?.map(clusterArn => ({
        id: clusterArn,
        name: clusterArn.split('/').pop(),
        link: `https://${region}.console.aws.amazon.com/ecs/home?region=${region}#/clusters/${clusterArn.split('/').pop()}`,
        region,
      })) || [];
    return { type: 'ecsClusters', count: clusters.length, resources: clusters };
  }

  private async getRdsDetails(rds: RDSClient, region: string) {
    const data = await rds.send(new DescribeDBInstancesCommand({}));
    const dbInstances =
      data.DBInstances?.map(db => ({
        id: db.DBInstanceIdentifier,
        name: 'RDS: ' + db.DBInstanceIdentifier,
        link: `https://${region}.console.aws.amazon.com/rds/home?region=${region}#database:id=${db.DBInstanceIdentifier}`,
        region,
      })) || [];
    return { type: 'databases', count: dbInstances.length, resources: dbInstances };
  }

  private async getDynamoDBDetails(dynamoDB: DynamoDBClient, region: string) {
    const data = await dynamoDB.send(new ListTablesCommand({}));
    const tables =
      data.TableNames?.map(tableName => ({
        id: tableName,
        name: 'DynamoDB table: ' + tableName,
        link: `https://${region}.console.aws.amazon.com/dynamodb/home?region=${region}#table?name=${tableName}`,
        region,
      })) || [];
    return { type: 'databases', count: tables.length, resources: tables };
  }

  private async getEksDetails(eks: EKSClient, region: string) {
    const data = await eks.send(new ListEKSClustersCommand({}));
    const clusters =
      data.clusters?.map(clusterName => ({
        id: clusterName,
        name: clusterName,
        link: `https://${region}.console.aws.amazon.com/eks/home?region=${region}#/clusters/${clusterName}`,
        region,
      })) || [];
    return { type: 'kubernetes', count: clusters.length, resources: clusters };
  }

  private async getLambdaDetails(lambda: LambdaClient, region: string) {
    const data = await lambda.send(new ListFunctionsCommand({}));
    const functions =
      data.Functions?.map(func => ({
        id: func.FunctionName,
        name: func.FunctionName,
        link: `https://${region}.console.aws.amazon.com/lambda/home?region=${region}#/functions/${func.FunctionName}`,
        region,
      })) || [];
    return { type: 'lambdas', count: functions.length, resources: functions };
  }

  private async getEc2Details(ec2: EC2Client, region: string) {
    const data = await ec2.send(new DescribeInstancesCommand({}));
    const instances =
      data.Reservations?.flatMap(reservation =>
        reservation.Instances?.map(instance => ({
          id: instance.InstanceId,
          name: this.getTagName(instance.Tags),
          link: `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#Instances:instanceId=${instance.InstanceId}`,
          region,
        })) || [],
      ) || [];
    return { type: 'ec2Instances', count: instances.length, resources: instances };
  }

  private async getEbsVolumeDetails(ec2: EC2Client, region: string) {
    const data = await ec2.send(new DescribeVolumesCommand({}));
    const volumes =
      data.Volumes?.map(volume => ({
        id: volume.VolumeId,
        name: this.getTagName(volume.Tags),
        link: `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#VolumeDetails:volumeId=${volume.VolumeId}`,
        region,
      })) || [];
    return { type: 'ebsVolumes', count: volumes.length, resources: volumes };
  }

  private async getImageDetails(ec2: EC2Client, region: string) {
    const data = await ec2.send(new DescribeImagesCommand({ Owners: ['self'] }));
    const images =
      data.Images?.map(image => ({
        id: image.ImageId,
        name: image.Name,
        link: `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#Images:visibility=owned-by-me;imageId=${image.ImageId}`,
        region,
      })) || [];
    return { type: 'images', count: images.length, resources: images };
  }

  private async getSnapshotDetails(ec2: EC2Client, region: string) {
    const data = await ec2.send(new DescribeSnapshotsCommand({ OwnerIds: ['self'] }));
    const snapshots =
      data.Snapshots?.map(snapshot => ({
        id: snapshot.SnapshotId,
        name: this.getTagName(snapshot.Tags),
        link: `https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#Snapshots:snapshotId=${snapshot.SnapshotId}`,
        region,
      })) || [];
    return { type: 'snapshots', count: snapshots.length, resources: snapshots };
  }

  private async getApiGatewayDetails(apiGateway: APIGatewayClient, region: string) {
    const data = await apiGateway.send(new GetRestApisCommand({}));
    const apis =
      data.items?.map(api => ({
        id: api.id,
        name: api.name,
        link: `https://${region}.console.aws.amazon.com/apigateway/main/apis/${api.id}/resources?api=${api.id}`,
        region,
      })) || [];
    return { type: 'apiGateways', count: apis.length, resources: apis };
  }

  // Utility to extract the "Name" tag from resource tags if available
  private getTagName(tags?: { Key?: string; Value?: string }[]): string | undefined {
    return tags?.find(tag => tag.Key === 'Name')?.Value;
  }
}
