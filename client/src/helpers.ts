import { type Graphics, type Sprite, Texture } from "pixi.js";
import type { ImgDefinition } from "../../common/src/utils/definitionList";
import { type Hitbox, HitboxType } from "../../common/src/utils/hitbox";
import { Camera } from "./game/camera";

export const Helpers = {
    getElem<T extends HTMLElement>(selector: string): T {
        const element = document.querySelector(selector);
        if (!(element instanceof HTMLElement)) {
            throw new Error(`Unknown element with selector: ${selector}`);
        }
        return element as T;
    },
    spriteFromDef(sprite: Sprite, def: ImgDefinition) {
        sprite.texture = Texture.from(def.src);

        if (def.rotation !== undefined) {
            sprite.rotation = def.rotation;
        }

        if (def.tint !== undefined) {
            sprite.tint = def.tint;
        }

        if (def.scale !== undefined) {
            sprite.scale.set(def.scale);
        }

        if (def.zIndex !== undefined) {
            sprite.zIndex = def.zIndex;
        }

        if (def.position) {
            sprite.position = def.position;
        }
    },

    drawHitbox(ctx: Graphics, hitbox: Hitbox) {
        switch (hitbox.type) {
            case HitboxType.Circle: {
                const pos = Camera.vecToScreen(hitbox.position);
                ctx.circle(pos.x, pos.y, Camera.unitToScreen(hitbox.radius));
                break;
            }
            case HitboxType.Rect: {
                const min = Camera.vecToScreen(hitbox.min);
                const max = Camera.vecToScreen(hitbox.max);
                const width = max.x - min.x;
                const height = max.y - min.y;
                ctx.rect(min.x, min.y, width, height);
                break;
            }
            case HitboxType.Polygon:
                ctx.poly(hitbox.verts.map((p) => Camera.vecToScreen(p)));
                break;
        }
    }
};
