import { gsap } from 'gsap';
import { type Application, Container, Graphics, Text } from 'pixi.js';
import type { GameEvent } from '../../engine/actions';
import { type BlockadeId, type Board, type Space, type Terrain, separates } from '../../engine/board';
import { DIRECTIONS, type Hex, type HexKey, addHex, hexDisk, hexDistance, hexKey } from '../../engine/hex';
import type { TargetKey } from '../../engine/moves';
import type { GameState, PieceId } from '../../engine/state';

type Point = { x: number; y: number };
type Handlers = { onSpace: (key: HexKey) => void; onBlockade: (id: BlockadeId) => void };
type Meeple = { body: Container; figure: Container; ring: Graphics; at: HexKey | null };
type Badge = { at: Point; color: number; node: Container; ring: Graphics };

const SIZE = 28;
// The board plane is turned by YAW and squashed by TILT for a diagonal tabletop view; things that stand on
// it are only positioned through the same projection, so they stay upright.
const YAW = (-18 * Math.PI) / 180;
const TILT = 0.66;
const THICKNESS = 9;
const PADDING = 24;
const HOP = 0.2;
const TURN_ZOOM = 1.15;
const MAX_ZOOM = 2.6;

const COLORS = {
  machete: 0x3e8e41,
  paddle: 0x2f7fc1,
  coin: 0xe0b13a,
  rubble: 0x8d9096,
  basecamp: 0xb8432f,
  mountain: 0x34353c,
  start: 0xd8c8a0,
  outline: 0x0f1a12,
  seam: 0xf4ecd9,
  gold: 0xf5cf5a,
  city: 0xe8a93b,
  citySide: 0x9a6a1c,
  plaza: 0xf6d06c,
  bank: 0xf6e7b8,
  highlight: 0xffffff,
};

// DIRECTIONS[i] faces the edge between these two corners of a pointy-top hex.
const EDGE_CORNERS = [[0, 1], [5, 0], [4, 5], [3, 4], [2, 3], [1, 2]] as const;

const toGround = ({ q, r }: Hex): Point => ({ x: SIZE * Math.sqrt(3) * (q + r / 2), y: SIZE * 1.5 * r });
const COS = Math.cos(YAW);
const SIN = Math.sin(YAW);
const project = ({ x, y }: Point): Point => ({ x: x * COS - y * SIN, y: (x * SIN + y * COS) * TILT });
// Tile edges hang straight down on screen, so in the turned plane they point against the yaw.
const DROP: Point = { x: THICKNESS * SIN, y: THICKNESS * COS };
const depth = (hex: Hex) => project(toGround(hex)).y;
// DIRECTIONS[i] points this many degrees from the flat board's x axis; edges facing up the screen catch the light.
const EDGE_ANGLES = [0, -60, -120, 180, 120, 60];
const LIT_EDGES = EDGE_ANGLES.flatMap((degrees, i) => (Math.sin((degrees * Math.PI) / 180 + YAW) < -0.3 ? [i] : []));
const parseKey = (key: HexKey): Hex => {
  const [q, r] = key.split(',').map(Number);
  return { q: q!, r: r! };
};
const average = (points: Point[]): Point => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
});

const corner = (center: Point, i: number, size = SIZE): Point => {
  const angle = (Math.PI / 180) * (60 * i - 30);
  return { x: center.x + size * Math.cos(angle), y: center.y + size * Math.sin(angle) };
};

const hexPoints = (center: Point, size = SIZE): number[] =>
  Array.from({ length: 6 }, (_, i) => corner(center, i, size)).flatMap(({ x, y }) => [x, y]);

const shade = (color: number, factor: number): number => {
  const channel = (shift: number) => Math.min(255, Math.round(((color >> shift) & 255) * factor));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
};

const terrainColor = (terrain: Terrain): number => (terrain.kind === 'landscape' ? COLORS[terrain.suit] : COLORS[terrain.kind]);

