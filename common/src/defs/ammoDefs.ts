import { DefinitionList, type ImgDefinition } from "../utils/definitionList";

interface AmmoDef {
    color: number;
    inventoryImg: ImgDefinition;
}

export const AmmoDefs = new DefinitionList({
    bullet: {
        color: 0xffff00,
        inventoryImg: {
            src: "ui-bullet.svg"
        }
    },
    shell: {
        color: 0xff0000,
        inventoryImg: {
            src: "ui-shell.svg"
        }
    },
    rocket: {
        color: 0xff510c,
        inventoryImg: {
            src: "ui-rocket.svg"
        }
    },
    cell: {
        color: 0x00ff00,
        inventoryImg: {
            src: "ui-cell.svg"
        }
    }
} satisfies Record<string, AmmoDef>);

export type AmmoDefKey = keyof (typeof AmmoDefs)["definitions"];
