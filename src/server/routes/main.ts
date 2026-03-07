import {ZariumServer} from "../ZariumServer";
import {renderTemplate} from "../Renderer";
import {SafeRequest, safeRoute} from "../utils";
const server:ZariumServer = ZariumServer.getInstance();

safeRoute(server.app, '/', 'get', async (req: SafeRequest,res) => {
    res.send(await renderTemplate("index.html", { csrfToken: (req as any).csrfToken() }))
});

safeRoute(server.app, '/api/status', 'get', async (req: SafeRequest,res) => {
    res.send({
        version: server.version,
        motd: server.motd,
        firstStart: server.firstStart,
        ssl_enabled: server.config.ssl_enabled
    })
});