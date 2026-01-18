import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BeehiivConnector } from './beehiiv.connector';

@Module({
  imports: [HttpModule],
  providers: [BeehiivConnector],
  exports: [BeehiivConnector],
})
export class EspModule {}
