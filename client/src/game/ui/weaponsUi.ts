import { Container, Sprite, Texture } from "pixi.js";
import { AmmoDefs } from "../../../../common/src/defs/ammoDefs";
import { type WeaponDefKey, WeaponDefs } from "../../../../common/src/defs/weaponDefs";
import type { UpdatePacket } from "../../../../common/src/packets/updatePacket";
import { MathUtils } from "../../../../common/src/utils/math";
import { Helpers } from "../../helpers";
import type { InputManager } from "../inputManager";
import { HorizontalLayout } from "./uiHelpers";

const iconSize = 96;

class WeaponDisplay extends Container {
    bg = new Sprite();
    selectedBg = new Sprite();
    weaponIcon = new Sprite();

    constructor(
        readonly weapon: WeaponDefKey,
        inputManager: InputManager
    ) {
        super();

        this.bg.texture = Texture.from("ui-weapon-slot.svg");
        this.bg.anchor.set(0.5, 0.5);
        this.bg.width = this.bg.height = iconSize;
        this.addChild(this.bg);

        const weaponDef = WeaponDefs.typeToDef(weapon);

        this.selectedBg.texture = Texture.from("ui-weapon-selected.svg");
        this.selectedBg.anchor.set(0.5, 0.5);
        this.selectedBg.width = this.selectedBg.height = iconSize;
        this.selectedBg.alpha = 0;
        const ammoDef = AmmoDefs.typeToDef(weaponDef.ammo);
        this.selectedBg.tint = ammoDef.color;
        this.addChild(this.selectedBg);

        this.weaponIcon.on("click", () => {
            inputManager.weaponToSwitch = this.weapon;
        });

        this.weaponIcon.anchor.set(0.5, 0.5);
        Helpers.spriteFromDef(this.weaponIcon, weaponDef.lootImg);
        this.weaponIcon.scale = 0.25;
        this.weaponIcon.angle = -35;
        this.addChild(this.weaponIcon);
    }
}

export class WeaponsUi extends Container {
    layout = new HorizontalLayout({
        width: iconSize,
        margin: 4
    });

    typeToDisplay = {} as Record<WeaponDefKey, WeaponDisplay>;

    oldActiveWeap: WeaponDefKey = "pistol";
    activeWeapon: WeaponDefKey = "pistol";
    activeBgTicker = 0;

    init(inputManager: InputManager) {
        let i = 0;

        this.addChild(this.layout);

        for (const weapon of WeaponDefs) {
            const weaponDisplay = new WeaponDisplay(weapon, inputManager);
            weaponDisplay.zIndex = i--;
            this.layout.addChild(weaponDisplay);
            this.typeToDisplay[weapon] = weaponDisplay;
        }

        this.layout.sortChildren();
    }

    resize(width: number, height: number) {
        this.layout.relayout();

        this.x = width / 2 - this.layout.width / 2 + iconSize / 2;
        this.y = height - this.layout.height / 2;
    }

    updateUi(data: UpdatePacket["playerData"]["weapons"]) {
        for (const weapon of WeaponDefs) {
            this.typeToDisplay[weapon].weaponIcon.alpha = data[weapon] ? 1 : 0.1;
        }
    }

    render(dt: number) {
        if (this.activeWeapon !== this.oldActiveWeap) {
            const def = WeaponDefs.typeToDef(this.activeWeapon);
            this.activeBgTicker += dt / def.switchDelay;
            const oldWeap = this.typeToDisplay[this.oldActiveWeap];
            const newWeap = this.typeToDisplay[this.activeWeapon];
            oldWeap.selectedBg.alpha = MathUtils.lerp(1, 0, this.activeBgTicker);
            newWeap.selectedBg.alpha = MathUtils.lerp(0, 1, this.activeBgTicker);

            if (this.activeBgTicker >= 1) {
                this.oldActiveWeap = this.activeWeapon;
                newWeap.selectedBg.alpha = 1;
                oldWeap.selectedBg.alpha = 0;
            }
        }
    }

    updateActiveWeapon(weap: WeaponDefKey) {
        if (this.activeWeapon === weap) {
            this.typeToDisplay[weap].selectedBg.alpha = 1;
            return;
        }

        this.oldActiveWeap = this.activeWeapon;
        this.activeWeapon = weap;
        this.activeBgTicker = 0;
    }
}
