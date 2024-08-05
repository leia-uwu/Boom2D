import { Container, Sprite, Text, type TextOptions } from "pixi.js";
import { type AmmoDefKey, AmmoDefs } from "../../../../common/src/defs/ammoDefs";
import type { UpdatePacket } from "../../../../common/src/packets/updatePacket";
import { Helpers } from "../../helpers";
import { UiStyle, UiTextStyle, VerticalLayout } from "./uiHelpers";

const itemHeight = 24;
const AmmoTextStyle: TextOptions = {
    style: {
        ...UiTextStyle,
        fontSize: itemHeight
    }
};

export class AmmoUi extends Container {
    textLayout = new VerticalLayout({
        height: itemHeight,
        margin: UiStyle.margin
    });

    iconsLayout = new VerticalLayout({
        height: itemHeight,
        margin: UiStyle.margin
    });

    screenHeight = 0;
    screenWidth = 0;

    ammoTexts = {} as Record<AmmoDefKey, Text>;

    init() {
        for (const ammo of AmmoDefs) {
            const text = new Text(AmmoTextStyle);
            this.ammoTexts[ammo] = text;
            this.textLayout.addChild(text);

            const def = AmmoDefs.typeToDef(ammo);
            const icon = new Sprite();
            Helpers.spriteFromDef(icon, def.inventoryImg);
            icon.width = icon.height = itemHeight;
            this.iconsLayout.addChild(icon);

            icon.tint = text.tint = def.color;
        }
        this.addChild(this.iconsLayout, this.textLayout);
    }

    updateUi(data: UpdatePacket["playerData"]["ammo"]) {
        for (const ammo in this.ammoTexts) {
            this.ammoTexts[ammo as AmmoDefKey].text = data[ammo as AmmoDefKey];
        }
        this.layoutText();
    }

    layoutText() {
        this.x = this.screenWidth - itemHeight * 3 - UiStyle.margin;
        this.y = this.screenHeight - this.textLayout.height - UiStyle.margin;
        this.iconsLayout.x = -itemHeight - UiStyle.margin;
    }

    resize(width: number, height: number) {
        this.screenWidth = width;
        this.screenHeight = height;
        this.textLayout.relayout();
        this.iconsLayout.relayout();

        this.layoutText();
    }
}
