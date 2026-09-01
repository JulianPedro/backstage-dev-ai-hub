import { useState } from 'react';
import { Text } from '@backstage/ui';
import { RiArrowRightSLine } from '@remixicon/react';
import styles from './CollapsibleSection.module.css';

interface CollapsibleSectionProps {
  label: string;
  /** Whether the section starts expanded. */
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/**
 * A disclosure whose summary reads as a button — a bordered bar with a hover
 * state, a rotating chevron, and an explicit Show/Hide label — so the toggle is
 * discoverable without prior knowledge of the feature. Native `<details>`, so
 * it stays keyboard-toggleable.
 *
 * State-controlled: `defaultOpen` seeds the initial state and the open/closed
 * choice survives parent re-renders (the panel re-renders as the body and
 * telemetry counts load), which a bare `open={defaultOpen}` would fight.
 */
export function CollapsibleSection({
  label,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className={styles.collapsible}
      open={open}
      onToggle={e => setOpen(e.currentTarget.open)}
    >
      <summary className={styles.summary}>
        <span className={styles.label}>
          <RiArrowRightSLine size={16} className={styles.chevron} />
          <Text variant="body-small" weight="bold">
            {label}
          </Text>
        </span>
        <span className={styles.toggle}>
          <span className={styles.show}>Show</span>
          <span className={styles.hide}>Hide</span>
        </span>
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}
