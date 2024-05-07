import { GameConstants } from "../constants";
import { GameBitStream } from "../net";
import { Collision, type CollisionResponse, type LineIntersection } from "./collision";
import { MathUtils } from "./math";
import { Vec2, type Vector } from "./vector";

export enum HitboxType {
    Circle,
    Rect,
    Polygon
}

export interface HitboxJSONMapping {
    [HitboxType.Circle]: {
        readonly type: HitboxType.Circle
        readonly radius: number
        readonly position: Vector
    }
    [HitboxType.Rect]: {
        readonly type: HitboxType.Rect
        readonly min: Vector
        readonly max: Vector
    }
    [HitboxType.Polygon]: {
        readonly type: HitboxType.Polygon
        readonly center: Vector
        readonly verts: Vector[]
    }
}

export type HitboxJSON = HitboxJSONMapping[HitboxType];

export type Hitbox = CircleHitbox | RectHitbox | PolygonHitbox;

export abstract class BaseHitbox<T extends HitboxType = HitboxType> {
    abstract type: HitboxType;

    abstract toJSON(): HitboxJSONMapping[T];

    static fromJSON(data: HitboxJSON): Hitbox {
        switch (data.type) {
            case HitboxType.Circle:
                return new CircleHitbox(data.radius, data.position);
            case HitboxType.Rect:
                return new RectHitbox(data.min, data.max);
            case HitboxType.Polygon:
                return new PolygonHitbox(data.verts, data.center);
        }
    }

    static serialize(stream: GameBitStream, hitbox: Hitbox) {
        stream.writeBits(hitbox.type, 2);

        switch (hitbox.type) {
            case HitboxType.Circle: {
                stream.writeFloat(hitbox.radius, 0, GameConstants.maxPosition, 16);
                stream.writePosition(hitbox.position);
                break;
            }
            case HitboxType.Rect: {
                stream.writePosition(hitbox.min);
                stream.writePosition(hitbox.max);
                break;
            }
            case HitboxType.Polygon: {
                stream.writeArray(hitbox.verts, 16, point => {
                    stream.writePosition(point);
                });
            }
        }
    }

    static deserialize(stream: GameBitStream): Hitbox {
        const type = stream.readBits(2) as HitboxType;

        switch (type) {
            case HitboxType.Circle: {
                const radius = stream.readFloat(0, GameConstants.maxPosition, 16);
                const position = stream.readPosition();
                return new CircleHitbox(radius, position);
            }
            case HitboxType.Rect: {
                const min = stream.readPosition();
                const max = stream.readPosition();
                return new RectHitbox(min, max);
            }
            case HitboxType.Polygon: {
                const points: Vector[] = [];
                stream.readArray(points, 16, () => {
                    return stream.readPosition();
                });
                return new PolygonHitbox(points);
            }
        }
    }

    abstract transform(position: Vector, rotation: number, scale: number): Hitbox;

    /**
     * Checks if this {@link Hitbox} collides with another one
     * @param that The other {@link Hitbox}
     * @return `true` if both {@link Hitbox}es collide
     */
    abstract collidesWith(that: Hitbox): boolean;

    abstract getIntersection(that: Hitbox): CollisionResponse;

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
     * Check if a line intersects with this {@link Hitbox}.
     * @param a the start point of the line
     * @param b the end point of the line
     * @return An intersection response containing the intersection position and normal
     */
    abstract intersectsLine(a: Vector, b: Vector): LineIntersection;
    /**
     * Get a random position inside this {@link Hitbox}.
     * @return A Vector of a random position inside this {@link Hitbox}
     */

    abstract toRectangle(): RectHitbox;

    abstract isPointInside(point: Vector): boolean;
}

export class CircleHitbox extends BaseHitbox {
    override readonly type = HitboxType.Circle;
    position: Vector;
    radius: number;

    constructor(radius: number, position?: Vector) {
        super();

        this.position = position ?? Vec2.new(0, 0);
        this.radius = radius;
    }

