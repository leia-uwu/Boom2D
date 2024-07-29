import { Container, Sprite, Text, type TextOptions, Texture } from "pixi.js";
import { type AmmoType, GameConstants } from "../../../../common/src/constants";
import type { UpdatePacket } from "../../../../common/src/packets/updatePacket";
import { UiTextStyle, VerticalLayout } from "./uiHelpers";

const itemHeight = 24;
const margin = 8;
const AmmoTextStyle: TextOptions = {
    style: {
        ...UiTextStyle.style,
        fontSize: itemHeight
    }
};

export class AmmoUi extends Container {
    textLayout = new VerticalLayout({
        height: itemHeight,
        margin
    });

    iconsLayout = new VerticalLayout({
        height: itemHeight,
        margin
    });

    screenHeight = 0;
    screenWidth = 0;

    ammoTexts = {} as Record<AmmoType, Text>;

    init() {
        let i = 0;
        for (const ammo of GameConstants.ammoTypes) {
            const text = new Text(AmmoTextStyle);
            text.zIndex = i--;
            this.ammoTexts[ammo] = text;
            this.textLayout.addChild(text);

            const icon = new Sprite();
            icon.texture = Texture.from(`ui-${ammo}.svg`);
            icon.zIndex = i;
            icon.width = icon.height = itemHeight;
            this.iconsLayout.addChild(icon);
        }
        this.textLayout.sortChildren();
        this.iconsLayout.sortChildren();
        this.addChild(this.iconsLayout, this.textLayout);
    }

    updateUi(data: UpdatePacket["playerData"]["ammo"]) {
        for (const ammo of GameConstants.ammoTypes) {
            this.ammoTexts[ammo].text = data[ammo];
        }
        this.layoutText();
    }

    layoutText() {
        this.x = this.screenWidth - itemHeight * 3 - margin;
        this.y = this.screenHeight - this.textLayout.height - margin;
        this.iconsLayout.x = -itemHeight - margin;
    }

    resize(width: number, height: number) {
        this.screenWidth = width;
        this.screenHeight = height;
        this.textLayout.relayout();
        this.iconsLayout.relayout();

        this.layoutText();
    }
}
