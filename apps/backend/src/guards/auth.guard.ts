import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    // Extract token from "Bearer <token>" format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const token = parts[1];
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    // Find session by token
    const session = await this.sessionRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!session) {
      throw new UnauthorizedException('Invalid token');
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    // Load user if not already loaded
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

    // Attach user to request
    request.user = user;

    return true;
  }
}
