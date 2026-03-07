import {Entity, Column, PrimaryGeneratedColumn, OneToOne, OneToMany} from "typeorm";
import {UserTOTP} from "./UserTOTP";
import {UserSession} from "./UserSessions";
import {NeutronServer} from "../../NeutronServer";
import bcrypt from "bcrypt";

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

    @Column()
    perms!: string;

    @Column()
    password!: string;

    @OneToOne(() => UserTOTP, totp => totp.user, { cascade: true })
    totp?: UserTOTP;

    @OneToMany(() => UserSession, (session) => session.user)
    sessions!: UserSession[];

    static async createAccount(username: string, password: string, displayname: string) {
        const userRepo = NeutronServer.getInstance().database.dataSource.getRepository(User);
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
        const userRepo = NeutronServer.getInstance().database.dataSource.getRepository(User);
        await userRepo.update(this.id, {perms: bitfield});
    }

    static async getUserById(id: string) {
        const userRepo = NeutronServer.getInstance().database.dataSource.getRepository(User);
        return userRepo.findOne({ where: { id } });
    }

    static async getUserByUsername(username: string) {
        const userRepo = NeutronServer.getInstance().database.dataSource.getRepository(User);
        return userRepo.findOne({ where: { username } });
    }
}