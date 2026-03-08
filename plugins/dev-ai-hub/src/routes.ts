import { createRouteRef, createSubRouteRef } from '@backstage/core-plugin-api';

export const rootRouteRef = createRouteRef({ id: 'dev-ai-hub' });

export const assetRouteRef = createSubRouteRef({
  id: 'dev-ai-hub/asset',
  parent: rootRouteRef,
  path: '/:assetId',
});
