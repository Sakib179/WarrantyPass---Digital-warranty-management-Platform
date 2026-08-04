import { randomUUID } from 'node:crypto';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type {
  PutObjectRequest,
  SignedDownload,
  SignedUpload,
  StorageProvider,
  StoredObject,
  StoredObjectMetadata,
  UploadRequest,
} from './storage-provider.js';

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;

  public constructor(
    private readonly configuration: {
      endpoint?: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      forcePathStyle: boolean;
    },
  ) {
    this.client = new S3Client({
      region: configuration.region,
      ...(configuration.endpoint ? { endpoint: configuration.endpoint } : {}),
      forcePathStyle: configuration.forcePathStyle,
      credentials: {
        accessKeyId: configuration.accessKeyId,
        secretAccessKey: configuration.secretAccessKey,
      },
    });
  }

  public async putObject(request: PutObjectRequest): Promise<StoredObjectMetadata> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.configuration.bucket,
        Key: request.storageKey,
        Body: request.body,
        ContentType: request.contentType,
        ChecksumSHA256: Buffer.from(request.checksumSha256, 'hex').toString('base64'),
        Metadata: { checksumSha256: request.checksumSha256 },
        ServerSideEncryption: 'AES256',
      }),
    );
    return {
      storageKey: request.storageKey,
      contentType: request.contentType,
      sizeBytes: request.body.byteLength,
      checksumSha256: request.checksumSha256,
      lastModifiedAt: new Date(),
    };
  }

  public async readObject(storageKey: string): Promise<StoredObject | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.configuration.bucket, Key: storageKey }),
      );
      if (!response.Body) return null;
      const body = Buffer.from(await response.Body.transformToByteArray());
      return {
        body,
        metadata: {
          storageKey,
          contentType: response.ContentType ?? 'application/octet-stream',
          sizeBytes: response.ContentLength ?? body.byteLength,
          checksumSha256: response.Metadata?.checksumsha256 ?? '',
          lastModifiedAt: response.LastModified ?? new Date(),
        },
      };
    } catch (error) {
      if (isMissingObject(error)) return null;
      throw error;
    }
  }

  public async createSignedUpload(request: UploadRequest): Promise<SignedUpload> {
    const storageKey = `${request.category}/${request.ownerId}/${randomUUID()}`;
    const command = new PutObjectCommand({
      Bucket: this.configuration.bucket,
      Key: storageKey,
      ContentType: request.contentType,
      ContentLength: request.sizeBytes,
      ServerSideEncryption: 'AES256',
    });
    const expiresIn = 5 * 60;
    return {
      storageKey,
      uploadUrl: await getSignedUrl(this.client, command, { expiresIn }),
      expiresAt: new Date(Date.now() + expiresIn * 1_000),
      requiredHeaders: { 'content-type': request.contentType },
    };
  }

  public async createSignedDownload(
    storageKey: string,
    expiresInSeconds: number,
  ): Promise<SignedDownload> {
    const command = new GetObjectCommand({
      Bucket: this.configuration.bucket,
      Key: storageKey,
    });
    return {
      downloadUrl: await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds }),
      expiresAt: new Date(Date.now() + expiresInSeconds * 1_000),
    };
  }

  public async getMetadata(storageKey: string): Promise<StoredObjectMetadata | null> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({ Bucket: this.configuration.bucket, Key: storageKey }),
      );
      return {
        storageKey,
        contentType: response.ContentType ?? 'application/octet-stream',
        sizeBytes: response.ContentLength ?? 0,
        checksumSha256: response.Metadata?.checksumsha256 ?? '',
        lastModifiedAt: response.LastModified ?? new Date(),
      };
    } catch (error) {
      if (isMissingObject(error)) return null;
      throw error;
    }
  }

  public async delete(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.configuration.bucket, Key: storageKey }),
    );
  }
}

function isMissingObject(error: unknown): boolean {
  return (
    error instanceof Error &&
    'name' in error &&
    (error.name === 'NoSuchKey' || error.name === 'NotFound')
  );
}
