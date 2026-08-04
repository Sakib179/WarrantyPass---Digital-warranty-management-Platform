export interface ApiSuccess<TData, TMeta = Record<string, never>> {
  success: true;
  data: TData;
  meta?: TMeta;
}

export interface ApiErrorDetail {
  path?: string;
  message: string;
  code?: string;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details: ApiErrorDetail[];
  };
}

export type ApiResponse<TData, TMeta = Record<string, never>> =
  ApiSuccess<TData, TMeta> | ApiErrorBody;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface HealthDto {
  service: string;
  status: 'healthy' | 'degraded';
  version: string;
  timestamp: string;
  uptime: number;
}

export interface DatabaseHealthDto {
  service: 'database';
  status: 'healthy';
  latencyMs: number;
  timestamp: string;
}

export interface VersionDto {
  service: string;
  version: string;
  apiVersion: 'v1';
}
