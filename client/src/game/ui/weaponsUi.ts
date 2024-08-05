import { Container, Sprite, Texture } from "pixi.js";
import { AmmoDefs } from "../../../../common/src/defs/ammoDefs";
import {
    type GunDef,
    type WeaponDefKey,
    WeaponDefs
} from "../../../../common/src/defs/weaponDefs";
import type { UpdatePacket } from "../../../../common/src/packets/updatePacket";
import { MathUtils } from "../../../../common/src/utils/math";
import { Helpers } from "../../helpers";
import type { InputManager } from "../inputManager";
import { HorizontalLayout, UiStyle } from "./uiHelpers";

const iconSize = 96;

class WeaponDisplay extends Container {
    bg = new Sprite();
    selectedBg = new Sprite();
    weaponIcon = new Sprite();

    selectedTicker = 0;

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

        this.on("click", () => {
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

    weaponDisplays = {} as Record<WeaponDefKey, WeaponDisplay>;

    activeWeapon: WeaponDefKey = "pistol";

    init(inputManager: InputManager) {
        this.addChild(this.layout);

        for (const weapon of WeaponDefs) {
            const weaponDisplay = new WeaponDisplay(weapon, inputManager);
            this.layout.addChild(weaponDisplay);
            this.weaponDisplays[weapon] = weaponDisplay;
        }
    }

    resize(width: number, height: number) {
        this.layout.relayout();

        this.x = width / 2 - this.layout.width / 2 + iconSize / 2;
        this.y = height - this.layout.height / 2 - UiStyle.margin;
    }

    updateUi(data: UpdatePacket["playerData"]["weapons"]) {
        for (const weapon of WeaponDefs) {
            this.weaponDisplays[weapon].weaponIcon.alpha = data[weapon] ? 1 : 0.1;
        }
    }

    render(dt: number) {
        const activeDef = WeaponDefs.typeToDef(this.activeWeapon) as GunDef;
        for (const weaponType in this.weaponDisplays) {
            const weaponDisplay = this.weaponDisplays[weaponType as WeaponDefKey];

            if (weaponType === this.activeWeapon) {
                weaponDisplay.selectedTicker += dt / activeDef.switchDelay;
            } else {
                weaponDisplay.selectedTicker -= dt / activeDef.switchDelay;
            }
            weaponDisplay.selectedTicker = MathUtils.clamp(
                weaponDisplay.selectedTicker,
                0,
                1
            );
            weaponDisplay.selectedBg.alpha = weaponDisplay.selectedTicker;
        }
    }

    updateActiveWeapon(weap: WeaponDefKey) {
        this.activeWeapon = weap;
    }
}
