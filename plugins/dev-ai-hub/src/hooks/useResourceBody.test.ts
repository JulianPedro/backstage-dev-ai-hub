import { renderHook, waitFor } from '@testing-library/react';
import { useApi } from '@backstage/core-plugin-api';
import { clearResourceBodyCache, useResourceBody } from './useResourceBody';

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useApi: jest.fn(),
}));

const mockUseApi = useApi as jest.Mock;

describe('useResourceBody', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearResourceBodyCache();
  });

  it('serves a repeat open of the same resource from cache, without refetching', async () => {
    const getEntityBody = jest
      .fn()
      .mockResolvedValue({ content: '# Body', contentType: 'text/markdown' });
    mockUseApi.mockReturnValue({ getEntityBody });

    const first = renderHook(() =>
      useResourceBody('airesource:default/x', true),
    );
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(getEntityBody).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = renderHook(() =>
      useResourceBody('airesource:default/x', true),
    );
    await waitFor(() =>
      expect(second.result.current.body?.content).toBe('# Body'),
    );
    expect(getEntityBody).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed fetch, so a later open refetches', async () => {
    const getEntityBody = jest.fn().mockRejectedValue(new Error('boom'));
    mockUseApi.mockReturnValue({ getEntityBody });

    const first = renderHook(() =>
      useResourceBody('airesource:default/x', true),
    );
    await waitFor(() => expect(first.result.current.error).toBe('upstream'));
    first.unmount();

    const second = renderHook(() =>
      useResourceBody('airesource:default/x', true),
    );
    await waitFor(() => expect(second.result.current.error).toBe('upstream'));
    expect(getEntityBody).toHaveBeenCalledTimes(2);
  });
});
