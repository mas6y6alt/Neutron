import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";

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

    @Column({ type: "timestamp" })
    expiresAt!: Date;

    @Column({ default: false })
    revoked!: boolean;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt!: Date;

    @Column({ type: "timestamp", nullable: true })
    lastUsedAt?: Date;
}