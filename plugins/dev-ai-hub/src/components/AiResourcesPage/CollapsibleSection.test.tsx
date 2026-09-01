import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { CollapsibleSection } from './CollapsibleSection';

jest.mock('@backstage/ui', () => ({
  Text: ({ children }: any) => <span>{children}</span>,
}));

/** jsdom does not toggle <details> on summary click, so drive it the way the
 * browser does: flip `open` and dispatch the native `toggle` event. */
function toggle(details: HTMLDetailsElement, open: boolean) {
  details.open = open;
  fireEvent(details, new Event('toggle'));
}

describe('CollapsibleSection', () => {
  it('renders the label, both Show/Hide affordances, and the children', () => {
    render(
      <CollapsibleSection label="Content">
        <span data-testid="child">body</span>
      </CollapsibleSection>,
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Show')).toBeInTheDocument();
    expect(screen.getByText('Hide')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('starts collapsed by default', () => {
    const { container } = render(
      <CollapsibleSection label="Content">body</CollapsibleSection>,
    );
    expect(container.querySelector('details')!.open).toBe(false);
  });

  it('starts expanded when defaultOpen is set', () => {
    const { container } = render(
      <CollapsibleSection label="Content" defaultOpen>
        body
      </CollapsibleSection>,
    );
    expect(container.querySelector('details')!.open).toBe(true);
  });

  it('tracks the open state as the user toggles it', () => {
    const { container } = render(
      <CollapsibleSection label="Content">body</CollapsibleSection>,
    );
    const details = container.querySelector('details')!;

    toggle(details, true);
    expect(details.open).toBe(true);

    toggle(details, false);
    expect(details.open).toBe(false);
  });

  it('keeps the user’s choice across a parent re-render (not reset to defaultOpen)', () => {
    const { container, rerender } = render(
      <CollapsibleSection label="Content" defaultOpen>
        body
      </CollapsibleSection>,
    );
    const details = container.querySelector('details')!;
    expect(details.open).toBe(true);

    // User collapses it…
    toggle(details, false);
    expect(details.open).toBe(false);

    // …and a parent re-render must not force it back open.
    rerender(
      <CollapsibleSection label="Content" defaultOpen>
        body
      </CollapsibleSection>,
    );
    expect(container.querySelector('details')!.open).toBe(false);
  });
});
