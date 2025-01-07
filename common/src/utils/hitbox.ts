import { type BaseGameMap, type BaseMapObject, MapObjectType } from "../baseMap";
import type { EntityType } from "../constants";
import { Collision, type IntersectionResponse, type LineIntersection } from "./collision";
import { MathUtils } from "./math";
import { assert } from "./util";
import { Vec2, type Vector } from "./vector";

export enum HitboxType {
    Circle,
    Rect,
    Polygon,
}

export interface CircleHitboxJSON {
    readonly type: HitboxType.Circle;
    readonly radius: number;
    readonly position: Vector;
}

export interface RectHitboxJSON {
    readonly type: HitboxType.Rect;
    readonly min: Vector;
    readonly max: Vector;
}

export interface PolygonHitboxJSON {
    readonly type: HitboxType.Polygon;
    readonly verts: Vector[];
}

export type HitboxJSON = CircleHitboxJSON | RectHitboxJSON | PolygonHitboxJSON;

export type Hitbox = CircleHitbox | RectHitbox | PolygonHitbox;

export abstract class BaseHitbox<T extends HitboxType = HitboxType> {
    abstract type: HitboxType;
    static readonly type: HitboxType;

    abstract toJSON(): HitboxJSON & { type: T };

    static fromJSON(data: HitboxJSON): Hitbox {
        switch (data.type) {
            case HitboxType.Circle:
                return new CircleHitbox(data.radius, data.position);
            case HitboxType.Rect:
                return new RectHitbox(data.min, data.max);
            case HitboxType.Polygon:
                return new PolygonHitbox(data.verts);
        }
    }

    abstract transform(position: Vector, rotation: number, scale: number): Hitbox;

    /**
     * Checks if this {@link Hitbox} collides with another one
     * @param that The other {@link Hitbox}
     * @return `true` if both {@link Hitbox}es collide
     */
    collidesWith(that: Hitbox): boolean {
        return CollisionHelpers.hitboxCheck(this as unknown as Hitbox, that);
    }

    /**
     * Checks if this {@link Hitbox} collides with another one
     * And returns an intersection response
     * @param that The other {@link Hitbox}
     * @return The intersection response with direction normal and penetration depth
     */
    getIntersection(that: Hitbox): IntersectionResponse {
        return CollisionHelpers.hitboxIntersection(this as unknown as Hitbox, that);
    }

    /**
     * Check if a line intersects with this {@link Hitbox}.
     * @param a the start point of the line
     * @param b the end point of the line
     * @return An intersection response containing the intersection position and normal
     */
    intersectsLine(a: Vector, b: Vector): LineIntersection {
        return CollisionHelpers.lineHitboxIntersection(this as unknown as Hitbox, a, b);
    }

    /**
     * Resolve collision between {@link Hitbox}es.
     * @param that The other {@link Hitbox}
     */

    /**
     * Clone this {@link Hitbox}.
     * @return a new {@link Hitbox} cloned from this one
     */
    abstract clone(): Hitbox;

    /**
     * Scale this {@link Hitbox}.
     * NOTE: This does change the initial {@link Hitbox}
     * @param scale The scale
     */
    abstract scale(scale: number): void;

    /**
     * Transforms this {@link Hitbox} into a Rectangle hitbox
     * @return a new RectHitbox based on the bounds of this {@link Hitbox}
     */
    abstract toRectangle(): RectHitbox;

    abstract isPointInside(point: Vector): boolean;
}

export class CircleHitbox extends BaseHitbox {
    override readonly type = HitboxType.Circle;
    static readonly type = HitboxType.Circle;

    position: Vector;
    radius: number;

    constructor(radius: number, position?: Vector) {
        super();

        this.position = position ?? Vec2.new(0, 0);
        this.radius = radius;
    }

    override toJSON(): CircleHitboxJSON {
        return {
            type: this.type,
            radius: this.radius,
            position: Vec2.clone(this.position),
        };
    }

    override transform(position: Vector, rotation = 0, scale = 1) {
        const radius = this.radius * scale;
        const newPos = Vec2.add(
            Vec2.rotate(Vec2.mul(this.position, scale), rotation),
            position,
        );
        return new CircleHitbox(radius, newPos);
    }

    override clone(): CircleHitbox {
        return new CircleHitbox(this.radius, Vec2.clone(this.position));
    }

    override scale(scale: number): void {
        this.radius *= scale;
    }

    override toRectangle(): RectHitbox {
        return new RectHitbox(
            Vec2.new(this.position.x - this.radius, this.position.y - this.radius),
            Vec2.new(this.position.x + this.radius, this.position.y + this.radius),
        );
    }

    override isPointInside(point: Vector): boolean {
        return Vec2.distance(point, this.position) < this.radius;
    }
}

