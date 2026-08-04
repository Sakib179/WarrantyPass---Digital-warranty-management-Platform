export type StoredFileVisibility = 'private' | 'public';

export interface UploadRequest {
  ownerId: string;
  category:
    | 'warranty-document'
    | 'invoice'
    | 'business-verification'
    | 'claim-evidence'
    | 'repair-receipt'
    | 'product-image';
  fileName: string;
  contentType: string;
  sizeBytes: number;
  visibility: StoredFileVisibility;
}

export interface SignedUpload {
  storageKey: string;
  uploadUrl: string;
  expiresAt: Date;
  requiredHeaders: Readonly<Record<string, string>>;
}

export interface SignedDownload {
  downloadUrl: string;
  expiresAt: Date;
}

export interface StoredObjectMetadata {
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  lastModifiedAt: Date;
}

export interface StoredObject {
  body: Buffer;
  metadata: StoredObjectMetadata;
}

export interface PutObjectRequest {
  storageKey: string;
  contentType: string;
  body: Buffer;
  checksumSha256: string;
}

export interface StorageProvider {
  putObject(request: PutObjectRequest): Promise<StoredObjectMetadata>;
  readObject(storageKey: string): Promise<StoredObject | null>;
  createSignedUpload(request: UploadRequest): Promise<SignedUpload>;
  createSignedDownload(storageKey: string, expiresInSeconds: number): Promise<SignedDownload>;
  getMetadata(storageKey: string): Promise<StoredObjectMetadata | null>;
  delete(storageKey: string): Promise<void>;
}

export type StorageConfiguration =
  | { provider: 'local'; rootPath: string }
  | {
      provider: 's3';
      endpoint?: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      forcePathStyle: boolean;
    };
