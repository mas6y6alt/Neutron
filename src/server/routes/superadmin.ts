import {requireJson, safeRoute} from "../utils";
import {NeutronServer} from "../NeutronServer";
import {User} from "../database/entities/User";
import bcrypt from "bcrypt";
const server:NeutronServer = NeutronServer.getInstance();

safeRoute(server.app, '/api/check-superadmin-key', 'post', async (req,res) => {
    if (!requireJson(req,res)) return;
    if (!(server.firstStart)) {
        res.send({
            success: false,
            detail: "Server not in setup mode."
        })
    } else {

        if (req.body.key !== server.superadminKey) {
            res.status(401).send({
                success: false,
                detail: "Invalid superadmin key."
            })
        } else {
            res.send({
                success: true,
                detail: "Superadmin key accepted."
            })
        }
    }
});

safeRoute(server.app, '/api/create-superadmin', 'post', async (req,res) => {
    if (!requireJson(req,res)) return;

    if (!(server.firstStart)) {
        res.send({
            success: false,
            detail: "Server not in setup mode."
        })
    } else {
        if (!(req.body.superAdminKey === server.superadminKey)) {
            res.status(401).send({
                success: false,
                detail: "Invalid superadmin key."
            })
        }

        const userRepo = NeutronServer.getInstance().database.dataSource.getRepository(User);
        const passwordHash = await bcrypt.hash(req.body.password, 10);
        const user = userRepo.create({
            username: req.body.username,
            displayname: req.body.displayName,
            roles: "",
            superadmin: true,
            password: passwordHash,
        });

        await userRepo.save(user);

        server.firstStart = false;

        return res.send({
            detail: "Superadmin account created.",
            id: user.id
        })
    }
});