    override toJSON(): HitboxJSONMapping[HitboxType.Circle] {
        return {
            type: this.type,
            radius: this.radius,
            position: Vec2.clone(this.position)
        };
    }

    override transform(position: Vector, rotation = 0, scale = 1) {
        const radius = this.radius * scale;
        const newPos = Vec2.add(Vec2.rotate(Vec2.mul(this.position, scale), rotation), position);
        return new CircleHitbox(radius, newPos);
    }

    override collidesWith(that: Hitbox): boolean {
        switch (that.type) {
            case HitboxType.Circle:
                return Collision.checkCircleCircle(that.position, that.radius, this.position, this.radius);
            case HitboxType.Rect:
                return Collision.checkRectCircle(that.min, that.max, this.position, this.radius);
            case HitboxType.Polygon:
                return Collision.checkCirclePolygon(this.position, this.radius, that.verts);
        }
    }

    override getIntersection(that: Hitbox) {
        switch (that.type) {
            case HitboxType.Circle:
                return Collision.circleCircleIntersection(this.position, this.radius, that.position, that.radius);
            case HitboxType.Rect:
                return Collision.rectCircleIntersection(that.min, that.max, this.position, this.radius);
            case HitboxType.Polygon:
                return Collision.circlePolygonIntersection(this.position, this.radius, that.center, that.verts);
        }
    }

    override clone(): CircleHitbox {
        return new CircleHitbox(this.radius, Vec2.clone(this.position));
    }

    override scale(scale: number): void {
        this.radius *= scale;
    }

    override intersectsLine(a: Vector, b: Vector): LineIntersection {
        return Collision.lineIntersectsCircle(a, b, this.position, this.radius);
    }

    override toRectangle(): RectHitbox {
        return new RectHitbox(
            Vec2.new(this.position.x - this.radius, this.position.y - this.radius),
            Vec2.new(this.position.x + this.radius, this.position.y + this.radius)
        );
    }

    override isPointInside(point: Vector): boolean {
        return Vec2.distance(point, this.position) < this.radius;
    }
}

export class RectHitbox extends BaseHitbox {
    override readonly type = HitboxType.Rect;
    min: Vector;
    max: Vector;

    constructor(min: Vector, max: Vector) {
        super();

        this.min = min;
        this.max = max;
    }

    static fromLine(a: Vector, b: Vector): RectHitbox {
        return new RectHitbox(
            Vec2.new(
                MathUtils.min(a.x, b.x),
                MathUtils.min(a.y, b.y)
            ),
            Vec2.new(
                MathUtils.max(a.x, b.x),
                MathUtils.max(a.y, b.y)
            )
        );
    }

    static fromRect(width: number, height: number, pos = Vec2.new(0, 0)): RectHitbox {
        const size = Vec2.new(width / 2, height / 2);

        return new RectHitbox(
            Vec2.sub(pos, size),
            Vec2.add(pos, size)
        );
    }

    override toJSON(): HitboxJSONMapping[HitboxType.Rect] {
        return {
            type: this.type,
            min: Vec2.clone(this.min),
            max: Vec2.clone(this.max)
        };
    }

    /**
     * Creates a new rectangle hitbox from the bounds of a circle
     */
    static fromCircle(radius: number, position: Vector): RectHitbox {
        return new RectHitbox(
            Vec2.new(position.x - radius, position.y - radius),
            Vec2.new(position.x + radius, position.y + radius));
    }

