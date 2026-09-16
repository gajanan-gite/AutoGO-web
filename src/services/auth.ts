import { User, UserRole } from '../types';

const CURRENT_USER_KEY = 'autogo_current_user_id_v2';
const CURRENT_TOKEN_KEY = 'autogo_session_token_v2';

type AuthListener = (user: User | null) => void;

class AuthService {
  private currentUser: User | null = null;
  private token: string | null = null;
  private listeners: Set<AuthListener> = new Set();
  private demoMode = true;

  constructor() {
    this.token = typeof window !== 'undefined' ? localStorage.getItem(CURRENT_TOKEN_KEY) : null;
    this.init();
  }

  public getToken(): string | null {
    return this.token;
  }

  public getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...extraHeaders,
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    // Extract CSRF token cookie if present in document
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)autogo_csrf_token=([^;]+)/);
      if (match && match[1]) {
        headers['X-CSRF-Token'] = decodeURIComponent(match[1]);
      }
    }
    return headers;
  }

  public isDemoMode(): boolean {
    return this.demoMode;
  }

  private async init() {
    // 1. Fetch system config to determine demo mode status
    try {
      const configRes = await fetch('/api/config');
      if (configRes.ok) {
        const configData = await configRes.json();
        this.demoMode = !!configData.demoMode;
      }
    } catch {
      // Offline or server booting
    }

    // 2. Check if active session exists on server
    try {
      const headers: Record<string, string> = {};
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const res = await fetch('/api/users/me', {
        credentials: 'include',
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          this.currentUser = data.user;
          this.notify();
          return;
        }
      }
    } catch {
      // Session verification network error
    }

    // 3. In demo mode: provide default persona for immediate interactive exploration
    if (this.demoMode) {
      const savedUserId = localStorage.getItem(CURRENT_USER_KEY) || 'user_alex_renter';
      await this.switchUser(savedUserId);
    } else {
      this.currentUser = null;
      this.notify();
    }
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.currentUser);
      } catch (err) {
        console.error('Auth listener error:', err);
      }
    }
  }

  public async switchUser(userId: string): Promise<User | null> {
    try {
      const res = await fetch('/api/auth/demo-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        this.currentUser = data.user;
        if (data.token) {
          this.token = data.token;
          localStorage.setItem(CURRENT_TOKEN_KEY, data.token);
        }
        localStorage.setItem(CURRENT_USER_KEY, data.user.id);
        this.notify();
        return data.user;
      }
    } catch (err) {
      console.warn('Demo switch failed:', err);
    }
    return null;
  }

  public async login(email: string, password?: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        this.currentUser = data.user;
        if (data.token) {
          this.token = data.token;
          localStorage.setItem(CURRENT_TOKEN_KEY, data.token);
        }
        localStorage.setItem(CURRENT_USER_KEY, data.user.id);
        this.notify();
        return { success: true, user: data.user };
      }

      return {
        success: false,
        error: data.error || 'Authentication failed. Please verify your credentials.',
      };
    } catch (err: any) {
      return { success: false, error: 'Network error communicating with authentication service.' };
    }
  }

  public async register(data: {
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    password?: string;
    profileImage?: string;
    bio?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (res.ok && resData.success && resData.user) {
        this.currentUser = resData.user;
        if (resData.token) {
          this.token = resData.token;
          localStorage.setItem(CURRENT_TOKEN_KEY, resData.token);
        }
        localStorage.setItem(CURRENT_USER_KEY, resData.user.id);
        this.notify();
        return { success: true, user: resData.user };
      }

      return {
        success: false,
        error: resData.error || 'Failed to create account.',
      };
    } catch (err: any) {
      return { success: false, error: 'Network error registering account.' };
    }
  }

  public async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network errors during logout
    }

    this.currentUser = null;
    this.token = null;
    localStorage.removeItem(CURRENT_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    this.notify();
  }
}

export const auth = new AuthService();
