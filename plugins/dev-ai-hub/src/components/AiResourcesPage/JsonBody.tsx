import { useMemo } from 'react';
import {
  PrismLight,
  type SyntaxHighlighterProps,
} from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';

// react-syntax-highlighter's bundled @types/react (v19) doesn't structurally
// match this repo's React 18 types, so the class component fails the JSX
// element-type check as-is; recast to a plain function-component shape.
const SyntaxHighlighter =
  PrismLight as unknown as React.ComponentType<SyntaxHighlighterProps>;

PrismLight.registerLanguage('json', json);

/**
 * Token colours are drawn from the app's own `--bui-fg-*` tokens, not a
 * canned Prism theme — those ship a single hardcoded palette and would go
 * unreadable in whichever of light/dark mode they weren't built for. Reusing
 * the app's own tokens means highlighting follows the active theme for free.
 */
const JSON_HIGHLIGHT_STYLE = {
  'code[class*="language-"]': {
    color: 'var(--bui-fg-primary)',
    background: 'none',
  },
  'pre[class*="language-"]': {
    color: 'var(--bui-fg-primary)',
    background: 'none',
  },
  property: { color: 'var(--bui-fg-announcement)' },
  string: { color: 'var(--bui-fg-warning)' },
  number: { color: 'var(--bui-fg-warning)' },
  boolean: { color: 'var(--bui-fg-warning)' },
  null: { color: 'var(--bui-fg-warning)' },
  punctuation: { color: 'var(--bui-fg-secondary)' },
  operator: { color: 'var(--bui-fg-secondary)' },
};

interface JsonBodyProps {
  content: string;
  className: string;
}

/**
 * Pretty-prints and syntax-highlights a JSON resource body (ADR-0014). Falls
 * back to the raw text, unhighlighted, when the content doesn't parse as
 * JSON — a malformed or foreign file must stay visible, not blank the panel.
 */
export function JsonBody({ content, className }: JsonBodyProps) {
  const formatted = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return null;
    }
  }, [content]);

  if (formatted === null) {
    return (
      <pre className={className}>
        <code>{content}</code>
      </pre>
    );
  }

  return (
    <SyntaxHighlighter
      language="json"
      style={JSON_HIGHLIGHT_STYLE}
      className={className}
      customStyle={{ margin: 0, padding: 0 }}
    >
      {formatted}
    </SyntaxHighlighter>
  );
}
