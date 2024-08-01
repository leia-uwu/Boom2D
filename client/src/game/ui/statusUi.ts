import { Container, Sprite, Text, type TextOptions, Texture } from "pixi.js";
import { GameConstants } from "../../../../common/src/constants";
import { type AmmoDefKey, AmmoDefs } from "../../../../common/src/defs/ammoDefs";
import type { UpdatePacket } from "../../../../common/src/packets/updatePacket";
import { MathUtils } from "../../../../common/src/utils/math";
import { Helpers } from "../../helpers";
import { UiTextStyle, VerticalLayout } from "./uiHelpers";

const StatusTextStyle: TextOptions = {
    style: {
        ...UiTextStyle,
        fontSize: 30
    }
};

const healthColorSteps = [
    {
        health: GameConstants.player.maxHealth,
        color: [0, 0xff, 0xff]
    },
    {
        health: GameConstants.player.defaultHealth,
        color: [0, 0xff, 0]
    },
    {
        health: 50,
        color: [0xb4, 0xff, 0x5e]
    },
    {
        health: 25,
        color: [0xff, 84, 46]
    },
    {
        health: 0,
        color: [0xff, 0, 0]
    }
];

export class StatusUi extends Container {
    textLayout = new VerticalLayout({
        height: 32,
        margin: 8
    });

    iconsLayout = new VerticalLayout({
        height: 32,
        margin: 8
    });

    health = 0;
    healthText = new Text(StatusTextStyle);
    healthIcon = new Sprite();

    armor = 0;
    armorText = new Text(StatusTextStyle);
    armorIcon = new Sprite();

    ammoText = new Text(StatusTextStyle);
    ammoIcon = new Sprite();

    init() {
        this.textLayout.addChild(this.ammoText, this.armorText, this.healthText);
        this.iconsLayout.addChild(this.ammoIcon, this.armorIcon, this.healthIcon);
        this.addChild(this.textLayout, this.iconsLayout);

        for (const text of this.textLayout.children) {
            (text as Text).anchor.x = 1;
            text.x = 96;
        }

        this.healthIcon.texture = Texture.from("ui-health.svg");
        this.armorIcon.texture = Texture.from("ui-armor.svg");
    }

    updateUi(data: UpdatePacket["playerData"], dirty: UpdatePacket["playerDataDirty"]) {
        if (dirty.health) {
            this.health = data.health;
            this.healthText.text = `${this.health}%`;

            let idx = 0;
            while (
                healthColorSteps[idx].health > this.health &&
                idx < healthColorSteps.length - 1
            ) {
                idx++;
            }
            const stepA = healthColorSteps[MathUtils.max(idx - 1, 0)];
            const stepB = healthColorSteps[idx];
            const t = MathUtils.remap(this.health, stepA.health, stepB.health, 0, 1);
            const rgb = [
                MathUtils.lerp(stepA.color[0], stepB.color[0], t),
                MathUtils.lerp(stepA.color[1], stepB.color[1], t),
                MathUtils.lerp(stepA.color[2], stepB.color[2], t)
            ];

            this.healthIcon.tint =
                this.healthText.tint = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        }

        if (dirty.armor) {
            this.armor = data.armor;
            this.armorText.text = `${this.armor}%`;
        }
    }

    updateActiveWeaponAmmo(type: AmmoDefKey, ammo: number) {
        const def = AmmoDefs.typeToDef(type);
        this.ammoText.tint = this.ammoIcon.tint = def.color;
        Helpers.spriteFromDef(this.ammoIcon, def.inventoryImg);
        this.ammoText.text = ammo;
    }

    resize(_width: number, height: number) {
        this.textLayout.relayout();
        this.iconsLayout.relayout();
        this.x = 8;
        this.y = height - this.height - 8;

        this.textLayout.x = 46;
    }
}
