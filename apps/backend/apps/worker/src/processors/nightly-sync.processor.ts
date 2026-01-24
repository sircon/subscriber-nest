import {
  BillingSubscription,
  BillingSubscriptionStatus,
} from '@app/database/entities/billing-subscription.entity';
import {
  EspConnection,
  EspConnectionStatus,
  EspSyncStatus,
} from '@app/database/entities/esp-connection.entity';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Queue } from 'bullmq';
import { In, Repository } from 'typeorm';

export interface NightlySyncJobData {}

@Processor('sync-scheduler')
@Injectable()
export class NightlySyncProcessor extends WorkerHost {
  private readonly logger = new Logger(NightlySyncProcessor.name);

  constructor(
    @InjectRepository(EspConnection)
    private espConnectionRepository: Repository<EspConnection>,
    @InjectRepository(BillingSubscription)
    private billingSubscriptionRepository: Repository<BillingSubscription>,
    @InjectQueue('subscriber-sync')
    private subscriberSyncQueue: Queue
  ) {
    super();
  }

  async process(job: Job<NightlySyncJobData>): Promise<void> {
    if (job.name !== 'nightly-sync') {
      throw new Error(`Unknown job type: ${job.name}`);
    }

    const subscriptions = await this.billingSubscriptionRepository.find({
      where: {
        status: BillingSubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
      },
      select: ['userId'],
    });

    const userIds = Array.from(
      new Set(subscriptions.map((subscription) => subscription.userId))
    );

    if (userIds.length === 0) {
      this.logger.log('No active subscriptions found for nightly sync.');
      return;
    }

    const connections = await this.espConnectionRepository.find({
      where: {
        userId: In(userIds),
        status: EspConnectionStatus.ACTIVE,
      },
    });

    let queued = 0;
    let skippedSyncing = 0;
    let skippedNoLists = 0;

    for (const connection of connections) {
      const hasSelectedLists =
        (connection.publicationIds?.length ?? 0) > 0 ||
        !!connection.publicationId;

      if (!hasSelectedLists) {
        skippedNoLists += 1;
        continue;
      }

      if (connection.syncStatus === EspSyncStatus.SYNCING) {
        skippedSyncing += 1;
        continue;
      }

      await this.espConnectionRepository.update(
        { id: connection.id },
        { syncStatus: EspSyncStatus.SYNCING }
      );

      try {
        await this.subscriberSyncQueue.add('sync-publication', {
          espConnectionId: connection.id,
        });
        queued += 1;
      } catch (error: any) {
        await this.espConnectionRepository.update(
          { id: connection.id },
          { syncStatus: EspSyncStatus.IDLE }
        );
        this.logger.error(
          `Failed to enqueue nightly sync for ESP connection ${connection.id}: ${error.message}`,
          error.stack
        );
      }
    }

    this.logger.log(
      `Nightly sync queued ${queued} connections (skipped syncing: ${skippedSyncing}, skipped no lists: ${skippedNoLists}).`
    );
  }
}
