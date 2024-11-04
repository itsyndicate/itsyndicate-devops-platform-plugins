// plugins/aws-health/src/api/AwsHealthApi.ts

import { createApiRef, DiscoveryApi, IdentityApi } from '@backstage/core-plugin-api';

/**
 * Represents a single AWS Health Event.
 */
export interface AwsHealthEvent {
  arn: string;
  service: string;
  eventTypeCode: string;
  eventTypeCategory: string;
  region?: string;
  startTime?: string;
  endTime?: string;
  eventId: string;
  link: string;
  details: string;
  statusCode: string;
}

/**
 * Create an API reference for AwsHealthApi.
 */
export const awsHealthApiRef = createApiRef<AwsHealthApi>({
  id: 'plugin.aws-health.service',
});

/**
 * Define the AwsHealthApi interface.
 */
export interface AwsHealthApi {
  getIssues(): Promise<AwsHealthEvent[]>;
  getScheduledChanges(): Promise<AwsHealthEvent[]>;
  getNotifications(): Promise<AwsHealthEvent[]>;
  getEventLog(): Promise<AwsHealthEvent[]>;
}

/**
 * Implement the AwsHealthApi interface.
 */
export class AwsHealthClient implements AwsHealthApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly identityApi: IdentityApi;

  constructor(options: { discoveryApi: DiscoveryApi; identityApi: IdentityApi }) {
    this.discoveryApi = options.discoveryApi;
    this.identityApi = options.identityApi;
  }

  private async getAuthorizationHeader(): Promise<HeadersInit> {
    const { token } = await this.identityApi.getCredentials();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async getBaseUrl(): Promise<string> {
    return await this.discoveryApi.getBaseUrl('aws-health');
  }

  private async fetchData(endpoint: string): Promise<AwsHealthEvent[]> {
    const baseUrl = await this.getBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      headers: await this.getAuthorizationHeader(),
    });
  
    if (!response.ok) {
      throw new Error(`Failed to fetch data from ${endpoint}, status ${response.status}`);
    }
  
    const data: AwsHealthEvent[] = await response.json();
    return data;
  }

  async getIssues(): Promise<AwsHealthEvent[]> {
    return this.fetchData('/issues');
  }

  async getScheduledChanges(): Promise<AwsHealthEvent[]> {
    return this.fetchData('/scheduled-changes');
  }

  async getNotifications(): Promise<AwsHealthEvent[]> {
    return this.fetchData('/notifications');
  }

  async getEventLog(): Promise<AwsHealthEvent[]> {
    return this.fetchData('/event-log');
  }
}
