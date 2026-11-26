import * as THREE from 'three';
import {
  PAL,
  createAmpStackGrid,
  createTechCrateGrid,
  createEqualizerPillarGrid,
} from '../voxel/VoxelModels.js';
import { VoxelGrid } from '../voxel/VoxelGrid.js';
import { DestructibleProp } from '../voxel/DestructibleProp.js';
import { DestructibleVoxelFloor } from '../voxel/DestructibleVoxelFloor.js';

export const STADIUM_CENTER_X = 96;
export const STADIUM_CENTER_Z = -86;
export const STADIUM_RADIUS = 22.0;
export const BOSS_HOME_X = 96;
export const BOSS_HOME_Z = -95;

/**
 * 1:1 3D REALIZATION OF THE GENERATED HI-FI RUSH CAMPUS LEVEL BLUEPRINT!
 * Winding S-Curve Floating Sky-Island World:
 *   ZONE 01 (Bottom-Left  x:0,   z:0  ): Octagonal Fountain Plaza + 4 Hedges + SE Stairs
 *   ZONE 02 (Bottom-Right x:64,  z:-8 ): Sky Stepping Stones + Hydraulic Beat Pistons + Curved Cyan Sonic Grind Rail
 *   ZONE 03 (Center       x:30,  z:-36): Wood-Slatted Vandelay Atrium + White Stairs + L-Shaped 2F Mezzanine + Shortcut Bridge
 *   ZONE 04 (Top-Left     x:0,   z:-68): Suspended Orange/Yellow/Teal Cargo Containers + Grassy Jump Islands + 5 Cyan Sonic Rings
 *   ZONE 05 (Top-Right    x:96,  z:-86): Tiered Circular Amp Titan Colosseum + 4 Giant Subwoofer Towers + Concert Trusses
 */
export const WORLD_ZONES = [
  {
    id: 0,
    code: 'ZONE 01',
    name: '八角喷泉广场',
    enName: 'FOUNTAIN PLAZA',
    objective: '完成左侧手柄节奏教学，随后沿东南白色阶梯踏上悬浮跳石！',
  },
  {
    id: 1,
    code: 'ZONE 02',
    name: '液压节拍桥 & 音轨',
    enName: 'CRUSHER & SONIC RAIL',
    objective: '跳过高空踏板，看准节拍冲过橙色液压重锤，跃上青色弧形音轨滑入中庭！',
  },
  {
    id: 2,
    code: 'ZONE 03',
    name: '木格双层中庭',
    enName: 'VANDELAY ATRIUM',
    objective: 'CHORUS 02 封锁战！登上右侧楼梯攻占 L 型二楼连廊，或用 [U] 远程轰击炮手！',
  },
  {
    id: 3,
    code: 'ZONE 04',
    name: '悬空货柜 & 磁吸光环',
    enName: 'CARGO SKY-RINGS',
    objective: '跃过彩色悬空集装箱与弹跳浮岛，在山巅按 [G / F] 穿行 5 道青色音速光环！',
  },
  {
    id: 4,
    code: 'ZONE 05',
    name: '巨型音箱斗兽场',
    enName: 'AMP TITAN COLOSSEUM',
    objective: '终极演出！在 REX-808 弹跳空隙中闪避穿行，用重型电贝斯粉碎音箱泰坦！',
  },
];

function createBarricadeWallGrid() {
  const g = new VoxelGrid(24, 16, 6, 0.14);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 24; x++) {
      const stripe = ((x + y) % 6) < 3;
      const isBorder = y <= 1 || y >= 14 || x <= 1 || x >= 22;
      const col = isBorder ? PAL.CHARCOAL : (stripe ? PAL.ORANGE : PAL.YELLOW);
      g.fillBox(x, y, 1, x, y, 4, col);
    }
  }
  for (let i = 0; i < 7; i++) {
    g.fillBox(8 + i, 4 + i, 0, 9 + i, 5 + i, 5, PAL.CYAN_BRIGHT, true);
    g.fillBox(15 - i, 4 + i, 0, 16 - i, 5 + i, 5, PAL.CYAN_BRIGHT, true);
  }
  return g;
}

function createGoldenVinylMesh() {
  const g = new VoxelGrid(18, 18, 4, 0.085);
  const cx = 8.5, cy = 8.5;
  for (let y = 0; y < 18; y++) {
    for (let x = 0; x < 18; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= 8.2) {
        let col = PAL.YELLOW;
        if (d < 2.6) col = PAL.MAGENTA_BRIGHT;
        else if (d > 5.8 && d < 6.6) col = PAL.ORANGE_BRIGHT;
        g.set(x, y, 1, col, true);
        g.set(x, y, 2, col, true);
      }
    }
  }
  return g.createMeshGroup({ pivotMode: 'center', outlineThickness: 0.024, castShadow: false });
}

