import assert from "assert";
import { readFileSync } from "fs";
import { join } from "path";
import { type ElementNode, parse } from "svg-parser";
import { type BaseFloor, BaseGameMap, type BaseWall } from "../../common/src/baseMap";
import { type LootDefKey, LootDefs } from "../../common/src/defs/lootDefs";
import { type MapDefKey, MapDefs } from "../../common/src/defs/mapDefs";
import type { ObstacleDefKey } from "../../common/src/defs/obstacleDefs";
import { PacketStream } from "../../common/src/net";
import { MapPacket } from "../../common/src/packets/mapPacke";
import {
    CircleHitbox,
    HitboxType,
    type PolygonHitboxJSON,
    RectHitbox
} from "../../common/src/utils/hitbox";
import { Random } from "../../common/src/utils/random";
import { Vec2, type Vector } from "../../common/src/utils/vector";
import { Obstacle } from "./entities/obstacle";
import type { Game } from "./game";

export class GameMap extends BaseGameMap {
    serializedData = new PacketStream(new ArrayBuffer(1 << 14));

    constructor(
        readonly game: Game,
        readonly name: MapDefKey
    ) {
        super();
        const def = MapDefs.typeToDef(name);

        const svgMap = new SvgParser();
        svgMap.parseSVGMap(join(__dirname, `../../${def.image}`));

        this.init(def.width, def.height, svgMap.walls);

        const packet = new MapPacket();
        packet.width = this.width;
        packet.height = this.height;
        packet.walls = this.walls;

        const keys = Object.keys(LootDefs.definitions);
        for (let i = 0; i < 100; i++) {
            const lootType = keys[Random.int(0, keys.length - 1)] as LootDefKey;
            const position = Random.vector(0, this.width, 0, this.height);
            this.game.lootManager.addLoot(lootType, position);
        }

        this.serializedData.serializeServerPacket(packet);
    }

    addObstacle(type: ObstacleDefKey, position: Vector) {
        const obstacle = new Obstacle(this.game, position, type);
        this.game.entityManager.register(obstacle);
        return obstacle;
    }
}

export class SvgParser {
    walls: BaseWall[] = [];

    static magicUnitToPixelScale = 3.779528;

    parseSVGMap(path: string) {
        const file = readFileSync(path).toString();
        const svgData = parse(file);

        for (const node of svgData.children) {
            if (node.type === "text") continue;
            this.parseNode(node);
        }
    }

