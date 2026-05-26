/**
 * API client for communicating with the FastAPI backend.
 * Provides typed functions for all project, HLD, and LLD operations.
 */

import axios from 'axios';
import type {
  HLD,
  LLD,
  Project,
  ProjectSummary,
  RequirementDoc,
  UploadedImage,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

/* ---- Projects ---- */

export async function listProjects(): Promise<ProjectSummary[]> {
  const { data } = await api.get<ProjectSummary[]>('/projects');
  return data;
}

export async function createProject(body: {
  name: string;
  description?: string;
  target_scale?: string;
  primary_language?: string;
  cloud_provider?: string;
}): Promise<Project> {
  const { data } = await api.post<Project>('/projects', body);
  return data;
}

export async function getProject(id: string): Promise<Project> {
  const { data } = await api.get<Project>(`/projects/${id}`);
  return data;
}

export async function updateProject(
  id: string,
  body: Partial<Project>
): Promise<Project> {
  const { data } = await api.put<Project>(`/projects/${id}`, body);
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`);
}

/* ---- Images ---- */

export async function uploadImage(
  projectId: string,
  file: File,
  endpoint?: string,
  description?: string
): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append('file', file);
  if (endpoint) formData.append('endpoint', endpoint);
  if (description) formData.append('description', description);

  const { data } = await api.post<UploadedImage>(
    `/projects/${projectId}/images`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export async function deleteImage(
  projectId: string,
  imageId: string
): Promise<void> {
  await api.delete(`/projects/${projectId}/images/${imageId}`);
}

/* ---- Requirements ---- */

export async function uploadRequirement(
  projectId: string,
  file?: File,
  content?: string,
  title?: string
): Promise<RequirementDoc> {
  const formData = new FormData();
  if (file) formData.append('file', file);
  if (content) formData.append('content', content);
  if (title) formData.append('title', title);

  const { data } = await api.post<RequirementDoc>(
    `/projects/${projectId}/requirements`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export async function deleteRequirement(
  projectId: string,
  reqId: string
): Promise<void> {
  await api.delete(`/projects/${projectId}/requirements/${reqId}`);
}

export async function updateRequirement(
  projectId: string,
  reqId: string,
  content: string,
  title?: string
): Promise<RequirementDoc> {
  const formData = new FormData();
  formData.append('content', content);
  if (title) formData.append('title', title);

  const { data } = await api.put<RequirementDoc>(
    `/projects/${projectId}/requirements/${reqId}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

/* ---- HLD ---- */

export async function generateHLD(
  projectId: string,
  additionalContext?: string,
  regenerate?: boolean
): Promise<HLD> {
  const { data } = await api.post<HLD>(`/projects/${projectId}/hld/generate`, {
    additional_context: additionalContext || '',
    regenerate: regenerate || false,
  });
  return data;
}

export async function getHLD(projectId: string): Promise<HLD | null> {
  const { data } = await api.get<HLD | null>(`/projects/${projectId}/hld`);
  return data;
}

export async function updateHLD(
  projectId: string,
  body: Partial<HLD>
): Promise<HLD> {
  const { data } = await api.put<HLD>(`/projects/${projectId}/hld`, body);
  return data;
}

/* ---- Services ---- */

export async function addService(
  projectId: string,
  body: {
    name: string;
    service_type?: string;
    description?: string;
    technology_stack?: string[];
  }
): Promise<Project> {
  const { data } = await api.post<Project>(
    `/projects/${projectId}/services`,
    body
  );
  return data;
}

export async function updateService(
  projectId: string,
  serviceId: string,
  body: Record<string, unknown>
): Promise<Project> {
  const { data } = await api.put<Project>(
    `/projects/${projectId}/services/${serviceId}`,
    body
  );
  return data;
}

export async function deleteService(
  projectId: string,
  serviceId: string
): Promise<Project> {
  const { data } = await api.delete<Project>(
    `/projects/${projectId}/services/${serviceId}`
  );
  return data;
}

/* ---- LLD ---- */

export async function generateLLD(
  projectId: string,
  serviceId: string,
  additionalContext?: string,
  regenerate?: boolean
): Promise<LLD> {
  const { data } = await api.post<LLD>(`/projects/${projectId}/lld/generate`, {
    service_id: serviceId,
    additional_context: additionalContext || '',
    regenerate: regenerate || false,
  });
  return data;
}

export async function getLLD(
  projectId: string,
  serviceId: string
): Promise<LLD> {
  const { data } = await api.get<LLD>(
    `/projects/${projectId}/lld/${serviceId}`
  );
  return data;
}

export async function updateLLD(
  projectId: string,
  serviceId: string,
  body: Partial<LLD>
): Promise<LLD> {
  const { data } = await api.put<LLD>(
    `/projects/${projectId}/lld/${serviceId}`,
    body
  );
  return data;
}

/* ---- Utility ---- */

/** Get the full URL for an uploaded image */
export function getImageUrl(filename: string): string {
  return `${API_BASE}/uploads/images/${filename}`;
}