const pipCount = (terrain: Terrain): number =>
  terrain.kind === 'landscape' ? terrain.power : terrain.kind === 'rubble' || terrain.kind === 'basecamp' ? terrain.cards : 0;

const drawPips = (g: Graphics, center: Point, count: number, color: number) => {
  const rows = count > 3 ? [Math.ceil(count / 2), Math.floor(count / 2)] : [count];
  rows.forEach((inRow, row) => {
    const y = center.y + (rows.length === 2 ? (row === 0 ? -5 : 5) : 0);
    for (let i = 0; i < inRow; i++) g.circle(center.x + (i - (inRow - 1) / 2) * 9, y, 3.4);
  });
  g.fill(color);
};

// The golden city behind the finishing spaces: empty hexes near the river and away from the rest of the route.
const cityHexes = (board: Board, spaces: Space[]): Hex[] => {
  const others = spaces.filter((space) => !space.finish);
  const found = new Map<HexKey, Hex>();
  for (const { hex: river } of spaces.filter((space) => space.finish)) {
    for (const offset of hexDisk(2)) {
      const hex = addHex(river, offset);
      const key = hexKey(hex);
      if (board.spaces[key] || found.has(key) || others.some((space) => hexDistance(space.hex, hex) <= 1)) continue;
      found.set(key, hex);
    }
  }
  return [...found.values()];
};

const label = (text: string, size: number, fill: number) => {
  const t = new Text({ text, style: { fontFamily: 'system-ui, sans-serif', fontSize: size, fontWeight: '800', fill } });
  t.anchor.set(0.5);
  t.eventMode = 'none';
  return t;
};

export class BoardRenderer {
  private readonly app: Application;
  private readonly handlers: Handlers;
  private readonly world = new Container();
  private readonly ground = new Container();
  private readonly plane = new Container();
  private readonly tiles = new Container();
  private readonly seams = new Container();
  private readonly highlights = new Graphics();
  private readonly upright = new Container();
  private readonly pieces = new Map<PieceId, Meeple>();
  private playerColors: readonly string[] = [];
  private readonly badges = new Map<BlockadeId, Badge>();
  private readonly fx = gsap.context(() => {});
  private readonly pulse = { alpha: 1 };
  private board: Board | null = null;
  private lastAnimation: number | null = null;
  private temple: Point = { x: 0, y: 0 };
  private mapBounds: { x: number; y: number; width: number; height: number } | null = null;
  private readonly camera = { x: 0, y: 0, scale: 1 };
  private overview = { x: 0, y: 0, scale: 1 };
  private introPending = true;
  private dragged = false;
  private drag: { x: number; y: number; cameraX: number; cameraY: number } | null = null;
  private readonly pointers = new Map<number, Point>();
  private pinch: { distance: number; scale: number; anchor: Point } | null = null;

