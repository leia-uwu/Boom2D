import { BaseBullet, BulletParams } from "../baseBullet";
import { EntityType, GameConstants } from "../constants";
import { WeaponDefKey, WeaponDefs } from "../defs/weaponDefs";
import { type GameBitStream, type Packet } from "../net";
import { type Vector } from "../utils/vector";

export interface EntitiesNetData {
    [EntityType.Player]: {
        // Partial data should be used for data that changes often
        position: Vector
        direction: Vector

        // while full data for data that rarely changes
        full?: {
            activeWeapon: WeaponDefKey
        }
    }
    [EntityType.Projectile]: {
        position: Vector
        full?: {
            direction: Vector
            shooterId: number
        }
    }
    [EntityType.Obstacle]: {
        full?: {
            position: Vector
        }
    }
}

interface EntitySerialization<T extends EntityType> {
    // how many bytes to alloc for the entity serialized data cache
    partialSize: number
    fullSize: number
    serializePartial: (stream: GameBitStream, data: EntitiesNetData[T]) => void
    serializeFull: (stream: GameBitStream, data: Required<EntitiesNetData[T]>["full"]) => void
    deserializePartial: (stream: GameBitStream) => EntitiesNetData[T]
    deserializeFull: (stream: GameBitStream) => Required<EntitiesNetData[T]>["full"]
}

export const EntitySerializations: { [K in EntityType]: EntitySerialization<K> } = {
    [EntityType.Player]: {
        partialSize: 8,
        fullSize: 2,
        serializePartial(stream, data): void {
            stream.writePosition(data.position);
            stream.writeUnit(data.direction, 16);
        },
        serializeFull(stream, data): void {
            WeaponDefs.write(stream, data.activeWeapon);
        },
        deserializePartial(stream) {
            return {
                position: stream.readPosition(),
                direction: stream.readUnit(16)
            };
        },
        deserializeFull(stream) {
            return {
                activeWeapon: WeaponDefs.read(stream)
            };
        }
    },
    [EntityType.Projectile]: {
        partialSize: 6,
        fullSize: 6,
        serializePartial(stream, data) {
            stream.writePosition(data.position);
        },
        serializeFull(stream, data) {
            stream.writeUnit(data.direction, 16);
            stream.writeUint16(data.shooterId);
        },
        deserializePartial(stream) {
            return {
                position: stream.readPosition()
            };
        },
        deserializeFull(stream) {
            return {
                direction: stream.readUnit(16),
                shooterId: stream.readUint16()
            };
        }
    },
    [EntityType.Obstacle]: {
        partialSize: 6,
        fullSize: 3,
        serializePartial(_stream, _data) {
        },
        serializeFull(stream, data) {
            stream.writePosition(data.position);
        },
        deserializePartial(_stream) {
            return {};
        },
        deserializeFull(stream) {
            return {
                position: stream.readPosition()
            };
        }
    }
};

interface Entity {
    id: number
    type: EntityType
    data: EntitiesNetData[Entity["type"]]
}

export interface Explosion {
    position: Vector
    radius: number
}

export interface Shot {
    id: number
    weapon: WeaponDefKey
}

//
// Active player serialization
//

function serializeActivePlayerData(stream: GameBitStream, data: UpdatePacket["playerData"], dirty: UpdatePacket["playerDataDirty"]) {
    stream.writeBoolean(dirty.id);
    if (dirty.id) {
        stream.writeUint16(data.id);
    }

    stream.writeBoolean(dirty.zoom);
    if (dirty.zoom) {
        stream.writeUint8(data.zoom);
    }

    stream.writeBoolean(dirty.health);
    if (dirty.health) {
        stream.writeUint8(data.health);
    }

    stream.writeBoolean(dirty.armor);
    if (dirty.armor) {
        stream.writeUint8(data.armor);
    }

    stream.writeBoolean(dirty.weapons);
    if (dirty.weapons) {
        for (const key in WeaponDefs.definitions) {
            stream.writeBoolean(data.weapons[key as WeaponDefKey]);
        }
    }

    stream.writeAlignToNextByte();
}

function deserializePlayerData(stream: GameBitStream, data: UpdatePacket["playerData"], dirty: UpdatePacket["playerDataDirty"]) {
    if (stream.readBoolean()) {
        dirty.id = true;
        data.id = stream.readUint16();
    }

    if (stream.readBoolean()) {
        dirty.zoom = true;
        data.zoom = stream.readUint8();
    }

    if (stream.readBoolean()) {
        dirty.health = true;
        data.health = stream.readUint8();
    }

    if (stream.readBoolean()) {
        dirty.armor = true;
        data.armor = stream.readUint8();
    }

    if (stream.readBoolean()) {
        dirty.weapons = true;
        for (const weapon in WeaponDefs.definitions) {
            data.weapons[weapon as WeaponDefKey] = stream.readBoolean();
        }
    }

    stream.readAlignToNextByte();
}

enum UpdateFlags {
    DeletedEntities = 1 << 0,
    FullEntities = 1 << 1,
    PartialEntities = 1 << 2,
    NewPlayers = 1 << 3,
    DeletedPlayers = 1 << 4,
    PlayerData = 1 << 5,
    Bullets = 1 << 6,
    Explosions = 1 << 7,
    Shots = 1 << 8,
    Map = 1 << 9
}

export class UpdatePacket implements Packet {
    deletedEntities: number[] = [];
    partialEntities: Entity[] = [];
    fullEntities: Array<Entity & { data: Required<EntitiesNetData[Entity["type"]]> }> = [];

    newPlayers: Array<{
        name: string
        id: number
    }> = [];

    deletedPlayers: number[] = [];

    playerDataDirty = {
        id: false,
        zoom: false,
        health: false,
        armor: false,
        weapons: false
    };

