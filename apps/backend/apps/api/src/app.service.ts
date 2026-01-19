import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'AudienceSafe API';
  }

  health(): { status: string } {
    return { status: 'ok' };
  }
}
