import { Text } from '@backstage/ui';
import {
  RESOURCE_TYPES,
  type ResourceType,
} from '@nospt/plugin-dev-ai-hub-common';
import { getTypeMeta } from './typeMeta';
import solidStyles from './StatTiles.module.css';
import consoleStyles from './StatTiles.console.module.css';
import auroraStyles from './StatTiles.aurora.module.css';

/**
 * EXPERIMENT (2026-08-04) — three visual treatments of the type row, chosen at
 * build time. Every variant renders the same DOM and the same behaviour; they
 * differ only in stylesheet, so switching between them cannot change what the
 * component does.
 *
 * - `solid`   — shipped design: brand-coloured blocks, white content.
 * - `console` — one dark instrument panel, each type a segment lit by its hue.
 * - `aurora`  — frosted glass panes over a blurred field of the six hues.
 *
 * TO REVERT THE EXPERIMENT ENTIRELY: set this to `solid`, delete
 * `StatTiles.console.module.css` and `StatTiles.aurora.module.css`, and drop
 * their imports above. Nothing else in the plugin references them.
 *
 * Once a variant is chosen, collapse this: the winner's rules move into
 * `StatTiles.module.css` and the losers are deleted. Leaving three stylesheets
 * in the bundle is the cost of the experiment, not a design.
 */
const TILE_VARIANT: 'solid' | 'console' | 'aurora' = 'solid';

const VARIANT_STYLES = {
  solid: solidStyles,
  console: consoleStyles,
  aurora: auroraStyles,
};

const styles = VARIANT_STYLES[TILE_VARIANT];

interface StatTilesProps {
  counts: Record<ResourceType, number>;
  activeType?: ResourceType;
  onToggle: (type: ResourceType) => void;
}

/**
 * The six clickable type tiles that act as the type filter (legacy pattern):
 * click filters to that type, click again clears.
 *
 * A share bar under each tile carries that type's proportion of the catalog,
 * so the row reads as a distribution ("mostly skills, few hooks") rather than
 * six identical objects — repetition is what makes attention fall off across a
 * row, and the count alone does nothing to break it.
 */
export function StatTiles({ counts, activeType, onToggle }: StatTilesProps) {
  const total = RESOURCE_TYPES.reduce((sum, type) => sum + counts[type], 0);

  return (
    <div className={styles.grid}>
      {RESOURCE_TYPES.map(type => {
        const meta = getTypeMeta(type);
        const isActive = activeType === type;
        const share = total > 0 ? counts[type] / total : 0;
        const percent = Math.round(share * 100);
        return (
          <div
            key={type}
            className={isActive ? styles.tileActive : styles.tile}
            style={
              {
                '--tile-fill': meta.tileFill,
                '--tile-share': `${share * 100}%`,
              } as React.CSSProperties
            }
            title={`${counts[type]} of ${total} resources (${percent}%)`}
            onClick={() => onToggle(type)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') onToggle(type);
            }}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            aria-label={`Filter by ${meta.pluralLabel}`}
          >
            {/* Echoes the card's tinted icon square, but inverted: a
                translucent white panel on the tile's own colour. Hidden from
                assistive tech — the tile is already labelled. */}
            <div className={styles.tileIconBox} aria-hidden>
              <meta.Icon size={20} />
            </div>
            <div className={styles.tileText}>
              {/* Typography is set inline as well as in the stylesheet: BUI's
                  Text carries its own colour and size, and which of the two
                  wins depends on the order BUI's styles land in the host app
                  relative to this plugin's. In an app where BUI came last,
                  these fell back to BUI's own values — which is how the tile
                  labels once silently changed colour between themes. */}
              <Text
                variant="title-medium"
                weight="bold"
                className={styles.tileValue}
                style={{
                  color: 'var(--devaihub-tile-fg)',
                  fontSize: '1.75rem',
                  lineHeight: 1.1,
                }}
              >
                {counts[type]}
              </Text>
              <Text
                variant="body-small"
                className={styles.tileLabel}
                style={{
                  color:
                    'var(--devaihub-tile-fg-muted, var(--devaihub-tile-fg))',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                }}
              >
                {meta.pluralLabel}
              </Text>
            </div>
            {/* The share bar. Decorative for assistive tech — the same figure
                is already in the tile's title and derivable from the count. */}
            <div className={styles.shareTrack} aria-hidden>
              <span className={styles.shareFill} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
