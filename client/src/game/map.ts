import { Graphics } from "pixi.js";
import { Game } from "./game";
import { Camera } from "./camera";
import { MapPacket } from "../../../common/src/packets/mapPacke";

export class GameMap {
    mapGraphics = new Graphics({
        zIndex: -99
    });

    width = 0;
    height = 0;

    constructor(readonly game: Game) { }

    updateFromPacket(packet: MapPacket) {
        this.width = packet.width;
        this.height = packet.height;
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
    }
}
