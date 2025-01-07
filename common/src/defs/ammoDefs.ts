import { DefinitionList, type ImgDefinition } from "../utils/definitionList";

interface AmmoDef {
    color: number;
    inventoryImg: ImgDefinition;
}

export type AmmoDefKey = "bullet" | "shell" | "rocket" | "cell";

const rawDefs: Record<AmmoDefKey, AmmoDef> = {
    bullet: {
        color: 0xffff00,
        inventoryImg: {
            src: "ui-bullet.svg",
        },
    },
    shell: {
        color: 0xff0000,
        inventoryImg: {
            src: "ui-shell.svg",
        },
    },
    rocket: {
        color: 0xff510c,
        inventoryImg: {
            src: "ui-rocket.svg",
        },
    },
    cell: {
        color: 0x00ff00,
        inventoryImg: {
            src: "ui-cell.svg",
        },
    },
};

export const AmmoDefs = new DefinitionList<AmmoDefKey, AmmoDef>(rawDefs);
