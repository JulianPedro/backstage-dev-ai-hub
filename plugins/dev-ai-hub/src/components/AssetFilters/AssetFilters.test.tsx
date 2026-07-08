import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { AssetFilters } from './AssetFilters';
import type { AssetFiltersValue } from './AssetFilters';

/**
 * Tag filter regression tests
 *
 * Issue: selecting a tag that yields 0 results caused the tag dropdown
 * to disappear (availableTags became []). User was stuck — could not
 * clear the tag to restore results.
 *
 * Fix: show tag dropdown when (availableTags.length > 0 OR value.tags.length > 0)
 */

describe('AssetFilters — tag dropdown regression #1046', () => {
  const defaultValue: AssetFiltersValue = {
    types: [],
    tools: [],
    search: '',
    tags: [],
  };

  function renderTags(overrides?: Partial<Parameters<typeof AssetFilters>[0]>) {
    return render(
      <AssetFilters
        value={defaultValue}
        onChange={() => {}}
        availableTags={[]}
        {...overrides}
      />,
    );
  }

  /* ─── Visibility rules ─────────────────────────────────────────────── */

  it('shows tag dropdown when availableTags is non-empty (no selection)', () => {
    renderTags({ availableTags: ['python', 'react'] });
    expect(screen.getByLabelText('Filter by tags')).toBeInTheDocument();
  });

  it('hides tag dropdown when availableTags is empty AND no tag selected', () => {
    renderTags({ availableTags: [], value: defaultValue });
    expect(screen.queryByLabelText('Filter by tags')).not.toBeInTheDocument();
  });

  it('KEEPS tag dropdown visible when tag selected but availableTags became empty (regression #1046)', () => {
    renderTags({ availableTags: [], value: { ...defaultValue, tags: ['python'] } });
    expect(screen.getByLabelText('Filter by tags')).toBeInTheDocument();
  });

  /* ─── Options merge ────────────────────────────────────────────────── */

  it('includes selected tags in dropdown options even when 0 results', () => {
    renderTags({ availableTags: [], value: { ...defaultValue, tags: ['stuck-tag'] } });
    // The selected tag must still appear in the dropdown so it can be un-selected
    expect(screen.getByText('#stuck-tag')).toBeInTheDocument();
  });

  it('shows helper placeholder when 0 results with active tag selection', () => {
    renderTags({ availableTags: [], value: { ...defaultValue, tags: ['stuck-tag'] } });
    expect(screen.getByText('Clear tags to see results…')).toBeInTheDocument();
  });
});
