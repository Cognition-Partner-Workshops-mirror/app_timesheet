import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { msalInstance, loginRequest } from '../auth/msalConfig';

// Use empty string to make requests relative to the current origin
// Vite proxy will forward /api requests to the backend
const API_BASE_URL = '';

/** Whether legacy email-only login is enabled (dev fallback) */
const isEmailLoginEnabled = import.meta.env.VITE_ENABLE_EMAIL_LOGIN === 'true';

/**
 * ApiClient handles all HTTP communication with the backend.
 *
 * Request interceptor attaches either:
 *   - Bearer token (from MSAL) for SSO users, or
 *   - x-user-email header for legacy email-only fallback
 *
 * On 401 responses, triggers MSAL logout or clears localStorage email.
 */
class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor: attach Bearer token (SSO) or x-user-email (fallback)
    this.client.interceptors.request.use(
      async (config) => {
        // Try MSAL token first — primary auth path
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          try {
            const tokenResponse = await msalInstance.acquireTokenSilent({
              scopes: loginRequest.scopes,
              account: accounts[0],
            });
            config.headers['Authorization'] = `Bearer ${tokenResponse.accessToken}`;
            return config;
          } catch (error) {
            console.error('Silent token acquisition failed:', error);
          }
        }

        // Fallback: legacy email-based auth header
        if (isEmailLoginEnabled) {
          const userEmail = localStorage.getItem('userEmail');
          if (userEmail) {
            config.headers['x-user-email'] = userEmail;
          }
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor: handle 401 by triggering appropriate logout
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        if (error.response?.status === 401) {
          const accounts = msalInstance.getAllAccounts();
          if (accounts.length > 0) {
            // SSO user: trigger MSAL redirect logout
            try {
              await msalInstance.logoutRedirect();
            } catch (logoutError) {
              console.error('MSAL logout redirect failed:', logoutError);
            }
          } else {
            // Legacy fallback: clear stored email and redirect to login
            localStorage.removeItem('userEmail');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints

  /** Legacy email-based login (dev fallback) */
  async login(email: string) {
    const response = await this.client.post('/api/auth/login', { email });
    return response.data;
  }

  /**
   * SSO token-based login: sends the Azure AD access token to the backend.
   * The backend validates the JWT, extracts the user email from claims,
   * and creates the user record in the DB if it doesn't exist.
   */
  async loginWithToken(accessToken: string) {
    const response = await this.client.post(
      '/api/auth/login',
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/api/auth/me');
    return response.data;
  }

  // Client endpoints
  async getClients() {
    const response = await this.client.get('/api/clients');
    return response.data;
  }

  async getClient(id: number) {
    const response = await this.client.get(`/api/clients/${id}`);
    return response.data;
  }

  async createClient(clientData: { name: string; description?: string; department?: string; email?: string }) {
    const response = await this.client.post('/api/clients', clientData);
    return response.data;
  }

  async updateClient(id: number, clientData: { name?: string; description?: string; department?: string; email?: string }) {
    const response = await this.client.put(`/api/clients/${id}`, clientData);
    return response.data;
  }

  async deleteClient(id: number) {
    const response = await this.client.delete(`/api/clients/${id}`);
    return response.data;
  }

  async deleteAllClients() {
    const response = await this.client.delete('/api/clients');
    return response.data;
  }

  // Work entry endpoints
  async getWorkEntries(clientId?: number) {
    const params = clientId ? { clientId } : {};
    const response = await this.client.get('/api/work-entries', { params });
    return response.data;
  }

  async getWorkEntry(id: number) {
    const response = await this.client.get(`/api/work-entries/${id}`);
    return response.data;
  }

  async createWorkEntry(entryData: { clientId: number; hours: number; description?: string; date: string }) {
    const response = await this.client.post('/api/work-entries', entryData);
    return response.data;
  }

  async updateWorkEntry(id: number, entryData: { clientId?: number; hours?: number; description?: string; date?: string }) {
    const response = await this.client.put(`/api/work-entries/${id}`, entryData);
    return response.data;
  }

  async deleteWorkEntry(id: number) {
    const response = await this.client.delete(`/api/work-entries/${id}`);
    return response.data;
  }

  // Report endpoints
  async getClientReport(clientId: number) {
    const response = await this.client.get(`/api/reports/client/${clientId}`);
    return response.data;
  }

  async exportClientReportCsv(clientId: number) {
    const response = await this.client.get(`/api/reports/export/csv/${clientId}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async exportClientReportPdf(clientId: number) {
    const response = await this.client.get(`/api/reports/export/pdf/${clientId}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // Health check
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
