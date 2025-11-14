import { AmmoDefs } from "@common/defs/ammoDefs";
import { type GunDef, type WeaponDefKey, WeaponDefs } from "@common/defs/weaponDefs";
import { UpdatePacket } from "@common/packets/updatePacket";
import { MathUtils } from "@common/utils/math";
import * as PIXI from "pixi.js";
import { Helpers } from "../../helpers";
import type { InputManager } from "../inputManager";
import { HorizontalLayout, UiStyle } from "./uiHelpers";

const iconSize = 96;

class WeaponDisplay extends PIXI.Container {
    bg = new PIXI.Sprite();
    selectedBg = new PIXI.Sprite();
    weaponIcon = new PIXI.Sprite();

    selectedTicker = 0;

    constructor(
        readonly weapon: WeaponDefKey,
        inputManager: InputManager,
    ) {
        super();

        this.bg.texture = PIXI.Texture.from("ui-weapon-slot.svg");
        this.bg.anchor.set(0.5, 0.5);
        this.bg.width = this.bg.height = iconSize;
        this.addChild(this.bg);

        const weaponDef = WeaponDefs.typeToDef(weapon);

        this.selectedBg.texture = PIXI.Texture.from("ui-weapon-selected.svg");
        this.selectedBg.anchor.set(0.5, 0.5);
        this.selectedBg.width = this.selectedBg.height = iconSize;
        this.selectedBg.alpha = 0;
        const ammoDef = AmmoDefs.typeToDef(weaponDef.ammo);
        this.selectedBg.tint = ammoDef.color;
        this.addChild(this.selectedBg);

        this.on("pointerdown", (e) => {
            inputManager.weaponToSwitch = this.weapon;
            e.stopPropagation();
        });

        this.weaponIcon.anchor.set(0.5, 0.5);
        Helpers.spriteFromDef(this.weaponIcon, weaponDef.lootImg);
        this.weaponIcon.scale = 0.25;
        this.weaponIcon.angle = -35;
        this.addChild(this.weaponIcon);
    }
}

export class WeaponsUi extends PIXI.Container {
    layout = new HorizontalLayout({
        width: iconSize,
        margin: 4,
    });

    weaponDisplays = {} as Record<WeaponDefKey, WeaponDisplay>;

    activeWeapon: WeaponDefKey = "pistol";

    weapons = {} as UpdatePacket["playerData"]["weapons"];

    validWeapons: WeaponDefKey[] = [];

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
        this.weapons = data;

        this.validWeapons.length = 0;
        for (const weapon of WeaponDefs) {
            this.weaponDisplays[weapon].alpha = data[weapon] ? 1 : 0.1;
            if (data[weapon]) {
                this.validWeapons.push(weapon);
            }
        }
    }

    render(dt: number) {
        const activeDef = WeaponDefs.typeToDef(this.activeWeapon) as GunDef;

        for (const weaponType in this.weaponDisplays) {
            const weaponDisplay = this.weaponDisplays[weaponType as WeaponDefKey];

            const hasWeapon = !!this.weapons[weaponType as WeaponDefKey];
            const isSelected = weaponType === this.activeWeapon;

            if (isSelected) {
                weaponDisplay.selectedTicker += dt / activeDef.switchDelay;
            } else {
                weaponDisplay.selectedTicker -= dt / activeDef.switchDelay;
            }

            weaponDisplay.selectedTicker = MathUtils.clamp(
                weaponDisplay.selectedTicker,
                0,
                1,
            );
            weaponDisplay.selectedBg.alpha = weaponDisplay.selectedTicker;

            weaponDisplay.interactive = hasWeapon && !isSelected;
        }
    }

    updateActiveWeapon(weap: WeaponDefKey) {
        this.activeWeapon = weap;
    }
}
