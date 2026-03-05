import ejs from "ejs";
import fs from "fs/promises";
import path from "path";

import {NeutronServer} from "./NeutronServer";

export const renderData = {
    urlFor(p: string): string {
        const basePath = NeutronServer.getInstance().config.proxy_base_path;
        return path.join(basePath, "static", p).replace(/\\/g, "/");
    }
};

export async function renderTemplate(file: string, data: any = {}) {
    const templatePath = path.join(__dirname, "../client/", file);
    const basePath = NeutronServer.getInstance().config.proxy_base_path;
    return ejs.render(await fs.readFile(templatePath, "utf8"), { ...data , ...renderData, basePath }, { async: true });
}