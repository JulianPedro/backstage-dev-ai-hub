module.exports = {
  ...require('@backstage/cli/config/eslint-factory')(__dirname),
  overrides: [
    {
      // `dev/` is the local harness — an app, not plugin code. Apps are what
      // load the Backstage UI stylesheet (the standard app template does it in
      // packages/app), and the harness must too or every `--bui-*` token is
      // undefined. Nothing here is published; the rule stays on for `src/`.
      files: ['dev/**/*.ts', 'dev/**/*.tsx'],
      rules: {
        '@backstage/no-ui-css-imports-in-non-frontend': 'off',
      },
    },
  ],
};
