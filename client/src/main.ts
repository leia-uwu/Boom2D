import * as PIXI from "pixi.js";
import { Game } from "./game/game";
import { Helpers } from "./helpers";
import { UiManager } from "./ui";

export class App {
    ui = new UiManager(this);
    pixi = new PIXI.Application();
    game = new Game(this);

    async init(): Promise<void> {
        await this.pixi.init({
            canvas: Helpers.getElem<HTMLCanvasElement>("#game-canvas"),
            resizeTo: window,
            resolution: window.devicePixelRatio ?? 1,
            antialias: true,
            preference: "webgl",
            background: "#3b3b3b",
            eventMode: "static",
        });
        this.pixi.stage.interactive = true;
        this.pixi.stage.hitArea = this.pixi.screen;
        this.pixi.renderer.events.cursorStyles.default = "crosshair";

        await this.game.init();

        app.ui.playButton.disabled = false;
    }
}

const app = new App();

(async () => {
    await app.init();

    app.pixi.canvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });
})();
