import {
  createApiRef,
  DiscoveryApi,
  IdentityApi,
} from '@backstage/core-plugin-api';

export const tfStateApiRef = createApiRef<TfStateApi>({
  id: 'plugin.s3-tfstate.service',
});

export interface TfStateApi {
  getResources(): Promise<TfStateResource[]>;
  updateResources(): Promise<void>; // If you have an update endpoint
}

export interface TfStateResource {
  name: string;
  type: string;
  id: string;
  url: string | null;
  dependencies: string[];
}

export class TfStateApiClient implements TfStateApi {
  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly identityApi: IdentityApi,
  ) {}

  async getResources(): Promise<TfStateResource[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('s3-tfstate-backend');
    const url = `${baseUrl}/tfstate`;

    // Use getCredentials to fetch the token
    const { token } = await this.identityApi.getCredentials();

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch tfstate resources, HTTP status ${response.status}`,
      );
    }

    const data: TfStateResource[] = await response.json();
    return data;
  }

  async updateResources(): Promise<void> {
    const baseUrl = await this.discoveryApi.getBaseUrl('s3-tfstate-backend');
    const url = `${baseUrl}/tfstate/update`;

    // Use getCredentials to fetch the token
    const { token } = await this.identityApi.getCredentials();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to update tfstate resources, HTTP status ${response.status}`,
      );
    }
  }
}