export function buildContinuousWorld(scene) {
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const inkMat = new THREE.MeshBasicMaterial({ color: PAL.INK });
  const rockMat = new THREE.MeshToonMaterial({ color: 0x6f5546 });
  const rockDarkMat = new THREE.MeshToonMaterial({ color: 0x523d32 });
  const creamMat = new THREE.MeshToonMaterial({ color: 0xf7f1df });
  const cyanTileMat = new THREE.MeshToonMaterial({ color: 0x2de2e6 });
  const woodMat = new THREE.MeshToonMaterial({ color: 0xc97a3d });
  const grassMat = new THREE.MeshToonMaterial({ color: 0x7be33b });
  const whiteMat = new THREE.MeshToonMaterial({ color: 0xf4f7fb });

  // =========================================================================
  // UNIFIED 3D WALKABLE SURFACES (Islands, Stairs, Moving Pads, Containers!)
  // =========================================================================
  const surfaces = [];
  const registerBoxSurface = (cfg) => {
    const s = {
      shape: 'box',
      x: cfg.x,
      z: cfg.z,
      w: cfg.w,
      d: cfg.d,
      topY: cfg.topY,
      baseX: cfg.x,
      baseY: cfg.topY,
      baseZ: cfg.z,
      prevX: cfg.x,
      prevY: cfg.topY,
      prevZ: cfg.z,
      dx: 0, dy: 0, dz: 0,
      moveAxis: cfg.moveAxis || null,
      moveAmp: cfg.moveAmp || 0,
      moveSpeed: cfg.moveSpeed || 1.4,
      movePhase: cfg.movePhase || 0,
      thickness: cfg.thickness || 1.0,
      group: cfg.group || null,
      enabled: cfg.enabled !== false,
      checkpoint: cfg.checkpoint || null,
    };
    surfaces.push(s);
    return s;
  };

  const registerCircleSurface = (x, z, r, topY, checkpoint = null) => {
    const s = {
      shape: 'circle',
      x, z, r, topY,
      dx: 0, dy: 0, dz: 0,
      enabled: true,
      checkpoint,
    };
    surfaces.push(s);
    return s;
  };

  // Helper: Stylized Floating Rocky Island Underside (matches blueprint!)
  const addRockUnderside = (x, yTop, z, rx, rz, depth = 7.5) => {
    const g = new THREE.Group();
    g.position.set(x, yTop, z);
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(Math.max(rx, rz) * 0.88, depth, 7), rockMat);
    cone1.rotation.x = Math.PI;
    cone1.scale.set(rx / Math.max(rx, rz), 1, rz / Math.max(rx, rz));
    cone1.position.y = -depth * 0.5 - 0.6;
    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(Math.max(rx, rz) * 0.55, depth * 0.75, 6), rockDarkMat);
    cone2.rotation.x = Math.PI;
    cone2.position.set(rx * 0.22, -depth * 0.45 - 0.6, -rz * 0.18);
    g.add(cone1, cone2);
    worldGroup.add(g);
  };

  // Helper: Comic Outlined Platform Pad
  const addPlatformPad = ({
    x, z, w, d, topY,
    thickness = 0.9,
    color = 0xffe600,
    trimColor = PAL.INK,
    moveAxis = null, moveAmp = 0, moveSpeed = 1.5, movePhase = 0,
    checkpoint = null,
  }) => {
    const group = new THREE.Group();
    group.position.set(x, topY - thickness * 0.5, z);

    const outline = new THREE.Mesh(new THREE.BoxGeometry(w + 0.18, thickness + 0.14, d + 0.18), inkMat);
    outline.position.y = -0.02;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, d), new THREE.MeshToonMaterial({ color }));
    body.castShadow = true;
    body.receiveShadow = true;
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.14, d + 0.06), new THREE.MeshBasicMaterial({ color: trimColor }));
    rim.position.y = thickness * 0.5 - 0.06;
    group.add(outline, body, rim);
    worldGroup.add(group);

    return registerBoxSurface({
      x, z, w, d, topY, thickness, group,
      moveAxis, moveAmp, moveSpeed, movePhase, checkpoint,
    });
  };

  // Helper: Walkable Staircase between two heights!
  const addStaircase = ({ x1, z1, y1, x2, z2, y2, width = 5.4, steps = 7, axis = 'x' }) => {
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const sx = THREE.MathUtils.lerp(x1, x2, t);
      const sz = THREE.MathUtils.lerp(z1, z2, t);
      const sy = THREE.MathUtils.lerp(y1, y2, (i + 1) / steps);
      const stepLen = (axis === 'x' ? Math.abs(x2 - x1) : Math.abs(z2 - z1)) / steps + 0.35;
      const w = axis === 'x' ? stepLen : width;
      const d = axis === 'x' ? width : stepLen;

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.55, d), whiteMat);
      mesh.position.set(sx, sy - 0.275, sz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      worldGroup.add(mesh);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.08, d + 0.05), inkMat);
      trim.position.set(sx, sy - 0.03, sz);
      worldGroup.add(trim);

      registerBoxSurface({ x: sx, z: sz, w: w + 0.2, d: d + 0.2, topY: sy, thickness: 0.55 });
    }
    // Clean stair side handrails!
    const len = Math.hypot(x2 - x1, z2 - z1, y2 - y1);
    const railGeo = new THREE.BoxGeometry(axis === 'x' ? len : 0.22, 0.22, axis === 'x' ? 0.22 : len);
    const railMat = new THREE.MeshToonMaterial({ color: 0x8fa8bf });
    [-1, 1].forEach((side) => {
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(
        (x1 + x2) * 0.5 + (axis === 'z' ? side * width * 0.5 : 0),
        (y1 + y2) * 0.5 + 0.85,
        (z1 + z2) * 0.5 + (axis === 'x' ? side * width * 0.5 : 0)
      );
      const slope = Math.atan2(y2 - y1, axis === 'x' ? (x2 - x1) : (z2 - z1));
      if (axis === 'x') rail.rotation.z = slope;
      else rail.rotation.x = -slope;
      worldGroup.add(rail);
    });
  };

  // Helper: Corrugated Vandelay Shipping Container (Orange / Yellow / Teal!)
  const addShippingContainer = ({ x, z, w, d, topY, height = 4.2, color = 0xff7a22, checkpoint = null }) => {
    const g = new THREE.Group();
    g.position.set(x, topY - height * 0.5, z);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, height + 0.16, d + 0.16), inkMat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), new THREE.MeshToonMaterial({ color }));
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(frame, body);

    // Corrugated vertical ribs along sides
    const ribMat = new THREE.MeshToonMaterial({ color: 0x1e2433 });
    const countZ = Math.floor(d / 1.4);
    for (let i = -countZ + 1; i < countZ; i += 2) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, height * 0.78, 0.18), ribMat);
      rib.position.z = i * 0.7;
      g.add(rib);
    }
    // Suspension cables going up into the sky (just like the blueprint!)
    const cableGeo = new THREE.CylinderGeometry(0.05, 0.05, 18, 6);
    [[-w * 0.42, -d * 0.42], [w * 0.42, d * 0.42]].forEach(([cx, cz]) => {
      const c = new THREE.Mesh(cableGeo, inkMat);
      c.position.set(cx, height * 0.5 + 9, cz);
      g.add(c);
    });

    worldGroup.add(g);
    return registerBoxSurface({ x, z, w, d, topY, thickness: height, group: g, checkpoint });
  };

  // Helper: Floating Grassy Jump Island (matches Zone 04 blueprint!)
  const addGrassyIsland = ({ x, z, w, d, topY, checkpoint = null }) => {
    const g = new THREE.Group();
    g.position.set(x, topY - 0.5, z);
    const turf = new THREE.Mesh(new THREE.BoxGeometry(w, 1.0, d), grassMat);
    turf.castShadow = true;
    turf.receiveShadow = true;
    const outline = new THREE.Mesh(new THREE.BoxGeometry(w + 0.18, 1.08, d + 0.18), inkMat);
    outline.position.y = -0.04;
    g.add(outline, turf);
    worldGroup.add(g);
    addRockUnderside(x, topY - 0.4, z, w * 0.58, d * 0.58, 5.2);
    return registerBoxSurface({ x, z, w, d, topY, thickness: 1.0, group: g, checkpoint });
  };

  // Helper: Green Hedge Planters (matches Zone 01 blueprint!)
  const leafMat = new THREE.MeshToonMaterial({ color: 0x5cc93b });
  const addHedgePlanter = (x, y, z, w = 5.6, d = 2.0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, d), whiteMat);
    base.position.y = 0.35;
    const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, 0.74, d + 0.14), inkMat);
    trim.position.y = 0.33;
    const bush = new THREE.Mesh(new THREE.BoxGeometry(w - 0.5, 1.35, d - 0.4), leafMat);
    bush.position.y = 1.25;
    bush.castShadow = true;
    g.add(trim, base, bush);
    worldGroup.add(g);
  };

  // Destructible Voxel Props & Floors
  const props = [];
  let propId = 1;
  const addProp = (type, x, z, rot = 0, hp = null, y = 0) => {
    let grid, radius, defaultHp;
    if (type === 'amp') {
      grid = createAmpStackGrid(); radius = 1.25; defaultHp = 65;
    } else if (type === 'pillar') {
      grid = createEqualizerPillarGrid(); radius = 1.05; defaultHp = 80;
    } else if (type === 'barricade') {
      grid = createBarricadeWallGrid(); radius = 2.4; defaultHp = 75;
    } else {
      grid = createTechCrateGrid(); radius = 1.1; defaultHp = 40;
    }
    const prop = new DestructibleProp({
      id: propId++,
      type,
      grid,
      position: new THREE.Vector3(x, y, z),
      rotationY: rot,
      hp: hp ?? defaultHp,
      radius,
      scene,
    });
    props.push(prop);
    return prop;
  };

  const voxelFloors = [];
  const wallColliders = []; // Solid obstacles/walls: { x, z, w, d, minY, maxY }

  // =========================================================================
  // FLUFFY CEL-SHADED CLOUDS FRAMING THE ENTIRE WINDING SKY CAMPUS!
  // =========================================================================
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  [
    [-34, 24, 22], [35, 28, 36], [96, 26, 18], [98, 30, -34],
    [-32, 28, -28], [-34, 32, -78], [48, 36, -112], [132, 30, -68], [116, 36, -124], [12, 22, 42]
  ].forEach(([cx, cy, cz], idx) => {
    const cg = new THREE.Group();
    cg.position.set(cx, cy, cz);
    const s = 1.1 + (idx % 3) * 0.35;
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(15 * s, 3.2 * s, 6.5 * s), cloudMat);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(9.5 * s, 3.2 * s, 5.5 * s), cloudMat);
    b2.position.set(2.2 * s, 2.2 * s, 0);
    const b3 = new THREE.Mesh(new THREE.BoxGeometry(7.5 * s, 2.4 * s, 4.8 * s), cloudMat);
    b3.position.set(-4.2 * s, 1.5 * s, 0.5);
    cg.add(b1, b2, b3);
    worldGroup.add(cg);
  });

  // =========================================================================
  // ZONE 01 (BOTTOM-LEFT): OCTAGONAL VANDELAY FOUNTAIN PLAZA (x:0, z:0)
  // =========================================================================
  const z1Radius = 18.2;
  const octGeo = new THREE.CylinderGeometry(z1Radius, z1Radius * 0.96, 2.2, 8);
  octGeo.rotateY(Math.PI / 8);
  const octBase = new THREE.Mesh(octGeo, creamMat);
  octBase.position.set(0, -1.12, 0);
  octBase.receiveShadow = true;
  worldGroup.add(octBase);

  const octRimGeo = new THREE.CylinderGeometry(z1Radius + 0.22, z1Radius + 0.22, 0.35, 8);
  octRimGeo.rotateY(Math.PI / 8);
  const octRim = new THREE.Mesh(octRimGeo, cyanTileMat);
  octRim.position.set(0, -0.15, 0);
  worldGroup.add(octRim);
  addRockUnderside(0, -2.0, 0, 16.5, 16.5, 9.5);

  // Cyan Cross-Walkway Stripes & Destructible Voxel Combat Ring in Plaza!
  const crossA = new THREE.Mesh(new THREE.BoxGeometry(31, 0.05, 5.2), cyanTileMat);
  crossA.position.set(0, 0.01, 0);
  crossA.rotation.y = Math.PI / 4;
  const crossB = new THREE.Mesh(new THREE.BoxGeometry(31, 0.05, 5.2), cyanTileMat);
  crossB.position.set(0, 0.01, 0);
  crossB.rotation.y = -Math.PI / 4;
  worldGroup.add(crossA, crossB);

  const z1Floor = new DestructibleVoxelFloor(scene, 9.2, {
    floorTileA: 0xfaf5e6, floorTileB: 0xd5f4f7,
    floorRingInner: 0x00d8ff, floorRingOuter: PAL.ORANGE,
  });
  z1Floor.group.position.x = -1.5;
  z1Floor.group.position.z = 2.5;
  voxelFloors.push({ floor: z1Floor, centerX: -1.5, centerZ: 2.5, radius: 9.6 });

  registerCircleSurface(0, 0, z1Radius - 0.6, 0, new THREE.Vector3(-5, 0, 6));

  // Iconic Central Tiered Cyan Beat-Fountain (x: 1.5, z: -6.5) — pulses on every beat!
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(1.5, 0, -6.5);
  const fRim = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.0, 0.75, 24), whiteMat);
  fRim.position.y = 0.38;
  const fWater = new THREE.Mesh(new THREE.CylinderGeometry(3.35, 3.35, 0.62, 24), new THREE.MeshBasicMaterial({ color: 0x35e8ff }));
  fWater.position.y = 0.42;
  const fTier2 = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.0, 1.3, 18), whiteMat);
  fTier2.position.y = 1.15;
  const fSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.3, 1.8, 16), new THREE.MeshBasicMaterial({ color: 0x7efbff, transparent: true, opacity: 0.88 }));
  fSpout.position.y = 2.2;
  fountainGroup.add(fRim, fWater, fTier2, fSpout);
  worldGroup.add(fountainGroup);
  wallColliders.push({ x: 1.5, z: -6.5, r: 3.9, minY: -1, maxY: 3.2 });

  // 4 Green Hedge Planters framing the Octagon + Secret Balcony for Golden Vinyl #1!
  addHedgePlanter(0, 0, -14.2, 6.4, 2.1);
  addHedgePlanter(-13.8, 0, 0, 2.1, 6.4);
  addHedgePlanter(0, 0, 14.2, 6.4, 2.1);
  addHedgePlanter(13.2, 0, -4.2, 2.1, 5.2);
  addPlatformPad({ x: -12.5, z: -9.5, w: 5.2, d: 5.2, topY: 2.4, color: 0xf4f7fb, trimColor: PAL.ORANGE });

  // Zone 01 South-East White Staircase descending onto Bright Yellow Landing Pad!
  addStaircase({ x1: 13.5, z1: 8.5, y1: 0.0, x2: 20.5, z2: 8.5, y2: -1.5, width: 5.8, steps: 6, axis: 'x' });
  addPlatformPad({
    x: 24.2, z: 8.5, w: 7.6, d: 7.6, topY: -1.5,
    color: PAL.YELLOW, trimColor: PAL.ORANGE,
    checkpoint: new THREE.Vector3(23.5, -1.5, 8.5),
  });

  // =========================================================================
  // ZONE 02 (BOTTOM-RIGHT): SKY STEPPING STONES, BEAT CRUSHERS & SONIC RAIL!
  // =========================================================================
  // 4 Floating Stepping Stones hopping East (+X) over open sky!
  addPlatformPad({ x: 32.2, z: 9.5,  w: 5.2, d: 3.6, topY: -1.1, color: PAL.ORANGE, trimColor: PAL.INK });
  addPlatformPad({ x: 39.2, z: 10.2, w: 4.8, d: 4.8, topY: -0.6, color: PAL.YELLOW, trimColor: PAL.INK });
  addPlatformPad({ x: 46.2, z: 8.8,  w: 4.8, d: 4.8, topY:  0.0, color: PAL.YELLOW, trimColor: PAL.CYAN_BRIGHT, moveAxis: 'y', moveAmp: 0.65, moveSpeed: 2.1 });
  addPlatformPad({ x: 53.2, z: 6.8,  w: 5.0, d: 5.0, topY:  0.4, color: PAL.ORANGE, trimColor: PAL.INK });

  // South Entry Yellow Pad of Conveyor Crusher Bridge + Secret Side Pad!
  addPlatformPad({
    x: 62.0, z: 4.5, w: 8.2, d: 7.5, topY: 0.6,
    color: PAL.YELLOW, trimColor: PAL.INK,
    checkpoint: new THREE.Vector3(62.0, 0.6, 4.5),
  });
  addPlatformPad({ x: 54.5, z: -2.5, w: 4.8, d: 4.8, topY: 2.9, color: PAL.ORANGE_BRIGHT, trimColor: PAL.YELLOW });

  // Industrial Steel Conveyor Walkway running North (x: 62, z: 1 -> -22)
  const convGroup = new THREE.Group();
  convGroup.position.set(62.0, 0.15, -10.5);
  const convDeck = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.9, 23.0), new THREE.MeshToonMaterial({ color: 0x7b8da6 }));
  convDeck.receiveShadow = true;
  const convOutline = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.96, 23.2), inkMat);
  convOutline.position.y = -0.02;
  const convCurbL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.15, 23.0), new THREE.MeshToonMaterial({ color: 0xcbd6e6 }));
  convCurbL.position.x = -3.05;
  const convCurbR = convCurbL.clone();
  convCurbR.position.x = 3.05;
  convGroup.add(convOutline, convDeck, convCurbL, convCurbR);
  worldGroup.add(convGroup);
  registerBoxSurface({ x: 62.0, z: -10.5, w: 6.4, d: 23.0, topY: 0.6, thickness: 0.9 });

  // TWO GIANT ORANGE BEAT-SYNCED HYDRAULIC CRUSHER PISTONS over the walkway!
  const crushers = [];
  [-5.5, -14.5].forEach((cz, idx) => {
    const cg = new THREE.Group();
    cg.position.set(62.0, 0.6, cz);

    const pillarGeo = new THREE.BoxGeometry(1.2, 6.8, 1.4);
    const pillarMat = new THREE.MeshToonMaterial({ color: 0x465266 });
    const pL = new THREE.Mesh(pillarGeo, pillarMat);
    pL.position.set(-3.4, 3.4, 0);
    const pR = new THREE.Mesh(pillarGeo, pillarMat);
    pR.position.set(3.4, 3.4, 0);
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(8.4, 1.5, 2.4), new THREE.MeshToonMaterial({ color: PAL.ORANGE }));
    topCap.position.set(0, 6.9, 0);
    cg.add(pL, pR, topCap);

    // Moving Heavy Crusher Head + Twin Steel Rods!
    const headGroup = new THREE.Group();
    headGroup.position.y = 4.5;
    const slamBlock = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.3, 2.8), new THREE.MeshToonMaterial({ color: PAL.ORANGE_BRIGHT }));
    slamBlock.castShadow = true;
    const hazardRim = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.28, 2.9), new THREE.MeshBasicMaterial({ color: PAL.YELLOW }));
    hazardRim.position.y = -0.55;
    const rodL = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 5.2, 10), new THREE.MeshToonMaterial({ color: 0xd8e2f0 }));
    rodL.position.set(-1.6, 2.8, 0);
    const rodR = rodL.clone();
    rodR.position.x = 1.6;
    headGroup.add(slamBlock, hazardRim, rodL, rodR);
    cg.add(headGroup);

    worldGroup.add(cg);
    crushers.push({
      x: 62.0,
      z: cz,
      baseFloorY: 0.6,
      headGroup,
      beatOffset: idx, // Alternate beat slams so you dash rhythmically 1-2!
      currentHeight: 4.5,
      slamActive: false,
    });
  });

  // North Yellow Platform at end of Crusher Bridge + Voxel Barricade!
  addPlatformPad({
    x: 62.0, z: -25.2, w: 8.0, d: 7.4, topY: 0.6,
    color: PAL.YELLOW, trimColor: PAL.CYAN_BRIGHT,
    checkpoint: new THREE.Vector3(62.0, 0.6, -24.5),
  });
  const barricadeWall = addProp('barricade', 62.0, -21.8, 0, 70, 0.6);

  // CURVED GLOWING CYAN SONIC GRIND RAIL looping from (62, -27) West into Zone 03 Atrium!
  const railCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(62.0, 1.35, -27.2),
    new THREE.Vector3(65.5, 3.2,  -34.5),
    new THREE.Vector3(60.0, 4.0,  -41.0),
    new THREE.Vector3(49.5, 2.8,  -39.0),
    new THREE.Vector3(41.5, 1.0,  -35.0),
  ]);
  const railTubeGeo = new THREE.TubeGeometry(railCurve, 44, 0.36, 12, false);
  const railTubeMat = new THREE.MeshBasicMaterial({ color: 0x38f6ff });
  const railOutlineGeo = new THREE.TubeGeometry(railCurve, 44, 0.44, 10, false);
  const railOutlineMat = new THREE.MeshBasicMaterial({ color: PAL.INK, side: THREE.BackSide });
  const railMesh = new THREE.Mesh(railTubeGeo, railTubeMat);
  const railOutline = new THREE.Mesh(railOutlineGeo, railOutlineMat);
  worldGroup.add(railMesh, railOutline);

  // Support struts under the curved Sonic Rail + Launch Sign!
  [0.15, 0.45, 0.75].forEach((t) => {
    const pt = railCurve.getPoint(t);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6.5, 8), new THREE.MeshToonMaterial({ color: 0x5c6d84 }));
    strut.position.set(pt.x, pt.y - 3.25, pt.z);
    worldGroup.add(strut);
  });

  // =========================================================================
  // ZONE 03 (CENTER): WOOD-SLATTED VANDELAY ATRIUM & 2F L-MEZZANINE (x:28, z:-34)
  // =========================================================================
  const atriumX = 28.0, atriumZ = -34.0, atriumW = 32.0, atriumD = 28.0;
  const atriumSlab = new THREE.Mesh(new THREE.BoxGeometry(atriumW, 2.0, atriumD), creamMat);
  atriumSlab.position.set(atriumX, -1.02, atriumZ);
  atriumSlab.receiveShadow = true;
  const atriumRim = new THREE.Mesh(new THREE.BoxGeometry(atriumW + 0.3, 0.38, atriumD + 0.3), cyanTileMat);
  atriumRim.position.set(atriumX, -0.18, atriumZ);
  worldGroup.add(atriumSlab, atriumRim);
  addRockUnderside(atriumX, -1.9, atriumZ, 16.5, 14.5, 9.0);

  registerBoxSurface({
    x: atriumX, z: atriumZ, w: atriumW, d: atriumD, topY: 0, thickness: 2.0,
    checkpoint: new THREE.Vector3(36.0, 0, -34.0),
  });

  const z3Floor = new DestructibleVoxelFloor(scene, 11.2, {
    floorTileA: 0xfbf6e8, floorTileB: 0xdbf0fa,
    floorRingInner: 0x00c8ff, floorRingOuter: PAL.MAGENTA,
  });
  z3Floor.group.position.x = 27.0;
  z3Floor.group.position.z = -32.5;
  voxelFloors.push({ floor: z3Floor, centerX: 27.0, centerZ: -32.5, radius: 11.6 });

  // Warm Wood-Slat Architectural Walls with Open Doorway Arches (matches blueprint!)
  const buildSlattedWallSegment = (cx, cz, w, d, h = 7.6) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat);
    base.position.set(cx, h * 0.5, cz);
    base.castShadow = true;
    worldGroup.add(base);
    // Crisp vertical wood slats!
    const alongX = w > d;
    const count = Math.floor((alongX ? w : d) / 1.1);
    for (let i = -count * 0.5; i <= count * 0.5; i++) {
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(alongX ? 0.22 : w + 0.14, h - 0.4, alongX ? d + 0.14 : 0.22),
        new THREE.MeshToonMaterial({ color: 0x9c5724 })
      );
      slat.position.set(cx + (alongX ? i * 1.05 : 0), h * 0.5, cz + (alongX ? 0 : i * 1.05));
      worldGroup.add(slat);
    }
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.55, d + 0.2), new THREE.MeshToonMaterial({ color: 0xe39b5c }));
    cap.position.set(cx, h + 0.2, cz);
    worldGroup.add(cap);
    wallColliders.push({ x: cx, z: cz, w, d, minY: 0, maxY: h });
  };

  // North Wall (z = -48, full length behind L-Mezzanine)
  buildSlattedWallSegment(28.0, -47.8, 32.0, 0.9, 8.2);
  // West Wall (x = 12.2) split around West Exit Doorway Arch (z = -35, width = 6.6)!
  buildSlattedWallSegment(12.2, -43.2, 0.9, 9.2, 8.2);
  buildSlattedWallSegment(12.2, -25.2, 0.9, 12.2, 8.2);
  const westArchTop = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, 7.6), whiteMat);
  westArchTop.position.set(12.2, 7.0, -35.0);
  worldGroup.add(westArchTop);

  // South Wall (z = -20.2) split around Shortcut Bridge Arch (x = 20.5) & East Rail Arch (x = 40.5)!
  buildSlattedWallSegment(14.5, -20.2, 5.2, 0.9, 6.2);
  buildSlattedWallSegment(30.5, -20.2, 11.5, 0.9, 6.2);
  const southArch1 = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.8, 1.3), whiteMat);
  southArch1.position.set(20.5, 5.6, -20.2);
  const eastArch = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.8, 1.3), whiteMat);
  eastArch.position.set(40.5, 5.8, -35.0);
  eastArch.rotation.y = Math.PI / 2;
  worldGroup.add(southArch1, eastArch);

  // Internal White Staircase climbing North along East Atrium Wall (y: 0 -> 3.6) + L-Shaped 2F Mezzanine!
  addStaircase({ x1: 40.5, z1: -24.0, y1: 0.0, x2: 40.5, z2: -32.5, y2: 3.6, width: 4.6, steps: 8, axis: 'z' });

  // 2F L-Mezzanine: East Landing + Long North Balcony (exact match to blueprint!)
  addPlatformPad({ x: 40.5, z: -40.2, w: 6.2, d: 14.2, topY: 3.6, thickness: 0.65, color: 0xdff6fa, trimColor: PAL.CYAN_BRIGHT });
  addPlatformPad({ x: 26.5, z: -44.2, w: 22.0, d: 6.2,  topY: 3.6, thickness: 0.65, color: 0xdff6fa, trimColor: PAL.CYAN_BRIGHT });
  // White Mezzanine Support Columns
  [[37.8, -35.0], [37.8, -41.5], [31.0, -41.5], [24.0, -41.5], [17.0, -41.5]].forEach(([px, pz]) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.4, 0.65), whiteMat);
    col.position.set(px, 1.7, pz);
    worldGroup.add(col);
  });

  // Unlockable Orange Wood Shortcut Bridge linking Atrium (20.5, -20) <-> Zone 01 Plaza (10.5, -11)!
  const shortcutBridgeGroup = new THREE.Group();
  const bridgeLen = 14.2;
  const bridgePlank = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.65, bridgeLen), new THREE.MeshToonMaterial({ color: 0xf08c3a }));
  const bridgeRim = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.72, bridgeLen + 0.1), inkMat);
  bridgeRim.position.y = -0.03;
  shortcutBridgeGroup.add(bridgeRim, bridgePlank);
  shortcutBridgeGroup.position.set(15.2, -0.32, -15.2);
  shortcutBridgeGroup.rotation.y = Math.atan2(20.5 - 10.0, -20.2 - (-10.2));
  shortcutBridgeGroup.visible = false; // Extends once Zone 03 Chorus Battle clears!
  worldGroup.add(shortcutBridgeGroup);
  const shortcutSurfaces = [
    registerBoxSurface({ x: 13.0, z: -13.0, w: 5.8, d: 5.8, topY: 0, enabled: false }),
    registerBoxSurface({ x: 16.0, z: -16.0, w: 5.8, d: 5.8, topY: 0, enabled: false }),
    registerBoxSurface({ x: 19.0, z: -19.0, w: 5.8, d: 5.8, topY: 0, enabled: false }),
  ];

  // =========================================================================
  // ZONE 04 (TOP-LEFT): SUSPENDED CARGO CONTAINERS & 5 CYAN SONIC RINGS!
  // =========================================================================
  // Floating Grassy Island #1 right outside Atrium's West Doorway Arch!
  addGrassyIsland({ x: 5.2, z: -35.0, w: 7.4, d: 7.4, topY: 0.0, checkpoint: new THREE.Vector3(5.2, 0, -35.0) });

  // Colorful Suspended Shipping Containers + Grassy Jump-Pad Islands climbing North!
  addShippingContainer({ x: -3.8, z: -41.5, w: 5.0, d: 9.2, topY: 1.3, color: 0xf27924 }); // Orange Container #1
  addPlatformPad({ x: 4.5, z: -48.5, w: 6.4, d: 6.4, topY: 1.7, color: 0x3be8e0, trimColor: PAL.INK }); // Cyan Jump Deck
  addShippingContainer({
    x: -3.5, z: -57.5, w: 5.2, d: 10.2, topY: 4.0, color: 0xffd819,
    checkpoint: new THREE.Vector3(-3.5, 4.0, -57.5),
  }); // Yellow Container #2
  addShippingContainer({ x: -11.8, z: -57.5, w: 4.8, d: 8.4, topY: 4.8, color: 0x2ec4b6 }); // Side Teal Secret Container!
  addGrassyIsland({ x: 5.2, z: -65.5, w: 7.0, d: 7.0, topY: 4.0 }); // Grassy Jump Island #2
  addShippingContainer({ x: -2.2, z: -74.5, w: 5.2, d: 10.0, topY: 6.2, color: 0xf27924 }); // High Orange Container #3
  addShippingContainer({ x: 7.8, z: -80.5, w: 9.6, d: 5.0, topY: 6.5, color: 0x2ec4b6 });   // Teal Container #4
  addGrassyIsland({
    x: 19.5, z: -83.5, w: 9.4, d: 9.4, topY: 6.8,
    checkpoint: new THREE.Vector3(19.5, 6.8, -83.5),
  }); // Summit Launch Grassy Island!
  addShippingContainer({ x: 10.5, z: -90.5, w: 5.2, d: 5.6, topY: 8.4, color: 0x2ec4b6 });  // High Mini Teal Secret Container!

  // THE 5 GIANT GLOWING CYAN SONIC MAGNET / BOOST RINGS ACROSS THE SKY CHASM!
  const grappleChainPoints = [
    new THREE.Vector3(29.5, 8.2, -82.0),
    new THREE.Vector3(42.5, 8.8, -78.5),
    new THREE.Vector3(56.0, 8.2, -73.5),
    new THREE.Vector3(70.5, 6.6, -67.5),
    new THREE.Vector3(84.5, 4.2, -62.0),
    new THREE.Vector3(96.0, 0.5, -58.5), // Lands cleanly on Colosseum South Forecourt!
  ];
  const sonicRings = [];
  for (let i = 0; i < 5; i++) {
    const pt = grappleChainPoints[i];
    const rg = new THREE.Group();
    rg.position.copy(pt);
    rg.lookAt(grappleChainPoints[i + 1]);
    const outer = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.26, 10, 28), new THREE.MeshBasicMaterial({ color: 0x3efcff }));
    const inner = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.12, 8, 24), new THREE.MeshBasicMaterial({ color: PAL.YELLOW }));
    rg.add(outer, inner);
    worldGroup.add(rg);
    sonicRings.push({ group: rg, pos: pt, outer, inner });
  }
  // Glowing cyan energy stream line threading through all 5 rings!
  const ringStreamCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(22.5, 7.5, -83.0), ...grappleChainPoints]);
  const ringStream = new THREE.Mesh(
    new THREE.TubeGeometry(ringStreamCurve, 36, 0.09, 6, false),
    new THREE.MeshBasicMaterial({ color: 0x7efbff, transparent: true, opacity: 0.65 })
  );
  worldGroup.add(ringStream);

  // =========================================================================
  // ZONE 05 (TOP-RIGHT): TIERED CIRCULAR AMP TITAN COLOSSEUM (x:96, z:-86)
  // =========================================================================
  // Colosseum South Forecourt Landing Deck (x: 96, z: -58.5)
  addPlatformPad({
    x: STADIUM_CENTER_X, z: -58.5, w: 16.5, d: 12.0, topY: 0.0,
    color: 0xeef3f8, trimColor: PAL.CYAN_BRIGHT,
    checkpoint: new THREE.Vector3(STADIUM_CENTER_X, 0, -58.5),
  });

  // Grand Circular Destructible Voxel Stage!
  const bossFloor = new DestructibleVoxelFloor(scene, STADIUM_RADIUS, {
    floorTileA: 0xf4f7fb, floorTileB: 0xd6e9f7,
    floorRingInner: 0x00c8ff, floorRingOuter: PAL.ORANGE,
  });
  bossFloor.group.position.x = STADIUM_CENTER_X;
  bossFloor.group.position.z = STADIUM_CENTER_Z;
  voxelFloors.push({ floor: bossFloor, centerX: STADIUM_CENTER_X, centerZ: STADIUM_CENTER_Z, radius: STADIUM_RADIUS + 0.5 });
  registerCircleSurface(STADIUM_CENTER_X, STADIUM_CENTER_Z, STADIUM_RADIUS + 0.8, 0, new THREE.Vector3(STADIUM_CENTER_X, 0, STADIUM_CENTER_Z + 14));

  addRockUnderside(STADIUM_CENTER_X, -2.2, STADIUM_CENTER_Z, 26.5, 26.5, 13.5);

  const bossSkirt = new THREE.Mesh(
    new THREE.CylinderGeometry(STADIUM_RADIUS + 1.2, STADIUM_RADIUS + 3.0, 2.8, 36),
    new THREE.MeshToonMaterial({ color: 0xc9d6e4 })
  );
  bossSkirt.position.set(STADIUM_CENTER_X, -1.5, STADIUM_CENTER_Z);
  worldGroup.add(bossSkirt);

  // Stepped Amphitheater Stadium Seating Tiers around North/East/West perimeter (exact match to blueprint!)
  for (let tier = 0; tier < 3; tier++) {
    const rIn = STADIUM_RADIUS + 0.8 + tier * 2.1;
    const tierGeo = new THREE.CylinderGeometry(rIn + 2.0, rIn + 2.0, 1.35, 36, 1, true, -Math.PI * 0.82, Math.PI * 1.64);
    tierGeo.rotateY(Math.PI); // Open on South (+Z) forecourt entrance!
    const tierMesh = new THREE.Mesh(tierGeo, new THREE.MeshToonMaterial({ color: tier % 2 === 0 ? 0xe8edf4 : 0xcdd8e6, side: THREE.DoubleSide }));
    tierMesh.position.set(STADIUM_CENTER_X, 0.7 + tier * 1.35, STADIUM_CENTER_Z);
    worldGroup.add(tierMesh);
  }

  // 4 Monumental Black Subwoofer Speaker Towers + Overhead Concert Lighting Trusses!
  const backdropTowers = [];
  const speakerAngles = [-Math.PI * 0.76, -Math.PI * 0.24, Math.PI * 0.24, Math.PI * 0.76];
  const speakerSpots = speakerAngles.map((ang) => ({
    x: STADIUM_CENTER_X + Math.sin(ang) * (STADIUM_RADIUS + 5.2),
    z: STADIUM_CENTER_Z + Math.cos(ang) * (STADIUM_RADIUS + 5.2),
  }));
  speakerSpots.forEach((sp) => {
    const tg = new THREE.Group();
    tg.position.set(sp.x, 0, sp.z);
    tg.lookAt(STADIUM_CENTER_X, 0, STADIUM_CENTER_Z);
    const box = new THREE.Mesh(new THREE.BoxGeometry(5.6, 16.5, 4.8), new THREE.MeshToonMaterial({ color: 0x232836 }));
    box.position.y = 8.25;
    box.castShadow = true;
    tg.add(box);
    [4.2, 9.2, 13.8].forEach((cy, idx) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.95, 20), new THREE.MeshBasicMaterial({ color: idx === 1 ? PAL.CYAN_BRIGHT : PAL.ORANGE_BRIGHT, side: THREE.DoubleSide }));
      ring.position.set(0, cy, 2.45);
      tg.add(ring);
    });
    worldGroup.add(tg);
    backdropTowers.push(tg);
  });

  // Overhead Concert Lighting Trusses linking Speaker Towers!
  for (let i = 0; i < 3; i++) {
    const a = speakerSpots[i], b = speakerSpots[i + 1];
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    const truss = new THREE.Mesh(new THREE.BoxGeometry(dist, 1.1, 1.1), new THREE.MeshToonMaterial({ color: 0x3b4559 }));
    truss.position.set((a.x + b.x) * 0.5, 15.6, (a.z + b.z) * 0.5);
    truss.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
    worldGroup.add(truss);
    // Stage Spotlights hanging under truss!
    [-0.28, 0, 0.28].forEach((f, li) => {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 8), new THREE.MeshBasicMaterial({ color: li === 1 ? PAL.CYAN_BRIGHT : PAL.YELLOW }));
      bulb.position.set(THREE.MathUtils.lerp(a.x, b.x, 0.5 + f), 14.8, THREE.MathUtils.lerp(a.z, b.z, 0.5 + f));
      worldGroup.add(bulb);
    });
  }

  const neonRingGeo = new THREE.RingGeometry(STADIUM_RADIUS + 0.35, STADIUM_RADIUS + 0.85, 48);
  neonRingGeo.rotateX(-Math.PI / 2);
  const neonRingMat = new THREE.MeshBasicMaterial({ color: PAL.CYAN_BRIGHT });
  const neonRing = new THREE.Mesh(neonRingGeo, neonRingMat);
  neonRing.position.set(STADIUM_CENTER_X, 0.04, STADIUM_CENTER_Z);
  worldGroup.add(neonRing);

  // Phase 3 Boss Floor Eruption overlay tiles inside Colosseum!
  const floorTiles = [];
  const tileSize = 3.2;
  const tileGeo = new THREE.PlaneGeometry(tileSize - 0.35, tileSize - 0.35);
  tileGeo.rotateX(-Math.PI / 2);
  for (let gx = -5; gx <= 5; gx++) {
    for (let gz = -5; gz <= 5; gz++) {
      const wx = STADIUM_CENTER_X + gx * tileSize;
      const wz = STADIUM_CENTER_Z + gz * tileSize;
      if (Math.hypot(wx - STADIUM_CENTER_X, wz - STADIUM_CENTER_Z) > STADIUM_RADIUS - 2.4) continue;
      const isChecker = (Math.abs(gx + gz) % 2) === 0;
      const glowMat = new THREE.MeshBasicMaterial({
        color: isChecker ? PAL.CYAN : PAL.ORANGE,
        transparent: true, opacity: 0.06, depthWrite: false,
      });
      const glowMesh = new THREE.Mesh(tileGeo, glowMat);
      glowMesh.position.set(wx, 0.03, wz);
      worldGroup.add(glowMesh);
      floorTiles.push({
        gx, gz, x: wx, z: wz, glowMesh, glowMat,
        baseColor: isChecker ? PAL.CYAN : PAL.ORANGE,
        hazardState: 0, hazardTimer: 0,
      });
    }
  }

  const spotBeams = [];
  const beamMat1 = new THREE.MeshBasicMaterial({ color: PAL.CYAN_BRIGHT, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false });
  const beamMat2 = new THREE.MeshBasicMaterial({ color: PAL.ORANGE_BRIGHT, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4.2, 22, 12, 1, true), i % 2 === 0 ? beamMat1 : beamMat2);
    cone.position.set(STADIUM_CENTER_X + Math.cos(a) * 24, 11, STADIUM_CENTER_Z + Math.sin(a) * 24);
    cone.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.35;
    worldGroup.add(cone);
    spotBeams.push(cone);
  }

  // =========================================================================
  // 6 HIDDEN EXPLORATION GOLDEN VINYLS ACROSS ALL 5 BLUEPRINT AREAS!
  // =========================================================================
  const collectibles = [];
  [
    { x: -12.5, y: 3.5, z: -9.5,  label: '喷泉高台秘藏 #1' },
    { x:  54.5, y: 4.0, z: -2.5,  label: '液压桥侧翼 #2' },
    { x:  17.5, y: 4.8, z: -44.2, label: '中庭二楼连廊 #3' },
    { x: -11.8, y: 6.0, z: -57.5, label: '青色悬空货柜 #4' },
    { x:  10.5, y: 9.6, z: -90.5, label: '云巅货柜秘藏 #5' },
    { x:  89.5, y: 1.3, z: -58.5, label: '斗兽场前庭 #6' },
  ].forEach((sp, idx) => {
    const mesh = createGoldenVinylMesh();
    mesh.position.set(sp.x, sp.y, sp.z);
    worldGroup.add(mesh);
    collectibles.push({
      id: idx + 1,
      mesh,
      baseY: sp.y,
      pos: new THREE.Vector3(sp.x, sp.y, sp.z),
      label: sp.label,
      collected: false,
    });
  });

  // =========================================================================
  // DIRECTIONAL NEON GUIDE ARROWS & BEAT JUMP-PADS
  // =========================================================================
  const guideArrows = [];
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 1.1);
  arrowShape.lineTo(1.1, 0);
  arrowShape.lineTo(0.6, 0);
  arrowShape.lineTo(0, 0.6);
  arrowShape.lineTo(-0.6, 0);
  arrowShape.lineTo(-1.1, 0);
  arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  arrowGeo.rotateX(-Math.PI / 2);

  [
    { x: 9.5,  y: 0.05,  z: 8.5,   yaw: -Math.PI / 2 }, // Zone 1 -> East Stairs
    { x: 25.5, y: -1.45, z: 8.5,   yaw: -Math.PI / 2 }, // Stepping Stones East
    { x: 62.0, y: 0.65,  z: 2.0,   yaw: 0 },            // Crusher Bridge North
    { x: 62.0, y: 0.65,  z: -24.5, yaw: 0 },            // Into Cyan Sonic Rail
    { x: 40.5, y: 0.05,  z: -22.5, yaw: 0 },            // Up Atrium Stairs
    { x: 16.5, y: 0.05,  z: -35.0, yaw: Math.PI / 2 },  // West Exit to Cargo Zone
    { x: 96.0, y: 0.05,  z: -60.5, yaw: 0 },            // Into Boss Colosseum!
  ].forEach((cfg, i) => {
    const mat = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? PAL.CYAN_BRIGHT : PAL.YELLOW,
      transparent: true, opacity: 0.72, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(arrowGeo, mat);
    m.position.set(cfg.x, cfg.y, cfg.z);
    m.rotation.y = cfg.yaw;
    worldGroup.add(m);
    guideArrows.push({ mesh: m, mat, baseX: cfg.x, baseZ: cfg.z });
  });

  const jumpPads = [];
  const addJumpPad = (x, y, z, boostY = 17.5, dirX = 0, dirZ = -1) => {
    const g = new THREE.Group();
    g.position.set(x, y + 0.08, z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.24, 2.8), new THREE.MeshToonMaterial({ color: PAL.CHARCOAL }));
    const glow = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.30, 2.1), new THREE.MeshBasicMaterial({ color: PAL.CYAN_BRIGHT }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.10, 8, 24), new THREE.MeshBasicMaterial({ color: PAL.YELLOW }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.22;
    g.add(base, glow, ring);
    worldGroup.add(g);
    jumpPads.push({ group: g, ring, x, y, z, radius: 1.9, boostY, dirX, dirZ, cooldown: 0 });
  };
  // Square Metal Beat Jump-Pads matching the Blueprint's Zone 04 islands!
  addJumpPad(-12.5, 0.0, -4.5, 14.5, 0, -1);     // Plaza lift up to Vinyl #1 balcony
  addJumpPad(4.5,  1.7, -48.5, 16.5, -0.65, -0.75); // Cyan Deck -> Yellow Container #2
  addJumpPad(5.2,  4.0, -65.5, 16.5, -0.55, -0.82); // Grassy Island #2 -> High Orange Container #3
  addJumpPad(22.2, 6.8, -83.0, 15.5, 0.95, 0.22);   // Summit Island Launch Pad right into the 5 Sonic Rings!

  // =========================================================================
  // ENERGY LASER GATES (Supporting arbitrary X/Z & Rotation!)
  // =========================================================================
  const addGate = (id, x, z, width, rotY = 0, colorHex = PAL.MAGENTA_BRIGHT) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    const postGeo = new THREE.BoxGeometry(0.95, 5.8, 0.95);
    const postMat = new THREE.MeshToonMaterial({ color: PAL.CHARCOAL });
    const leftPost = new THREE.Mesh(postGeo, postMat);
    leftPost.position.set(-width * 0.5, 2.9, 0);
    const rightPost = new THREE.Mesh(postGeo, postMat);
    rightPost.position.set(width * 0.5, 2.9, 0);
    group.add(leftPost, rightPost);

    const laserGroup = new THREE.Group();
    for (let y = 0.9; y <= 4.5; y += 1.2) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.26, 0.26),
        new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9 })
      );
      bar.position.y = y;
      laserGroup.add(bar);
    }
    group.add(laserGroup);
    worldGroup.add(group);
    return { id, x, z, width, rotY, group, laserGroup, locked: true };
  };

  // Gate 1: Guards Zone 01 SE Staircase until interactive tutorial completes!
  const gateZone1 = addGate('zone1', 13.0, 8.5, 6.4, Math.PI / 2, PAL.ORANGE_BRIGHT);
  // Gate 3: Guards Zone 03 Atrium's West Doorway Arch until Chorus 02 clears!
  const gateZone3 = addGate('zone3', 12.6, -35.0, 6.6, Math.PI / 2, PAL.MAGENTA_BRIGHT);
  // Gate Boss: Locks behind KAI upon entering the Colosseum!
  const gateBossBack = addGate('bossBack', STADIUM_CENTER_X, -63.5, 15.5, 0, PAL.RED_CORE);
  gateBossBack.locked = false;
  gateBossBack.laserGroup.visible = false;

  // =========================================================================
  // DESTRUCTIBLE VOXEL PROPS ACROSS ALL 5 AREAS!
  // =========================================================================
  // Zone 01 Fountain Plaza
  addProp('crate', -9.5, 6.5, 0.3);
  addProp('crate',  6.5, 10.5, -0.3);
  addProp('amp',   -9.5, -3.5, 0.7);
  addProp('amp',    8.5, -10.5, -0.6);

  // Zone 02 Crusher Bridge Pads
  addProp('crate', 59.0, 6.5, 0.2, 40, 0.6);
  addProp('amp',   65.0, 6.5, -0.4, 65, 0.6);
  addProp('crate', 59.5, -26.5, 0.3, 40, 0.6);

  // Zone 03 Vandelay Atrium (Ground + 2F Mezzanine!)
  addProp('pillar', 20.5, -26.5, 0);
  addProp('pillar', 34.0, -26.5, 0);
  addProp('amp',    18.0, -40.5, 0.8);
  addProp('crate',  33.0, -39.0, -0.3);
  addProp('amp',    31.5, -44.2, 0.0, 60, 3.6); // On 2F Mezzanine!

  // Zone 04 Summit Supply Crates before Sonic Rings
  addProp('crate', 16.5, -80.5, 0.3, 40, 6.8);
  addProp('amp',   16.5, -86.5, 0.5, 65, 6.8);

  // Zone 05 Colosseum Perimeter Cover Props (around x:96, z:-86!)
  addProp('amp',    STADIUM_CENTER_X - 14.0, STADIUM_CENTER_Z + 5, 0.9);
  addProp('amp',    STADIUM_CENTER_X + 14.0, STADIUM_CENTER_Z + 5, -0.9);
  addProp('crate',  STADIUM_CENTER_X - 9.0,  STADIUM_CENTER_Z + 12, 0.3);
  addProp('crate',  STADIUM_CENTER_X + 9.0,  STADIUM_CENTER_Z + 12, -0.3);
  addProp('pillar', STADIUM_CENTER_X - 15.0, STADIUM_CENTER_Z - 6, 0);
  addProp('pillar', STADIUM_CENTER_X + 15.0, STADIUM_CENTER_Z - 6, 0);
  addProp('amp',    STADIUM_CENTER_X - 12.0, STADIUM_CENTER_Z - 14, 0.7);
  addProp('amp',    STADIUM_CENTER_X + 12.0, STADIUM_CENTER_Z - 14, -0.7);

  return {
    arenaGroup: worldGroup,
    surfaces,
    wallColliders,
    fountainSpout: fSpout,
    crushers,
    railCurve,
    railTubeMat,
    sonicRings,
    grappleChainPoints,
    shortcutBridgeGroup,
    unlockShortcutBridge() {
      shortcutBridgeGroup.visible = true;
      shortcutSurfaces.forEach((s) => { s.enabled = true; });
    },
    voxelFloors,
    collectibles,
    floorTiles,
    neonRing,
    neonRingMat,
    backdropTowers,
    spotBeams,
    guideArrows,
    jumpPads,
    gates: { zone1: gateZone1, zone3: gateZone3, bossBack: gateBossBack },
    barricadeWall,
    props,
    nextPropId: () => propId++,
    carveFloorAt(wx, wz, radius, depth, particles) {
      let total = 0;
      for (const vf of voxelFloors) {
        if (Math.hypot(wx - vf.centerX, wz - vf.centerZ) <= vf.radius + radius) {
          total += vf.floor.carveCrater(wx - vf.centerX, wz - vf.centerZ, radius, depth, particles);
        }
      }
      return total;
    },
    updatePlatforms(elapsedTime, beatFloat = 0) {
      // 1. Moving Stepping Stones
      for (const s of surfaces) {
        if (!s.moveAxis) continue;
        s.prevX = s.x; s.prevY = s.topY; s.prevZ = s.z;
        if (s.moveAxis === 'x') s.x = s.baseX + Math.sin(elapsedTime * s.moveSpeed + s.movePhase) * s.moveAmp;
        else if (s.moveAxis === 'y') s.topY = s.baseY + Math.sin(elapsedTime * s.moveSpeed + s.movePhase) * s.moveAmp;
        else if (s.moveAxis === 'z') s.z = s.baseZ + Math.sin(elapsedTime * s.moveSpeed + s.movePhase) * s.moveAmp;
        s.dx = s.x - s.prevX;
        s.dy = s.topY - s.prevY;
        s.dz = s.z - s.prevZ;
        if (s.group) s.group.position.set(s.x, s.topY - s.thickness * 0.5, s.z);
      }

      // 2. Beat-Synced Hydraulic Crusher Pistons!
      // Every 4 beats, piston slams down sharply on its target beat and retracts smoothly!
      for (const cr of crushers) {
        const cycle = (beatFloat + cr.beatOffset * 2) % 4;
        let targetH = 4.6;
        if (cycle >= 2.85 && cycle < 3.45) {
          targetH = 0.72; // SLAM DOWN ON CONVEYOR!
          cr.slamActive = true;
        } else if (cycle >= 2.35 && cycle < 2.85) {
          targetH = 4.95; // Slight wind-up tremble before slam!
          cr.slamActive = false;
        } else {
          cr.slamActive = false;
        }
        cr.currentHeight = THREE.MathUtils.lerp(cr.currentHeight, targetH, cr.slamActive ? 0.45 : 0.16);
        cr.headGroup.position.y = cr.currentHeight;
      }

      // 3. Spin & pulse the 5 Cyan Sonic Sky-Rings!
      sonicRings.forEach((sr, idx) => {
        sr.inner.rotation.z = elapsedTime * 2.5 + idx;
        const sc = 1 + Math.sin(elapsedTime * 5 + idx) * 0.06;
        sr.group.scale.setScalar(sc);
      });
    },
    destroyAllFloors() {
      for (const vf of voxelFloors) vf.floor.destroy();
    }
  };
}
