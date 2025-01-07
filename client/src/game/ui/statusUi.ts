import { Container, Sprite, Text, type TextOptions, Texture } from "pixi.js";
import { GameConstants } from "../../../../common/src/constants";
import { type AmmoDefKey, AmmoDefs } from "../../../../common/src/defs/ammoDefs";
import type { UpdatePacket } from "../../../../common/src/packets/updatePacket";
import { MathUtils } from "../../../../common/src/utils/math";
import { Helpers } from "../../helpers";
import { UiStyle, UiTextStyle, VerticalLayout } from "./uiHelpers";

const StatusTextStyle: TextOptions = {
    style: {
        ...UiTextStyle,
        fontSize: 30,
    },
};

const healthColorSteps = [
    {
        health: GameConstants.player.maxHealth,
        color: [0, 0xff, 0xff],
    },
    {
        health: GameConstants.player.defaultHealth,
        color: [0, 0xff, 0],
    },
    {
        health: 50,
        color: [0xb4, 0xff, 0x5e],
    },
    {
        health: 25,
        color: [0xff, 84, 46],
    },
    {
        health: 0,
        color: [0xff, 0, 0],
    },
];

class StatusValue extends Container {
    text = new Text(StatusTextStyle);
    icon = new Sprite();

    constructor() {
        super();
        this.addChild(this.text, this.icon);
        this.text.anchor.x = 1;
        this.text.x = 138;
    }

    setText(text: string | number) {
        this.text.text = text;
    }
    setIcon(icon: string) {
        this.icon.texture = Texture.from(icon);
    }
}

export class StatusUi extends VerticalLayout {
    ammo = new StatusValue();
    health = new StatusValue();
    armor = new StatusValue();

    constructor() {
        super({
            height: 32,
            margin: 8,
        });
    }

    init() {
        this.health.setIcon("ui-health.svg");
        this.armor.setIcon("ui-armor.svg");

        this.addChild(this.ammo, this.armor, this.health);
        this.relayout();
    }

    updateUi(data: UpdatePacket["playerData"], dirty: UpdatePacket["playerDataDirty"]) {
        if (dirty.health) {
            this.health.setText(`${data.health}%`);

            let idx = 0;
            while (
                healthColorSteps[idx].health > data.health
                && idx < healthColorSteps.length - 1
            ) {
                idx++;
            }
            const stepA = healthColorSteps[MathUtils.max(idx - 1, 0)];
            const stepB = healthColorSteps[idx];
            const t = MathUtils.remap(data.health, stepA.health, stepB.health, 0, 1);
            const rgb = [
                MathUtils.lerp(stepA.color[0], stepB.color[0], t),
                MathUtils.lerp(stepA.color[1], stepB.color[1], t),
                MathUtils.lerp(stepA.color[2], stepB.color[2], t),
            ];

            this.health.tint = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        }

        if (dirty.armor) {
            this.armor.setText(`${data.armor}%`);
        }
    }

    updateActiveWeaponAmmo(type: AmmoDefKey, ammo: number) {
        const def = AmmoDefs.typeToDef(type);
        this.ammo.tint = def.color;
        Helpers.spriteFromDef(this.ammo.icon, def.inventoryImg);
        this.ammo.setText(ammo);
    }

    resize(_width: number, height: number) {
        this.x = UiStyle.margin;
        this.y = height - this.height - UiStyle.margin;
    }
}
