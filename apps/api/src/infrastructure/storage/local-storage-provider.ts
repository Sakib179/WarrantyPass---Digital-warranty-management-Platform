import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

import type {
  PutObjectRequest,
  SignedDownload,
  SignedUpload,
  StorageProvider,
  StoredObject,
  StoredObjectMetadata,
  UploadRequest,
} from './storage-provider.js';

export class LocalStorageProvider implements StorageProvider {
  private readonly absoluteRoot: string;

  public constructor(
    rootPath: string,
    private readonly apiUrl: string,
  ) {
    this.absoluteRoot = resolve(rootPath);
  }

  public async putObject(request: PutObjectRequest): Promise<StoredObjectMetadata> {
    const path = this.resolveKey(request.storageKey);
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(path, request.body, { mode: 0o600, flag: 'wx' });
    return {
      storageKey: request.storageKey,
      contentType: request.contentType,
      sizeBytes: request.body.byteLength,
      checksumSha256: request.checksumSha256,
      lastModifiedAt: new Date(),
    };
  }

  public async readObject(storageKey: string): Promise<StoredObject | null> {
    const metadata = await this.getMetadata(storageKey);
    if (!metadata) return null;
    const body = await readFile(this.resolveKey(storageKey));
    return { body, metadata };
  }

  public createSignedUpload(request: UploadRequest): Promise<SignedUpload> {
    return Promise.resolve({
      storageKey: request.fileName,
      uploadUrl: `${this.apiUrl}/api/v1/storage/local-upload-disabled`,
      expiresAt: new Date(Date.now() + 5 * 60_000),
      requiredHeaders: { 'content-type': request.contentType },
    });
  }

  public createSignedDownload(
    storageKey: string,
    expiresInSeconds: number,
  ): Promise<SignedDownload> {
    return Promise.resolve({
      downloadUrl: `${this.apiUrl}/api/v1/storage/private/${encodeURIComponent(storageKey)}`,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1_000),
    });
  }

  public async getMetadata(storageKey: string): Promise<StoredObjectMetadata | null> {
    try {
      const info = await stat(this.resolveKey(storageKey));
      return {
        storageKey,
        contentType: 'application/octet-stream',
        sizeBytes: info.size,
        checksumSha256: '',
        lastModifiedAt: info.mtime,
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  public async delete(storageKey: string): Promise<void> {
    try {
      await unlink(this.resolveKey(storageKey));
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }

  private resolveKey(storageKey: string): string {
    const path = resolve(this.absoluteRoot, storageKey);
    if (path !== this.absoluteRoot && !path.startsWith(`${this.absoluteRoot}${sep}`)) {
      throw new Error('Storage key escaped the configured local storage root.');
    }
    return path;
  }
}

function isNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as Error & { code?: string }).code === 'ENOENT'
  );
}
