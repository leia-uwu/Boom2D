import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { type WeaponDefKey, WeaponDefs } from "../../../../common/src/defs/weaponDefs";
import type { UpdatePacket } from "../../../../common/src/packets/updatePacket";
import { MathUtils } from "../../../../common/src/utils/math";
import type { InputManager } from "../inputManager";
import { HorizontalLayout } from "./uiHelpers";

const iconSize = 96;
const barWidth = iconSize * [...WeaponDefs].length;

class WeaponDisplay extends Container {
    sprite = new Sprite();

    constructor(
        readonly weapon: WeaponDefKey,
        inputManager: InputManager
    ) {
        super();

        const weaponDef = WeaponDefs.typeToDef(weapon);
        this.sprite.texture = Texture.from(weaponDef.lootImg.src);

        this.sprite.on("click", () => {
            inputManager.weaponToSwitch = this.weapon;
        });

        this.sprite.anchor.set(0.5, 0.5);
        this.sprite.scale = 0.3;
        this.sprite.angle = -35;
        this.addChild(this.sprite);

        this.alpha = 0;
    }
}

export class WeaponsUi extends Container {
    layout = new HorizontalLayout({
        width: iconSize
    });

    bg = new Graphics();

    typeToDisplay = {} as Record<WeaponDefKey, WeaponDisplay>;

    oldActiveWeap: WeaponDefKey = "pistol";
    activeWeapon: WeaponDefKey = "pistol";
    activeBgTicker = 0;

    selectedBg = new Sprite();

    init(inputManager: InputManager) {
        let i = 0;

        this.addChild(this.bg);
        this.addChild(this.selectedBg);
        this.addChild(this.layout);

        this.bg.alpha = 0.2;

        this.selectedBg.scale = 4;
        this.selectedBg.anchor.set(0.5, 0.5);

        this.selectedBg.height = this.selectedBg.width = iconSize;

        for (const weapon of WeaponDefs) {
            const weaponDisplay = new WeaponDisplay(weapon, inputManager);
            weaponDisplay.zIndex = i--;
            this.layout.addChild(weaponDisplay);
            this.typeToDisplay[weapon] = weaponDisplay;
        }

        this.selectedBg.texture = Texture.from("ui-selected-weap.svg");

        this.layout.sortChildren();
    }

    resize(width: number, height: number) {
        this.layout.relayout();

        this.x = width / 2 - barWidth / 2 + iconSize / 2;
        this.y = height - this.layout.height / 2;

        this.bg.clear();
        this.bg.rect(-iconSize / 2, -iconSize / 2, barWidth, iconSize);
        this.bg.fill(0x000000);
    }

    updateUi(data: UpdatePacket["playerData"]["weapons"]) {
        for (const weapon of WeaponDefs) {
            this.typeToDisplay[weapon].alpha = data[weapon] ? 1 : 0;
        }
    }

    render(dt: number) {
        if (this.activeWeapon !== this.oldActiveWeap) {
            const def = WeaponDefs.typeToDef(this.activeWeapon);
            this.activeBgTicker += dt / def.switchDelay;
            const oldX = this.typeToDisplay[this.oldActiveWeap].position.x;
            const newX = this.typeToDisplay[this.activeWeapon].position.x;
            this.selectedBg.position.x = MathUtils.lerp(oldX, newX, this.activeBgTicker);
            if (this.activeBgTicker >= 1) {
                this.oldActiveWeap = this.activeWeapon;
                this.selectedBg.position.x = newX;
            }
        }
    }

    updateActiveWeapon(weap: WeaponDefKey) {
        if (this.activeWeapon === weap) return;
        this.oldActiveWeap = this.activeWeapon;
        this.activeWeapon = weap;
        this.activeBgTicker = 0;
    }
}