    override transform(position: Vector, rotation = 0, scale = 1) {
        const e = Vec2.mul(Vec2.sub(this.max, this.min), 0.5);
        const c = Vec2.add(this.min, e);
        const pts = [Vec2.new(c.x - e.x, c.y - e.y), Vec2.new(c.x - e.x, c.y + e.y), Vec2.new(c.x + e.x, c.y - e.y), Vec2.new(c.x + e.x, c.y + e.y)];
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

    override collidesWith(that: Hitbox): boolean {
        switch (that.type) {
            case HitboxType.Circle:
                return Collision.checkRectCircle(this.min, this.max, that.position, that.radius);
            case HitboxType.Rect:
                return Collision.checkRectRect(that.min, that.max, this.min, this.max);
        }
        return false;
    }

    override getIntersection(that: Hitbox) {
        switch (that.type) {
            case HitboxType.Circle:
                return Collision.rectCircleIntersection(this.min, this.max, that.position, that.radius);
            case HitboxType.Rect:
                return Collision.rectRectIntersection(this.min, this.max, that.min, that.max);
        }
        return null;
    }

    override clone(): RectHitbox {
        return new RectHitbox(Vec2.clone(this.min), Vec2.clone(this.max));
    }

    override scale(scale: number): void {
        const centerX = (this.min.x + this.max.x) / 2;
        const centerY = (this.min.y + this.max.y) / 2;

        this.min = Vec2.new((this.min.x - centerX) * scale + centerX, (this.min.y - centerY) * scale + centerY);
        this.max = Vec2.new((this.max.x - centerX) * scale + centerX, (this.max.y - centerY) * scale + centerY);
    }

    override intersectsLine(a: Vector, b: Vector): LineIntersection {
        return Collision.lineIntersectsRect(a, b, this.min, this.max);
    }

    override toRectangle(): this {
        return this;
    }

    override isPointInside(point: Vector): boolean {
        return point.x > this.min.x && point.y > this.min.y && point.x < this.max.x && point.y < this.max.y;
    }
}

export class PolygonHitbox extends BaseHitbox {
    override readonly type = HitboxType.Polygon;
    verts: Vector[];
    constructor(verts: Vector[], public center = Vec2.new(0, 0)) {
        super();
        if (verts.length < 3) {
            throw new Error("Polygons must have at least 3 points");
        }
        this.verts = verts.map(p => Vec2.clone(p));
    }

    override toJSON(): HitboxJSONMapping[HitboxType.Polygon] {
        return {
            type: this.type,
            verts: this.verts.map(point => Vec2.clone(point)),
            center: Vec2.clone(this.center)
        };
    }

    getIntersection(that: Hitbox): CollisionResponse {
        if (that instanceof CircleHitbox) {
            return Collision.circlePolygonIntersection(that.position, that.radius, this.center, this.verts);
        }
        return null;
    }

    override collidesWith(_that: Hitbox): boolean {
        // TODO
        return false;
    }

    override clone(): PolygonHitbox {
        return new PolygonHitbox(this.verts);
    }

    override transform(position: Vector, scale = 1, rotation = 0): PolygonHitbox {
        const points: Vector[] = [];

        const center = Vec2.add(this.center, position);

        for (let i = 0; i < this.verts.length; i++) {
            const pt = this.verts[i];
            const dist = Vec2.distance(pt, this.center) * scale;
            const rot = MathUtils.angleBetweenPoints(pt, this.center) + rotation;
            points.push(Vec2.add(center, Vec2.rotate(Vec2.new(dist, 0), rot)));
        }

        return new PolygonHitbox(points, center);
    }

    override scale(scale: number): void {
        for (let i = 0; i < this.verts.length; i++) {
            const pt = this.verts[i];
            const dist = Vec2.distance(pt, this.center) * scale;
            const rot = MathUtils.angleBetweenPoints(pt, this.center);
            this.verts[i] = Vec2.add(this.center, Vec2.rotate(Vec2.new(dist, 0), rot));
        }
    }

    override intersectsLine(a: Vector, b: Vector): LineIntersection {
        return Collision.lineIntersectsPolygon(a, b, this.verts);
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
        const { x, y } = point;
        let inside = false;
        const count = this.verts.length;
        // take first and last
        // then take second and second last
        // so on
        for (let i = 0, j = count - 1; i < count; j = i++) {
            const { x: xi, y: yi } = this.verts[i];
            const { x: xj, y: yj } = this.verts[j];

            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }

        return inside;
    }
}
