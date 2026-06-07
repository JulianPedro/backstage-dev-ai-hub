import { createPermission } from '@backstage/plugin-permission-common';

export const devAiHubSyncPermission = createPermission({
  name: 'dev-ai-hub.sync.trigger',
  attributes: { action: 'create' },
});

export const devAiHubPermissions = [devAiHubSyncPermission];