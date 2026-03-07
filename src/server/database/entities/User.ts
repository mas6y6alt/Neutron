import {Entity, Column, PrimaryGeneratedColumn, OneToOne, OneToMany} from "typeorm";
import {UserTOTP} from "./UserTOTP";
import {UserSession} from "./UserSessions";
import {ZariumServer} from "../../ZariumServer";
import bcrypt, {hash} from "bcrypt";
import {parseTime} from "../../utils";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

@Entity("users")
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ unique: true })
    username!: string;

    @Column()
    displayname!: string;

    @Column({ default: false })
    superadmin!: boolean;

    @Column({ type: "datetime",default: () => "CURRENT_TIMESTAMP" })
    createdAt!: Date;

    @Column()
    perms!: string;

    @Column()
    password!: string;

    @OneToOne(() => UserTOTP, totp => totp.user, { cascade: true })
    totp?: UserTOTP;

    @OneToMany(() => UserSession, (session) => session.user)
    sessions!: UserSession[];

    static async createAccount(username: string, password: string, displayname: string) {
        const userRepo = ZariumServer.getInstance().database.dataSource.getRepository(User);
        const passwordHash = await bcrypt.hash(password, 10);

        const user = userRepo.create({
            username,
            displayname,
            perms: "",
            superadmin: false,
            password: passwordHash,
        });

        await userRepo.save(user);
        return user;
    }

    async updatePerms(bitfield: string) {
        const userRepo = ZariumServer.getInstance().database.dataSource.getRepository(User);
        await userRepo.update(this.id, {perms: bitfield});
    }

    async updatePassword(newPassword: string) {
        const userRepo = ZariumServer.getInstance().database.dataSource.getRepository(User);
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await userRepo.update(this.id, {password: passwordHash});
    }

    static async getUserById(id: string) {
        const userRepo = ZariumServer.getInstance().database.dataSource.getRepository(User);
        return userRepo.findOne({ where: { id } });
    }

    static async getUserByUsername(username: string) {
        const userRepo = ZariumServer.getInstance().database.dataSource.getRepository(User);
        return userRepo.findOne({ where: { username } });
    }

    async checkPassword(password: string) {
        return bcrypt.compare(password, this.password);
    }

    async createSession(userAgent?: string) {
        const userSessionRepo = ZariumServer.getInstance().database.dataSource.getRepository(UserSession);

        const refreshToken = crypto.randomBytes(32).toString("hex");
        const refreshTokenHash = await hash(refreshToken,10);

        const session = userSessionRepo.create({
            userId: this.id,
            refreshTokenHash: refreshTokenHash,
            refreshTokenKey: uuidv4(),
            expiresAt: new Date(Date.now() + parseTime(ZariumServer.getInstance().REFRESH_TOKEN_EXPIRATION_TIME)),
            userAgent: userAgent,
        });

        await userSessionRepo.save(session);

        return {
            id: session.id,
            userId: session.userId,
            expiresAt: session.expiresAt,
            refreshToken: refreshToken,
            refreshKey: session.refreshTokenKey,
        };
    }
}