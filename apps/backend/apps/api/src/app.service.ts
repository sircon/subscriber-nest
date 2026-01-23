import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Audience Safe API';
  }

  health(): { status: string } {
    return { status: 'ok' };
  }
}
