import * as PIXI from "pixi.js";
import type { ImgDefinition } from "../../common/src/utils/definitionList";
import { type HitboxJSON, HitboxType } from "../../common/src/utils/hitbox";
import { assert } from "../../common/src/utils/util";
import { Camera } from "./game/camera";

export const Helpers = {
    getElem<T extends HTMLElement>(selector: string): T {
        const element = document.querySelector(selector);

        assert(
            element instanceof HTMLElement,
            `Unknown element with selector: ${selector}`,
        );

        return element as T;
    },
    spriteFromDef(sprite: PIXI.Sprite, def: ImgDefinition) {
        sprite.texture = PIXI.Texture.from(def.src);

        sprite.rotation = def.rotation ?? 0;

        sprite.tint = def.tint ?? 0xffffff;

        sprite.scale.set(def.scale ?? 1);

        sprite.zIndex = def.zIndex ?? 0;

        sprite.position = def.position ?? { x: 0, y: 0 };

        sprite.anchor = def.anchor ?? { x: 0.5, y: 0.5 };
    },

    drawHitbox(ctx: PIXI.Graphics, hitbox: HitboxJSON) {
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
    },
};
