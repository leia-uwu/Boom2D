import { Container, Sprite, Text, Texture } from "pixi.js";
import { type Game } from "../game";
import { ClientEntity } from "./entity";
import { type EntitiesNetData } from "../../../../common/src/packets/updatePacket";
import { Vec2 } from "../../../../common/src/utils/vector";
import { Camera } from "../camera";
import { EntityType, GameConstants } from "../../../../common/src/constants";
import { WeaponDefKey, WeaponDefs } from "../../../../common/src/defs/weaponDefs";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { Helpers } from "../../helpers";
import { Random } from "../../../../common/src/utils/random";
import { MathUtils } from "../../../../common/src/utils/math";

export class Player extends ClientEntity {
    readonly __type = EntityType.Player;

    readonly hitbox = new CircleHitbox(GameConstants.player.radius);

    activeWeapon!: WeaponDefKey;

    images = {
        base: Sprite.from("player-base.svg"),
        leftFist: Sprite.from("player-fist.svg"),
        rightFist: Sprite.from("player-fist.svg"),
        weapon: new Sprite(),
        muzzle: new Sprite()
    };

    // container for stuff that doesn't rotate
    staticContainer = new Container();

    nameText = new Text({
        style: {
            align: "center",
            fill: "white",
            fontFamily: "Rubik Mono One",
            fontSize: 36
        }
    });

    direction = Vec2.new(0, 0);
    oldDirection = Vec2.new(0, 0);

    muzzleTicker = 0;

    constructor(game: Game, id: number) {
        super(game, id);

        const images = Object.values(this.images);
        for (const image of images) {
            image.anchor.set(0.5);
        }
        this.container.addChild(...images);

        this.images.leftFist.position.set(48, 48);
        this.images.rightFist.position.set(48, -48);

        this.images.muzzle.rotation = Math.PI / 2;
        this.images.muzzle.zIndex = -2;
        this.images.muzzle.anchor.y = 1;

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
            this.activeWeapon = data.full.activeWeapon;
            const weaponDef = WeaponDefs.typeToDef(this.activeWeapon);
            Helpers.spriteFromDef(this.images.weapon, {
                zIndex: -1,
                rotation: Math.PI / 2,
                ...weaponDef.worldImg
            });

            if (weaponDef.type === "gun") {
                this.images.rightFist.position.y = this.images.weapon.position.y;
                this.images.leftFist.position = weaponDef.leftFistPos;
                this.images.leftFist.zIndex = -2;
            }
            this.game.ui.updateWeaponsUi();

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

        this.muzzleTicker -= dt;
        this.images.muzzle.alpha = MathUtils.lerp(0, 1, this.muzzleTicker / 0.2);
    }

    shootEffect(weapon: WeaponDefKey): void {
        const def = WeaponDefs.typeToDef(weapon);

        this.game.audioManager.play(def.sfx.shoot, {
            position: this.position,
            maxRange: 96
        });
        const pos = Vec2.new(def.barrelLength, 0);
        const muzzle = this.images.muzzle;
        this.muzzleTicker = 0.2;
        muzzle.texture = Texture.from(def.muzzleImgs[Random.int(0, def.muzzleImgs.length - 1)]);
        muzzle.position = Camera.vecToScreen(pos);
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
