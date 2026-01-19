import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BeehiivConnector } from './beehiiv.connector';
import { MailchimpConnector } from './mailchimp.connector';
import { KitConnector } from './kit.connector';
import { ActiveCampaignConnector } from './active-campaign.connector';
import { BrevoConnector } from './brevo.connector';
import { CampaignMonitorConnector } from './campaign-monitor.connector';
import { ConstantContactConnector } from './constant-contact.connector';
import { CustomerIoConnector } from './customer-io.connector';
import { EmailOctopusConnector } from './email-octopus.connector';
import { GhostConnector } from './ghost.connector';
import { IterableConnector } from './iterable.connector';
import { MailerLiteConnector } from './mailerlite.connector';
import { OmedaConnector } from './omeda.connector';
import { PostUpConnector } from './postup.connector';
import { SailthruConnector } from './sailthru.connector';
import { SendGridConnector } from './sendgrid.connector';
import { SparkPostConnector } from './sparkpost.connector';

@Module({
  imports: [HttpModule],
  providers: [
    // Existing connectors
    BeehiivConnector,
    KitConnector,
    MailchimpConnector,
    // New connectors
    ActiveCampaignConnector,
    BrevoConnector,
    CampaignMonitorConnector,
    ConstantContactConnector,
    CustomerIoConnector,
    EmailOctopusConnector,
    GhostConnector,
    IterableConnector,
    MailerLiteConnector,
    OmedaConnector,
    PostUpConnector,
    SailthruConnector,
    SendGridConnector,
    SparkPostConnector,
  ],
  exports: [
    // Existing connectors
    BeehiivConnector,
    KitConnector,
    MailchimpConnector,
    // New connectors
    ActiveCampaignConnector,
    BrevoConnector,
    CampaignMonitorConnector,
    ConstantContactConnector,
    CustomerIoConnector,
    EmailOctopusConnector,
    GhostConnector,
    IterableConnector,
    MailerLiteConnector,
    OmedaConnector,
    PostUpConnector,
    SailthruConnector,
    SendGridConnector,
    SparkPostConnector,
  ],
})
export class EspModule {}
