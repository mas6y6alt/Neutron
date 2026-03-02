import ejs from "ejs";
import fs from "fs/promises";
import path from "path";

export const renderData = {
    urlFor(path: string): string {
        return `/static/${path}`;
    }
};

export async function renderTemplate(file: string, data: any = {}) {
    const templatePath = path.join(__dirname, "templates", file);
    return ejs.render(await fs.readFile(templatePath, "utf8"), { ...data , ...renderData }, { async: true });
}