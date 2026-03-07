import {ZariumServer} from "../ZariumServer";
import {parseTime, requireJson, SafeRequest, safeRoute} from "../utils";
import {User} from "../database/entities/User";
import {UserSession} from "../database/entities/UserSessions";
import {UserJwtPayload} from "../utils";
import jwt from "jsonwebtoken";

const server:ZariumServer = ZariumServer.getInstance();

safeRoute(server.app, '/api/auth/verify', 'post', async (req: SafeRequest,res) => {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    } else if (req.cookies?.["access-token"]) {
        token = req.cookies["access-token"];
    }

    if (!token) return res.status(401).json({ detail: "Missing token" });

    let payload: UserJwtPayload | null = null;
    try {
        payload = jwt.verify(token, ZariumServer.getInstance().ACCESS_TOKEN_SECRET) as UserJwtPayload;
    } catch {
        return res.status(401).json({ detail: "Invalid token" })
    }

    return res.send({
        id: payload?.userId
    })
});

safeRoute(server.app, '/api/auth/password_auth', 'post', async (req: SafeRequest,res) => {
    if (!requireJson(req,res)) return;

    const userRepo = ZariumServer.getInstance().database.dataSource.getRepository(User);
    const userSessionRepo = ZariumServer.getInstance().database.dataSource.getRepository(UserSession);
    const user = await userRepo.findOne({where: {username: req.body.username}});
    if (!user) return res.status(401).json({ detail: "Invalid credentials" });

    if (!(await user.checkPassword(req.body.password))) return res.status(401).json({ detail: "Invalid credentials" });
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

    res.send({
        user_id: user.id
    });
})

safeRoute(server.app, '/api/auth/refresh', 'post', async (req: SafeRequest,res) => {
    const userSessionRepo = ZariumServer.getInstance().database.dataSource.getRepository(UserSession);
    const refreshTokenKey = req.cookies?.["refresh-token-key"];
    const refreshTokenVal = req.cookies?.["refresh-token-val"];

    if (!refreshTokenKey || !refreshTokenVal) {
        res.status(401).send({ detail: "Invalid refresh token" });
        return;
    }

    const session = await userSessionRepo.findOne({
        where: {
            refreshTokenKey: refreshTokenKey,
        }
    });

    if (!session) {
        res.status(401).send({ detail: "Invalid refresh token" });
        return;
    }

    if (!session.isValid()) {
        res.status(401).send({ detail: "Invalid refresh token" });
        return;
    }

    if (!await session.checkSession(refreshTokenVal)) {
        res.status(401).send({ detail: "Invalid refresh token" });
        return;
    }

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

    res.send({
        detail: "Refreshed session"
    });
})

safeRoute(server.app, '/api/auth/force-logout', 'post', async (req: SafeRequest,res) => {
    res.clearCookie('access-token');
    res.clearCookie('refresh-token-key');
    res.clearCookie('refresh-token-val');

    res.send({
        detail: "Cleared session cookies"
    })
})

safeRoute(server.app, '/api/auth/logout', 'post', async (req: SafeRequest,res) => {
    const userSessionRepo = ZariumServer.getInstance().database.dataSource.getRepository(UserSession);
    const refreshTokenKey = req.cookies?.["refresh-token-key"];

    if (refreshTokenKey) {
        await (await userSessionRepo.findOne({
            where: {
                refreshTokenKey: refreshTokenKey,
            }
        }))?.revoke()
    }

    res.clearCookie('access-token');
    res.clearCookie('refresh-token-key');
    res.clearCookie('refresh-token-val');

    res.send({
        detail: "Logged out"
    })
}, {
    require_auth: true
})