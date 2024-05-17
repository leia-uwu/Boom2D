import { type AmmoType } from "../constants";
import { type ImgDefinition } from "../utils/definitionList";
import { type BaseLootDef } from "./lootDefs";

export interface AmmoPickupDef extends BaseLootDef {
    type: "ammo-pickup"
    ammo: Partial<Record<AmmoType, number>>
    lootImg: ImgDefinition
}

export const AmmoPickupDefs = {
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
    }
} satisfies Record<string, AmmoPickupDef>;