export class RectHitbox extends BaseHitbox {
    override readonly type = HitboxType.Rect;
    static readonly type = HitboxType.Rect;

    min: Vector;
    max: Vector;

    constructor(min: Vector, max: Vector) {
        super();

        this.min = min;
        this.max = max;
    }

    static fromLine(a: Vector, b: Vector): RectHitbox {
        return new RectHitbox(
            Vec2.new(MathUtils.min(a.x, b.x), MathUtils.min(a.y, b.y)),
            Vec2.new(MathUtils.max(a.x, b.x), MathUtils.max(a.y, b.y)),
        );
    }

    static fromRect(width: number, height: number, pos = Vec2.new(0, 0)): RectHitbox {
        const size = Vec2.new(width / 2, height / 2);

        return new RectHitbox(Vec2.sub(pos, size), Vec2.add(pos, size));
    }

    override toJSON(): RectHitboxJSON {
        return {
            type: this.type,
            min: Vec2.clone(this.min),
            max: Vec2.clone(this.max),
        };
    }

    /**
     * Creates a new rectangle hitbox from the bounds of a circle
     */
    static fromCircle(radius: number, position: Vector): RectHitbox {
        return new RectHitbox(
            Vec2.new(position.x - radius, position.y - radius),
            Vec2.new(position.x + radius, position.y + radius),
        );
    }

    override transform(position: Vector, rotation = 0, scale = 1) {
        const e = Vec2.mul(Vec2.sub(this.max, this.min), 0.5);
        const c = Vec2.add(this.min, e);
        const pts = [
            Vec2.new(c.x - e.x, c.y - e.y),
            Vec2.new(c.x - e.x, c.y + e.y),
            Vec2.new(c.x + e.x, c.y - e.y),
            Vec2.new(c.x + e.x, c.y + e.y),
        ];
        const min = Vec2.new(Number.MAX_VALUE, Number.MAX_VALUE);
        const max = Vec2.new(-Number.MAX_VALUE, -Number.MAX_VALUE);

        for (let i = 0; i < pts.length; i++) {
            const p = Vec2.add(Vec2.rotate(Vec2.mul(pts[i], scale), rotation), position);
            min.x = MathUtils.min(min.x, p.x);
            min.y = MathUtils.min(min.y, p.y);
            max.x = MathUtils.max(max.x, p.x);
            max.y = MathUtils.max(max.y, p.y);
        }

        return new RectHitbox(min, max);
    }

    override clone(): RectHitbox {
        return new RectHitbox(Vec2.clone(this.min), Vec2.clone(this.max));
    }

    override scale(scale: number): void {
        const centerX = (this.min.x + this.max.x) / 2;
        const centerY = (this.min.y + this.max.y) / 2;

        this.min = Vec2.new(
            (this.min.x - centerX) * scale + centerX,
            (this.min.y - centerY) * scale + centerY,
        );
        this.max = Vec2.new(
            (this.max.x - centerX) * scale + centerX,
            (this.max.y - centerY) * scale + centerY,
        );
    }

    override toRectangle(): this {
        return this;
    }

    override isPointInside(point: Vector): boolean {
        return (
            point.x > this.min.x
            && point.y > this.min.y
            && point.x < this.max.x
            && point.y < this.max.y
        );
    }
}

export class PolygonHitbox extends BaseHitbox {
    override readonly type = HitboxType.Polygon;
    static readonly type = HitboxType.Polygon;

    verts: Vector[];
    normals: Vector[] = [];
    center: Vector;
    constructor(verts: Vector[]) {
        super();
        assert(verts.length >= 3, "Polygons must have at least 3 points");

        this.verts = verts.map((p) => Vec2.clone(p));

        if (
            !Collision.isTriangleCounterClockWise(
                this.verts[0],
                this.verts[1],
                this.verts[2],
            )
        ) {
            this.verts.reverse();
        }

        for (let i = 0; i < this.verts.length; i++) {
            const va = this.verts[i];
            const vb = this.verts[(i + 1) % this.verts.length];
            const edge = Vec2.sub(vb, va);
            this.normals[i] = Vec2.normalize(Vec2.perp(edge));
        }

        this.center = Collision.polygonCenter(this.verts);
    }

    override toJSON(): PolygonHitboxJSON {
        return {
            type: this.type,
            verts: this.verts.map((vert) => Vec2.clone(vert)),
        };
    }

    override clone(): PolygonHitbox {
        return new PolygonHitbox(this.verts);
    }

    override transform(position: Vector, scale = 1, rotation = 0): PolygonHitbox {
        const verts: Vector[] = [];

        const center = Vec2.add(this.center, position);

        for (let i = 0; i < this.verts.length; i++) {
            const pt = this.verts[i];
            const dist = Vec2.distance(pt, this.center) * scale;
            const rot = MathUtils.angleBetweenPoints(pt, this.center) + rotation;
            verts.push(Vec2.add(center, Vec2.rotate(Vec2.new(dist, 0), rot)));
        }

        return new PolygonHitbox(verts);
    }

