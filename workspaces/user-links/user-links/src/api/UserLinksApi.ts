import { createApiRef, DiscoveryApi, IdentityApi } from '@backstage/core-plugin-api';

export const userLinksApiRef = createApiRef<UserLinksApi>({
  id: 'plugin.user-links.service',
});

export interface UserLinksApi {
  getUserLinks(userId: string): Promise<UserLink[]>;
  addUserLink(linkData: { userId: string; name: string; link: string; description?: string }): Promise<void>;
  deleteUserLink(id: number): Promise<void>;
}
export type UserLink = {
      id: number;
      userId: string;
      name: string;
      link: string;
      description?: string;
  };
  export class UserLinksClient {
    private readonly discoveryApi: DiscoveryApi;
    private readonly identityApi: IdentityApi;
  
    constructor({
      discoveryApi,
      identityApi,
    }: {
      discoveryApi: DiscoveryApi;
      identityApi: IdentityApi;
    }) {
      this.discoveryApi = discoveryApi;
      this.identityApi = identityApi;
    }

  private async getAuthHeaders() {
    const { token } = await this.identityApi.getCredentials();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getUserLinks(userId: string): Promise<UserLink[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('user-links-backend');
    const response = await fetch(`${baseUrl}/user-links/${userId}`, {
      headers: await this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to fetch user links`);
    return await response.json();
  }

  async addUserLink(linkData: { userId: string; name: string; link: string; description?: string }): Promise<void> {
    const baseUrl = await this.discoveryApi.getBaseUrl('user-links-backend');
    const { token } = await this.identityApi.getCredentials();

    const response = await fetch(`${baseUrl}/user-links`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`, 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(linkData),
    });

    if (!response.ok) {
      throw new Error(`Failed to add user link: ${response.statusText}`);
    }
  }


  async deleteUserLink(id: number): Promise<void> {
    const baseUrl = await this.discoveryApi.getBaseUrl('user-links-backend');
    await fetch(`${baseUrl}/user-links/${id}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });
  }
}
