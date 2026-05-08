import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Simple schema for testing
const TestSchema = z.object({
  id: z.number(),
  name: z.string(),
});

describe('apiFetch Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should validate and return parsed data when schema is provided', async () => {
    const mockData = { id: 1, name: 'Test Item' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData,
    });

    const { apiFetch } = await import('../src/lib/api');
    
    const result = await apiFetch('/test', {}, TestSchema);
    expect(result).toEqual(mockData);
  });

  it('should include Authorization header when token exists', async () => {
    localStorage.setItem('token', 'fake-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 1, name: 'Test' }),
    });

    const { apiFetch } = await import('../src/lib/api');
    await apiFetch('/test', {}, TestSchema);

    const callHeaders = (mockFetch.mock.calls[0][1] as any).headers;
    expect(callHeaders['Authorization']).toBe('Bearer fake-token');
  });

  it('should handle 401 and redirect to login', async () => {
    localStorage.setItem('token', 'expired-token');
    mockFetch.mockResolvedValueOnce({
      status: 401,
      ok: false,
    });

    // Mock window.location
    const originalLocation = window.location;
    const mockLocation = { 
      pathname: '/dashboard', 
      href: '',
      startsWith: (str: string) => '/dashboard'.startsWith(str)
    };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      configurable: true
    });

    const { apiFetch } = await import('../src/lib/api');
    await apiFetch('/test');

    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.href).toBe('/login');

    Object.defineProperty(window, 'location', { value: originalLocation });
  });

  it('should throw when data does not match schema', async () => {
    const invalidData = { id: 'not-a-number', name: 'Test Item' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => invalidData,
    });

    const { apiFetch } = await import('../src/lib/api');
    
    await expect(apiFetch('/test', {}, TestSchema)).rejects.toThrow();
  });
});
