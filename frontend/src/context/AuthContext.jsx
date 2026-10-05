import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Session token stored ONLY in memory
  const tokenRef = useRef(null);
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const setSessionToken = useCallback((newToken) => {
    tokenRef.current = newToken;
    setTokenState(newToken);
  }, []);

  // Fetch current user details and quota from GET /api/auth/me using in-memory token or httpOnly cookie
  const refreshUser = useCallback(async (customToken = null) => {
    try {
      const activeToken = customToken || tokenRef.current;
      const headers = {};
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers,
        credentials: 'include', // sends httpOnly cookie if present
      });

      if (res.ok) {
        const text = await res.text();
        if (text) {
          try {
            const userData = JSON.parse(text);
            setUser(userData);
            return userData;
          } catch {
            // Non-JSON response
          }
        }
      } else if (res.status === 401) {
        // Not authenticated
        setSessionToken(null);
        setUser(null);
      }
    } catch (err) {
      console.warn('Failed to fetch current user session', err);
    } finally {
      setLoading(false);
    }
    return null;
  }, [setSessionToken]);

  // On mount, check if an existing session cookie exists
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Authenticate with Google ID token: POST /api/auth/google
  const loginWithGoogle = useCallback(async (idToken) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ idToken }),
      });

      let data = null;
      const text = await res.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          // Response is not JSON
        }
      }

      if (!res.ok) {
        throw new Error((data && data.error) || 'Failed to authenticate with Google (Server error).');
      }

      if (!data) {
        throw new Error('Unexpected server response format.');
      }

      // Keep token in memory only
      setSessionToken(data.token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, [setSessionToken]);

  // Logout: call POST /api/auth/logout, clear in-memory state and clear BYOK overrides
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      const activeToken = tokenRef.current;
      const headers = {};
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      await fetch('/api/auth/logout', {
        method: 'POST',
        headers,
        credentials: 'include',
      });
    } catch (err) {
      console.warn('Logout error', err);
    } finally {
      setSessionToken(null);
      setUser(null);

      // Clear any user-supplied (BYOK) key held in "Key Config" from memory / browser storage
      try {
        localStorage.removeItem('ai_hub_keys_config');
        sessionStorage.removeItem('ai_hub_keys_config');
        localStorage.removeItem('ai_hub_current_user');
      } catch (e) {
        console.warn('Error clearing stored key configuration', e);
      }

      setLoading(false);
    }
  }, [setSessionToken]);

  // Authenticated fetch wrapper that automatically attaches Authorization header and handles 401s
  const authFetch = useCallback(async (url, options = {}) => {
    const opts = { ...options };
    opts.headers = { ...(opts.headers || {}) };
    opts.credentials = 'include';

    if (tokenRef.current) {
      opts.headers['Authorization'] = `Bearer ${tokenRef.current}`;
    }

    const response = await fetch(url, opts);

    if (response.status === 401) {
      // Clear session when 401 Unauthorized is received
      setSessionToken(null);
      setUser(null);
    }

    return response;
  }, [setSessionToken]);

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    loading,
    loginWithGoogle,
    logout,
    refreshUser,
    authFetch,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
