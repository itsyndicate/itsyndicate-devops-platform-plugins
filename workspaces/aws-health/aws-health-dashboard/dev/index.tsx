import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { awsHealthDashboardPlugin, AwsHealthDashboardPage } from '../src/plugin';

createDevApp()
  .registerPlugin(awsHealthDashboardPlugin)
  .addPage({
    element: <AwsHealthDashboardPage />,
    title: 'Root Page',
    path: '/aws-health-dashboard',
  })
  .render();
