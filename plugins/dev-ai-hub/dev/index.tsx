import { createRoot } from 'react-dom/client';
// Backstage UI design tokens (--bui-*). The plugin's CSS modules are built on
// them, and a consuming app is expected to load this stylesheet once — so the
// harness must too, or every component renders unstyled.
import '@backstage/ui/css/styles.css';
import { createApp } from '@backstage/frontend-defaults';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';
import { SignInPage } from '@backstage/core-components';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import userSettingsPlugin from '@backstage/plugin-user-settings/alpha';
import { devAiHubPlugin } from '../src/plugin';

/**
 * Guest sign-in for the harness. The v2 routes require real Backstage
 * credentials (ADR-0005), so the app signs in against the dev backend's guest
 * provider (`auth.providers.guest` in app-config.dev.yaml) rather than the
 * legacy tokenless identity, which those routes reject.
 */
const signInModule = createFrontendModule({
  pluginId: 'app',
  extensions: [
    SignInPageBlueprint.make({
      params: {
        loader: async () => props =>
          <SignInPage {...props} providers={['guest']} />,
      },
    }),
  ],
});

/**
 * The harness runs the plugin *as shipped*: `devAiHubPlugin` is mounted as a
 * feature, so its PageBlueprint routing, SubPage tabs and ApiBlueprint are the
 * ones under test — never a component mounted directly. The catalog plugin
 * rides along as a viewer onto the entities the plugin reads, so the
 * catalog → dev-ai-hub read path is visible end to end at `yarn start`.
 *
 * User settings carries the theme toggle. Without it the app silently follows
 * `prefers-color-scheme`, and the plugin's theme-adaptive `--bui-*` tokens can
 * only be checked in whichever mode the machine happens to be in.
 */
const app = createApp({
  features: [devAiHubPlugin, catalogPlugin, userSettingsPlugin, signInModule],
});

createRoot(document.getElementById('root')!).render(app.createRoot());
