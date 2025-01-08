import { BaseGameMap, BaseMapObject, MapObjectType } from "../baseMap";
import { EntityType } from "../constants";
import { Hitbox } from "./hitbox";
import { Vec2, Vector } from "./vector";

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
