import { Assets } from "pixi.js";

export class ResourceManager {
    private readonly _pathToSrc: Record<string, string> = {};

    getImage(path: string): string {
        return this._pathToSrc[path];
    }

    async loadAssets(): Promise<void> {
        // imports all svg assets from public dir
        // and sets an alias with the file name
        // so for example you can just do:
        // new Sprite("player.svg")
        // instead of:
        // new Sprite("./game/img/player.svg")

        const promises: Array<ReturnType<(typeof Assets)["load"]>> = [];
        const imgs: Record<string, { default: string }> = import.meta.glob(
            "/assets/img/**/*.svg",
            {
                eager: true
            }
        );

        for (const img in imgs) {
            const path = img.split("/");
            const name = path[path.length - 1];
            const src = `.${img}`;
            const realPath = imgs[img].default;
            this._pathToSrc[img] = realPath;
            this._pathToSrc[name] = realPath;

            const promise = Assets.load({
                alias: [name, src],
                src: realPath
            });
            promises.push(promise);
        }

        await Promise.all(promises);
    }
}
