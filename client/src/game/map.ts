import { Graphics } from "pixi.js";
import { BaseGameMap } from "../../../common/src/baseMap";
import type { MapPacket } from "../../../common/src/packets/mapPacke";
import { Helpers } from "../helpers";
import { Camera } from "./camera";
import type { Game } from "./game";

export class GameMap extends BaseGameMap {
    mapGraphics = new Graphics({
        zIndex: -99
    });

    wallGraphics = new Graphics({
        zIndex: 50
    });

    constructor(readonly game: Game) {
        super();
    }

    updateFromPacket(packet: MapPacket) {
        this.init(packet.width, packet.height, packet.walls);
        this.drawMap();
    }

    drawMap() {
        const ctx = this.mapGraphics;
        ctx.clear();
        this.game.camera.addObject(ctx);

        const gridSize = 16 * Camera.scale;
        const gridWidth = this.width * Camera.scale;
        const gridHeight = this.height * Camera.scale;
        for (let x = 0; x <= gridWidth; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, gridHeight);
        }

        for (let y = 0; y <= gridHeight; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(gridWidth, y);
        }

        ctx.stroke({
            color: 0xffffff,
            alpha: 0.1,
            width: 2
        });

        const wallCtx = this.wallGraphics;
        wallCtx.clear();
        this.game.camera.addObject(wallCtx);

        wallCtx.beginPath();
        for (const wall of this.walls) {
            Helpers.drawHitbox(wallCtx, wall.hitbox);
            wallCtx.fill(wall.color);
            wallCtx.stroke({
                color: 0,
                width: 10,
                cap: "round",
                join: "round"
            });
        }
    }
}
