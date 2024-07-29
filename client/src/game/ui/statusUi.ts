import { Container, Sprite, Text, type TextOptions, Texture } from "pixi.js";
import type { UpdatePacket } from "../../../../common/src/packets/updatePacket";
import { UiTextStyle, VerticalLayout } from "./uiHelpers";

const StatusTextStyle: TextOptions = {
    style: {
        ...UiTextStyle.style,
        fontSize: 30
    }
};

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
        this.textLayout.addChild(this.healthText, this.armorText, this.ammoText);
        this.iconsLayout.addChild(this.healthIcon, this.armorIcon, this.ammoIcon);
        this.addChild(this.textLayout, this.iconsLayout);

        this.healthIcon.texture = Texture.from("ui-health.svg");
        this.armorIcon.texture = Texture.from("ui-armor.svg");
        this.ammoIcon.texture = Texture.from("ui-ammo.svg");
    }

    updateUi(data: UpdatePacket["playerData"], dirty: UpdatePacket["playerDataDirty"]) {
        if (dirty.health) {
            this.health = data.health;
            this.healthText.text = `${this.health}%`;
        }
        if (dirty.armor) {
            this.armor = data.armor;
            this.armorText.text = `${this.armor}%`;
        }
        this.layoutText();
    }

    layoutText() {
        for (const text of this.textLayout.children) {
            text.x = 116 - text.width;
        }
    }

    updateActiveWeaponAmmo(ammo: number) {
        this.ammoText.text = ammo;
        this.layoutText();
    }

    resize(_width: number, height: number) {
        this.textLayout.relayout();
        this.iconsLayout.relayout();
        this.x = 8;
        this.y = height - this.height - 8;

        this.textLayout.x = 46;

        this.layoutText();
    }
}
