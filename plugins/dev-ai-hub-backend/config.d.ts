export interface Config {
  devAiHub?: {
    /**
     * Install telemetry (ADR-0007). The write path is always active — there
     * is no feature flag — so the salt is required wherever `devAiHub` is
     * configured at all.
     */
    telemetry: {
      /**
       * Stable salt used to hash the caller identity recorded on telemetry
       * events. Must not change across restarts/deploys, or historical
       * per-day dedup keys become unrecoverable.
       * @visibility secret
       */
      salt: string;
    };
  };
}
