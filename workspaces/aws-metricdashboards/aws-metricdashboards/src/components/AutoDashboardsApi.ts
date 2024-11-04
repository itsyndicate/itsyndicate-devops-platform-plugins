// plugins/aws-cloudwatch/src/api/AwsCloudWatchApi.ts

import { createApiRef, DiscoveryApi, IdentityApi } from '@backstage/core-plugin-api';

export interface MetricDataResult {
  Id: string;
  Label: string;
  Timestamps: string[];
  Values: number[];
  StatusCode: string;
  Messages?: string[];
}
export interface Resource {
  instanceId?: string;
  volumeId?: string;
  dbInstanceId?: string;
  dbClusterId?: string;
  tableName?: string;
  apiId?: string;
  region?: string;
  queueUrl?: string;
  name: string;
  url: string;
  metrics: MetricDataResult[];
}
/**
 * Create an API reference for AwsCloudWatchApi.
 */
export const automaticDashboardApiRef = createApiRef<AutomaticDashboardApi>({
  id: 'plugin.aws-metricdashboards.service',
});
export interface AutomaticDashboard {
  resourceType: string;
  resources: Resource[];
}
/**
 * Define the AwsCloudWatchApi interface.
 */
export interface AutomaticDashboardApi {
  getAutomaticDashboards(): Promise<AutomaticDashboard[]>;
}

/**
 * Implement the AwsCloudWatchApi interface.
 */
export class AutomaticDashboardClient implements AutomaticDashboardApi {
  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly identityApi: IdentityApi,
  ) {}

  /**
   * Constructs the authorization headers required for API requests.
   */
  private async getAuthorizationHeader(): Promise<HeadersInit> {
    const { token } = await this.identityApi.getCredentials();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getAutomaticDashboards(): Promise<AutomaticDashboard[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('aws-metricdashboards');
    const url = `${baseUrl}/automatic-dashboards`;

    const response = await fetch(url, {
      headers: await this.getAuthorizationHeader(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch automatic dashboards, status ${response.status}`);
    }

    const data: AutomaticDashboard[] = await response.json();
    return data;
  }
}
