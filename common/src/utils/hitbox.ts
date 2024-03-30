import { Collision, CollisionResponse, LineIntersection } from "./collision"
import { Vec2, Vector } from "./vector"

export enum HitboxType {
    Circle,
    Rect,
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
}

export type HitboxJSON = HitboxJSONMapping[HitboxType];

export interface HitboxMapping {
    [HitboxType.Circle]: CircleHitbox
    [HitboxType.Rect]: RectHitbox
}

export type Hitbox = HitboxMapping[HitboxType];

export abstract class BaseHitbox {
    abstract type: HitboxType;

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

    override collidesWith(that: Hitbox): boolean {
        switch (that.type) {
            case HitboxType.Circle:
                return Collision.checkCircleCircle(that.position, that.radius, this.position, this.radius);
            case HitboxType.Rect:
                return Collision.checkRectCircle(that.min, that.max, this.position, this.radius);
        }
    }

    override getIntersection(that: Hitbox) {
        switch (that.type) {
            case HitboxType.Circle:
                return Collision.circleCircleIntersection(this.position, this.radius, that.position, that.radius);
            case HitboxType.Rect:
                return Collision.rectCircleIntersection(that.min, that.max, this.position, this.radius)
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

    toJSON(): HitboxJSONMapping[HitboxType.Rect] {
        return {
            type: this.type,
            min: Vec2.clone(this.min),
            max: Vec2.clone(this.max)
        };
    }

    static fromLine(a: Vector, b: Vector): RectHitbox {
        return new RectHitbox(
            Vec2.new(
                Math.min(a.x, b.x),
                Math.min(a.y, b.y)
            ),
            Vec2.new(
                Math.max(a.x, b.x),
                Math.max(a.y, b.y)
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
    /**
     * Creates a new rectangle hitbox from the bounds of a circle
     */
    static fromCircle(radius: number, position: Vector): RectHitbox {
        return new RectHitbox(
            Vec2.new(position.x - radius, position.y - radius),
            Vec2.new(position.x + radius, position.y + radius));
    }

    override collidesWith(that: Hitbox): boolean {
        switch (that.type) {
            case HitboxType.Circle:
                return Collision.checkRectCircle(this.min, this.max, that.position, that.radius);
            case HitboxType.Rect:
                return Collision.checkRectRect(that.min, that.max, this.min, this.max);
        }
    }

    override getIntersection(that: Hitbox) {
        switch (that.type) {
            case HitboxType.Circle:
                return Collision.rectCircleIntersection(this.min, this.max, that.position, that.radius)
            case HitboxType.Rect:
                return Collision.rectRectIntersection(this.min, this.max, that.min, that.max);
        }
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