    parseNode(node: ElementNode) {
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (typeof child === "string") continue;
            if (child.type !== "element") continue;

            this.parseNode(child);
            if (child.properties && child.properties["boom2d-wall"]) {
                this.walls.push(...this.parseWall(child));
            }
        }
    }

    parseWall(node: ElementNode): BaseWall[] {
        let walls: BaseWall[] = [];
        assert(node.properties, "Node has no properties");

        const color = this.parseColor(node);
        switch (node.tagName) {
            case "circle": {
                walls.push({
                    hitbox: this.parseCircle(node),
                    color
                });
                break;
            }
            case "rect": {
                walls.push({
                    hitbox: this.parseRectangle(node),
                    color
                });
                break;
            }
            case "path": {
                const polygons = this.parsePath(node);

                for (let i = 0; i < polygons.length; i++) {
                    walls.push({
                        hitbox: polygons[i],
                        color
                    });
                }
                break;
            }
        }
        return walls;
    }

    parseFloor(node: ElementNode) {
        let floors: BaseFloor[] = [];
        assert(node.properties, "Node has no properties");

        const texture = node.properties["texture"]?.toString() ?? "";

        const color = this.parseColor(node);

        switch (node.tagName) {
            case "circle": {
                floors.push({
                    hitbox: this.parseCircle(node),
                    texture,
                    color
                });
                break;
            }
            case "rect": {
                floors.push({
                    hitbox: this.parseRectangle(node),
                    texture,
                    color
                });
                break;
            }
            case "path": {
                const polygons = this.parsePath(node);

                for (let i = 0; i < polygons.length; i++) {
                    floors.push({
                        hitbox: polygons[i],
                        texture,
                        color
                    });
                }
                break;
            }
        }
        return floors;
    }

    parseColor(node: ElementNode): number {
        assert(node.properties);
        assert(node.properties.style);
        const style = (node.properties.style as string).split(";");
        const fillStyle = style.find((s) => s.includes("fill"));
        let color = 0x000000;
        if (fillStyle) {
            color = parseInt(`0x${fillStyle.replace("fill:#", "")}`);
        }
        return color;
    }

    parseCircle(node: ElementNode): CircleHitbox {
        assert(node.properties);
        assert(node.properties.r, "Circle must have radius");
        assert(node.properties.cx, "Circle must have x coordinate");
        assert(node.properties.cy, "Circle must have y coordinate");
        const x =
            parseFloat(node.properties.cx.toString()) * SvgParser.magicUnitToPixelScale;
        const y =
            parseFloat(node.properties.cy.toString()) * SvgParser.magicUnitToPixelScale;
        const radius =
            parseFloat(node.properties.r.toString()) * SvgParser.magicUnitToPixelScale;

        return new CircleHitbox(radius, Vec2.new(x, y));
    }

    parseRectangle(node: ElementNode): RectHitbox {
        assert(node.properties);
        assert(node.properties.width, "Rectangle must have width");
        assert(node.properties.height, "Rectangle must have height");
        assert(node.properties.x, "Rectangle must have x coordinate");
        assert(node.properties.y, "Rectangle must have y coordinate");

        const width =
            parseFloat(node.properties.width.toString()) *
            SvgParser.magicUnitToPixelScale;
        const height =
            parseFloat(node.properties.height.toString()) *
            SvgParser.magicUnitToPixelScale;
        const x =
            parseFloat(node.properties.x.toString()) * SvgParser.magicUnitToPixelScale;
        const y =
            parseFloat(node.properties.y.toString()) * SvgParser.magicUnitToPixelScale;
        const min = Vec2.new(x, y);
        const max = Vec2.new(x + width, y + height);

        return new RectHitbox(min, max);
    }

    parsePath(node: ElementNode) {
        assert(node.properties);
        assert(node.properties.d, "Path node must have d property");

        // trim it because sometimes inkscape can add an extra space to the end of the path
        // and that breaks the parser lol
        const path = (node.properties.d as string).trim();

        // convert this path format: "M20 20 L40 40"
        // to this: "M 20 20 L 40 40"
        // so its easier to parse
        let tempCommands: Array<string | string[]> = path.split(" ");

        for (let i = 0; i < tempCommands.length; i++) {
            const command = tempCommands[i] as string;
            if (command.length > 1 && isNaN(parseFloat(command))) {
                tempCommands[i] = [command[0], command.slice(1, command.length)];
            }
        }
        const commands = tempCommands.flat();

        const polygons: PolygonHitboxJSON[] = [];

        let verts: Vector[] = [];
        let lastVertIsRelative = false;

        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            // upper case commands mean absolutely positioned
            // lower case commands mean relatively positioned

            switch (command) {
                // new path
                case "m":
                case "M": {
                    lastVertIsRelative = command === "m";
                    const cords = commands[i + 1].split(",");

                    // svg coordinates can be separated by comma or spaces
                    // increment index by 2 if separated by spaces

                    if (cords.length === 2) {
                        verts = [
                            {
                                x: parseFloat(cords[0]),
                                y: parseFloat(cords[1])
                            }
                        ];
                        i++;
                    } else {
                        verts = [
                            {
                                x: parseFloat(commands[i + 1]),
                                y: parseFloat(commands[i + 2])
                            }
                        ];
                        i += 2;
                    }
                    break;
                }
                // end path
                case "z":
                case "Z": {
                    verts = verts.map((p) =>
                        Vec2.mul(p, SvgParser.magicUnitToPixelScale)
                    );
                    polygons.push({ type: HitboxType.Polygon, verts: verts });
                    break;
                }
                // horizontal line
                case "h": {
                    verts.push({
                        x: verts[verts.length - 1].x + parseFloat(commands[i + 1]),
                        y: verts[verts.length - 1].y
                    });
                    i++;
                    break;
                }
                case "H": {
                    verts.push({
                        x: parseFloat(commands[i + 1]),
                        y: verts[verts.length - 1].y
                    });
                    i++;
                    break;
                }
                // vertical line
                case "v": {
                    verts.push({
                        x: verts[verts.length - 1].x,
                        y: verts[verts.length - 1].y + parseFloat(commands[i + 1])
                    });
                    i++;
                    break;
                }
                case "V": {
                    verts.push({
                        x: verts[verts.length - 1].x,
                        y: parseFloat(commands[i + 1])
                    });
                    i++;
                    break;
                }
                // unsupported curve lines
                case "C":
                case "c":
                case "S":
                case "s":
                case "Q":
                case "q":
                case "T":
                case "t":
                case "A":
                case "a":
                    assert(false, "Svg parser doesn't support curves");
                // path coordinates
                case "L":
                    lastVertIsRelative = false;
                    break;
                case "l":
                    lastVertIsRelative = true;
                    break;
                default: {
                    const cords = command.split(",");
                    let pos: Vector;
                    if (lastVertIsRelative) {
                        pos = verts[verts.length - 1];
                    } else {
                        pos = Vec2.new(0, 0);
                    }
                    let point: Vector;
                    if (cords.length === 2) {
                        point = {
                            x: parseFloat(cords[0]),
                            y: parseFloat(cords[1])
                        };
                    } else {
                        point = {
                            x: parseFloat(commands[i]),
                            y: parseFloat(commands[i + 1])
                        };
                        i++;
                    }
                    verts.push(Vec2.add(pos, point));
                }
            }
        }

        return polygons;
    }
}
