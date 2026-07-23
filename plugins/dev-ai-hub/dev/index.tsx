import { createDevApp } from '@backstage/dev-utils';
import { discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { AiResourcesPage } from '../src/components/AiResourcesPage';
import {
  devAiHubResourceApiRef,
  DevAiHubResourceClient,
} from '../src/api/DevAiHubResourceClient';

// Auto-select guest sign-in. The dev harness backend runs the guest auth
// provider, so real tokens are minted (required by the v2 routes, ADR-0005).
// Do NOT set enableLegacyGuestToken here — it short-circuits to a tokenless
// identity that the auth-gated v2 routes reject.
if (typeof window !== 'undefined') {
  localStorage.setItem('@backstage/core:SignInPage:provider', 'guest');
  localStorage.removeItem('enableLegacyGuestToken');
}

createDevApp()
  .registerApi({
    api: devAiHubResourceApiRef,
    deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
    factory: ({ discoveryApi, fetchApi }) =>
      new DevAiHubResourceClient(discoveryApi, fetchApi),
  })
  .addPage({
    element: <AiResourcesPage />,
    title: 'Dev AI Hub',
    path: '/dev-ai-hub',
  })
  .render();
