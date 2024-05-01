import { Container, Sprite, Text } from "pixi.js";
import { type Game } from "../game";
import { ClientEntity } from "./entity";
import { type EntitiesNetData } from "../../../../common/src/packets/updatePacket";
import { Vec2 } from "../../../../common/src/utils/vector";
import { Camera } from "../camera";
import { EntityType, GameConstants } from "../../../../common/src/constants";
import { WeaponDefKey, WeaponDefs } from "../../../../common/src/defs/weaponDefs";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { spriteFromDef } from "../../utils";

export class Player extends ClientEntity {
    readonly type = EntityType.Player;

    readonly hitbox = new CircleHitbox(GameConstants.player.radius);

    weapon!: WeaponDefKey;

    images = {
        base: Sprite.from("player-base.svg"),
        leftFist: Sprite.from("player-fist.svg"),
        rightFist: Sprite.from("player-fist.svg"),
        weapon: new Sprite()
    };

    // container for stuff that doesn't rotate
    staticContainer = new Container();

    nameText = new Text({
        style: {
            align: "center",
            fill: "white",
            fontFamily: "Russo One",
            fontSize: 40
        }
    });

    direction = Vec2.new(0, 0);
    oldDirection = Vec2.new(0, 0);

    constructor(game: Game, id: number) {
        super(game, id);

        const images = Object.values(this.images);
        for (const image of images) {
            image.anchor.set(0.5);
        }
        this.container.addChild(...images);

        this.images.leftFist.position.set(48, 48);
        this.images.rightFist.position.set(48, -48);

        this.container.zIndex = 2;
        this.nameText.anchor.set(0.5);

        this.staticContainer.zIndex = 3;
        this.game.camera.addObject(this.staticContainer);

        this.nameText.text = this.game.playerNames.get(this.id) ?? "Unknown Player";
        this.nameText.position.set(0, 90);
        this.staticContainer.addChild(this.nameText);

        const tint = GameConstants.player[this.id === this.game.activePlayerID ? "activeColor" : "enemyColor"];
        this.images.base.tint = tint;
        this.images.leftFist.tint = tint;
        this.images.rightFist.tint = tint;
    }

    override updateFromData(data: EntitiesNetData[EntityType.Player], isNew: boolean): void {
        super.updateFromData(data, isNew);

        this.oldPosition = isNew ? data.position : Vec2.clone(this.position);
        this.position = data.position;
        this.hitbox.position = this.position;
        this.oldDirection = Vec2.clone(this.direction);
        this.direction = data.direction;

        if (data.full) {
            this.weapon = data.full.weapon;
            const weaponDef = WeaponDefs.typeToDef(this.weapon);
            spriteFromDef(this.images.weapon, weaponDef.worldImg);

            if (weaponDef.type === "gun") {
                this.images.rightFist.position.y = this.images.weapon.position.y;
                this.images.leftFist.position = weaponDef.leftFistPos;
                this.images.leftFist.zIndex = -2;
            }

            this.container.sortChildren();
        }
    }

    override render(dt: number): void {
        super.render(dt);
        const pos = Camera.vecToScreen(
            Vec2.lerp(this.oldPosition, this.position, this.interpolationFactor)
        );
        this.container.position = pos;
        this.staticContainer.position = pos;

        const direction = Vec2.lerp(this.oldDirection, this.direction, this.interpolationFactor);
        this.container.rotation = Math.atan2(direction.y, direction.x);
    }

    override destroy(): void {
        this.container.destroy({
            children: true
        });
        this.staticContainer.destroy({
            children: true
        });
    }
}
