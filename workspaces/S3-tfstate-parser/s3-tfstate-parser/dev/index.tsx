import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { s3TfstateResourcesPlugin, S3TfstateResourcesPage } from '../src/plugin';

createDevApp()
  .registerPlugin(s3TfstateResourcesPlugin)
  .addPage({
    element: <S3TfstateResourcesPage />,
    title: 'Root Page',
    path: '/s3-tfstate-resources',
  })
  .render();
