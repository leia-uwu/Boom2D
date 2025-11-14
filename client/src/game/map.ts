import { BaseGameMap, MapObjectType } from "@common/baseMap";
import type { MapPacket } from "@common/packets/mapPacket";
import * as PIXI from "pixi.js";
import { Helpers } from "../helpers";
import { Camera } from "./camera";
import type { Game } from "./game";

export class GameMap extends BaseGameMap {
    mapGraphics = new PIXI.Graphics({
        zIndex: -99,
    });

    wallGraphics = new PIXI.Graphics({
        zIndex: 50,
    });

    constructor(readonly game: Game) {
        super();
    }

    updateFromPacket(packet: MapPacket) {
        this.init(packet.width, packet.height, packet.objects);
        this.drawMap();
    }

    drawMap() {
        const ctx = this.mapGraphics;
        ctx.clear();
        this.game.camera.addObject(ctx);

        for (const floor of this.objects) {
            if (floor.type !== MapObjectType.Floor) continue;

            ctx.beginPath();
            Helpers.drawHitbox(ctx, floor.hitbox);

            const fillStyle: PIXI.FillStyle = {
                color: floor.color,
            };
            if (floor.texture) fillStyle.texture = PIXI.Texture.from(floor.texture);
            ctx.fill(fillStyle);
        }

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
            width: 2,
        });

        const wallCtx = this.wallGraphics;
        wallCtx.clear();
        this.game.camera.addObject(wallCtx);

        wallCtx.beginPath();

        for (const wall of this.objects) {
            if (wall.type !== MapObjectType.Wall) continue;

            Helpers.drawHitbox(wallCtx, wall.hitbox);
            const fillStyle: PIXI.FillStyle = {
                color: wall.color,
            };
            if (wall.texture) fillStyle.texture = PIXI.Texture.from(wall.texture);
            wallCtx.fill(fillStyle);

            wallCtx.stroke({
                color: 0,
                width: 10,
                cap: "round",
                join: "round",
            });
        }
    }
}
