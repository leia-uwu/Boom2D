import { Sprite } from "pixi.js";
import { type Game } from "../game";
import { ClientEntity } from "./entity";
import { type EntitiesNetData } from "../../../../common/src/packets/updatePacket";
import { Camera } from "../camera";
import { EntityType } from "../../../../common/src/constants";

export class Obstacle extends ClientEntity {
    readonly type = EntityType.Obstacle;

    image = new Sprite();

    constructor(game: Game, id: number) {
        super(game, id);

        this.container.addChild(this.image);
        this.image.anchor.set(0.5, 0.5);
    }

    override updateFromData(data: EntitiesNetData[EntityType.Obstacle], isNew: boolean): void {
        super.updateFromData(data, isNew);

        if (data.full) {
            this.position = data.full.position;
        }
    }

    override render(dt: number): void {
        super.render(dt);
        const pos = Camera.vecToScreen(this.position);
        this.container.position = pos;
    }

    override destroy(): void {
        this.container.destroy({
            children: true
        });
    }
}
