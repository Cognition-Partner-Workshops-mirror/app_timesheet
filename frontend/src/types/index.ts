/**
 * TypeScript type definitions matching the backend Pydantic models.
 * These types ensure type safety across the frontend application.
 */

export type DesignPatternCategory =
  | 'structural'
  | 'communication'
  | 'data_management'
  | 'reliability'
  | 'security'
  | 'observability'
  | 'deployment';

export type ServiceType =
  | 'api_gateway'
  | 'backend_service'
  | 'database_service'
  | 'auth_service'
  | 'messaging_service'
  | 'cache_service'
  | 'cdn_service'
  | 'load_balancer'
  | 'monitoring_service'
  | 'custom';

export interface UploadedImage {
  id: string;
  filename: string;
  original_name: string;
  endpoint: string;
  description: string;
  upload_time: string;
  ai_analysis: string;
}

export interface RequirementDoc {
  id: string;
  filename: string;
  original_name: string;
  content: string;
  upload_time: string;
}

export interface DesignPattern {
  name: string;
  category: DesignPatternCategory;
  description: string;
  rationale: string;
  applied: boolean;
}

export interface ServiceEndpoint {
  method: string;
  path: string;
  description: string;
  request_schema: string;
  response_schema: string;
  auth_required: boolean;
}

export interface ServiceDefinition {
  id: string;
  name: string;
  service_type: ServiceType;
  description: string;
  responsibilities: string[];
  technology_stack: string[];
  endpoints: ServiceEndpoint[];
  dependencies: string[];
  database: string;
  protocols: string[];
  related_image_ids: string[];
  lld_generated: boolean;
}

export interface HLD {
  id: string;
  title: string;
  overview: string;
  architecture_overview: string;
  services: ServiceDefinition[];
  design_patterns: DesignPattern[];
  scalability_strategy: string;
  security_strategy: string;
  reliability_strategy: string;
  communication_patterns: string;
  deployment_strategy: string;
  raw_content: string;
  generated_at: string;
  last_modified: string;
}

export interface LLD {
  id: string;
  service_id: string;
  service_name: string;
  component_diagram: string;
  class_design: string;
  database_schema: string;
  api_contracts: string;
  sequence_flows: string;
  error_handling: string;
  data_validation: string;
  caching_strategy: string;
  logging_monitoring: string;
  security_details: string;
  raw_content: string;
  generated_at: string;
  last_modified: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  images: UploadedImage[];
  requirements: RequirementDoc[];
  hld: HLD | null;
  llds: Record<string, LLD>;
  target_scale: string;
  primary_language: string;
  cloud_provider: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  image_count: number;
  requirement_count: number;
  has_hld: boolean;
  service_count: number;
  lld_count: number;
}

/* Service type display labels */
export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  api_gateway: 'API Gateway',
  backend_service: 'Backend Service',
  database_service: 'Database Service',
  auth_service: 'Auth Service',
  messaging_service: 'Messaging Service',
  cache_service: 'Cache Service',
  cdn_service: 'CDN Service',
  load_balancer: 'Load Balancer',
  monitoring_service: 'Monitoring Service',
  custom: 'Custom',
};

/* Design pattern category display labels */
export const PATTERN_CATEGORY_LABELS: Record<DesignPatternCategory, string> = {
  structural: 'Structural',
  communication: 'Communication',
  data_management: 'Data Management',
  reliability: 'Reliability',
  security: 'Security',
  observability: 'Observability',
  deployment: 'Deployment',
};
