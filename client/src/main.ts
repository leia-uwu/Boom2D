import "./scss/main.scss";
import { Game } from "./game/game";
import { UiManager } from "./ui";
import { Application } from "pixi.js";
import { Helpers } from "./helpers";

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
            background: "#3b3b3b"
        });

        await this.game.init();

        app.uiManager.playButton.disabled = false;
    }
}

const app = new App();

(async() => {
    await app.init();
})();
