import {NeutronServer} from "../NeutronServer";
import {SafeRequest, safeRoute} from "../utils";
import jwt, {JwtPayload} from "jsonwebtoken";

const server:NeutronServer = NeutronServer.getInstance();

safeRoute(server.app, '/api/verify_login', 'post', async (req: SafeRequest,res) => {
    let token: string | undefined;
    let user: JwtPayload | undefined;

    let access_token = false;
    let refresh_token = false;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    } else if (req.cookies?.["access-token"]) {
        token = req.cookies["access-token"];
    }

    if (!token) return res.status(401).json({ detail: "Missing access token" });

    // TODO: Actually check if the token is valid

    try {
        user = jwt.verify(token, NeutronServer.getInstance().ACCESS_TOKEN_SECRET) as JwtPayload;
    } catch (_) {}

    return res.send({
        access_token: access_token,
        refresh_token: refresh_token,
        user_id: user?.userId
    });
})