  constructor(app: Application, handlers: Handlers) {
    this.app = app;
    this.handlers = handlers;
    this.ground.scale.y = TILT;
    this.highlights.eventMode = 'none';
    this.plane.rotation = YAW;
    this.plane.addChild(this.tiles, this.seams, this.highlights);
    this.ground.addChild(this.plane);
    this.upright.sortableChildren = true;
    this.world.addChild(this.ground, this.upright);
    app.stage.addChild(this.world);
    this.fx.add(() => gsap.to(this.pulse, { alpha: 0.45, duration: 0.75, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
    app.ticker.add(this.tick);
    app.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    app.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  destroy() {
    this.fx.kill();
    this.app.ticker.remove(this.tick);
    this.app.canvas.removeEventListener('wheel', this.onWheel);
    this.app.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  }

  setPlayerColors(colors: readonly string[]) {
    if (colors === this.playerColors) return;
    this.playerColors = colors;
    for (const meeple of this.pieces.values()) meeple.body.destroy({ children: true });
    this.pieces.clear();
  }

  setBoard(board: Board) {
    if (board === this.board) return;
    this.board = board;
    this.tiles.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.upright.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.pieces.clear();
    this.badges.clear();
    this.lastAnimation = null;

    const spaces = Object.values(board.spaces)
      .flatMap((space) => space ?? [])
      .sort((a, b) => depth(a.hex) - depth(b.hex));
    const city = cityHexes(board, spaces);
    const groundHexes = [...spaces.map((space) => ({ hex: space.hex, space })), ...city.map((hex) => ({ hex, space: null }))].sort(
      (a, b) => depth(a.hex) - depth(b.hex),
    );
    for (const { hex, space } of groundHexes) this.tiles.addChild(space ? this.drawSpace(space) : this.drawCityHex(hex));
    this.tiles.addChild(this.drawTileBorders(board, spaces), this.drawCityEdges(board, city));
    for (const space of spaces) {
      if (space.terrain.kind === 'mountain') this.upright.addChild(this.drawMountain(project(toGround(space.hex))));
    }
    this.addCity(city, spaces);

    const bounds = this.world.getLocalBounds();
    this.mapBounds = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    this.introPending = true;
    this.resize();
    this.moveCamera(this.overview, 0);
  }

  update(game: GameState, targets: ReadonlySet<TargetKey>, activePiece: PieceId | null, animation: { id: number; events: GameEvent[] }) {
    const fresh = this.lastAnimation !== null && this.lastAnimation !== animation.id;
    this.lastAnimation = animation.id;
    const events = fresh ? animation.events : [];
    for (const event of events) if (event.type === 'blockadeBroken') this.burst(event.blockadeId);
    this.drawBlockades(game, targets);
    this.drawHighlights(targets);
    this.syncPieces(game, activePiece, events);
  }

  resize() {
    const bounds = this.mapBounds;
    if (!bounds) return;
    const { width, height } = this.app.screen;
    const scale = Math.min((width - PADDING * 2) / bounds.width, (height - PADDING * 2) / bounds.height);
    this.overview = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, scale };
    this.applyCamera();
  }

  showOverview() {
    this.moveCamera(this.overview, 0.8);
  }

  // The first focus of a game holds the whole-map view for a moment before zooming in.
  focusPiece(pieceId: PieceId | null) {
    const body = pieceId === null ? undefined : this.pieces.get(pieceId)?.body;
    if (!body?.visible) return;
    const delay = this.introPending ? 0.8 : 0;
    this.introPending = false;
    this.moveCamera({ x: body.x, y: body.y - SIZE, scale: Math.max(this.overview.scale, TURN_ZOOM) }, 1.2, delay);
  }

  zoomBy(factor: number) {
    const { width, height } = this.app.screen;
    this.zoomAt(factor, { x: width / 2, y: height / 2 }, 0.3);
  }

  private zoomAt(factor: number, screen: Point, duration = 0) {
    const { width, height } = this.app.screen;
    const { x, y, scale } = this.camera;
    const zoom = Math.min(MAX_ZOOM, Math.max(this.overview.scale * 0.8, scale * factor));
    const anchor = { x: x + (screen.x - width / 2) / scale, y: y + (screen.y - height / 2) / scale };
    this.moveCamera({ x: anchor.x - (screen.x - width / 2) / zoom, y: anchor.y - (screen.y - height / 2) / zoom, scale: zoom }, duration);
  }

  private moveCamera(target: { x: number; y: number; scale: number }, duration: number, delay = 0) {
    gsap.killTweensOf(this.camera);
    if (duration === 0) {
      Object.assign(this.camera, target);
      this.applyCamera();
      return;
    }
    this.fx.add(() => gsap.to(this.camera, { ...target, duration, delay, ease: 'power2.inOut', onUpdate: this.applyCamera }));
  }

  private readonly applyCamera = () => {
    const bounds = this.mapBounds;
    if (bounds) {
      this.camera.x = Math.min(bounds.x + bounds.width, Math.max(bounds.x, this.camera.x));
      this.camera.y = Math.min(bounds.y + bounds.height, Math.max(bounds.y, this.camera.y));
    }
    const { width, height } = this.app.screen;
    this.world.scale.set(this.camera.scale);
    this.world.position.set(width / 2 - this.camera.x * this.camera.scale, height / 2 - this.camera.y * this.camera.scale);
  };

  private readonly onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const rect = this.app.canvas.getBoundingClientRect();
    const speed = event.ctrlKey ? 0.01 : 0.0015;
    this.zoomAt(Math.exp(-event.deltaY * speed), { x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  private readonly onPointerDown = (event: PointerEvent) => {
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 1) {
      this.dragged = false;
      this.drag = { x: event.clientX, y: event.clientY, cameraX: this.camera.x, cameraY: this.camera.y };
    } else if (this.pointers.size === 2) {
      this.dragged = true;
      this.drag = null;
      const [a, b] = [...this.pointers.values()];
      const middle = this.toCanvas({ x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 });
      this.pinch = { distance: Math.hypot(a!.x - b!.x, a!.y - b!.y), scale: this.camera.scale, anchor: this.toWorld(middle) };
    }
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const middle = this.toCanvas({ x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 });
      const scale = Math.min(MAX_ZOOM, Math.max(this.overview.scale * 0.8, (this.pinch.scale * Math.hypot(a!.x - b!.x, a!.y - b!.y)) / this.pinch.distance));
      const { width, height } = this.app.screen;
      this.moveCamera({ x: this.pinch.anchor.x - (middle.x - width / 2) / scale, y: this.pinch.anchor.y - (middle.y - height / 2) / scale, scale }, 0);
      return;
    }
    if (!this.drag) return;
    const dx = event.clientX - this.drag.x;
    const dy = event.clientY - this.drag.y;
    if (!this.dragged && Math.hypot(dx, dy) < 6) return;
    this.dragged = true;
    const { scale } = this.camera;
    this.moveCamera({ x: this.drag.cameraX - dx / scale, y: this.drag.cameraY - dy / scale, scale }, 0);
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    const [remaining] = [...this.pointers.values()];
    this.drag = remaining ? { x: remaining.x, y: remaining.y, cameraX: this.camera.x, cameraY: this.camera.y } : null;
  };

  private toCanvas(client: Point): Point {
    const rect = this.app.canvas.getBoundingClientRect();
    return { x: client.x - rect.left, y: client.y - rect.top };
  }

  private toWorld(screen: Point): Point {
    const { width, height } = this.app.screen;
    return { x: this.camera.x + (screen.x - width / 2) / this.camera.scale, y: this.camera.y + (screen.y - height / 2) / this.camera.scale };
  }

  // A drag that ends over a space must not also count as a click on it.
  private tapped(action: () => void) {
    return () => {
      if (!this.dragged) action();
    };
  }

  private readonly tick = () => {
    this.highlights.alpha = this.pulse.alpha;
    for (const { ring } of this.pieces.values()) ring.alpha = this.pulse.alpha;
    for (const { ring } of this.badges.values()) ring.alpha = this.pulse.alpha;
  };

  private drawSpace(space: Space): Container {
    const center = toGround(space.hex);
    const color = terrainColor(space.terrain);
    const g = new Graphics()
      .poly(hexPoints({ x: center.x + DROP.x, y: center.y + DROP.y }, SIZE - 0.5))
      .fill(shade(color, 0.55))
      .poly(hexPoints(center, SIZE - 0.5))
      .fill(color)
      .stroke({ width: 1.5, color: COLORS.outline, alpha: 0.35 });
    for (const edge of LIT_EDGES) {
      const [a, b] = EDGE_CORNERS[edge]!.map((i) => corner(center, i, SIZE - 2.5));
      g.moveTo(a!.x, a!.y).lineTo(b!.x, b!.y);
    }
    g.stroke({ width: 2.5, color: 0xffffff, alpha: 0.22, cap: 'round' });
    const pips = pipCount(space.terrain);
    if (pips > 0) drawPips(g, center, pips, space.terrain.kind === 'landscape' && space.terrain.suit === 'coin' ? 0x4a3410 : 0xffffff);
    if (space.finish) {
      for (const dy of [-12, 12]) {
        g.moveTo(center.x - 13, center.y + dy)
          .quadraticCurveTo(center.x - 6.5, center.y + dy - 4, center.x, center.y + dy)
          .quadraticCurveTo(center.x + 6.5, center.y + dy + 4, center.x + 13, center.y + dy);
      }
      g.stroke({ width: 2, color: 0xffffff, alpha: 0.4 });
    }
    g.eventMode = 'static';
    g.cursor = 'pointer';
    g.on('pointertap', this.tapped(() => this.handlers.onSpace(hexKey(space.hex))));
    if (space.terrain.kind !== 'start') return g;
    const tile = new Container();
    const slot = label(String(space.terrain.slot), 16, 0x3b2f1c);
    slot.position.set(center.x, center.y);
    tile.addChild(g, slot);
    return tile;
  }

  private drawTileBorders(board: Board, spaces: Space[]): Graphics {
    const g = new Graphics();
    for (const space of spaces) {
      const center = toGround(space.hex);
      DIRECTIONS.forEach((direction, i) => {
        const neighbor = board.spaces[hexKey(addHex(space.hex, direction))];
        if (neighbor && neighbor.tile === space.tile) return;
        const [a, b] = EDGE_CORNERS[i]!.map((c) => corner(center, c));
        g.moveTo(a!.x, a!.y).lineTo(b!.x, b!.y);
      });
    }
    g.stroke({ width: 2.5, color: COLORS.outline, alpha: 0.85 });
    g.eventMode = 'none';
    return g;
  }

  private drawMountain(at: Point): Graphics {
    const { x, y } = at;
    const g = new Graphics()
      .poly([x - 17, y + 5, x - 2, y - 24, x + 3, y + 5])
      .fill(0x777a85)
      .poly([x - 2, y - 24, x + 17, y + 5, x + 3, y + 5])
      .fill(0x45474f)
      .poly([x - 2, y - 24, x - 8, y - 12.5, x - 3.5, y - 15, x + 0.5, y - 11.5, x + 5, y - 14.5])
      .fill(0xf4f1ea)
      .poly([x - 17, y + 5, x - 2, y - 24, x + 17, y + 5])
      .stroke({ width: 1.5, color: COLORS.outline, alpha: 0.6 });
    g.zIndex = y;
    g.eventMode = 'none';
    return g;
  }

  private drawCityHex(hex: Hex): Graphics {
    const center = toGround(hex);
    const g = new Graphics()
      .poly(hexPoints({ x: center.x + DROP.x, y: center.y + DROP.y }, SIZE + 0.5))
      .fill(COLORS.citySide)
      .poly(hexPoints(center, SIZE + 0.5))
      .fill(COLORS.city)
      .rect(center.x - 9, center.y - 7, 18, 14)
      .fill(COLORS.plaza)
      .rect(center.x - 4, center.y - 3, 8, 6)
      .fill(0xfff1c2);
    g.eventMode = 'none';
    return g;
  }

  private drawCityEdges(board: Board, city: Hex[]): Container {
    const inCity = new Set(city.map(hexKey));
    const outline = new Graphics();
    const banks = new Graphics();
    for (const hex of city) {
      const center = toGround(hex);
      DIRECTIONS.forEach((direction, i) => {
        const key = hexKey(addHex(hex, direction));
        if (inCity.has(key)) return;
        const [a, b] = EDGE_CORNERS[i]!.map((c) => corner(center, c));
        (board.spaces[key]?.finish ? banks : outline).moveTo(a!.x, a!.y).lineTo(b!.x, b!.y);
      });
    }
    outline.stroke({ width: 2.5, color: COLORS.outline, alpha: 0.85 });
    banks.stroke({ width: 5, color: COLORS.bank, cap: 'round' });
    const edges = new Container();
    edges.eventMode = 'none';
    edges.addChild(outline, banks);
    return edges;
  }

  private addCity(city: Hex[], spaces: Space[]) {
    const finish = spaces.filter((space) => space.finish).map((space) => toGround(space.hex));
    if (finish.length === 0) return;
    this.temple = project(average(city.length > 0 ? city.map(toGround) : finish));
    this.upright.addChild(this.drawTemple(this.temple));
    city.forEach((hex, i) => {
      const at = project(toGround(hex));
      if (i % 3 !== 1 || Math.hypot(at.x - this.temple.x, at.y - this.temple.y) < SIZE * 1.6) return;
      const pyramid = new Graphics()
        .rect(-12, -7, 24, 7)
        .fill(COLORS.gold)
        .stroke({ width: 1.2, color: 0x6b4a0c })
        .rect(-7, -13, 14, 6)
        .fill(shade(COLORS.gold, 1.08))
        .stroke({ width: 1.2, color: 0x6b4a0c });
      pyramid.position.set(at.x, at.y);
      pyramid.zIndex = at.y;
      pyramid.eventMode = 'none';
      this.upright.addChild(pyramid);
    });
  }

  private drawTemple(at: Point): Graphics {
    const g = new Graphics().ellipse(0, 0, 44, 16).fill({ color: COLORS.gold, alpha: 0.25 });
    [64, 48, 32].forEach((width, step) => {
      g.rect(-width / 2, -12 * (step + 1), width, 12)
        .fill(shade(COLORS.gold, 1 - step * 0.08))
        .stroke({ width: 1.5, color: 0x6b4a0c });
    });
    g.rect(-8, -50, 16, 14).fill(0x6b4a0c).poly([-11, -50, 0, -60, 11, -50]).fill(COLORS.gold).stroke({ width: 1.5, color: 0x6b4a0c });
    g.position.set(at.x, at.y);
    g.zIndex = at.y;
    g.eventMode = 'none';
    return g;
  }

  private drawBlockades(game: GameState, targets: ReadonlySet<TargetKey>) {
    this.seams.removeChildren().forEach((child) => child.destroy());
    for (const { node } of this.badges.values()) node.destroy({ children: true });
    this.badges.clear();
    const spaces = Object.values(game.board.spaces).flatMap((space) => space ?? []);
    for (const blockade of game.board.blockades) {
      if (!game.blockades.includes(blockade.id)) continue;
      const line = new Graphics();
      const midpoints: Point[] = [];
      for (const space of spaces) {
        const center = toGround(space.hex);
        DIRECTIONS.forEach((direction, i) => {
          const neighbor = game.board.spaces[hexKey(addHex(space.hex, direction))];
          if (!neighbor || hexKey(neighbor.hex) < hexKey(space.hex) || !separates(blockade, space.tile, neighbor.tile)) return;
          const [a, b] = EDGE_CORNERS[i]!.map((c) => corner(center, c));
          line.moveTo(a!.x, a!.y).lineTo(b!.x, b!.y);
          midpoints.push({ x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 });
        });
      }
      const requirement = blockade.requirement;
      const color = requirement.kind === 'landscape' ? COLORS[requirement.suit] : COLORS.rubble;
      line.stroke({ width: 14, color: COLORS.seam, cap: 'round' }).stroke({ width: 8, color, cap: 'round' });
      line.eventMode = 'none';
      this.seams.addChild(line);

      const at = project(average(midpoints));
      const node = new Container();
      const ring = new Graphics().circle(0, -22, 22).stroke({ width: 4, color: COLORS.highlight });
      ring.visible = targets.has(`blockade:${blockade.id}`);
      const cost = label(
        String(requirement.kind === 'landscape' ? requirement.power : requirement.cards),
        17,
        requirement.kind === 'landscape' && requirement.suit === 'coin' ? 0x3b2a0c : 0xffffff,
      );
      cost.position.set(0, -22);
      node.addChild(
        new Graphics()
          .ellipse(0, 0, 10, 4)
          .fill({ color: 0x000000, alpha: 0.35 })
          .rect(-2, -14, 4, 14)
          .fill(COLORS.outline)
          .circle(0, -22, 15)
          .fill(color)
          .stroke({ width: 3, color: COLORS.seam }),
        cost,
        ring,
      );
      node.position.set(at.x, at.y);
      node.zIndex = at.y;
      node.eventMode = ring.visible ? 'static' : 'none';
      node.cursor = 'pointer';
      node.on('pointertap', this.tapped(() => this.handlers.onBlockade(blockade.id)));
      this.upright.addChild(node);
      this.badges.set(blockade.id, { at, color, node, ring });
    }
  }

  private drawHighlights(targets: ReadonlySet<TargetKey>) {
    this.highlights.clear();
    for (const key of targets) {
      if (!key.startsWith('space:')) continue;
      const center = toGround(parseKey(key.slice('space:'.length) as HexKey));
      this.highlights
        .poly(hexPoints(center, SIZE - 3))
        .fill({ color: COLORS.highlight, alpha: 0.3 })
        .stroke({ width: 3.5, color: COLORS.highlight });
    }
  }

  private syncPieces(game: GameState, activePiece: PieceId | null, events: GameEvent[]) {
    const paths = new Map<PieceId, HexKey[]>();
    const arrived = new Set<PieceId>();
    for (const event of events) {
      if (event.type === 'pieceMoved') paths.set(event.pieceId, [...(paths.get(event.pieceId) ?? []), event.to]);
      if (event.type === 'pieceArrived') arrived.add(event.pieceId);
    }
    for (const piece of game.pieces) {
      let meeple = this.pieces.get(piece.id);
      if (!meeple) {
        meeple = this.createMeeple(piece.owner);
        this.pieces.set(piece.id, meeple);
        this.upright.addChild(meeple.body);
      }
      meeple.ring.visible = piece.id === activePiece;
      meeple.at = piece.at === 'eldorado' ? null : piece.at;
      meeple.body.eventMode = piece.owner === game.turn.player ? 'static' : 'none';
      const path = paths.get(piece.id);
      if (path) {
        this.hop(meeple, path, arrived.has(piece.id));
        continue;
      }
      if (gsap.isTweening(meeple.body)) continue;
      meeple.body.visible = piece.at !== 'eldorado';
      if (piece.at === 'eldorado') continue;
      const at = project(toGround(parseKey(piece.at)));
      meeple.body.position.set(at.x, at.y);
      meeple.body.zIndex = at.y;
    }
  }

  private createMeeple(owner: number): Meeple {
    const color = Number.parseInt(this.playerColors[owner]!.slice(1), 16);
    const body = new Container();
    const figure = new Container();
    const ring = new Graphics().ellipse(0, 0, 18, 8).stroke({ width: 3, color: COLORS.highlight });
    const silhouette = new Graphics()
      .moveTo(-11, 0)
      .lineTo(-3.5, 0)
      .lineTo(0, -8)
      .lineTo(3.5, 0)
      .lineTo(11, 0)
      .lineTo(7, -13)
      .quadraticCurveTo(15, -15, 14, -20)
      .quadraticCurveTo(12, -24, 5, -22)
      .lineTo(-5, -22)
      .quadraticCurveTo(-12, -24, -14, -20)
      .quadraticCurveTo(-15, -15, -7, -13)
      .closePath()
      .fill(color)
      .stroke({ width: 2, color: COLORS.outline })
      .circle(0, -28.5, 6.5)
      .fill(color)
      .stroke({ width: 2, color: COLORS.outline });
    const shading = new Graphics()
      .poly([1, -1, 3.5, 0, 11, 0, 7, -13, 14, -20, 5, -22, 1, -22])
      .fill({ color: 0x000000, alpha: 0.18 })
      .circle(-2.5, -31, 2.2)
      .fill({ color: 0xffffff, alpha: 0.55 });
    figure.addChild(silhouette, shading);
    body.addChild(new Graphics().ellipse(0, 0, 12, 5).fill({ color: 0x000000, alpha: 0.35 }), ring, figure);
    const meeple: Meeple = { body, figure, ring, at: null };
    body.cursor = 'pointer';
    body.on('pointertap', this.tapped(() => meeple.at && this.handlers.onSpace(meeple.at)));
    return meeple;
  }

  private hop(meeple: Meeple, stops: HexKey[], arrives: boolean) {
    const { body, figure } = meeple;
    gsap.killTweensOf([body, figure, figure.scale]);
    body.visible = true;
    body.alpha = 1;
    this.fx.add(() => {
      const timeline = gsap.timeline();
      stops.forEach((key, i) => {
        const to = project(toGround(parseKey(key)));
        const start = i * HOP;
        timeline
          .to(body, { x: to.x, y: to.y, duration: HOP, ease: 'power1.inOut' }, start)
          .to(figure, { y: -16, duration: HOP / 2, ease: 'power2.out' }, start)
          .to(figure, { y: 0, duration: HOP / 2, ease: 'power2.in' }, start + HOP / 2)
          .call(() => {
            body.zIndex = to.y;
            this.dust(to);
          }, [], start + HOP)
          .to(figure.scale, { x: 1.15, y: 0.85, duration: 0.06, yoyo: true, repeat: 1 }, start + HOP);
      });
      if (arrives) {
        timeline
          .to(body, { x: this.temple.x, y: this.temple.y, duration: 0.6, ease: 'power2.in' })
          .to(body, { alpha: 0, duration: 0.3 }, '<0.3')
          .set(body, { visible: false });
      }
    });
  }

  private dust(at: Point) {
    this.fx.add(() => {
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2;
        const puff = new Graphics().circle(0, 0, 3).fill({ color: 0xeee2c4, alpha: 0.8 });
        puff.position.set(at.x, at.y);
        puff.zIndex = at.y - 1;
        puff.eventMode = 'none';
        this.upright.addChild(puff);
        gsap.to(puff.scale, { x: 2, y: 2, duration: 0.45 });
        gsap.to(puff, {
          x: at.x + Math.cos(angle) * 16,
          y: at.y + Math.sin(angle) * 16 * TILT,
          alpha: 0,
          duration: 0.45,
          ease: 'power2.out',
          onComplete: () => puff.destroy(),
        });
      }
    });
  }

  private burst(id: BlockadeId) {
    const badge = this.badges.get(id);
    if (!badge) return;
    const { at, color } = badge;
    this.fx.add(() => {
      const flash = new Graphics().circle(0, 0, 18).stroke({ width: 5, color: COLORS.seam });
      flash.position.set(at.x, at.y - 22);
      flash.zIndex = at.y + 1;
      this.upright.addChild(flash);
      gsap.to(flash.scale, { x: 3, y: 3, duration: 0.5, ease: 'power2.out' });
      gsap.to(flash, { alpha: 0, duration: 0.5, onComplete: () => flash.destroy() });
      for (let i = 0; i < 18; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 40;
        const shard = new Graphics().rect(-3, -3, 6, 6).fill(i % 3 === 0 ? COLORS.seam : color);
        shard.position.set(at.x, at.y - 22);
        shard.zIndex = at.y + 1;
        this.upright.addChild(shard);
        gsap.to(shard, {
          x: at.x + Math.cos(angle) * distance,
          y: at.y - 22 + Math.sin(angle) * distance + 20,
          rotation: Math.random() * 6,
          alpha: 0,
          duration: 0.8,
          ease: 'power3.out',
          onComplete: () => shard.destroy(),
        });
      }
    });
  }
}
