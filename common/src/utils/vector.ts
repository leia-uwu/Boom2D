import { MathUtils } from "./math";

/**
 * 2D vector
 */
export interface Vector {
    x: number;
    y: number;
}

/**
 * Vector util functions
 */
export const Vec2 = {
    new(x: number, y: number): Vector {
        return { x, y };
    },

    set(a: Vector, b: Vector) {
        a.x = b.x;
        a.y = b.y;
    },

    add(a: Vector, b: Vector): Vector {
        return Vec2.new(a.x + b.x, a.y + b.y);
    },

    add2(a: Vector, x: number, y: number): Vector {
        return Vec2.new(a.x + x, a.y + y);
    },

    sub(a: Vector, b: Vector): Vector {
        return Vec2.new(a.x - b.x, a.y - b.y);
    },

    sub2(a: Vector, x: number, y: number): Vector {
        return Vec2.new(a.x - x, a.y - y);
    },

    mul(a: Vector, n: number): Vector {
        return Vec2.new(a.x * n, a.y * n);
    },

    div(a: Vector, n: number): Vector {
        return Vec2.new(a.x / n, a.y / n);
    },

    clone(vector: Vector): Vector {
        return Vec2.new(vector.x, vector.y);
    },

    invert(a: Vector): Vector {
        return Vec2.new(-a.x, -a.y);
    },

    /**
     * @param angle The angle in radians
     */
    rotate(vector: Vector, angle: number): Vector {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return Vec2.new(vector.x * cos - vector.y * sin, vector.x * sin + vector.y * cos);
    },

    lengthSqr(a: Vector): number {
        return a.x * a.x + a.y * a.y;
    },

    length(a: Vector): number {
        return Math.sqrt(Vec2.lengthSqr(a));
    },

    distanceSqrt(a: Vector, b: Vector): number {
        const diff = Vec2.sub(a, b);
        return Vec2.lengthSqr(diff);
    },

    distance(a: Vector, b: Vector): number {
        const diff = Vec2.sub(a, b);
        return Vec2.length(diff);
    },

    normalize(a: Vector): Vector {
        const eps = 0.000001;
        const len = Vec2.length(a);
        return {
            x: len > eps ? a.x / len : a.x,
            y: len > eps ? a.y / len : a.y,
        };
    },

    normalizeSafe(a: Vector, b?: Vector): Vector {
        b = b ?? Vec2.new(1.0, 0.0);
        const eps = 0.000001;
        const len = Vec2.length(a);
        return {
            x: len > eps ? a.x / len : b.x,
            y: len > eps ? a.y / len : b.y,
        };
    },

    lerp(start: Vector, end: Vector, interpFactor: number): Vector {
        return Vec2.add(Vec2.mul(start, 1 - interpFactor), Vec2.mul(end, interpFactor));
    },

    dot(a: Vector, b: Vector): number {
        return a.x * b.x + a.y * b.y;
    },

    neg(vec: Vector): Vector {
        return { x: -vec.x, y: -vec.y };
    },

    perp(a: Vector): Vector {
        return { x: -a.y, y: a.x };
    },

    equals(a: Vector, b: Vector, epsilon = 0.001): boolean {
        return Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon;
    },

    midpoint(p1: Vector, p2: Vector): Vector {
        return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    },

    minElems(a: Vector, b: Vector): Vector {
        return { x: MathUtils.min(a.x, b.x), y: MathUtils.min(a.y, b.y) };
    },

    maxElems(a: Vector, b: Vector): Vector {
        return { x: MathUtils.max(a.x, b.x), y: MathUtils.max(a.y, b.y) };
    },

    /**
     * Takes a polar representation of a vector and converts it into a cartesian one
     * @param angle The angle in radians
     * @param magnitude The vector's length. Defaults to 1
     * @returns A new vector whose length is `magnitude` and whose direction is `angle`
     */
    fromPolar(angle: number, magnitude = 1): Vector {
        return {
            x: Math.cos(angle) * magnitude,
            y: Math.sin(angle) * magnitude,
        };
    },
};
