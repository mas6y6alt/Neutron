import {Entity, Column, PrimaryColumn} from "typeorm";

@Entity("users_totp")
export class UserTOTP {
    @PrimaryColumn("uuid")
    id!: string;

    @Column({ type: "varchar", length: 64 })
    secret!: string;
}
