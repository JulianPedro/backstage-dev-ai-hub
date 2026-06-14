export interface Config {
  devAiHub?: {
    /**
     * Asset providers — each entry syncs a Git repository as source-of-truth.
     */
    providers?: Array<{
      /** Unique identifier for this provider (used as a key in the DB and API). */
      id: string;
      /** Repository host type. Currently only 'github' is supported. */
      type: 'github';
      /** Clone URL of the repository containing AI assets. */
      target: string;
      /** Branch to sync. Defaults to 'main'. */
      branch?: string;
      schedule?: {
        frequency?: {
          minutes?: number;
          hours?: number;
        };
        timeout?: {
          minutes?: number;
          hours?: number;
        };
      };
      filters?: {
        /** Only sync assets targeting these AI tools. */
        tools?: string[];
        /** Only sync assets of these types. */
        types?: string[];
      };
    }>;

    /**
     * UI customization — served to the frontend via GET /api/dev-ai-hub/ui-config.
     */
    ui?: {
      /**
       * Override the accent color for each asset type.
       * Accepts any valid CSS color string (hex, rgb, hsl).
       * Defaults: instruction=#2563EB, agent=#7C3AED, skill=#059669,
       *           workflow=#D97706, prompt=#EC4899, bundle=#8B5CF6
       */
      typeColors?: {
        instruction?: string;
        agent?: string;
        skill?: string;
        workflow?: string;
        prompt?: string;
        bundle?: string;
      };
      /**
       * Which asset types to show as stat cards at the top of the page (max 4).
       * Any remaining slots are filled with defaults in order: instruction, agent, skill, workflow.
       * Example: [instruction, prompt, agent, skill]
       */
      statsCards?: string[];
    };
  };
}
