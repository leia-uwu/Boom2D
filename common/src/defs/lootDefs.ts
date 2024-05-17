import { DefinitionList, ImgDefinition } from "../utils/definitionList";
import { AmmoPickupDef, AmmoPickupDefs } from "./ammoPickupDefs";
import { GunDef, WeaponDefs } from "./weaponDefs";

export interface BaseLootDef {
    lootImg: ImgDefinition
    respawnTime: number
}

export type LootDef = GunDef | AmmoPickupDef;

export const LootDefs = new DefinitionList({
    ...WeaponDefs.definitions,
    ...AmmoPickupDefs
} as Record<string, LootDef>);

export type LootDefKey = keyof typeof LootDefs["definitions"];
