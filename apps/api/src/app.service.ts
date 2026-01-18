import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHello(): string {
    return "SubscriberNest API";
  }

  health(): { status: string } {
    return { status: "ok" };
  }
}
