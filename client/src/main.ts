import "./scss/main.scss";
import { Application } from "pixi.js";
import { Game } from "./game/game";
import { Helpers } from "./helpers";
import { UiManager } from "./ui";

export class App {
    uiManager = new UiManager(this);
    pixi = new Application();
    game = new Game(this);

    async init(): Promise<void> {
        await this.pixi.init({
            canvas: Helpers.getElem<HTMLCanvasElement>("#game-canvas"),
            resizeTo: window,
            resolution: window.devicePixelRatio ?? 1,
            antialias: true,
            preference: "webgl",
            background: "#3b3b3b",
            eventMode: "static"
        });

        await this.game.init();

        app.uiManager.playButton.disabled = false;
    }
}

const app = new App();

(async () => {
    await app.init();
})();
