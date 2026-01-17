import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { EspConnectionService } from './esp-connection.service';
import { AuthGuard } from './guards/auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './entities/user.entity';

class CreateEspConnectionDto {
  provider: string;
  apiKey: string;
}

@Controller('esp-connections')
export class EspConnectionController {
  constructor(private readonly espConnectionService: EspConnectionService) {}

  @Post()
  @UseGuards(AuthGuard)
  async createConnection(
    @CurrentUser() user: User,
    @Body() body: CreateEspConnectionDto,
  ): Promise<{ id: string; provider: string; createdAt: Date }> {
    return this.espConnectionService.createConnection(
      user,
      body.provider,
      body.apiKey,
    );
  }

  @Get()
  @UseGuards(AuthGuard)
  async getUserConnections(
    @CurrentUser() user: User,
  ): Promise<
    Array<{ id: string; provider: string; isActive: boolean; createdAt: Date }>
  > {
    return this.espConnectionService.getUserConnections(user);
  }
}
