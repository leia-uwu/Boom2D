import { MathUtils } from "./math";
import { Vec2, type Vector } from "./vector";

export type CollisionResponse = { dir: Vector; pen: number } | null;
export type LineIntersection = { point: Vector; normal: Vector } | null;

export const Collision = {
    /**
     * Check whether two circles collide
     * @param pos1 The center of the first circle
     * @param r1 The radius of the first circle
     * @param pos2 The center of the second circle
     * @param r2 The radius of the second circle
     */
    checkCircleCircle(pos1: Vector, r1: number, pos2: Vector, r2: number): boolean {
        const a = r1 + r2;
        const x = pos1.x - pos2.x;
        const y = pos1.y - pos2.y;

        return a * a > x * x + y * y;
    },

    /**
     * Check whether a rectangle and a circle collide
     * @param min The min Vector of the rectangle
     * @param max The max vector of the rectangle
     * @param pos The center of the circle
     * @param rad The radius of the circle
     */
    checkRectCircle(min: Vector, max: Vector, pos: Vector, rad: number): boolean {
        const cpt = {
            x: MathUtils.clamp(pos.x, min.x, max.x),
            y: MathUtils.clamp(pos.y, min.y, max.y)
        };

        const distX = pos.x - cpt.x;
        const distY = pos.y - cpt.y;
        const distSquared = distX * distX + distY * distY;

        return (
            distSquared < rad * rad ||
            (pos.x >= min.x && pos.x <= max.x && pos.y >= min.y && pos.y <= max.y)
        );
    },

    /**
     * Check whether two rectangles collide
     * @param min The min Vector of the first rectangle
     * @param max The max vector of the first rectangle
     * @param min2 The min Vector of the second rectangle
     * @param max2 The max vector of the second rectangle
     */
    checkRectRect(min1: Vector, max1: Vector, min2: Vector, max2: Vector): boolean {
        return min2.x < max1.x && min2.y < max1.y && min1.x < max2.x && min1.y < max2.y;
    },
    checkCirclePolygon(
        circleCenter: Vector,
        circleRadius: number,
        vertices: Vector[]
    ): boolean {
        let axis = Vec2.new(0, 0);

        for (let i = 0; i < vertices.length; i++) {
            const va = vertices[i];
            const vb = vertices[(i + 1) % vertices.length];

            const edge = Vec2.sub(vb, va);
            axis = Vec2.new(-edge.y, edge.x);
            axis = Vec2.normalize(axis);

            const { min: minA, max: maxA } = Collision.projectVertices(vertices, axis);
            const { min: minB, max: maxB } = Collision.projectCircle(
                circleCenter,
                circleRadius,
                axis
            );

            if (minA >= maxB || minB >= maxA) {
                return false;
            }
        }

        const cpIndex = Collision.findClosestPointOnPolygon(circleCenter, vertices);
        const cp = vertices[cpIndex];

        axis = Vec2.sub(cp, circleCenter);
        axis = Vec2.normalize(axis);

        const { min: minA, max: maxA } = Collision.projectVertices(vertices, axis);
        const { min: minB, max: maxB } = Collision.projectCircle(
            circleCenter,
            circleRadius,
            axis
        );

        if (minA >= maxB || minB >= maxA) {
            return false;
        }

        return true;
    },
    /**
     * Checks if a line intersects another line
     * @param a0 The start of the first line
     * @param a1 The end of the first line
     * @param b0 The start of the second line
     * @param b1 The end of the second line
     * @return The intersection position if it happened, if not returns null
     */
    lineIntersectsLine(a0: Vector, a1: Vector, b0: Vector, b1: Vector): Vector | null {
        const x1 = MathUtils.signedAreaTri(a0, a1, b1);
        const x2 = MathUtils.signedAreaTri(a0, a1, b0);
        if (x1 !== 0 && x2 !== 0 && x1 * x2 < 0) {
            const x3 = MathUtils.signedAreaTri(b0, b1, a0);
            const x4 = x3 + x2 - x1;
            if (x3 * x4 < 0) {
                const t = x3 / (x3 - x4);
                return Vec2.add(a0, Vec2.mul(Vec2.sub(a1, a0), t));
            }
        }
        return null;
    },

    /**
     * Checks if a line intersects a circle
     * @param s0 The start of the line
     * @param s1 The end of the line
     * @param pos The position of the circle
     * @param rad The radius of the circle
     * @return An intersection response with the intersection position and normal Vectors, returns null if they don't intersect
     */
    lineIntersectsCircle(
        s0: Vector,
        s1: Vector,
        pos: Vector,
        rad: number
    ): LineIntersection {
        let d = Vec2.sub(s1, s0);
        const len = MathUtils.max(Vec2.length(d), 0.000001);
        d = Vec2.div(d, len);
        const m = Vec2.sub(s0, pos);
        const b = Vec2.dot(m, d);
        const c = Vec2.dot(m, m) - rad * rad;
        if (c > 0 && b > 0.0) {
            return null;
        }
        const discSq = b * b - c;
        if (discSq < 0) {
            return null;
        }
        const disc = Math.sqrt(discSq);
        let t = -b - disc;
        if (t < 0) {
            t = -b + disc;
        }
        if (t <= len) {
            const point = Vec2.add(s0, Vec2.mul(d, t));
            return {
                point,
                normal: Vec2.normalize(Vec2.sub(point, pos))
            };
        }
        return null;
    },

    /**
     * Checks if a line intersects a rectangle
     * @param s0 The start of the line
     * @param s1 The end of the line
     * @param min The min Vector of the rectangle
     * @param max The max Vector of the rectangle
     * @return An intersection response with the intersection position and normal Vectors, returns null if they don't intersect
     */
    lineIntersectsRect(
        s0: Vector,
        s1: Vector,
        min: Vector,
        max: Vector
    ): LineIntersection {
        let tmin = 0;
        let tmax = Number.MAX_VALUE;
        const eps = 0.00001;
        const r = s0;
        let d = Vec2.sub(s1, s0);
        const dist = Vec2.length(d);
        d = dist > eps ? Vec2.div(d, dist) : Vec2.new(1, 0);

        let absDx = Math.abs(d.x);
        let absDy = Math.abs(d.y);

        if (absDx < eps) {
            d.x = eps * 2;
            absDx = d.x;
        }
        if (absDy < eps) {
            d.y = eps * 2;
            absDy = d.y;
        }

        if (absDx > eps) {
            const tx1 = (min.x - r.x) / d.x;
            const tx2 = (max.x - r.x) / d.x;
            tmin = MathUtils.max(tmin, MathUtils.min(tx1, tx2));
            tmax = MathUtils.min(tmax, MathUtils.max(tx1, tx2));
            if (tmin > tmax) {
                return null;
            }
        }
        if (absDy > eps) {
            const ty1 = (min.y - r.y) / d.y;
            const ty2 = (max.y - r.y) / d.y;
            tmin = MathUtils.max(tmin, MathUtils.min(ty1, ty2));
            tmax = MathUtils.min(tmax, MathUtils.max(ty1, ty2));
            if (tmin > tmax) {
                return null;
            }
        }
        if (tmin > dist) {
            return null;
        }
        // Hit
        const point = Vec2.add(s0, Vec2.mul(d, tmin));
        // Intersection normal
        const c = Vec2.add(min, Vec2.mul(Vec2.sub(max, min), 0.5));
        const p0 = Vec2.sub(point, c);
        const d0 = Vec2.mul(Vec2.sub(min, max), 0.5);

        const x = (p0.x / Math.abs(d0.x)) * 1.001;
        const y = (p0.y / Math.abs(d0.y)) * 1.001;
        const normal = Vec2.normalizeSafe(
            {
                x: x < 0 ? Math.ceil(x) : Math.floor(x),
                y: y < 0 ? Math.ceil(y) : Math.floor(y)
            },
            Vec2.new(1, 0)
        );
        return {
            point,
            normal
        };
    },

    /**
     * Checks if a line intersects a polygon
     * @param s0 The start of the line
     * @param s1 The end of the line
     * @param vertices The polygon vertices
     * @return An intersection response with the intersection position and normal Vectors, returns null if they don't intersect
     */
    lineIntersectsPolygon(a: Vector, b: Vector, vertices: Vector[]): LineIntersection {
        let closestDist = Number.MAX_VALUE;
        let normal: Vector | undefined = undefined;
        let point: Vector | undefined = undefined;

        for (let i = 0; i < vertices.length; i++) {
            const va = vertices[i];
            const vb = vertices[(i + 1) % vertices.length];

            const intersection = Collision.lineIntersectsLine(a, b, va, vb);

            if (intersection) {
                const newDist = Vec2.distanceSqrt(intersection, a);

                if (newDist < closestDist) {
                    closestDist = newDist;
                    normal = Vec2.normalize(Vec2.perp(Vec2.sub(va, vb)));
                    point = intersection;
                }
            }
        }

        if (point && normal) {
            return {
                point,
                normal
            };
        }

        return null;
    },

    /**
     * Checks if circle intersects another circle
     * @param pos0 The position of the first circle
     * @param rad0 The radius of the first circle
     * @param pos1 The position of the second circle
     * @param rad1 The radius of the second circle
     * @return An intersection response with the intersection direction and pen, returns null if they don't intersect
     */
    circleCircleIntersection(
        pos0: Vector,
        rad0: number,
        pos1: Vector,
        rad1: number
    ): CollisionResponse {
        const r = rad0 + rad1;
        const toP1 = Vec2.sub(pos1, pos0);
        const distSqr = Vec2.lengthSqr(toP1);
        if (distSqr < r * r) {
            const dist = Math.sqrt(distSqr);
            return {
                dir: dist > 0.00001 ? Vec2.div(toP1, dist) : Vec2.new(1.0, 0.0),
                pen: r - dist
            };
        }
        return null;
    },

    /**
     * Checks if circle intersects a rectangle
     * @param min The min Vector of the rectangle
     * @param max The max Vector of the rectangle
     * @param pos The position of the circle
     * @param radius The radius of the circle
     * @return An intersection response with the intersection direction and pen, returns null if they don't intersect
     */
    rectCircleIntersection(
        min: Vector,
        max: Vector,
        pos: Vector,
        radius: number
    ): CollisionResponse {
        if (pos.x >= min.x && pos.x <= max.x && pos.y >= min.y && pos.y <= max.y) {
            const e = Vec2.mul(Vec2.sub(max, min), 0.5);
            const c = Vec2.add(min, e);
            const p = Vec2.sub(pos, c);
            const xp = Math.abs(p.x) - e.x - radius;
            const yp = Math.abs(p.y) - e.y - radius;
            if (xp > yp) {
                return {
                    dir: Vec2.new(p.x > 0.0 ? 1.0 : -1.0, 0.0),
                    pen: -xp
                };
            }
            return {
                dir: Vec2.new(0.0, p.y > 0.0 ? 1.0 : -1.0),
                pen: -yp
            };
        }
        const cpt = Vec2.new(
            MathUtils.clamp(pos.x, min.x, max.x),
            MathUtils.clamp(pos.y, min.y, max.y)
        );

        const dir = Vec2.sub(cpt, pos);

        const dstSqr = Vec2.lengthSqr(dir);
        if (dstSqr < radius * radius) {
            const dst = Math.sqrt(dstSqr);
            return {
                dir: dst > 0.0001 ? Vec2.div(dir, dst) : Vec2.new(1.0, 0.0),
                pen: radius - dst
            };
        }

        return null;
    },

    /**
     * Checks if a rectangle intersects a rectangle
     * @param min The min Vector of the first rectangle
     * @param max The max vector of the first rectangle
     * @param min2 The min Vector of the second rectangle
     * @param max2 The max vector of the second rectangle
     * @return An intersection response with the intersection direction and pen, returns null if they don't intersect
     */
    rectRectIntersection(
        min0: Vector,
        max0: Vector,
        min1: Vector,
        max1: Vector
    ): CollisionResponse {
        const e0 = Vec2.mul(Vec2.sub(max0, min0), 0.5);
        const c0 = Vec2.add(min0, e0);
        const e1 = Vec2.mul(Vec2.sub(max1, min1), 0.5);
        const c1 = Vec2.add(min1, e1);
        const n = Vec2.sub(c1, c0);
        const xo = e0.x + e1.x - Math.abs(n.x);
        if (xo > 0.0) {
            const yo = e0.y + e1.y - Math.abs(n.y);
            if (yo > 0.0) {
                if (xo > yo) {
                    return {
                        dir: n.x < 0.0 ? Vec2.new(-1.0, 0.0) : Vec2.new(1.0, 0.0),
                        pen: xo
                    };
                }
                return {
                    dir: n.y < 0.0 ? Vec2.new(0.0, -1.0) : Vec2.new(0.0, 1.0),
                    pen: yo
                };
            }
        }
        return null;
    },

    /**
     * Checks if a circle intersects a polygon
     * @param circleCenter The center of the circle
     * @param circleRadius The radius of the circle
     * @param polygonCenter The center of the polygon
     * @param vertices The polygon vertices
     * @link https://www.youtube.com/watch?v=V2JI_P9bvik
     * @return An intersection response with the intersection direction and pen, returns null if they don't intersect
     */
    circlePolygonIntersection(
        circleCenter: Vector,
        circleRadius: number,
        polygonCenter: Vector,
        vertices: Vector[]
    ): CollisionResponse {
        let dir = Vec2.new(0, 0);
        let pen = Number.MAX_VALUE;

        let axis = Vec2.new(0, 0);
        let axisDepth = 0;

        for (let i = 0; i < vertices.length; i++) {
            const va = vertices[i];
            const vb = vertices[(i + 1) % vertices.length];

            const edge = Vec2.sub(vb, va);
            axis = Vec2.new(-edge.y, edge.x);
            axis = Vec2.normalize(axis);

            const { min: minA, max: maxA } = Collision.projectVertices(vertices, axis);
            const { min: minB, max: maxB } = Collision.projectCircle(
                circleCenter,
                circleRadius,
                axis
            );

            if (minA >= maxB || minB >= maxA) {
                return null;
            }

            axisDepth = MathUtils.min(maxB - minA, maxA - minB);

            if (axisDepth < pen) {
                pen = axisDepth;
                dir = axis;
            }
        }

        const cpIndex = Collision.findClosestPointOnPolygon(circleCenter, vertices);
        const cp = vertices[cpIndex];

        axis = Vec2.sub(cp, circleCenter);
        axis = Vec2.normalize(axis);

        const { min: minA, max: maxA } = Collision.projectVertices(vertices, axis);
        const { min: minB, max: maxB } = Collision.projectCircle(
            circleCenter,
            circleRadius,
            axis
        );

        if (minA >= maxB || minB >= maxA) {
            return null;
        }

        axisDepth = MathUtils.min(maxB - minA, maxA - minB);

        if (axisDepth < pen) {
            pen = axisDepth;
            dir = axis;
        }

        const direction = Vec2.sub(polygonCenter, circleCenter);

        if (Vec2.dot(direction, dir) < 0) {
            dir = Vec2.neg(dir);
        }

        return {
            pen,
            dir
        };
    },

    findClosestPointOnPolygon(circleCenter: Vector, vertices: Vector[]) {
        let result = -1;
        let minDistance = Number.MAX_VALUE;

        for (let i = 0; i < vertices.length; i++) {
            const v = vertices[i];
            const distance = Vec2.distanceSqrt(v, circleCenter);

            if (distance < minDistance) {
                minDistance = distance;
                result = i;
            }
        }

        return result;
    },

    projectCircle(center: Vector, radius: number, axis: Vector) {
        const direction = Vec2.normalize(axis);
        const directionAndRadius = Vec2.mul(direction, radius);

        const p1 = Vec2.add(center, directionAndRadius);
        const p2 = Vec2.sub(center, directionAndRadius);

        let min = Vec2.dot(p1, axis);
        let max = Vec2.dot(p2, axis);

        if (min > max) {
            // swap the min and max values.
            const t = min;
            min = max;
            max = t;
        }
        return { min, max };
    },

    projectVertices(vertices: Vector[], axis: Vector) {
        let min = Number.MAX_VALUE;
        let max = Number.MIN_VALUE;

        for (let i = 0; i < vertices.length; i++) {
            const v = vertices[i];
            const proj = Vec2.dot(v, axis);

            if (proj < min) {
                min = proj;
            }
            if (proj > max) {
                max = proj;
            }
        }
        return { min, max };
    },

    polygonCenter(vertices: Vector[]): Vector {
        let center = Vec2.new(0, 0);
        for (let i = 0; i < vertices.length; i++) {
            Vec2.set(center, Vec2.add(center, vertices[i]));
        }
        Vec2.set(center, Vec2.mul(center, 1 / vertices.length));
        return center;
    },

    isTriangleCounterClockWise(a: Vector, b: Vector, c: Vector): boolean {
        return b.x * a.y + c.x * b.y + a.x * c.y < a.x * b.y + b.x * c.y + c.x * a.y;
    }
};