    playerData = {
        id: 0,
        zoom: 0,
        health: 0,
        armor: 0,
        weapons: {} as Record<WeaponDefKey, boolean>
    };

    bullets: BulletParams[] = [];

    explosions: Explosion[] = [];

    shots: Shot[] = [];

    mapDirty = false;
    map = {
        width: 0,
        height: 0
    };

    // server side cached entity serializations
    serverPartialEntities: Array<{
        partialStream: GameBitStream
    }> = [];

    serverFullEntities: Array<{
        partialStream: GameBitStream
        fullStream: GameBitStream
    }> = [];

    serialize(stream: GameBitStream): void {
        let flags = 0;
        // save the stream index for writing flags
        const flagsIdx = stream.index;
        stream.writeUint16(flags);

        if (this.deletedEntities.length) {
            stream.writeArray(this.deletedEntities, 16, id => {
                stream.writeUint16(id);
            });

            flags |= UpdateFlags.DeletedEntities;
        }

        if (this.serverFullEntities.length) {
            stream.writeArray(this.serverFullEntities, 16, entity => {
                stream.writeBytes(entity.partialStream, 0, entity.partialStream.byteIndex);
                stream.writeBytes(entity.fullStream, 0, entity.fullStream.byteIndex);
            });

            flags |= UpdateFlags.FullEntities;
        }

        if (this.serverPartialEntities.length) {
            stream.writeArray(this.serverPartialEntities, 16, entity => {
                stream.writeBytes(entity.partialStream, 0, entity.partialStream.byteIndex);
            });

            flags |= UpdateFlags.PartialEntities;
        }

        if (this.newPlayers.length) {
            stream.writeArray(this.newPlayers, 8, player => {
                stream.writeUint16(player.id);
                stream.writeASCIIString(player.name, GameConstants.player.nameMaxLength);
            });

            flags |= UpdateFlags.NewPlayers;
        }

        if (this.deletedPlayers.length) {
            stream.writeArray(this.deletedPlayers, 8, id => {
                stream.writeUint16(id);
            });

            flags |= UpdateFlags.DeletedPlayers;
        }

        if (Object.values(this.playerDataDirty).includes(true)) {
            serializeActivePlayerData(stream, this.playerData, this.playerDataDirty);

            flags |= UpdateFlags.PlayerData;
        }

        if (this.bullets.length) {
            stream.writeArray(this.bullets, 8, bullet => {
                BaseBullet.serialize(stream, bullet);
            });
            flags |= UpdateFlags.Bullets;
        }

        if (this.explosions.length) {
            stream.writeArray(this.explosions, 8, explosion => {
                stream.writePosition(explosion.position);
            });

            flags |= UpdateFlags.Explosions;
        }

        if (this.shots.length) {
            stream.writeArray(this.shots, 8, shot => {
                stream.writeUint16(shot.id);
                WeaponDefs.write(stream, shot.weapon);
            });

            flags |= UpdateFlags.Shots;
        }

        if (this.mapDirty) {
            stream.writeUint16(this.map.width);
            stream.writeUint16(this.map.height);

            flags |= UpdateFlags.Map;
        }

        // write flags and restore stream index
        const idx = stream.index;
        stream.index = flagsIdx;
        stream.writeUint16(flags);
        stream.index = idx;
    }

    deserialize(stream: GameBitStream): void {
        const flags = stream.readUint16();

        if (flags & UpdateFlags.DeletedEntities) {
            stream.readArray(this.deletedEntities, 16, () => {
                return stream.readUint16();
            });
        }

        if (flags & UpdateFlags.FullEntities) {
            stream.readArray(this.fullEntities, 16, () => {
                const id = stream.readUint16();
                const entityType = stream.readUint8() as EntityType;
                const data = EntitySerializations[entityType].deserializePartial(stream);
                stream.readAlignToNextByte();
                data.full = EntitySerializations[entityType].deserializeFull(stream);
                stream.readAlignToNextByte();
                return {
                    id,
                    type: entityType,
                    data
                };
            });
        }

        if (flags & UpdateFlags.PartialEntities) {
            stream.readArray(this.partialEntities, 16, () => {
                const id = stream.readUint16();
                const entityType = stream.readUint8() as EntityType;
                const data = EntitySerializations[entityType].deserializePartial(stream);
                stream.readAlignToNextByte();
                return {
                    id,
                    type: entityType,
                    data
                };
            });
        }

        if (flags & UpdateFlags.NewPlayers) {
            stream.readArray(this.newPlayers, 8, () => {
                return {
                    id: stream.readUint16(),
                    name: stream.readASCIIString(GameConstants.player.nameMaxLength)
                };
            });
        }

        if (flags & UpdateFlags.DeletedPlayers) {
            stream.readArray(this.deletedPlayers, 8, () => {
                return stream.readUint16();
            });
        }

        if (flags & UpdateFlags.PlayerData) {
            deserializePlayerData(stream, this.playerData, this.playerDataDirty);
        }

        if (flags & UpdateFlags.Bullets) {
            stream.readArray(this.bullets, 8, () => {
                return BaseBullet.deserialize(stream);
            });
        }

        if (flags & UpdateFlags.Explosions) {
            stream.readArray(this.explosions, 8, () => {
                return {
                    position: stream.readPosition()
                };
            });
        }

        if (flags & UpdateFlags.Shots) {
            stream.readArray(this.shots, 8, () => {
                return {
                    id: stream.readUint16(),
                    weapon: WeaponDefs.read(stream)
                };
            });
        }

        if (flags & UpdateFlags.Map) {
            this.mapDirty = true;
            this.map.width = stream.readUint16();
            this.map.height = stream.readUint16();
        }
    }
}