    override scale(scale: number): void {
        for (let i = 0; i < this.verts.length; i++) {
            const pt = this.verts[i];
            const dist = Vec2.distance(pt, this.center) * scale;
            const rot = MathUtils.angleBetweenPoints(pt, this.center);
            this.verts[i] = Vec2.add(this.center, Vec2.rotate(Vec2.new(dist, 0), rot));
        }
    }

    override toRectangle(): RectHitbox {
        const min = Vec2.new(Number.MAX_VALUE, Number.MAX_VALUE);
        const max = Vec2.new(0, 0);
        for (const point of this.verts) {
            min.x = MathUtils.min(min.x, point.x);
            min.y = MathUtils.min(min.y, point.y);
            max.x = MathUtils.max(max.x, point.x);
            max.y = MathUtils.max(max.y, point.y);
        }

        return new RectHitbox(min, max);
    }

    override isPointInside(point: Vector): boolean {
        return Collision.pointInsidePolygon(point, this.verts);
    }
}

type HitBoxCtr = { type: HitboxType };

const checkFunctions: Array<
    Array<{ fn: (a: Hitbox, b: Hitbox) => boolean; reverse: boolean }>
> = [];

function setCheckFn<A extends HitBoxCtr, B extends HitBoxCtr>(
    hitboxA: A,
    hitboxB: B,
    fn: (a: Hitbox & { type: A["type"] }, b: Hitbox & { type: B["type"] }) => boolean,
) {
    const setFunction = (
        typeA: HitboxType,
        typeB: HitboxType,
        fn: (a: Hitbox & { type: A["type"] }, b: Hitbox & { type: B["type"] }) => boolean,
        reverse: boolean,
    ) => {
        checkFunctions[typeA] = checkFunctions[typeA] || [];
        checkFunctions[typeA][typeB] = {
            fn,
            reverse,
        };
    };
    setFunction(hitboxA.type, hitboxB.type, fn, false);
    if (hitboxA.type != hitboxB.type) {
        setFunction(hitboxB.type, hitboxA.type, fn, true);
    }
}

setCheckFn(CircleHitbox, CircleHitbox, (a, b) => {
    return Collision.checkCircleCircle(a.position, a.radius, b.position, b.radius);
});
setCheckFn(CircleHitbox, RectHitbox, (a, b) => {
    return Collision.checkRectCircle(b.min, b.max, a.position, a.radius);
});
setCheckFn(CircleHitbox, PolygonHitbox, (a, b) => {
    return Collision.checkCirclePolygon(a.position, a.radius, b.verts, b.normals);
});
setCheckFn(RectHitbox, RectHitbox, (a, b) => {
    return Collision.checkRectRect(a.min, a.min, b.min, b.max);
});
setCheckFn(PolygonHitbox, PolygonHitbox, (a, b) => {
    return Collision.checkPolygonPolygon(a.verts, a.normals, b.verts, b.normals);
});

const intersectionFunctions: Array<
    Array<{ fn: (a: Hitbox, b: Hitbox) => IntersectionResponse; reverse: boolean }>
> = [];

function setIntersectionFn<A extends HitBoxCtr, B extends HitBoxCtr>(
    hitboxA: A,
    hitboxB: B,
    fn: (
        a: Hitbox & { type: A["type"] },
        b: Hitbox & { type: B["type"] },
    ) => IntersectionResponse,
) {
    const setFunction = (
        typeA: HitboxType,
        typeB: HitboxType,
        fn: (
            a: Hitbox & { type: A["type"] },
            b: Hitbox & { type: B["type"] },
        ) => IntersectionResponse,
        reverse: boolean,
    ) => {
        intersectionFunctions[typeA] = intersectionFunctions[typeA] || [];
        intersectionFunctions[typeA][typeB] = {
            fn: fn as (a: Hitbox, B: Hitbox) => IntersectionResponse,
            reverse,
        };
    };
    setFunction(hitboxA.type, hitboxB.type, fn, false);
    if (hitboxA.type != hitboxB.type) {
        setFunction(hitboxB.type, hitboxA.type, fn, true);
    }
}

setIntersectionFn(CircleHitbox, CircleHitbox, (a, b) => {
    return Collision.circleCircleIntersection(a.position, a.radius, b.position, b.radius);
});

setIntersectionFn(RectHitbox, CircleHitbox, (a, b) => {
    return Collision.rectCircleIntersection(a.min, a.max, b.position, b.radius);
});

setIntersectionFn(RectHitbox, RectHitbox, (a, b) => {
    return Collision.rectRectIntersection(a.min, a.max, b.min, b.max);
});

