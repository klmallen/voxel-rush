import * as THREE from 'three';
import {
  PAL,
  createAmpStackGrid,
  createTechCrateGrid,
  createEqualizerPillarGrid,
  createBackdropTowerMesh,
} from '../voxel/VoxelModels.js';
import { DestructibleProp } from '../voxel/DestructibleProp.js';
import { DestructibleVoxelFloor } from '../voxel/DestructibleVoxelFloor.js';

export const ARENA_RADIUS = 19.5;

/**
 * Builds the Hi-Fi RUSH Industrial Concert Stage Arena:
 * - REAL Chunked True-Voxel Destructible Stage Floor (carves stepped 3D voxel craters!)
 * - Beat-pulsing neon stage rim & overhead trusses/spotlights
 * - Giant true-voxel concert speaker towers framing the arena
 * - Ring of destructible true-voxel props (Amp Stacks, Tech Crates, Equalizer Pillars)
 */
export function buildArena(scene, theme = null) {
  const arenaGroup = new THREE.Group();
  scene.add(arenaGroup);

  // --- 1. TRUE-VOXEL DESTRUCTIBLE STAGE FLOOR (8x8 Live Carvable Voxel Chunks!) ---
  const voxelFloor = new DestructibleVoxelFloor(scene, ARENA_RADIUS, theme);

  // Deep industrial under-stage pedestal (visual skirt beneath the voxel floor slab)
  const skirtGeo = new THREE.CylinderGeometry(ARENA_RADIUS + 0.5, ARENA_RADIUS + 2.2, 2.4, 24);
  const skirtMat = new THREE.MeshToonMaterial({ color: 0x171b27 });
  const skirt = new THREE.Mesh(skirtGeo, skirtMat);
  skirt.position.y = -2.45;
  arenaGroup.add(skirt);

  // Glowing cyan outer neon ring (pulses on every beat!)
  const neonRingGeo = new THREE.RingGeometry(ARENA_RADIUS + 0.45, ARENA_RADIUS + 0.92, 48);
  neonRingGeo.rotateX(-Math.PI / 2);
  const neonRingMat = new THREE.MeshBasicMaterial({ color: PAL.CYAN_BRIGHT });
  const neonRing = new THREE.Mesh(neonRingGeo, neonRingMat);
  neonRing.position.y = 0.03;
  arenaGroup.add(neonRing);

  // --- 2. PHASE 3 FLOOR ERUPTION HAZARD OVERLAY TILES ---
  // (Transparent glowing decals floating slightly above the voxel floor for crisp beat warnings!)
  const floorTiles = [];
  const tileSize = 3.1;
  const tileGeo = new THREE.PlaneGeometry(tileSize - 0.35, tileSize - 0.35);
  tileGeo.rotateX(-Math.PI / 2);
  for (let gx = -5; gx <= 5; gx++) {
    for (let gz = -5; gz <= 5; gz++) {
      const wx = gx * tileSize;
      const wz = gz * tileSize;
      if (Math.hypot(wx, wz) > ARENA_RADIUS - 2.2) continue;

      const isChecker = (Math.abs(gx + gz) % 2) === 0;
      const glowMat = new THREE.MeshBasicMaterial({
        color: isChecker ? PAL.CYAN : PAL.ORANGE,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      });
      const glowMesh = new THREE.Mesh(tileGeo, glowMat);
      glowMesh.position.set(wx, 0.025, wz);
      arenaGroup.add(glowMesh);

      floorTiles.push({
        gx, gz, x: wx, z: wz,
        glowMesh,
        glowMat,
        baseColor: isChecker ? PAL.CYAN : PAL.ORANGE,
        hazardState: 0, // 0=normal, 1=warning, 2=erupting!
        hazardTimer: 0,
      });
    }
  }

  // --- 3. GIANT BACKGROUND TRUE-VOXEL CONCERT SPEAKER TOWERS ---
  const backdropTowers = [];
  const towerAngles = [-2.55, -2.05, -1.57, -1.08, -0.58, 0.45, 2.68];
  towerAngles.forEach((ang, idx) => {
    const dist = ARENA_RADIUS + 9.5 + (idx % 2) * 3.5;
    const h = 36 + (idx % 3) * 10;
    const tower = createBackdropTowerMesh(h);
    tower.position.set(Math.cos(ang) * dist, -2.5, Math.sin(ang) * dist);
    tower.lookAt(0, -2.5, 0);
    arenaGroup.add(tower);
    backdropTowers.push(tower);
  });

  // Overhead stage lighting rig ring
  const trussGeo = new THREE.TorusGeometry(ARENA_RADIUS + 4, 0.35, 6, 24);
  trussGeo.rotateX(Math.PI / 2);
  const truss = new THREE.Mesh(trussGeo, new THREE.MeshBasicMaterial({ color: 0x161822 }));
  truss.position.y = 14.5;
  arenaGroup.add(truss);

  // Vibrant concert spotlight beams in background
  const beamMat1 = new THREE.MeshBasicMaterial({
    color: PAL.CYAN_BRIGHT, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false
  });
  const beamMat2 = new THREE.MeshBasicMaterial({
    color: PAL.ORANGE_BRIGHT, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false
  });
  const spotBeams = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4.5, 22, 12, 1, true), i % 2 === 0 ? beamMat1 : beamMat2);
    cone.position.set(Math.cos(a) * (ARENA_RADIUS + 4), 10, Math.sin(a) * (ARENA_RADIUS + 4));
    cone.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.35;
    cone.rotation.x = 0.25;
    arenaGroup.add(cone);
    spotBeams.push(cone);
  }

  // --- 4. DESTRUCTIBLE TRUE-VOXEL STAGE PROPS ---
  const props = [];
  let propIdCounter = 1;

  const propPlacements = [
    { type: 'amp',    x: -11.8, z: -2.5, rot: 0.9 },
    { type: 'crate',  x: -10.5, z: 4.0,  rot: 0.3 },
    { type: 'pillar', x: -13.5, z: 7.5,  rot: 0 },
    { type: 'crate',  x: -7.5,  z: 11.5, rot: 0.6 },
    { type: 'amp',    x: 11.8,  z: -2.5, rot: -0.9 },
    { type: 'crate',  x: 10.5,  z: 4.0,  rot: -0.4 },
    { type: 'pillar', x: 13.5,  z: 7.5,  rot: 0 },
    { type: 'crate',  x: 7.5,   z: 11.5, rot: -0.5 },
    { type: 'pillar', x: -7.5,  z: -9.0, rot: 0 },
    { type: 'pillar', x: 7.5,   z: -9.0, rot: 0 },
    { type: 'amp',    x: -12.5, z: -9.5, rot: 0.7 },
    { type: 'amp',    x: 12.5,  z: -9.5, rot: -0.7 },
    { type: 'crate',  x: -6.0,  z: 5.5,  rot: 0.2 },
    { type: 'crate',  x: 6.0,   z: 5.5,  rot: -0.2 },
  ];

  for (const p of propPlacements) {
    let grid, hp, radius;
    if (p.type === 'amp') {
      grid = createAmpStackGrid();
      hp = 70;
      radius = 1.25;
    } else if (p.type === 'pillar') {
      grid = createEqualizerPillarGrid();
      hp = 85;
      radius = 1.05;
    } else {
      grid = createTechCrateGrid();
      hp = 45;
      radius = 1.1;
    }
    props.push(new DestructibleProp({
      id: propIdCounter++,
      type: p.type,
      grid,
      position: new THREE.Vector3(p.x, 0, p.z),
      rotationY: p.rot,
      hp,
      radius,
      scene,
    }));
  }

  return {
    arenaGroup,
    voxelFloor,
    floorTiles,
    neonRing,
    neonRingMat,
    backdropTowers,
    spotBeams,
    props,
    nextPropId: () => propIdCounter++,
  };
}
