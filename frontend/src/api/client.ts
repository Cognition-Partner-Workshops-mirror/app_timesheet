import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type {
  FilesResponse,
  FileQueryParams,
  LibraryFile,
  LibraryStats,
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  UpdateFileRequest,
} from '../types/api';

// Empty base URL so Vite proxy handles /api routing to backend
const API_BASE_URL = '';

/**
 * API client for the Digital Library backend.
 * Handles auth headers, file uploads, and all CRUD operations.
 */
class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // Longer timeout for file uploads
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Inject user email header on every request
    this.client.interceptors.request.use(
      (config) => {
        const userEmail = localStorage.getItem('userEmail');
        if (userEmail) {
          config.headers['x-user-email'] = userEmail;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Redirect to login on 401
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('userEmail');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // --- Auth endpoints ---

  async login(email: string, displayName?: string) {
    const response = await this.client.post('/api/auth/login', { email, display_name: displayName });
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/api/auth/me');
    return response.data;
  }

  // --- File endpoints ---

  /** Fetch paginated, filtered, sorted file list */
  async getFiles(params: FileQueryParams = {}): Promise<FilesResponse> {
    const response = await this.client.get('/api/files', { params });
    return response.data;
  }

  /** Get single file details with tags */
  async getFile(id: number): Promise<LibraryFile> {
    const response = await this.client.get(`/api/files/${id}`);
    return response.data;
  }

  /** Get library statistics (counts, total size) */
  async getStats(): Promise<LibraryStats> {
    const response = await this.client.get('/api/files/stats');
    return response.data;
  }

  /** Upload files via multipart form data */
  async uploadFiles(
    files: File[],
    collectionId?: number | null,
    tags?: string[],
    onProgress?: (percent: number) => void
  ) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (collectionId) formData.append('collection_id', String(collectionId));
    if (tags && tags.length > 0) formData.append('tags', JSON.stringify(tags));

    const response = await this.client.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return response.data;
  }

  /** Update file metadata */
  async updateFile(id: number, data: UpdateFileRequest) {
    const response = await this.client.put(`/api/files/${id}`, data);
    return response.data;
  }

  /** Delete a file */
  async deleteFile(id: number) {
    const response = await this.client.delete(`/api/files/${id}`);
    return response.data;
  }

  /** Toggle favorite status */
  async toggleFavorite(id: number) {
    const response = await this.client.post(`/api/files/${id}/favorite`);
    return response.data;
  }

  /** Build the preview URL for a file */
  getPreviewUrl(id: number): string {
    return `/api/files/${id}/preview`;
  }

  /** Build the download URL for a file */
  getDownloadUrl(id: number): string {
    return `/api/files/${id}/download`;
  }

  // --- Collection endpoints ---

  async getCollections(): Promise<Collection[]> {
    const response = await this.client.get('/api/collections');
    return response.data;
  }

  async getCollection(id: number): Promise<Collection> {
    const response = await this.client.get(`/api/collections/${id}`);
    return response.data;
  }

  async createCollection(data: CreateCollectionRequest): Promise<Collection> {
    const response = await this.client.post('/api/collections', data);
    return response.data;
  }

  async updateCollection(id: number, data: UpdateCollectionRequest) {
    const response = await this.client.put(`/api/collections/${id}`, data);
    return response.data;
  }

  async deleteCollection(id: number) {
    const response = await this.client.delete(`/api/collections/${id}`);
    return response.data;
  }

  // --- Health ---

  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
