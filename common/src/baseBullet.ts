import { EntityType } from "./constants";
import { BulletDefKey, BulletDefs } from "./defs/bulletDefs";
import { GameBitStream } from "./net";
import { Hitbox } from "./utils/hitbox";
import { Vec2, Vector } from "./utils/vector";

export interface BulletParams {
    initialPosition: Vector
    shooterId: number
    direction: Vector
    type: BulletDefKey
}

interface GameEntity {
    type: EntityType
    hitbox: Hitbox
    id: number
}

export class BaseBullet implements BulletParams {
    direction: Vector;
    initialPosition: Vector;
    type: BulletDefKey;
    shooterId: number;

    distanceTraveled = 0;
    dead = false;

    position: Vector;
    lastPosition: Vector;
    finalPosition: Vector;

    constructor(params: BulletParams) {
        this.initialPosition = Vec2.clone(params.initialPosition);
        this.direction = Vec2.clone(params.direction);
        this.type = params.type;
        this.shooterId = params.shooterId;

        this.initialPosition = Vec2.clone(params.initialPosition);
        this.lastPosition = Vec2.clone(params.initialPosition);
        this.position = Vec2.clone(params.initialPosition);

        const def = BulletDefs.typeToDef(this.type);

        this.finalPosition = Vec2.add(this.position, Vec2.mul(this.direction, def.maxDistance));
    }

    tick(dt: number) {
        const def = BulletDefs.typeToDef(this.type);

        this.lastPosition = Vec2.clone(this.position);
        this.position = Vec2.add(this.position, Vec2.mul(this.direction, def.speed * dt));

        this.distanceTraveled = Vec2.distance(this.initialPosition, this.position);

        if (this.distanceTraveled > def.maxDistance) {
            this.dead = true;
            this.position = Vec2.clone(this.finalPosition);
        }
    }

    protected checkCollisions<T extends GameEntity>(entities: Iterable<T>) {
        const collisions: Array<{
            entity: T
            position: Vector
            normal: Vector
            distSquared: number
        }> = [];

        for (const entity of entities) {
            if (entity.id === this.shooterId) continue;

            const intersection = entity.hitbox.intersectsLine(this.lastPosition, this.position);

            if (intersection) {
                collisions.push({
                    entity,
                    position: intersection.point,
                    normal: intersection.normal,
                    distSquared: Vec2.distanceSqrt(this.lastPosition, intersection.point)
                });
            }
        }

        collisions.sort((a, b) => {
            return a.distSquared - b.distSquared;
        });

        return collisions;
    }

    static serialize(stream: GameBitStream, params: BulletParams): void {
        stream.writeUint16(params.shooterId);
        stream.writePosition(params.initialPosition);
        stream.writeUnit(params.direction, 16);
        BulletDefs.write(stream, params.type);
    }

    static deserialize(stream: GameBitStream): BulletParams {
        return {
            shooterId: stream.readUint16(),
            initialPosition: stream.readPosition(),
            direction: stream.readUnit(16),
            type: BulletDefs.read(stream)
        };
    }
}