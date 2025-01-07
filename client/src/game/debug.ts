import { type ColorSource, Graphics } from "pixi.js";
import {
    type CircleHitboxJSON,
    type HitboxJSON,
    HitboxType,
    type PolygonHitboxJSON,
    type RectHitboxJSON,
} from "../../../common/src/utils/hitbox";
import { Vec2, type Vector } from "../../../common/src/utils/vector";
import { Helpers } from "../helpers";
import { Camera } from "./camera";

export const DEBUG_ENABLED = false;

enum ShapeType {
    Circle,
    Rect,
    Polygon,
    Line,
    Ray,
}

interface Line {
    type: ShapeType.Line;
    a: Vector;
    b: Vector;
}

interface Ray {
    type: ShapeType.Ray;
    position: Vector;
    direction: Vector;
    length: number;
}

type DebugShape = (CircleHitboxJSON | RectHitboxJSON | PolygonHitboxJSON | Line | Ray) & {
    color: ColorSource;
};

export class DebugRenderer {
    readonly graphics = new Graphics({
        zIndex: 999,
    });

    private shapes: DebugShape[] = [];

    render(): void {
        if (!DEBUG_ENABLED) return;
        const ctx = this.graphics;
        ctx.clear();
        for (let i = 0; i < this.shapes.length; i++) {
            const shape = this.shapes[i];
            ctx.beginPath();
            switch (shape.type) {
                case HitboxType.Circle:
                case HitboxType.Rect:
                case HitboxType.Polygon:
                    Helpers.drawHitbox(ctx, shape);
                    break;
                case ShapeType.Line: {
                    const start = Camera.vecToScreen(shape.a);
                    const end = Camera.vecToScreen(shape.b);
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(end.x, end.y);
                    break;
                }
                case ShapeType.Ray: {
                    const start = Camera.vecToScreen(shape.position);
                    ctx.moveTo(start.x, start.y);
                    const end = Camera.vecToScreen(
                        Vec2.add(shape.position, Vec2.mul(shape.direction, shape.length)),
                    );
                    ctx.lineTo(end.x, end.y);
                    break;
                }
            }
            ctx.stroke({
                color: shape.color,
                width: 2,
            });
        }
    }

    addHitbox(hitbox: HitboxJSON, color: ColorSource): void {
        this.shapes.push({
            ...hitbox,
            color,
        });
    }

    addLine(a: Vector, b: Vector, color: ColorSource): void {
        this.shapes.push({
            type: ShapeType.Line,
            a,
            b,
            color,
        });
    }

    addRay(
        position: Vector,
        direction: Vector,
        length: number,
        color: ColorSource,
    ): void {
        this.shapes.push({
            type: ShapeType.Ray,
            position,
            direction,
            length,
            color,
        });
    }

    flush(): void {
        this.shapes.length = 0;
    }
}

export const debugRenderer = new DebugRenderer();
