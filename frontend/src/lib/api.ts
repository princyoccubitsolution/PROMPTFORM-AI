export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || '127.0.0.1';
    return `http://${host}:5050/api`;
  }
  return 'http://127.0.0.1:5050/api';
}

export const BASE_URL = 'http://127.0.0.1:5050/api';

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('promptform_access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

// Intercepts connection errors and throws meaningful messages
function parseNetworkError(error: any): never {
  const msg = error?.message || '';
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('NetworkError') ||
    msg.includes('Failed to connect')
  ) {
    throw new Error('Backend server is not running or unreachable. Please start it using "npm run dev".');
  }
  throw error;
}

// Silently refreshes access token using refresh token rotation
async function handleTokenRefresh(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem('promptform_refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${getBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      localStorage.removeItem('promptform_access_token');
      localStorage.removeItem('promptform_refresh_token');
      localStorage.removeItem('promptform_user_email');
      localStorage.removeItem('promptform_user_name');
      return null;
    }

    const data = await response.json();
    localStorage.setItem('promptform_access_token', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('promptform_refresh_token', data.refreshToken);
    }
    return data.accessToken;
  } catch (error) {
    return null;
  }
}

// Fetch wrapper that handles token refreshing and retry logic on 401
async function request(endpoint: string, options: RequestInit) {
  const url = `${getBaseUrl()}${endpoint}`;
  let response;
  
  try {
    response = await fetch(url, { ...options, cache: 'no-store' });
  } catch (error) {
    parseNetworkError(error);
  }

  if (response.status === 401 && typeof window !== 'undefined') {
    const newAccessToken = await handleTokenRefresh();
    if (newAccessToken) {
      const updatedHeaders = {
        ...getHeaders(),
        'Authorization': `Bearer ${newAccessToken}`,
      };
      try {
        response = await fetch(url, { ...options, headers: updatedHeaders, cache: 'no-store' });
      } catch (error) {
        parseNetworkError(error);
      }
    } else {
      throw new Error('Authentication token expired. Please log in again.');
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.error || errorData.message || '';
    
    if (errorData.error === 'SESSION_MISMATCH' && typeof window !== 'undefined') {
      localStorage.removeItem('promptform_access_token');
      localStorage.removeItem('promptform_refresh_token');
      localStorage.removeItem('promptform_user_email');
      localStorage.removeItem('promptform_user_name');
      window.location.href = '/login?reason=concurrent_session';
      throw new Error(errorMsg || 'Logged out because your account is active on another device.');
    }

    const error = new Error(errorMsg || `HTTP error ${response.status}`) as any;
    error.status = response.status;
    error.data = errorData;

    if (response.status === 403 && errorData.status === 'restricted') {
      throw error;
    }
    if (response.status === 403) {
      throw new Error(errorMsg || 'Access Denied.');
    }
    if (
      (errorMsg.toLowerCase().includes('prisma') ||
      errorMsg.toLowerCase().includes('postgresql') ||
      errorMsg.toLowerCase().includes('database connection')) &&
      !errorMsg.toLowerCase().includes('gemini') &&
      !errorMsg.toLowerCase().includes('ai')
    ) {
      throw new Error('Database connection failed. Please check PostgreSQL status.');
    }
    if (errorMsg) {
      throw new Error(errorMsg);
    }
    throw error;
  }

  return response.json();
}

export const api = {
  async get(endpoint: string) {
    return request(endpoint, {
      method: 'GET',
      headers: getHeaders(),
    });
  },

  async post(endpoint: string, body?: any) {
    return request(endpoint, {
      method: 'POST',
      headers: getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  async postMultipart(endpoint: string, formData: FormData) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('promptform_access_token') : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return request(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    });
  },

  async put(endpoint: string, body: any) {
    return request(endpoint, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
  },

  async patch(endpoint: string, body: any) {
    return request(endpoint, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
  },

  async delete(endpoint: string) {
    return request(endpoint, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  async upload(endpoint: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('promptform_access_token') : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${BASE_URL}${endpoint}`;
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });
    } catch (error) {
      parseNetworkError(error);
    }

    if (response.status === 401 && typeof window !== 'undefined') {
      const newAccessToken = await handleTokenRefresh();
      if (newAccessToken) {
        const retryHeaders = {
          'Authorization': `Bearer ${newAccessToken}`,
        };
        try {
          response = await fetch(url, {
            method: 'POST',
            headers: retryHeaders,
            body: formData,
          });
        } catch (error) {
          parseNetworkError(error);
        }
      } else {
        throw new Error('Authentication token expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || '';
      if (response.status === 403) {
        throw new Error(errorMsg || 'Access Denied.');
      }
      throw new Error(errorMsg || `HTTP error ${response.status}`);
    }

    return response.json();
  }
};
