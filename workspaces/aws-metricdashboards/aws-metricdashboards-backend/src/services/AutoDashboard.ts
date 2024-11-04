import { Config } from '@backstage/config';
import {
  CloudWatchClient,
  GetMetricDataCommand,
  GetMetricDataCommandInput,
} from '@aws-sdk/client-cloudwatch';
import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeInstancesCommandOutput,
  Instance,
} from '@aws-sdk/client-ec2';
import {
  DynamoDBClient,
  ListTablesCommand,
  ListTablesCommandOutput,
} from '@aws-sdk/client-dynamodb';
import {
  DescribeVolumesCommand,
  DescribeVolumesCommandOutput,
  Volume,
} from '@aws-sdk/client-ec2';
import {
  RDSClient,
  DescribeDBInstancesCommand,
  DescribeDBInstancesCommandOutput,
  DBInstance,
  DescribeDBClustersCommand,
  DescribeDBClustersCommandOutput,
  DBCluster,
} from '@aws-sdk/client-rds';
import {
  APIGatewayClient,
  GetRestApisCommand,
  GetRestApisCommandOutput,
  RestApi,
} from '@aws-sdk/client-api-gateway';
import {
  SQSClient,
  ListQueuesCommand,
  ListQueuesCommandOutput,
} from '@aws-sdk/client-sqs';
import { Logger } from 'winston';
import { AutoDashboardDatabase } from '../db/AutoDashboardDatabase'; // Import the database handler
import { DatabaseService } from '@backstage/backend-plugin-api';

export class AwsCloudWatchDashboards {
  private readonly regions: string[];
  private readonly logger: Logger;
  private db: AutoDashboardDatabase | null = null;

  constructor(config: Config, logger: Logger, databaseManager: DatabaseService) {
    this.regions = config.getOptionalStringArray('aws.regions') || ['us-east-1'];
    this.logger = logger;
    this.initializeDatabase(databaseManager);
  }

  private async initializeDatabase(databaseManager: DatabaseService) {
    try {
      const knexClient = await databaseManager.getClient();
      this.db = new AutoDashboardDatabase(knexClient, this.logger);
    } catch (error) {
      this.logger.error('Error initializing AWS CloudWatch database:', error);
    }
  }

