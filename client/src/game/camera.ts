import { Container } from "pixi.js";
import { GameConstants } from "../../../common/src/constants";
import { MathUtils } from "../../../common/src/utils/math";
import { Vec2, type Vector } from "../../../common/src/utils/vector";
import type { Game } from "./game";

export class Camera {
    readonly container = new Container({
        sortableChildren: true,
        isRenderGroup: true,
        eventMode: "none"
    });

    readonly game: Game;

    position = Vec2.new(0, 0);

    width = 1;
    height = 1;

    private _zoom: number = GameConstants.player.defaultZoom;

    /**
     * How many pixels each game unit is
     */
    static scale = 64;

    /**
     * Scales a game vector to pixels
     */
    static vecToScreen(a: Vector): Vector {
        return Vec2.mul(a, this.scale);
    }

    /**
     * Scales a game unit to pixels
     */
    static unitToScreen(a: number): number {
        return a * this.scale;
    }

    get zoom(): number {
        return this._zoom;
    }
    set zoom(zoom: number) {
        if (zoom === this._zoom) return;
        this._zoom = zoom;
        this.resize();
    }

    constructor(game: Game) {
        this.game = game;
    }

    resize(): void {
        this.width = this.game.pixi.screen.width;
        this.height = this.game.pixi.screen.height;

        const minDim = MathUtils.min(this.width, this.height);
        const maxDim = MathUtils.max(this.width, this.height);
        const maxScreenDim = MathUtils.max(minDim * (16 / 9), maxDim);

        this.container.scale.set((maxScreenDim * 0.5) / (this._zoom * Camera.scale));
        this.render();
    }

    render(): void {
        const position = this.position;
        const cameraPos = Vec2.add(
            Vec2.mul(position, this.container.scale.x),
            Vec2.new(-this.width / 2, -this.height / 2)
        );
        this.container.position.set(-cameraPos.x, -cameraPos.y);
    }

    addObject(object: Container): void {
        this.container.addChild(object);
    }

    clear(): void {
        this.container.removeChildren();
    }
}
