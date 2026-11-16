// Centralized API client with JWT interception and token refresh

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

let accessToken: string | null = localStorage.getItem('expenseai_access_token');

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('expenseai_access_token', token);
  } else {
    localStorage.removeItem('expenseai_access_token');
  }
};

export const getAccessToken = () => accessToken;

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends httpOnly refresh token cookie (FR-03)
  });

  // Handle 401: Token expired, attempt refresh once
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setAccessToken(refreshData.accessToken);
        headers.set('Authorization', `Bearer ${refreshData.accessToken}`);

        // Retry initial request
        const retryRes = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });
        if (!retryRes.ok) {
          const err = await retryRes.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(err.error || `HTTP error ${retryRes.status}`);
        }
        return retryRes.json();
      } else {
        setAccessToken(null);
      }
    } catch {
      setAccessToken(null);
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }

  // Handle blob responses (e.g. CSV export)
  if (response.headers.get('content-type')?.includes('text/csv')) {
    return response.blob() as any;
  }

  return response.json();
}
