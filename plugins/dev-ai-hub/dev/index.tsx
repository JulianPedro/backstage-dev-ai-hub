import { createDevApp } from '@backstage/dev-utils';
import { discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { DevAiHubPage } from '../src/components/DevAiHubPage';
import { devAiHubApiRef, DevAiHubClient } from '../src/api/DevAiHubClient';

// Bypass Backstage guest auth without a running auth backend.
// The legacy token path generates the token locally — same keys the e2e
// base fixture injects via page.addInitScript().
if (typeof window !== 'undefined') {
  localStorage.setItem('@backstage/core:SignInPage:provider', 'guest');
  localStorage.setItem('enableLegacyGuestToken', 'true');
}

createDevApp()
  .registerApi({
    api: devAiHubApiRef,
    deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
    factory: ({ discoveryApi, fetchApi }) =>
      new DevAiHubClient(discoveryApi, fetchApi),
  })
  .addPage({
    element: <DevAiHubPage />,
    title: 'Dev AI Hub',
    path: '/dev-ai-hub',
  })
  .render();
