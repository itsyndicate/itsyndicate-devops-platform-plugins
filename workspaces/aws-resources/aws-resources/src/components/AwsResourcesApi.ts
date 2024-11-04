// plugins/aws-resources/src/api/AwsResourcesApi.ts
import { createApiRef, DiscoveryApi, IdentityApi } from '@backstage/core-plugin-api';

export const awsResourcesApiRef = createApiRef<AwsResourcesApi>({
  id: 'plugin.aws-resources.service',
});

export interface AwsResourcesApi {
  getAwsResources(): Promise<any>;
}

export class AwsResourcesClient implements AwsResourcesApi {
  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly identityApi: IdentityApi,
  ) {}

  async getAwsResources(): Promise<any> {
    const baseUrl = await this.discoveryApi.getBaseUrl('aws-resources');
    const url = `${baseUrl}/count`;

    // Get the user's token
    const { token } = await this.identityApi.getCredentials();

    // Include the Authorization header
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch AWS resources, status ${response.status}`);
    }

    return await response.json();
  }
}
