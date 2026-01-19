import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BeehiivConnector } from './beehiiv.connector';
import { MailchimpConnector } from './mailchimp.connector';
import { KitConnector } from './kit.connector';

@Module({
  imports: [HttpModule],
  providers: [BeehiivConnector, KitConnector, MailchimpConnector],
  exports: [BeehiivConnector, KitConnector, MailchimpConnector],
})
export class EspModule { }
