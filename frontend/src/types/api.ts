// User model for the digital library
export interface User {
  email: string;
  display_name: string;
  created_at?: string;
}

// Tag attached to a file
export interface Tag {
  id: number;
  name: string;
}

// File type categories supported by the library
export type FileType = 'image' | 'pdf' | 'ebook' | 'document';

// A file stored in the library
export interface LibraryFile {
  id: number;
  user_email: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  file_type: FileType;
  size: number;
  collection_id: number | null;
  collection_name?: string | null;
  collection_color?: string | null;
  is_favorite: number;
  notes: string;
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

// Collection for organizing files
export interface Collection {
  id: number;
  user_email: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  file_count: number;
  created_at: string;
  updated_at: string;
}

// Pagination metadata returned with file listings
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Response shape for paginated file listings
export interface FilesResponse {
  files: LibraryFile[];
  pagination: PaginationInfo;
}

// Library usage statistics
export interface LibraryStats {
  total_files: number;
  total_size: number;
  image_count: number;
  pdf_count: number;
  ebook_count: number;
  document_count: number;
  favorites_count: number;
}

// Query parameters for fetching files
export interface FileQueryParams {
  sort_by?: 'name' | 'date' | 'size' | 'type';
  sort_order?: 'asc' | 'desc';
  file_type?: 'all' | FileType;
  collection_id?: number | null;
  favorites_only?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

// Request body for creating a collection
export interface CreateCollectionRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

// Request body for updating a collection
export interface UpdateCollectionRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}

// Request body for updating file metadata
export interface UpdateFileRequest {
  original_name?: string;
  collection_id?: number | null;
  is_favorite?: boolean;
  notes?: string;
  tags?: string[];
}

// Login request payload
export interface LoginRequest {
  email: string;
  display_name?: string;
}

// Login response payload
export interface LoginResponse {
  message: string;
  user: User;
}
