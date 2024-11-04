import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { awsAllResourcesPlugin, AwsAllResourcesPage } from '../src/plugin';

createDevApp()
  .registerPlugin(awsAllResourcesPlugin)
  .addPage({
    element: <AwsAllResourcesPage />,
    title: 'Root Page',
    path: '/aws-all-resources',
  })
  .render();
