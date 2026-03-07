import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Generated} from "typeorm";
import { User } from "./User";
import {ZariumServer} from "../../ZariumServer";
import {UserJwtPayload} from "../../utils";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

@Entity("user_sessions")
export class UserSession {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User, (user) => user.sessions, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user!: User;

    @Column()
    userId!: string;

    @Column({ unique: true })
    refreshTokenHash!: string;

    @Column({
        type: "uuid",
        unique: true
    })
    refreshTokenKey!: string;

    @Column({ type: "datetime" })
    expiresAt!: Date;

    @Column({ default: false })
    revoked!: boolean;

    @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
    createdAt!: Date;

    @Column({ type: "datetime", nullable: true })
    lastUsedAt?: Date;

    @Column({ type: "datetime", nullable: true })
    revokedAt?: Date;

    @Column({ nullable: true })
    userAgent?: string;

    async createAccessToken() {
        if (this.revoked) throw new Error("Session invalid. Cannot create access token.");
        if (this.expiresAt < new Date()) throw new Error("Session invalid. Cannot create access token.");

        const repository = ZariumServer.getInstance().database.dataSource.getRepository(UserSession);
        await repository.update(this.id, {lastUsedAt: new Date()});

        return jwt.sign({
            userId: this.userId,
            sessionId: this.id,
            refresh_key: this.refreshTokenKey
        } as UserJwtPayload, ZariumServer.getInstance().ACCESS_TOKEN_SECRET, { expiresIn: ZariumServer.getInstance().ACCESS_TOKEN_EXPIRATION_TIME as any});
    }

    isValid() {
        if (this.revoked) return false;
        return this.expiresAt >= new Date();
    }

    async checkSession(token: string) {
        return bcrypt.compare(token, this.refreshTokenHash);
    }

    async checkRefreshToken(refreshToken: string) {
        if (this.revoked) return false;
        if (this.expiresAt < new Date()) return false;
        return await bcrypt.compare(refreshToken, this.refreshTokenHash);
    }

    async revoke() {
        this.revoked = true;
        await ZariumServer.getInstance().database.dataSource.getRepository(UserSession).update(this.id, {revoked: true, revokedAt: new Date()});
    }
}