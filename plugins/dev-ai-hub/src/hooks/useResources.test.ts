import { act, renderHook, waitFor } from '@testing-library/react';
import { useApi } from '@backstage/core-plugin-api';
import { useResources } from './useResources';

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useApi: jest.fn(),
}));

const mockUseApi = useApi as jest.Mock;

describe('useResources', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts in a loading state with no items and no error', () => {
    mockUseApi.mockReturnValue({
      getResources: jest.fn(() => new Promise(() => {})),
    });

    const { result } = renderHook(() => useResources());

    expect(result.current.loading).toBe(true);
    expect(result.current.items).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  it('resolves to the fetched items and clears the loading state', async () => {
    const items = [{ name: 'a' }, { name: 'b' }];
    mockUseApi.mockReturnValue({
      getResources: jest.fn().mockResolvedValue(items),
    });

    const { result } = renderHook(() => useResources());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual(items);
    expect(result.current.error).toBeUndefined();
  });

  it('resolves to an empty array without treating it as an error', async () => {
    mockUseApi.mockReturnValue({
      getResources: jest.fn().mockResolvedValue([]),
    });

    const { result } = renderHook(() => useResources());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeUndefined();
  });

  it('surfaces a rejection as an Error and stops loading', async () => {
    mockUseApi.mockReturnValue({
      getResources: jest.fn().mockRejectedValue(new Error('boom')),
    });

    const { result } = renderHook(() => useResources());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.items).toBeUndefined();
  });

  it('wraps a non-Error rejection in an Error', async () => {
    mockUseApi.mockReturnValue({
      getResources: jest.fn().mockRejectedValue('a plain string failure'),
    });

    const { result } = renderHook(() => useResources());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('a plain string failure');
  });

  it('ignores a stale resolution after the api ref changes', async () => {
    let resolveFirst: (items: unknown[]) => void = () => {};
    const firstCall = new Promise(resolve => {
      resolveFirst = resolve;
    });
    const firstApi = { getResources: jest.fn().mockReturnValue(firstCall) };
    const secondApi = {
      getResources: jest.fn().mockResolvedValue([{ name: 'fresh' }]),
    };
    mockUseApi.mockReturnValue(firstApi);

    const { result, rerender } = renderHook(() => useResources());

    mockUseApi.mockReturnValue(secondApi);
    rerender();

    await waitFor(() =>
      expect(result.current.items).toEqual([{ name: 'fresh' }]),
    );

    // The stale first call resolving afterwards must not clobber the fresh result.
    await act(async () => {
      resolveFirst([{ name: 'stale' }]);
    });
    expect(result.current.items).toEqual([{ name: 'fresh' }]);
  });
});
