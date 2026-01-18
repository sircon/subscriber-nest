import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '@app/database/entities/session.entity';
import { User } from '@app/database/entities/user.entity';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const token = parts[1];
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    const session = await this.sessionRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!session) {
      throw new UnauthorizedException('Invalid token');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    let user = session.user;
    if (!user) {
      const foundUser = await this.userRepository.findOne({
        where: { id: session.userId },
      });
      if (!foundUser) {
        throw new UnauthorizedException('User not found');
      }
      user = foundUser;
    }

    if (user.deleteRequestedAt) {
      const url = request.url || '';
      const isExportEndpoint = url.includes('/subscribers/export');

      if (!isExportEndpoint) {
        throw new ForbiddenException(
          'Account deletion in progress. You can export your data for 30 days.'
        );
      }
    }

    request.user = user;

    return true;
  }
}
