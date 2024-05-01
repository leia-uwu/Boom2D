import { type Sprite, Texture } from "pixi.js";
import { type ImgDefinition } from "../../common/src/utils/definitionList";

export function getElem<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector(selector);
    if (!(element instanceof HTMLElement)) {
        throw new Error(`Unknown element with selector: ${selector}`);
    }
    return element as T;
}

export function spriteFromDef(sprite: Sprite, def: ImgDefinition) {
    sprite.texture = Texture.from(def.src);

    if (def.rotation !== undefined) { sprite.rotation = def.rotation; }

    if (def.tint !== undefined) { sprite.tint = def.tint; }

    if (def.scale !== undefined) { sprite.scale.set(def.scale); }

    if (def.zIndex !== undefined) { sprite.zIndex = def.zIndex; }

    if (def.position) { sprite.position = def.position; }
}
