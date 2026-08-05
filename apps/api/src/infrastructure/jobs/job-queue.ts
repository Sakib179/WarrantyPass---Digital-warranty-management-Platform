import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AppConfig } from '../../config/env.js';

export interface JobPayload<T = any> {
  queueName: string;
  jobName: string;
  data: T;
  idempotencyKey?: string;
  maxRetries?: number;
}

export type JobHandler<T = any> = (data: T) => Promise<void>;

export class JobQueue {
  private handlers = new Map<string, JobHandler>();

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig
  ) {}

  public registerHandler<T = any>(queueName: string, jobName: string, handler: JobHandler<T>): void {
    const key = `${queueName}:${jobName}`;
    this.handlers.set(key, handler);
  }

  public async enqueue<T = any>(payload: JobPayload<T>): Promise<string> {
    const maxRetries = payload.maxRetries ?? 5;

    // Check idempotency if provided
    if (payload.idempotencyKey) {
      const existing = await this.prisma.backgroundJob.findUnique({
        where: { idempotencyKey: payload.idempotencyKey },
      });
      if (existing) {
        return existing.id;
      }
    }

    const job = await this.prisma.backgroundJob.create({
      data: {
        queueName: payload.queueName,
        jobName: payload.jobName,
        payload: payload.data as any,
        status: 'PENDING',
        attemptCount: 0,
        maxRetries,
        idempotencyKey: payload.idempotencyKey ?? null,
      },
    });

    // Execute immediately in local/dev mode or queue worker mode
    setImmediate(() => {
      this.processJob(job.id).catch((err) => {
        console.error(`[BackgroundJob] Job execution failed for ${job.id}:`, err);
      });
    });

    return job.id;
  }

  public async processJob(jobId: string): Promise<void> {
    const job = await this.prisma.backgroundJob.findUnique({
      where: { id: jobId },
    });

    if (!job || ['COMPLETED', 'CANCELLED'].includes(job.status)) {
      return;
    }

    const handlerKey = `${job.queueName}:${job.jobName}`;
    const handler = this.handlers.get(handlerKey);

    if (!handler) {
      await this.prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorDetails: `No handler registered for ${handlerKey}`,
          failedAt: new Date(),
        },
      });
      return;
    }

    const nextAttempt = job.attemptCount + 1;
    await this.prisma.backgroundJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', attemptCount: nextAttempt },
    });

    try {
      await handler(job.payload);
      await this.prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      });
    } catch (err: any) {
      const isDeadLetter = nextAttempt >= job.maxRetries;
      await this.prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: isDeadLetter ? 'FAILED' : 'PENDING',
          attemptCount: nextAttempt,
          errorDetails: err.message || String(err),
          failedAt: isDeadLetter ? new Date() : null,
        },
      });
    }
  }
}
