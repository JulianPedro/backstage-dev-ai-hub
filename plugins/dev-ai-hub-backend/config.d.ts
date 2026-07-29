export interface Config {
  devAiHub?: {
    /**
     * Install telemetry (ADR-0007). The write path is always active — there
     * is no feature flag — so a salt is always in play; the only question is
     * where it comes from.
     */
    telemetry?: {
      /**
       * Stable salt used to hash the caller identity recorded on telemetry
       * events. Optional: when unset, the plugin generates a salt on first
       * start and persists it in its own database, which keeps hashes stable
       * across restarts. Set it explicitly to keep the salt outside the
       * database it protects — and then it must not change across
       * restarts/deploys, or historical per-day dedup keys become
       * unrecoverable.
       * @visibility secret
       */
      salt?: string;
    };
  };
}