setIntersectionFn(CircleHitbox, PolygonHitbox, (a, b) => {
    return Collision.circlePolygonIntersection(
        a.position,
        a.radius,
        b.center,
        b.verts,
        b.normals,
    );
});

setIntersectionFn(PolygonHitbox, PolygonHitbox, (a, b) => {
    return Collision.polygonPolygonIntersection(
        a.verts,
        a.normals,
        a.center,
        b.verts,
        b.normals,
        b.center,
    );
});

const lineIntersectionFunctions: Array<
    (hitbox: Hitbox, a: Vector, b: Vector) => LineIntersection
> = [];

function setLineIntersectionFn<A extends HitBoxCtr>(
    hitbox: A,
    fn: (hitbox: Hitbox & { type: A["type"] }, a: Vector, b: Vector) => LineIntersection,
) {
    lineIntersectionFunctions[hitbox.type] = fn as (typeof lineIntersectionFunctions)[number];
}

setLineIntersectionFn(CircleHitbox, (hitbox, a, b) => {
    return Collision.lineIntersectsCircle(a, b, hitbox.position, hitbox.radius);
});

setLineIntersectionFn(RectHitbox, (hitbox, a, b) => {
    return Collision.lineIntersectsRect(a, b, hitbox.min, hitbox.max);
});

setLineIntersectionFn(PolygonHitbox, (hitbox, a, b) => {
    return Collision.lineIntersectsPolygon(a, b, hitbox.verts);
});

interface Entity {
    __type: EntityType;
    id: number;
    position: Vector;
    hitbox: Hitbox;
}

interface LineOfSightResponse {
    entity?: Entity;
    wall?: BaseMapObject;
    normal?: Vector;
    position: Vector;
    distance: number;
    originalDistance: number;
}

export const CollisionHelpers = {
    hitboxCheck(hitboxA: Hitbox, hitboxB: Hitbox): boolean {
        const collisionFn = checkFunctions[hitboxA.type][hitboxB.type];
        assert(collisionFn, `${hitboxA.type} doesn't support check with ${hitboxB.type}`);
        return collisionFn.reverse
            ? collisionFn.fn(hitboxB, hitboxA)
            : collisionFn.fn(hitboxA, hitboxB);
    },

    hitboxIntersection(hitboxA: Hitbox, hitboxB: Hitbox): IntersectionResponse {
        const collisionFn = intersectionFunctions[hitboxA.type][hitboxB.type];
        assert(
            collisionFn,
            `${hitboxA.type} doesn't support intersection with ${hitboxB.type}`,
        );

        let response = collisionFn.reverse
            ? collisionFn.fn(hitboxB, hitboxA)
            : collisionFn.fn(hitboxA, hitboxB);
        if (response && collisionFn.reverse) {
            response.normal = Vec2.neg(response.normal);
        }
        return response;
    },

    lineHitboxIntersection(hitbox: Hitbox, a: Vector, b: Vector): LineIntersection {
        const intersectionFn = lineIntersectionFunctions[hitbox.type];
        assert(intersectionFn, `Hitbox ${hitbox.type} doens't support line intersection`);
        return intersectionFn(hitbox, a, b);
    },

    lineOfSightCheck(
        entities: Iterable<Entity>,
        map: BaseGameMap,
        pointA: Vector,
        pointB: Vector,
        entitesToCollide: EntityType[],
        entityId = 0,
    ): LineOfSightResponse {
        let originalDist = Vec2.distanceSqrt(pointA, pointB);

        let res: LineOfSightResponse = {
            position: pointB,
            distance: originalDist,
            originalDistance: originalDist,
        };

        const objects = map.intersectLineSegment(pointA, pointB);

        for (const wall of objects) {
            if (wall.type !== MapObjectType.Wall) continue;

            const intersection = wall.hitbox.intersectsLine(pointA, pointB);
            if (intersection) {
                const intersectionDist = Vec2.distanceSqrt(pointA, intersection.point);
                if (intersectionDist < res.distance) {
                    res.normal = intersection.normal;
                    res.position = intersection.point;
                    res.distance = intersectionDist;
                    res.wall = wall;
                }
            }
        }

        for (const entity of entities) {
            if (!entitesToCollide.includes(entity.__type)) continue;
            if (entity.id === entityId) continue;

            const intersection = entity.hitbox.intersectsLine(pointA, pointB);
            if (intersection) {
                const intersectionDist = Vec2.distanceSqrt(pointA, intersection.point);
                if (intersectionDist < res.distance) {
                    res.normal = intersection.normal;
                    res.position = intersection.point;
                    res.distance = intersectionDist;
                    res.wall = undefined;
                    res.entity = entity;
                }
            }
        }

        res.distance = Math.sqrt(res.distance);

        return res;
    },
};
