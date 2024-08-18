import { DefinitionList, type ImgDefinition } from "../utils/definitionList";
import type { AmmoDefKey } from "./ammoDefs";
import { type GunDef, type WeaponDefKey, WeaponDefs } from "./weaponDefs";

export interface BaseLootDef {
    lootImg: ImgDefinition;
    lootRadius: number;
    respawnTime: number;
}

export interface AmmoPickupDef extends BaseLootDef {
    type: "ammo-pickup";
    ammo: Partial<Record<AmmoDefKey, number>>;
}

export interface PowerUpDef extends BaseLootDef {
    type: "powerup";
    health: number;
    maxHealth: number;
    maxArmor: number;
    armor: number;
}

export type LootDef = GunDef | AmmoPickupDef | PowerUpDef;

export type LootDefKey =
    | WeaponDefKey
    | "ammoClip"
    | "ammoBox"
    | "shell"
    | "shellBox"
    | "rocket"
    | "rocketBox"
    | "energyCell"
    | "energyCellPack"
    | "stimpack"
    | "medikit";

const rawDefs: Record<LootDefKey, LootDef> = {
    ...WeaponDefs.definitions,
    ammoClip: {
        type: "ammo-pickup",
        respawnTime: 10,
        lootRadius: 1.2,
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
        lootRadius: 1.8,
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
        lootRadius: 1.4,
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
        lootRadius: 2,
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
        lootRadius: 1.5,
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
        lootRadius: 2.5,
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
        lootRadius: 1.5,
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
        lootRadius: 2.5,
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
        lootRadius: 1.4,
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
        lootRadius: 2,
        health: 25,
        maxHealth: 100,
        armor: 0,
        maxArmor: 0,
        lootImg: {
            src: "medikit.svg"
        }
    }
};

export const LootDefs = new DefinitionList<LootDefKey, LootDef>(rawDefs);
