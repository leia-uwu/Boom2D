import type { AmmoType } from "../constants";
import { DefinitionList, type ImgDefinition } from "../utils/definitionList";
import { type GunDef, WeaponDefs } from "./weaponDefs";

export interface BaseLootDef {
    lootImg: ImgDefinition;
    respawnTime: number;
}

export interface AmmoPickupDef extends BaseLootDef {
    type: "ammo-pickup";
    ammo: Partial<Record<AmmoType, number>>;
}

export interface PowerUpDef extends BaseLootDef {
    type: "powerup";
    health: number;
    maxHealth: number;
    maxArmor: number;
    armor: number;
}

export type LootDef = GunDef | AmmoPickupDef | PowerUpDef;

export const LootDefs = new DefinitionList({
    ...WeaponDefs.definitions,
    ammoClip: {
        type: "ammo-pickup",
        respawnTime: 10,
        ammo: {
            bullet: 10
        },
        lootImg: {
            src: "ammo-clip.svg"
        }
    },
    ammoBox: {
        type: "ammo-pickup",
        respawnTime: 20,
        ammo: {
            bullet: 50
        },
        lootImg: {
            src: "ammo-box.svg"
        }
    },
    shell: {
        type: "ammo-pickup",
        respawnTime: 10,
        ammo: {
            shell: 4
        },
        lootImg: {
            src: "shell.svg"
        }
    },
    shellBox: {
        type: "ammo-pickup",
        respawnTime: 20,
        ammo: {
            shell: 20
        },
        lootImg: {
            src: "shell-box.svg"
        }
    },
    rocket: {
        type: "ammo-pickup",
        respawnTime: 15,
        ammo: {
            rocket: 1
        },
        lootImg: {
            src: "rocket.svg"
        }
    },
    rocketBox: {
        type: "ammo-pickup",
        respawnTime: 30,
        ammo: {
            rocket: 5
        },
        lootImg: {
            src: "rocket-box.svg"
        }
    },
    energyCell: {
        type: "ammo-pickup",
        respawnTime: 15,
        ammo: {
            cell: 40
        },
        lootImg: {
            src: "energy-cell.svg"
        }
    },
    energyCellPack: {
        type: "ammo-pickup",
        respawnTime: 30,
        ammo: {
            cell: 100
        },
        lootImg: {
            src: "energy-cell-pack.svg"
        }
    },
    stimpack: {
        type: "powerup",
        respawnTime: 10,
        health: 10,
        maxHealth: 100,
        armor: 0,
        maxArmor: 0,
        lootImg: {
            src: "stimpack.svg"
        }
    },
    medikit: {
        type: "powerup",
        respawnTime: 10,
        health: 20,
        maxHealth: 100,
        armor: 0,
        maxArmor: 0,
        lootImg: {
            src: "medikit.svg"
        }
    }
} satisfies Record<string, LootDef>);

export type LootDefKey = keyof (typeof LootDefs)["definitions"];
