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

    constructor(game: Game) {
        this.game = game;
    }

    _position = Vec2.new(0, 0);
    oldPosition = Vec2.new(0, 0);
    interpolationTicker = 0;

    set position(pos: Vector) {
        this.oldPosition = Vec2.clone(this._position);
        this._position = Vec2.clone(pos);
        this.interpolationTicker = 0;
    }

    get position() {
        return this._position;
    }

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

    resize(): void {
        this.width = this.game.pixi.screen.width;
        this.height = this.game.pixi.screen.height;

        const minDim = MathUtils.min(this.width, this.height);
        const maxDim = MathUtils.max(this.width, this.height);
        const maxScreenDim = MathUtils.max(minDim * (16 / 9), maxDim);

        this.container.scale.set((maxScreenDim * 0.5) / (this._zoom * Camera.scale));
        this.render(1);
    }

    render(dt: number): void {
        this.interpolationTicker += dt;
        const interpT = MathUtils.clamp(
            this.interpolationTicker / this.game.serverDt,
            0,
            1
        );

        const position = Camera.vecToScreen(
            Vec2.lerp(this.oldPosition, this.position, interpT)
        );

        const cameraPos = Vec2.invert(
            Vec2.add(
                Vec2.mul(position, this.container.scale.x),
                Vec2.new(-this.width / 2, -this.height / 2)
            )
        );

        this.container.position.copyFrom(cameraPos);
    }

    addObject(object: Container): void {
        this.container.addChild(object);
    }

    clear(): void {
        this.container.removeChildren();
    }
}
