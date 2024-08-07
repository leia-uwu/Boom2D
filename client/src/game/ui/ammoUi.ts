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

export class AmmoUi extends VerticalLayout {
    screenHeight = 0;
    screenWidth = 0;

    ammoTexts = {} as Record<AmmoDefKey, Text>;

    constructor() {
        super({
            height: itemHeight,
            margin: UiStyle.margin
        });
    }

    init() {
        for (const ammo of AmmoDefs) {
            const container = new Container();
            const text = new Text(AmmoTextStyle);
            this.ammoTexts[ammo] = text;
            container.addChild(text);

            const def = AmmoDefs.typeToDef(ammo);
            const icon = new Sprite();
            Helpers.spriteFromDef(icon, def.inventoryImg);
            icon.width = icon.height = itemHeight;
            icon.x = -itemHeight - UiStyle.margin;
            container.addChild(icon);

            icon.tint = text.tint = def.color;
            this.addChild(container);
        }
        this.relayout();
    }

    updateUi(data: UpdatePacket["playerData"]["ammo"]) {
        for (const ammo of AmmoDefs) {
            this.ammoTexts[ammo].text = data[ammo];
        }
    }

    resize(width: number, height: number) {
        this.screenWidth = width;
        this.screenHeight = height;

        this.x = this.screenWidth - itemHeight * 3 - UiStyle.margin;
        this.y = this.screenHeight - this.height - UiStyle.margin;
    }
}
