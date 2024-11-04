import { s3TfstateResourcesPlugin } from './plugin';

describe('s3-tfstate-resources', () => {
  it('should export plugin', () => {
    expect(s3TfstateResourcesPlugin).toBeDefined();
  });
});
