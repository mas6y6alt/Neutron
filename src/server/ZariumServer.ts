import express from "express";
import cookieParser from "cookie-parser";
import csurf from "csurf";
import * as http from "node:http";
import * as path from "node:path";
import * as fs from "fs/promises";
import {ZariumConfig} from "./ZariumConfig";
import crypto from "crypto";
import { createLogger } from "./Logging";
import winston from "winston";
import * as https from "node:https";
import {WebSocketServer, WebSocket} from "ws";
import {IncomingMessage} from "node:http";
import {Socket} from "node:net";
import {Database} from "./database/Database";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import {User} from "./database/entities/User";
import {handleCSRF, handleErrors} from "./utils";

export class ZariumServer {
    public version = "1.0.0";
    public static instance: ZariumServer;
    public app!: express.Application;
    public server!: http.Server;
    public port: number = 3000;
    public config!: ZariumConfig;
    public logger!: winston.Logger;
    public database!: Database;
    public masterkey!: Buffer;
    public firstStart: boolean = false;
    public wss = new WebSocketServer({ noServer: true });
    public wsRouteHandlers: { [url: string]: (ws: WebSocket, req: IncomingMessage) => void } = {};
    public motd: string = "A Zarium Server";
    public superadminKey: string = "";

    public ACCESS_TOKEN_SECRET: string = crypto.randomBytes(32).toString("hex");
    public ACCESS_TOKEN_EXPIRATION_TIME: string = "10m";
    public REFRESH_TOKEN_EXPIRATION_TIME: string = "7d";

    public static getInstance(): ZariumServer {
        if (!ZariumServer.instance) {
            throw new Error("ZariumServer instance not initialized");
        }
        return ZariumServer.instance;
    }

    constructor() {
        if (ZariumServer.instance) {
            throw new Error("ZariumServer instance already initialized");
        }

        ZariumServer.instance = this;
    }

    async init(configPath: string = "config.yml") {
        try {
            await fs.access(configPath);
            this.config = await ZariumConfig.loadSafe(configPath);

            this.port = this.config.port;

            const dataFolderPath = path.resolve(this.config.data_folder);
            try {
                await fs.access(dataFolderPath);
                // exists
            } catch (err) {
                if ((err as NodeJS.ErrnoException).code === "ENOENT") {
                    await fs.mkdir(dataFolderPath, {recursive: true});
                } else {
                    throw err;
                }
            }
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === "ENOENT") {
                this.config = new ZariumConfig();
                const dataFolderPath = path.resolve(this.config.data_folder);
                await fs.mkdir(dataFolderPath, { recursive: true });
            } else {
                console.error(err);
            }
        }

        this.logger = await createLogger({
            level: this.config.debug ? "debug" : "info",
            logsFolder: this.config.logs_folder,
            console: this.config.logging_console,
            file: this.config.logging_file,
            maxFiles: this.config.logging_max_files,
        });

        try {
            await fs.access(path.join(this.config.data_folder, "masterkey.key"));
            let base64 = await fs.readFile(path.join(this.config.data_folder, "masterkey.key"), "utf-8");
            this.masterkey = Buffer.from(base64, "base64");
        } catch {
            this.masterkey = crypto.randomBytes(32);
            await fs.writeFile(path.join(this.config.data_folder, "masterkey.key"), this.masterkey.toString("base64"), "utf-8");
        }

        try {
            await fs.access(path.join(this.config.data_folder,"access_token.key"));
            this.ACCESS_TOKEN_SECRET = await fs.readFile(path.join(this.config.data_folder,"access_token.key"), "utf-8");
        } catch {
            await fs.writeFile(path.join(this.config.data_folder,"access_token.key"), this.ACCESS_TOKEN_SECRET, "utf-8");
        }

        this.REFRESH_TOKEN_EXPIRATION_TIME = this.config.refresh_token_expiration
        this.ACCESS_TOKEN_EXPIRATION_TIME = this.config.access_token_expiration

        this.logger.info("Starting \""+this.config.database_type+"\" database...");
        this.database = Database.getInstance();
        await this.database.init(this.config);

        this.logger.info("Database initialized");

        this.app = express();
        this.app.set("trust proxy", this.config.trust_proxy);

        if (this.config.ssl_enabled) {
            const key = await fs.readFile(this.config.ssl_key);
            const cert = await fs.readFile(this.config.ssl_cert);

            this.server = https.createServer(
                {
                    key,
                    cert,
                },
                this.app
            );
        } else {
            this.server = http.createServer(this.app);
        }

// 1. Security first
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                    "script-src": ["'self'", "'unsafe-inline'"],
                },
            },
        }));

        if (this.config.rate_limit_enabled) {
            const limiter = rateLimit({
                windowMs: this.config.rate_limit_window_ms,
                max: this.config.rate_limit_max,
                standardHeaders: true,
                legacyHeaders: false,
            });
            this.app.use(limiter);
        }

// 2. Body parsing
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

// 3. Cookie & CSRF
        this.app.use(cookieParser());
        this.app.use(csurf({ cookie: true }));

// 4. Static files
        this.app.use("/public", express.static(path.join(__dirname, "../client/public")));
        this.app.use("/assets", express.static(path.join(__dirname, "../client/assets")));

// 5. Custom routes
        require("./routes/main");
        require("./routes/superadmin");
        require("./routes/account");

// 6. WebSocket upgrade handling
        this.server.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
            const path = new URL(request.url!, 'http://dummy').pathname;
            const handler = this.wsRouteHandlers[path];
            if (!handler) {
                socket.destroy();
                return;
            }
            this.wss.handleUpgrade(request, socket, head, (ws) => handler(ws, request));
        });

// 7. CSRF errors
        handleCSRF(this.app);

// 8. 404 + 500 errors
        handleErrors(this.app);

        if (await Database.getDataSource().getRepository(User).count() === 0) {
            this.firstStart = true;
        }

        if (this.firstStart) {
            this.superadminKey = crypto.randomBytes(12).toString("hex");

            const firstStartMessage = `
=======================================================
FIRST TIME SETUP: Superadmin Key Generated
-------------------------------------------------------
Your server's user database is empty (first-time startup).

🔑  SUPERADMIN KEY: ${this.superadminKey}

⚠️  IMPORTANT:
- This key is **one-time use only**
- DO NOT SHARE THIS KEY WITH ANYONE

=======================================================
`;
            this.logger.info(firstStartMessage);
        }

        if (!this.config.ssl_enabled) {
            const warning = `
=======================================================
⚠️  WARNING: SSL is NOT enabled!
-------------------------------------------------------
Your Zarium server is running without SSL. This means:
- All traffic, including chat messages, is sent in plain text
- Your server is vulnerable to eavesdropping or tampering

=======================================================
            `;
            this.logger.warn(warning);
        }
    }

    public start() {
        this.server.listen(this.port, this.config.host, () => {
            if (this.config.ssl_enabled) {
                this.logger.info(`Zarium Server running at https://${this.config.host}:${this.port}`);
            } else {
                this.logger.info(`Zarium Server running at http://${this.config.host}:${this.port}`);
            }
        });
    }

    public registerWsRoute(
        url: string,
        handler: (ws: WebSocket, req: IncomingMessage) => void
    ) {
        this.wsRouteHandlers[url] = handler;
    }
}