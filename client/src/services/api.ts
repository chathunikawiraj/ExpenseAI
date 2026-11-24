// Centralized API client with JWT interception and token refresh

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const apiErrorFromResponse = async (response: Response): Promise<ApiError> => {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    const message = response.status >= 500
      ? 'ExpenseAI is temporarily unavailable. Please try again later.'
      : 'The server returned an unreadable response.';
    return new ApiError(message, undefined, response.status);
  }

  const details = body !== null && typeof body === 'object'
    ? body as Record<string, unknown>
    : {};
  const validationMessages = Array.isArray(details.details)
    ? details.details
        .map((issue) => {
          if (issue === null || typeof issue !== 'object') return null;
          const validationIssue = issue as Record<string, unknown>;
          if (typeof validationIssue.message !== 'string') return null;
          const field = typeof validationIssue.field === 'string'
            ? `${validationIssue.field}: `
            : '';
          return `${field}${validationIssue.message}`;
        })
        .filter((message): message is string => message !== null)
    : [];
  const message = typeof details.error === 'string'
    ? details.error
    : `HTTP error ${response.status}`;

  return new ApiError(
    validationMessages.length > 0
      ? `${message} ${validationMessages.join(' ')}`
      : message,
    typeof details.code === 'string' ? details.code : undefined,
    response.status,
  );
};

const fetchApi = async (url: string, options: RequestInit): Promise<Response> => {
  try {
    return await fetch(url, options);
  } catch (cause) {
    if (cause instanceof TypeError) {
      throw new ApiError('Unable to connect to ExpenseAI. Check your connection and try again.', 'NETWORK_ERROR');
    }
    throw cause;
  }
};

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

  const response = await fetchApi(url, {
    ...options,
    headers,
    credentials: 'include', // sends httpOnly refresh token cookie (FR-03)
  });

  // Handle 401: Token expired, attempt refresh once
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    try {
      const refreshRes = await fetchApi(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setAccessToken(refreshData.accessToken);
        headers.set('Authorization', `Bearer ${refreshData.accessToken}`);

        // Retry initial request
        const retryRes = await fetchApi(url, {
          ...options,
          headers,
          credentials: 'include',
        });
        if (!retryRes.ok) {
          throw await apiErrorFromResponse(retryRes);
        }
        return retryRes.json();
      } else {
        setAccessToken(null);
      }
    } catch (cause) {
      setAccessToken(null);
      if (cause instanceof ApiError) throw cause;
    }
  }

  if (!response.ok) {
    throw await apiErrorFromResponse(response);
  }

  // Handle blob responses (e.g. CSV export)
  if (response.headers.get('content-type')?.includes('text/csv')) {
    return response.blob() as any;
  }

  return response.json();
}
