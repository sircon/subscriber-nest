import { User } from './user.entity';
export declare class Session {
    id: string;
    userId: string;
    user: User;
    token: string;
    expiresAt: Date;
    createdAt: Date;
}
