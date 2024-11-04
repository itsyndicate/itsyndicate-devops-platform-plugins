import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { examplePluginPlugin, ExamplePluginPage } from '../src/plugin';

createDevApp()
  .registerPlugin(examplePluginPlugin)
  .addPage({
    element: <ExamplePluginPage />,
    title: 'Root Page',
    path: '/example-plugin',
  })
  .render();