  /**
   * Fetches automatic dashboards with graph values for supported AWS resources.
   * Implements caching logic similar to AwsCloudWatchProvider.
   */
  async getAutomaticDashboards(): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const cachedData = await this.db.fetchData('automaticDashboards');
      if (cachedData) {
        const { data, lastUpdated } = cachedData;
        const dashboards = data as any[];
        if (
          new Date().getTime() - lastUpdated.getTime() >=
          AutoDashboardDatabase.CACHE_REFRESH_INTERVAL
        ) {
          // Data is stale, update cache in the background
          this.updateAutomaticDashboards().catch(error =>
            this.logger.error(error),
          );
        }
        return dashboards;
      } else {
        // No data in cache, return empty array and update cache in background
        this.updateAutomaticDashboards().catch(error =>
          this.logger.error(error),
        );
        return [];
      }
    } catch (error) {
      this.logger.error('Error fetching automatic dashboards', error);
      throw new Error('Failed to fetch automatic dashboards');
    }
  }

  private async updateAutomaticDashboards(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const dashboards = await this.fetchAutomaticDashboardsFromAWS();
      await this.db.updateData('automaticDashboards', dashboards);
    } catch (error) {
      this.logger.error('Error updating automatic dashboards in database', error);
    }
  }

  private async fetchAutomaticDashboardsFromAWS(): Promise<any[]> {
    try {
      const dashboards = [];

      // Fetch data for each service
      dashboards.push(await this.getEc2DashboardData());
      dashboards.push(await this.getDynamoDbDashboardData());
      dashboards.push(await this.getEbsDashboardData());
      dashboards.push(await this.getRdsDashboardData());
      dashboards.push(await this.getRdsClusterDashboardData());
      dashboards.push(await this.getApiGatewayDashboardData());
      dashboards.push(await this.getSqsDashboardData());
      // Add more services as needed

      return dashboards;
    } catch (error) {
      this.logger.error('Error fetching automatic dashboards from AWS', error);
      throw new Error('Failed to fetch automatic dashboards from AWS');
    }
  }

  /**
   * Fetches dashboard data for EC2 instances across multiple regions.
   */
  private async getEc2DashboardData(): Promise<any> {
    const resourcesPerRegion = await Promise.all(
      this.regions.map(async region => {
        const ec2Client = new EC2Client({ region });
        const cloudWatchClient = new CloudWatchClient({ region });

        const instances = await this.listAllEc2Instances(ec2Client);
        const metricDataQueries: any[] = [];
        const resources: any[] = [];

        instances.forEach((instance, index) => {
          const instanceId = instance.InstanceId;
          const instanceName = instance.Tags?.find(tag => tag.Key === 'Name')?.Value;
          if (!instanceId) return;

          // Generate URL for the EC2 instance
          const url = `https://console.aws.amazon.com/ec2/v2/home?region=${region}#InstanceDetails:instanceId=${instanceId}`;
          // Initialize resource object
          const resource = {
            instanceId,
            name: instanceName || instanceId,
            url,
            region: region,
            metrics: [], // Will be populated later
          };

          // Sanitize the region for the ID
          const sanitizedRegion = region.replace(/-/g, '_');

          // Collect metric queries with unique IDs
          const cpuUtilizationId = `ec2_cpu_${sanitizedRegion}_${index}`;
          const networkInId = `ec2_network_in_${sanitizedRegion}_${index}`;

          metricDataQueries.push(
            {
              Id: cpuUtilizationId,
              MetricStat: {
                Metric: {
                  Namespace: 'AWS/EC2',
                  MetricName: 'CPUUtilization',
                  Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
                },
                Period: 300,
                Stat: 'Average',
              },
              Label: `EC2 CPU Utilization (${instanceId})`,
              ReturnData: true,
            },
            {
              Id: networkInId,
              MetricStat: {
                Metric: {
                  Namespace: 'AWS/EC2',
                  MetricName: 'NetworkIn',
                  Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
                },
                Period: 300,
                Stat: 'Sum',
              },
              Label: `EC2 Network In (${instanceId})`,
              ReturnData: true,
            },
            // Add more metrics as needed
          );

          // Map metric IDs to resource for later association
          resource.metricsIds = [cpuUtilizationId, networkInId];

          resources.push(resource);
        });

        // Fetch metrics
        const metrics = await this.fetchMetrics(metricDataQueries, cloudWatchClient);

        // Associate metrics with their corresponding resources
        resources.forEach(resource => {
          resource.metrics = metrics.filter(metric =>
            resource.metricsIds.includes(metric.Id),
          );
          // Remove the temporary metricsIds property
          delete resource.metricsIds;
        });

        return resources;
      }),
    );

    // Flatten the resources array
    const allResources = resourcesPerRegion.flat();

    return {
      resourceType: 'EC2',
      resources: allResources,
    };
  }

  private async listAllEc2Instances(ec2Client: EC2Client): Promise<Instance[]> {
    const instances: Instance[] = [];
    let nextToken: string | undefined = undefined;

    do {
      const params = {
        NextToken: nextToken,
        MaxResults: 1000,
      };

      const command = new DescribeInstancesCommand(params);
      const response: DescribeInstancesCommandOutput = await ec2Client.send(command);

      response.Reservations?.forEach(reservation => {
        reservation.Instances?.forEach(instance => {
          instances.push(instance);
        });
      });

      nextToken = response.NextToken;
    } while (nextToken);

    return instances;
  }

  /**
   * Fetches dashboard data for DynamoDB tables across multiple regions.
   */
  private async getDynamoDbDashboardData(): Promise<any> {
    const resourcesPerRegion = await Promise.all(
      this.regions.map(async region => {
        const dynamoDbClient = new DynamoDBClient({ region });
        const cloudWatchClient = new CloudWatchClient({ region });

        const tables = await this.listAllDynamoDbTables(dynamoDbClient);
        const metricDataQueries: any[] = [];
        const resources: any[] = [];

        tables.forEach((tableName, index) => {
          // Generate URL for the DynamoDB table
          const url = `https://console.aws.amazon.com/dynamodb/home?region=${region}#tables:selected=${tableName};tab=overview`;

          // Initialize resource object
          const resource = {
            name: tableName,
            url,
            region: region,
            metrics: [], // Will be populated later
          };

          // Sanitize the region for the ID
          const sanitizedRegion = region.replace(/-/g, '_');

          // Collect metric queries with unique IDs
          const readCapacityId = `dynamodb_read_capacity_${sanitizedRegion}_${index}`;
          const writeCapacityId = `dynamodb_write_capacity_${sanitizedRegion}_${index}`;

          metricDataQueries.push(
            {
              Id: readCapacityId,
              MetricStat: {
                Metric: {
                  Namespace: 'AWS/DynamoDB',
                  MetricName: 'ConsumedReadCapacityUnits',
                  Dimensions: [{ Name: 'TableName', Value: tableName }],
                },
                Period: 300,
                Stat: 'Sum',
              },
              Label: `DynamoDB Read Capacity (${tableName})`,
              ReturnData: true,
            },
            {
              Id: writeCapacityId,
              MetricStat: {
                Metric: {
                  Namespace: 'AWS/DynamoDB',
                  MetricName: 'ConsumedWriteCapacityUnits',
                  Dimensions: [{ Name: 'TableName', Value: tableName }],
                },
                Period: 300,
                Stat: 'Sum',
              },
              Label: `DynamoDB Write Capacity (${tableName})`,
              ReturnData: true,
            },
            // Add more metrics as needed
          );

          // Map metric IDs to resource for later association
          resource.metricsIds = [readCapacityId, writeCapacityId];

          resources.push(resource);
        });

        // Fetch metrics
        const metrics = await this.fetchMetrics(metricDataQueries, cloudWatchClient);

        // Associate metrics with their corresponding resources
        resources.forEach(resource => {
          resource.metrics = metrics.filter(metric =>
            resource.metricsIds.includes(metric.Id),
          );
          // Remove the temporary metricsIds property
          delete resource.metricsIds;
        });

        return resources;
      }),
    );

    const allResources = resourcesPerRegion.flat();

    return {
      resourceType: 'DynamoDB',
      resources: allResources,
    };
  }

  private async listAllDynamoDbTables(
    dynamoDbClient: DynamoDBClient,
  ): Promise<string[]> {
    const tables: string[] = [];
    let lastEvaluatedTableName: string | undefined = undefined;

    do {
      const params = {
        ExclusiveStartTableName: lastEvaluatedTableName,
      };

      const command = new ListTablesCommand(params);
      const response: ListTablesCommandOutput = await dynamoDbClient.send(command);

      if (response.TableNames) {
        tables.push(...response.TableNames);
      }

      lastEvaluatedTableName = response.LastEvaluatedTableName;
    } while (lastEvaluatedTableName);

    return tables;
  }

  /**
   * Fetches dashboard data for Elastic Block Store (EBS) volumes across multiple regions.
   */
  private async getEbsDashboardData(): Promise<any> {
    const resourcesPerRegion = await Promise.all(
      this.regions.map(async region => {
        const ebsClient = new EC2Client({ region });
        const cloudWatchClient = new CloudWatchClient({ region });

        const volumes = await this.listAllEbsVolumes(ebsClient);
        const metricDataQueries: any[] = [];
        const resources: any[] = [];

        volumes.forEach((volume, index) => {
          const volumeId = volume.VolumeId;
          const volumeName = volume.Tags?.find(tag => tag.Key === 'Name')?.Value;
          if (!volumeId) return;

          // Generate URL for the EBS volume
          const url = `https://console.aws.amazon.com/ec2/v2/home?region=${region}#Volumes:volumeId=${volumeId}`;

          // Initialize resource object
          const resource = {
            volumeId,
            name: volumeName || volumeId,
            url,
            region: region,
            metrics: [], // Will be populated later
          };

          // Sanitize the region for the ID
          const sanitizedRegion = region.replace(/-/g, '_');

          // Collect metric queries with unique IDs
          const readOpsId = `ebs_volume_read_ops_${sanitizedRegion}_${index}`;
          const writeOpsId = `ebs_volume_write_ops_${sanitizedRegion}_${index}`;

          metricDataQueries.push(
            {
              Id: readOpsId,
              MetricStat: {
                Metric: {
                  Namespace: 'AWS/EBS',
                  MetricName: 'VolumeReadOps',
                  Dimensions: [{ Name: 'VolumeId', Value: volumeId }],
                },
                Period: 300,
                Stat: 'Sum',
              },
              Label: `EBS Volume Read Ops (${volumeId})`,
              ReturnData: true,
            },
            {
              Id: writeOpsId,
              MetricStat: {
                Metric: {
                  Namespace: 'AWS/EBS',
                  MetricName: 'VolumeWriteOps',
                  Dimensions: [{ Name: 'VolumeId', Value: volumeId }],
                },
                Period: 300,
                Stat: 'Sum',
              },
              Label: `EBS Volume Write Ops (${volumeId})`,
              ReturnData: true,
            },
            // Add more metrics as needed
          );

          // Map metric IDs to resource for later association
          resource.metricsIds = [readOpsId, writeOpsId];

          resources.push(resource);
        });

        // Fetch metrics
        const metrics = await this.fetchMetrics(metricDataQueries, cloudWatchClient);

        // Associate metrics with their corresponding resources
        resources.forEach(resource => {
          resource.metrics = metrics.filter(metric =>
            resource.metricsIds.includes(metric.Id),
          );
          // Remove the temporary metricsIds property
          delete resource.metricsIds;
        });

        return resources;
      }),
    );

    const allResources = resourcesPerRegion.flat();

    return {
      resourceType: 'EBS',
      resources: allResources,
    };
  }

  private async listAllEbsVolumes(ebsClient: EC2Client): Promise<Volume[]> {
    const volumes: Volume[] = [];
    let nextToken: string | undefined = undefined;

    do {
      const params = {
        NextToken: nextToken,
        MaxResults: 500,
      };

      const command = new DescribeVolumesCommand(params);
      const response: DescribeVolumesCommandOutput = await ebsClient.send(command);

      if (response.Volumes) {
        volumes.push(...response.Volumes);
      }

      nextToken = response.NextToken;
    } while (nextToken);

    return volumes;
  }

  /**
   * Fetches dashboard data for RDS instances across multiple regions.
   */
  private async getRdsDashboardData(): Promise<any> {
    const resourcesPerRegion = await Promise.all(
      this.regions.map(async region => {
        const rdsClient = new RDSClient({ region });
        const cloudWatchClient = new CloudWatchClient({ region });

        const dbInstances = await this.listAllRdsInstances(rdsClient);
        const metricDataQueries: any[] = [];
        const resources: any[] = [];

        dbInstances.forEach((dbInstance, index) => {
          const dbInstanceId = dbInstance.DBInstanceIdentifier;
          if (!dbInstanceId) return;

          // Generate URL for the RDS instance
          const url = `https://console.aws.amazon.com/rds/home?region=${region}#database:id=${dbInstanceId};is-cluster=false`;

          // Initialize resource object
          const resource = {
            dbInstanceId,
            name: dbInstanceId,
            url,
            region: region,
            metrics: [], // Will be populated later
          };

          // Sanitize the region for the ID
          const sanitizedRegion = region.replace(/-/g, '_');

          // Collect metric queries with unique IDs
          const cpuUtilizationId = `rds_cpu_utilization_${sanitizedRegion}_${index}`;
          const dbConnectionsId = `rds_database_connections_${sanitizedRegion}_${index}`;

          metricDataQueries.push(
            {
              Id: cpuUtilizationId,
              MetricStat: {
                Metric: {
                  Namespace: 'AWS/RDS',
                  MetricName: 'CPUUtilization',
                  Dimensions: [
                    { Name: 'DBInstanceIdentifier', Value: dbInstanceId },
                  ],
                },
                Period: 300,
                Stat: 'Average',
              },
              Label: `RDS CPU Utilization (${dbInstanceId})`,
              ReturnData: true,
            },
            {
              Id: dbConnectionsId,
              MetricStat: {
                Metric: {
                  Namespace: 'AWS/RDS',
                  MetricName: 'DatabaseConnections',
                  Dimensions: [
                    { Name: 'DBInstanceIdentifier', Value: dbInstanceId },
                  ],
                },
                Period: 300,
                Stat: 'Average',
              },
              Label: `RDS Database Connections (${dbInstanceId})`,
              ReturnData: true,
            },
            // Add more metrics as needed
          );

          // Map metric IDs to resource for later association
          resource.metricsIds = [cpuUtilizationId, dbConnectionsId];

          resources.push(resource);
        });

        // Fetch metrics
        const metrics = await this.fetchMetrics(metricDataQueries, cloudWatchClient);

        // Associate metrics with their corresponding resources
        resources.forEach(resource => {
          resource.metrics = metrics.filter(metric =>
            resource.metricsIds.includes(metric.Id),
          );
          // Remove the temporary metricsIds property
          delete resource.metricsIds;
        });

        return resources;
      }),
    );

    const allResources = resourcesPerRegion.flat();

    return {
      resourceType: 'RDS',
      resources: allResources,
    };
  }

  private async listAllRdsInstances(rdsClient: RDSClient): Promise<DBInstance[]> {
    const instances: DBInstance[] = [];
    let marker: string | undefined = undefined;

    do {
      const params = {
        Marker: marker,
        MaxRecords: 100,
      };

      const command = new DescribeDBInstancesCommand(params);
      const response: DescribeDBInstancesCommandOutput = await rdsClient.send(command);

      if (response.DBInstances) {
        instances.push(...response.DBInstances);
      }

      marker = response.Marker;
    } while (marker);

    return instances;
  }

  /**
   * Fetches dashboard data for RDS Clusters across multiple regions.
   */
  private async getRdsClusterDashboardData(): Promise<any> {
    const resourcesPerRegion = await Promise.all(
      this.regions.map(async region => {
        const rdsClient = new RDSClient({ region });
        const cloudWatchClient = new CloudWatchClient({ region });

        const dbClusters = await this.listAllRdsClusters(rdsClient);
        const metricDataQueries: any[] = [];
        const resources: any[] = [];

        dbClusters.forEach((dbCluster, index) => {
          const dbClusterId = dbCluster.DBClusterIdentifier;
          if (!dbClusterId) return;

          // Generate URL for the RDS cluster
          const url = `https://console.aws.amazon.com/rds/home?region=${region}#database:id=${dbClusterId};is-cluster=true`;

          // Initialize resource object
          const resource = {
            dbClusterId,
            name: dbClusterId,
            url,
            region: region,
            metrics: [], // Will be populated later
          };

          // Sanitize the region for the ID
          const sanitizedRegion = region.replace(/-/g, '_');

          // Collect metric queries with unique IDs
          const cpuUtilizationId = `rds_cluster_cpu_utilization_${sanitizedRegion}_${index}`;
          const dbConnectionsId = `rds_cluster_database_connections_${sanitizedRegion}_${index}`;

          metricDataQueries.push(
            {
              Id: cpuUtilizationId,
              MetricStat: {
                Metric: {
                  Namespace: 'AWS/RDS',
                  MetricName: 'CPUUtilization',
                  Dimensions: [
                    { Name: 'DBClusterIdentifier', Value: dbClusterId },
                  ],
                },
                Period: 300,
                Stat: 'Average',
              },
              Label: `RDS Cluster CPU Utilization (${dbClusterId})`,
              ReturnData: true,
            },
            {
              Id: dbConnectionsId,
              MetricStat: {
                Metric: {
                  Namespace: 'AWS/RDS',
                  MetricName: 'DatabaseConnections',
                  Dimensions: [
                    { Name: 'DBClusterIdentifier', Value: dbClusterId },
                  ],
                },
                Period: 300,
                Stat: 'Average',
              },
              Label: `RDS Cluster Database Connections (${dbClusterId})`,
              ReturnData: true,
            },
            // Add more metrics as needed
          );

          // Map metric IDs to resource for later association
          resource.metricsIds = [cpuUtilizationId, dbConnectionsId];

          resources.push(resource);
        });

        // Fetch metrics
        const metrics = await this.fetchMetrics(metricDataQueries, cloudWatchClient);

        // Associate metrics with their corresponding resources
        resources.forEach(resource => {
          resource.metrics = metrics.filter(metric =>
            resource.metricsIds.includes(metric.Id),
          );
          // Remove the temporary metricsIds property
          delete resource.metricsIds;
        });

        return resources;
      }),
    );

    const allResources = resourcesPerRegion.flat();

    return {
      resourceType: 'RDSCluster',
      resources: allResources,
    };
  }

  private async listAllRdsClusters(rdsClient: RDSClient): Promise<DBCluster[]> {
    const clusters: DBCluster[] = [];
    let marker: string | undefined = undefined;

    do {
      const params = {
        Marker: marker,
        MaxRecords: 100,
      };

      const command = new DescribeDBClustersCommand(params);
      const response: DescribeDBClustersCommandOutput = await rdsClient.send(command);

      if (response.DBClusters) {
        clusters.push(...response.DBClusters);
      }

      marker = response.Marker;
    } while (marker);

    return clusters;
  }

  /**
   * Fetches dashboard data for API Gateway across multiple regions.
   */
  private async getApiGatewayDashboardData(): Promise<any> {
    const resourcesPerRegion = await Promise.all(
      this.regions.map(async region => {
        const apiGatewayClient = new APIGatewayClient({ region });
        const cloudWatchClient = new CloudWatchClient({ region });

        const apis = await this.listAllRestApis(apiGatewayClient);
        const metricDataQueries: any[] = [];
        const resources: any[] = [];

        apis.forEach((api, index) => {
          const apiId = api.Id;
          if (!apiId) return;

          // Generate URL for the API Gateway
          const url = `https://console.aws.amazon.com/apigateway/home?region=${region}#/apis/${apiId}/resources`;

          // Initialize resource object
          const resource = {
            apiId,
            name: api.Name || apiId,
            url,
            region: region,
            metrics: [], // Will be populated later
          };

          // Sanitize the region for the ID
          const sanitizedRegion = region.replace(/-/g, '_');

          // Collect metric queries with unique IDs
          const countId = `apigateway_count_${sanitizedRegion}_${index}`;
          const latencyId = `apigateway_latency_${sanitizedRegion}_${index}`;

          metricDataQueries.push(
            {
              Id: countId,
              MetricStat: {
                Metric: {
                  Namespace: 'AWS/ApiGateway',
                  MetricName: 'Count',
                  Dimensions: [{ Name: 'ApiId', Value: apiId }],
                },
                Period: 300,
                Stat: 'Sum',
              },
              Label: `API Gateway Count (${api.Name})`,
              ReturnData: true,
            },
            {
              Id: latencyId,
              MetricStat: {
                Metric: {
                  Namespace: 'AWS/ApiGateway',
                  MetricName: 'Latency',
                  Dimensions: [{ Name: 'ApiId', Value: apiId }],
                },
                Period: 300,
                Stat: 'Average',
              },
              Label: `API Gateway Latency (${api.Name})`,
              ReturnData: true,
            },
            // Add more metrics as needed
          );

          // Map metric IDs to resource for later association
          resource.metricsIds = [countId, latencyId];

          resources.push(resource);
        });

        // Fetch metrics
        const metrics = await this.fetchMetrics(metricDataQueries, cloudWatchClient);

        // Associate metrics with their corresponding resources
        resources.forEach(resource => {
          resource.metrics = metrics.filter(metric =>
            resource.metricsIds.includes(metric.Id),
          );
          // Remove the temporary metricsIds property
          delete resource.metricsIds;
        });

        return resources;
      }),
    );

    const allResources = resourcesPerRegion.flat();

    return {
      resourceType: 'APIGateway',
      resources: allResources,
    };
  }

  private async listAllRestApis(
    apiGatewayClient: APIGatewayClient,
  ): Promise<RestApi[]> {
    const apis: RestApi[] = [];
    let position: string | undefined = undefined;

    do {
      const params = {
        position: position,
        limit: 500,
      };

      const command = new GetRestApisCommand(params);
      const response: GetRestApisCommandOutput = await apiGatewayClient.send(command);

      if (response.items) {
        apis.push(...response.items);
      }

      position = response.position;
    } while (position);

    return apis;
  }

  /**
   * Fetches dashboard data for SQS queues across multiple regions.
   */
  private async getSqsDashboardData(): Promise<any> {
    const resourcesPerRegion = await Promise.all(
      this.regions.map(async region => {
        const sqsClient = new SQSClient({ region });
        const cloudWatchClient = new CloudWatchClient({ region });

        const queues = await this.listAllSqsQueues(sqsClient);
        const metricDataQueries: any[] = [];
        const resources: any[] = [];

        queues.forEach((queueUrl, index) => {
          const queueName = this.getQueueNameFromUrl(queueUrl);

          // Generate URL for the SQS queue
          const url = `https://console.aws.amazon.com/sqs/v2/home?region=${region}#/queues/${encodeURIComponent(
            queueUrl,
          )}`;

          // Initialize resource object
          const resource = {
            queueUrl,
            name: queueName,
            url,
            region: region,
            metrics: [], // Will be populated later
          };

          // Sanitize the region for the ID
          const sanitizedRegion = region.replace(/-/g, '_');

          // Collect metric queries with unique IDs
          const messagesVisibleId = `sqs_messages_visible_${sanitizedRegion}_${index}`;
          const messagesReceivedId = `sqs_messages_received_${sanitizedRegion}_${index}`;

          metricDataQueries.push(
            {
              Id: messagesVisibleId,
              MetricStat: {
                Metric: {
                  Namespace: 'AWS/SQS',
                  MetricName: 'ApproximateNumberOfMessagesVisible',
                  Dimensions: [{ Name: 'QueueName', Value: queueName }],
                },
                Period: 300,
                Stat: 'Average',
              },
              Label: `SQS Messages Visible (${queueName})`,
              ReturnData: true,
            },
            {
              Id: messagesReceivedId,
              MetricStat: {
                Metric: {
                  Namespace: 'AWS/SQS',
                  MetricName: 'NumberOfMessagesReceived',
                  Dimensions: [{ Name: 'QueueName', Value: queueName }],
                },
                Period: 300,
                Stat: 'Sum',
              },
              Label: `SQS Messages Received (${queueName})`,
              ReturnData: true,
            },
            // Add more metrics as needed
          );

          // Map metric IDs to resource for later association
          resource.metricsIds = [messagesVisibleId, messagesReceivedId];

          resources.push(resource);
        });

        // Fetch metrics
        const metrics = await this.fetchMetrics(metricDataQueries, cloudWatchClient);

        // Associate metrics with their corresponding resources
        resources.forEach(resource => {
          resource.metrics = metrics.filter(metric =>
            resource.metricsIds.includes(metric.Id),
          );
          // Remove the temporary metricsIds property
          delete resource.metricsIds;
        });

        return resources;
      }),
    );

    const allResources = resourcesPerRegion.flat();

    return {
      resourceType: 'SQS',
      resources: allResources,
    };
  }

  private async listAllSqsQueues(sqsClient: SQSClient): Promise<string[]> {
    const queues: string[] = [];
    let nextToken: string | undefined = undefined;

    do {
      const params = {
        NextToken: nextToken,
      };

      const command = new ListQueuesCommand(params);
      const response: ListQueuesCommandOutput = await sqsClient.send(command);

      if (response.QueueUrls) {
        queues.push(...response.QueueUrls);
      }

      nextToken = response.NextToken;
    } while (nextToken);

    return queues;
  }

  private getQueueNameFromUrl(queueUrl: string): string {
    const parts = queueUrl.split('/');
    return parts[parts.length - 1];
  }

  // Helper method to fetch metrics and construct dashboard data.
  private async fetchMetrics(
    metricDataQueries: any[],
    cloudWatchClient: CloudWatchClient,
  ): Promise<any[]> {
    if (metricDataQueries.length === 0) {
      return [];
    }

    // CloudWatch GetMetricData allows a maximum of 500 queries per request.
    const maxQueriesPerRequest = 500;
    const metrics: any[] = [];

    for (let i = 0; i < metricDataQueries.length; i += maxQueriesPerRequest) {
      const chunk = metricDataQueries.slice(i, i + maxQueriesPerRequest);

      const params: GetMetricDataCommandInput = {
        StartTime: new Date(Date.now() - 3600 * 1000), // Last 1 hour
        EndTime: new Date(),
        MetricDataQueries: chunk,
      };

      try {
        const command = new GetMetricDataCommand(params);
        const response = await cloudWatchClient.send(command);

        metrics.push(...(response.MetricDataResults || []));
      } catch (error) {
        this.logger.error(`Error fetching metrics:`, error);
      }
    }

    return metrics;
  }
}
