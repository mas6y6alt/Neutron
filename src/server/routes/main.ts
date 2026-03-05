import {NeutronServer} from "../NeutronServer";
import {renderTemplate} from "../Renderer";
import { v4 as uuidv4 } from "uuid";
import express from "express";
const server:NeutronServer = NeutronServer.getInstance();
const router = express.Router();

router.get('/',async (req,res) => {
    res.send(await renderTemplate("index.html", { csrfToken: (req as any).csrfToken() }))
});

router.get('/api/status',async (req,res) => {
    res.send({
        version: server.version,
        motd: server.motd,
        serverTitle: server.serverTitle,
        firstStart: server.firstStart,
        ssl_enabled: server.config.ssl_enabled
    })
});

router.post('/api/check-superadmin-key',async (req,res) => {
    if (!(server.firstStart)) {
        res.send({
            success: false,
            detail: "Server not in setup mode."
        })
    } else {
        if (req.headers['content-type'] !== "application/json") {
            res.status(400).send({
                detail: "Invalid content type."
            })
        }

        if (req.body.key !== server.superadminKey) {
            res.send({
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

module.exports = router;