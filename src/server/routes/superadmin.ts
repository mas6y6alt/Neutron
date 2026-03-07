import {parseTime, requireJson, safeRoute} from "../utils";
import {ZariumServer} from "../ZariumServer";
import {User} from "../database/entities/User";
import bcrypt from "bcrypt";
import {UserSession} from "../database/entities/UserSessions";
const server:ZariumServer = ZariumServer.getInstance();

safeRoute(server.app, '/api/setup/check-superadmin-key', 'post', async (req,res) => {
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

safeRoute(server.app, '/api/setup/create-superadmin', 'post', async (req,res) => {
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

        const userRepo = ZariumServer.getInstance().database.dataSource.getRepository(User);
        const userSessionRepo = ZariumServer.getInstance().database.dataSource.getRepository(UserSession);
        const passwordHash = await bcrypt.hash(req.body.password, 10);
        const user = userRepo.create({
            username: req.body.username,
            displayname: req.body.displayName,
            perms: "",
            superadmin: true,
            password: passwordHash,
        });

        await userRepo.save(user);

        server.firstStart = false;

        const session = await user.createSession(req.headers["user-agent"]);
        const access_token = await (await userSessionRepo.findOne({
            where: {
                id: session.id
            }
        }))?.createAccessToken()

        res.cookie('access-token', access_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: parseTime(ZariumServer.getInstance().ACCESS_TOKEN_EXPIRATION_TIME)
        });

        res.cookie('refresh-token-key', session.refreshKey, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: parseTime(ZariumServer.getInstance().REFRESH_TOKEN_EXPIRATION_TIME)
        });

        res.cookie('refresh-token-val', session.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: parseTime(ZariumServer.getInstance().REFRESH_TOKEN_EXPIRATION_TIME)
        });

        ZariumServer.getInstance().logger.info(`New SuperAdmin account with the username \"${user.username}\" has been registered.`);
        ZariumServer.getInstance().logger.info(`Setup mode disabled.`);

        return res.send({
            detail: "Superadmin account created.",
            id: user.id
        })
    }
});