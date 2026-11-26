import * as THREE from 'three';
import { VoxelGrid } from './VoxelGrid.js';

/**
 * Hi-Fi RUSH Pop-Art Cel-Shaded Palette
 */
export const PAL = {
  INK: 0x161822,
  CHARCOAL: 0x262a38,
  STEEL_DARK: 0x3b4254,
  STEEL: 0x62708a,
  STEEL_LIGHT: 0x9aa8bf,
  WHITE: 0xf4f6fa,
  CREAM: 0xfff3d6,
  SKIN: 0xf7c59f,
  SKIN_SHADE: 0xd99b72,

  ORANGE: 0xff5a1f,
  ORANGE_DARK: 0xc93b0b,
  ORANGE_BRIGHT: 0xff8c2b,
  YELLOW: 0xffe600,
  YELLOW_DARK: 0xd9a800,
  CYAN: 0x00e5cc,
  CYAN_BRIGHT: 0x4dfcff,
  TEAL_DARK: 0x0b6b73,
  TEAL_ARMOR: 0x1c7c8c,
  MAGENTA: 0xff2a85,
  MAGENTA_BRIGHT: 0xff6bb0,
  PURPLE: 0x7b3fe4,
  RED_CORE: 0xff2233,
  GREEN_HEAL: 0x22f57a,
  DENIM: 0x243b6b,
  DENIM_LIGHT: 0x385896,
  HAIR_DARK: 0x1d2233,
  BRASS: 0xe6b83a,
};

// =========================================================================
// 0. THREE UNMISTAKABLE OVERSIZED TRUE-VOXEL MUSICAL INSTRUMENT WEAPONS!
//    Designed at high micro-voxel resolution with bold silhouettes visible
//    clearly from the 3rd-person camera!
// =========================================================================

/**
 * WEAPON 1: HEAVY 4-STRING PUNK ELECTRIC BASS (24 x 52 x 6 fine voxels!)
 * KAI's signature dragged weapon! Asymmetrical offset rock bass body with heavy
 * chrome spark-skid tail bumper at y=0..2, split P-Bass pickups, 4 thick glowing
 * electric-cyan/yellow bass strings, fretted maple neck, and 4-in-line bass tuners!
 */
export function buildFlyingVGuitarMesh(vs = 0.068) {
  const g = new VoxelGrid(24, 52, 6, vs);

  // 1. Heavy Chrome & Spark-Steel Tail Skid Bumper (y = 0..2 — scrapes the ground when dragged!)
  g.fillBox(6, 0, 1, 17, 2, 4, PAL.STEEL_LIGHT);
  g.fillBox(8, 0, 2, 15, 1, 3, PAL.YELLOW, true);

  // 2. Offset Punk Electric Bass Body (y = 2..23 — bold asymmetric upper & lower horns!)
  for (let y = 2; y <= 23; y++) {
    let xMin = 4, xMax = 19;
    if (y <= 5) {
      xMin = 6 - (y - 2);
      xMax = 17 + (y - 2);
    } else if (y >= 12 && y <= 16) {
      // Classic curvaceous bass waist indent!
      xMin = 6;
      xMax = 17;
    } else if (y > 16) {
      // Asymmetric longer upper bass horn (left) & shorter cutaway horn (right)!
      const hornLeft = y <= 23 ? (4 + Math.max(0, y - 20)) : 99;
      const hornRight = y <= 20 ? (19 - Math.max(0, y - 18)) : -1;
      for (let x = 3; x <= 20; x++) {
        const inLeftHorn = (x >= hornLeft && x <= 8 && y <= 23);
        const inCenter = (x >= 9 && x <= 14 && y <= 22);
        const inRightHorn = (x >= 15 && x <= hornRight && y <= 20);
        if (!inLeftHorn && !inCenter && !inRightHorn) continue;
        const isRim = (x === hornLeft || x === hornRight || y >= 22);
        g.fillBox(x, y, 1, x, y, 4, isRim ? PAL.CREAM : PAL.ORANGE);
      }
      continue;
    }
    for (let x = xMin; x <= xMax; x++) {
      const isEdge = (x === xMin || x === xMax);
      g.fillBox(x, y, 1, x, y, 4, isEdge ? PAL.CREAM : PAL.ORANGE);
    }
  }

  // Crisp Tortoise/Cream Punk Pickguard + Heavy Chrome Bass Bridge + Split P/J Bass Pickups!
  g.fillBox(7, 6, 4, 16, 18, 4, PAL.CREAM);
  g.fillBox(9, 4, 4, 14, 6, 5, PAL.STEEL_LIGHT); // Heavy-mass bass bridge
  g.fillBox(9, 9, 5, 14, 10, 5, PAL.INK);        // J-Bass bridge pickup
  g.fillBox(9, 13, 5, 11, 15, 5, PAL.INK);       // Split P-Bass pickup A
  g.fillBox(12, 12, 5, 14, 14, 5, PAL.INK);      // Split P-Bass pickup B
  g.set(16, 8, 5, PAL.YELLOW);                   // Master volume knob
  g.set(17, 6, 5, PAL.YELLOW);                   // Bass boost knob
  g.fillBox(5, 8, 5, 6, 13, 5, PAL.CYAN_BRIGHT, true); // Glowing beat equalizer strip!

  // 3. Long Thick Maple & Rosewood Bass Neck (y = 22..44)
  g.fillBox(10, 22, 2, 13, 44, 3, PAL.CREAM);
  g.fillBox(10, 22, 4, 13, 44, 4, PAL.CHARCOAL);
  for (let fy = 24; fy <= 43; fy += 3) {
    g.fillBox(10, fy, 4, 13, fy, 4, PAL.STEEL_LIGHT);
  }

  // 4. FOUR THICK HEAVY-GAUGE GLOWING BASS STRINGS!
  g.fillBox(10, 5, 5, 10, 45, 5, PAL.CYAN_BRIGHT, true);
  g.fillBox(11, 5, 5, 11, 45, 5, PAL.YELLOW, true);
  g.fillBox(12, 5, 5, 12, 45, 5, PAL.WHITE, true);
  g.fillBox(13, 5, 5, 13, 45, 5, PAL.CYAN_BRIGHT, true);

  // 5. Iconic Angled 4-In-Line Punk Bass Headstock + 4 Cloverleaf Tuning Pegs!
  g.fillBox(9, 44, 2, 15, 50, 4, PAL.ORANGE);
  g.fillBox(10, 50, 2, 14, 51, 4, PAL.YELLOW);
  for (let py = 45; py <= 49; py += 1) {
    if (py % 2 === 1) g.fillBox(6, py, 3, 8, py, 3, PAL.STEEL_LIGHT); // 4 chunky bass tuners!
  }
  g.fillBox(7, 45, 3, 7, 49, 3, PAL.YELLOW);

  // Grip near upper neck [12, 38, 3] so the heavy body & bumper [12, 0, 3] trail 2.58m down onto the floor!
  return g.createMeshGroup({ customPivot: [12, 38, 3], outlineThickness: 0.025 });
}

/**
 * WEAPON 2: CYBER-PUNK KEYTAR BLADE (22 x 44 x 6 fine voxels!)
 * Instantly recognizable shoulder synth-keytar with crisp black-and-white piano keys,
 * neon magenta/cyan synthesizer body, and glowing pitch-wheel neck!
 */
export function buildKeytarMesh(vs = 0.066) {
  const g = new VoxelGrid(22, 44, 6, vs);

  // Sleek slanted Electric-Cyan & Magenta Keytar Body
  g.fillBox(3, 2, 1, 18, 24, 4, PAL.CYAN);
  g.fillBox(2, 4, 1, 5, 22, 4, PAL.MAGENTA); // Bold hot-pink bevel trim!
  g.fillBox(17, 2, 1, 19, 25, 4, PAL.YELLOW); // Razor yellow edge!
  g.fillBox(19, 3, 2, 20, 24, 3, PAL.CYAN_BRIGHT, true); // Glowing synth blade rim

  // CRISP PIANO KEYBOARD! White keys with alternating raised Black sharp/flat keys!
  g.fillBox(6, 4, 4, 16, 22, 5, PAL.WHITE);
  // Subtle key divider lines + raised black keys (2-3-2 octave pattern!)
  const blackKeyRows = [6, 8, 12, 14, 16, 20];
  for (const ky of blackKeyRows) {
    g.fillBox(6, ky, 5, 11, ky, 5, PAL.INK);
  }
  // Equalizer LED strip beside keys
  for (let y = 5; y <= 21; y += 2) {
    g.set(4, y, 5, y > 15 ? PAL.MAGENTA_BRIGHT : PAL.YELLOW, true);
  }

  // Keytar Neck + Pitch-Bend Ribbon & Modulation Wheel!
  g.fillBox(7, 24, 2, 12, 41, 4, PAL.CHARCOAL);
  g.fillBox(8, 25, 5, 11, 39, 5, PAL.MAGENTA_BRIGHT, true); // Glowing touch ribbon!
  g.fillBox(13, 34, 2, 15, 39, 4, PAL.YELLOW); // Grip handle guard
  // Angular Synth Headstock
  g.fillBox(5, 40, 2, 15, 43, 4, PAL.CYAN_BRIGHT, true);

  return g.createMeshGroup({ customPivot: [10, 24, 3], outlineThickness: 0.024 });
}

/**
 * WEAPON 3: BOOM-BASS AMP HAMMER (24 x 46 x 12 fine voxels!)
 * Massive 4-string rock bass guitar fused with a booming subwoofer amplifier head!
 */
export function buildBassHammerMesh(vs = 0.066) {
  const g = new VoxelGrid(24, 46, 12, vs);

  // Heavy Bass Neck (handle)
  g.fillBox(10, 0, 4, 13, 27, 7, PAL.CHARCOAL);
  g.fillBox(9, 0, 4, 14, 3, 7, PAL.YELLOW); // Pommel grip
  // Thick glowing yellow bass strings on shaft!
  g.fillBox(11, 4, 8, 11, 27, 8, PAL.YELLOW, true);
  g.fillBox(12, 4, 8, 12, 27, 8, PAL.ORANGE_BRIGHT, true);

  // GIANT AMPLIFIER-SPEAKER HAMMER HEAD (22x17x12)
  g.fillBox(1, 27, 1, 22, 43, 10, PAL.CHARCOAL);
  g.fillBox(0, 40, 0, 23, 44, 11, PAL.ORANGE); // Top orange amp crown
  // Hazard yellow-black bumper bands
  for (let x = 1; x <= 22; x++) {
    const c = (x % 4) < 2 ? PAL.YELLOW : PAL.INK;
    g.fillBox(x, 27, 0, x, 29, 11, c);
  }
  // Dual Booming Speaker Cones on Front (+Z) & Back (-Z) of the hammer head!
  g.fillRingZ(6.5, 35, 10, 11, 2.2, 4.2, PAL.STEEL_LIGHT);
  g.fillCylinderZ(6.5, 35, 10, 11, 2.0, PAL.CYAN_BRIGHT, true);
  g.fillRingZ(16.5, 35, 10, 11, 2.2, 4.2, PAL.STEEL_LIGHT);
  g.fillCylinderZ(16.5, 35, 10, 11, 2.0, PAL.ORANGE_BRIGHT, true);

  g.fillRingZ(6.5, 35, 0, 1, 2.2, 4.2, PAL.STEEL_LIGHT);
  g.fillCylinderZ(6.5, 35, 0, 1, 2.0, PAL.ORANGE_BRIGHT, true);
  g.fillRingZ(16.5, 35, 0, 1, 2.2, 4.2, PAL.STEEL_LIGHT);
  g.fillCylinderZ(16.5, 35, 0, 1, 2.0, PAL.CYAN_BRIGHT, true);

  // Glowing side impact grilles
  g.fillBox(0, 31, 3, 1, 38, 8, PAL.YELLOW, true);
  g.fillBox(22, 31, 3, 23, 38, 8, PAL.YELLOW, true);

  return g.createMeshGroup({ customPivot: [12, 16, 6], outlineThickness: 0.026 });
}

// =========================================================================
// 1. HERO: KAI (Full 15-Joint Articulated Street-Dancer Rig + Dragged Bass!)
//    - 2-segment Arms: Shoulder (Upper Arm) + Elbow (Forearm & Glove/Gauntlet)
//    - 3-segment Legs: Hip (Thigh) + Knee (Shin/Calf) + Ankle (High-Top Sneaker)
//    - 2-segment Scarf + Pelvis/Spine Waist + Dragged Bass Spark Marker!
// =========================================================================
export function buildHeroModel() {
  const vs = 0.072; // Crisp bold hero scale!
  const root = new THREE.Group();

  // Pelvis / Hip groove root (height dynamically computed from bent-knee kinematics so sneakers stay flat!)
  const bodyPivot = new THREE.Group();
  bodyPivot.position.set(0, 17.5 * vs, 0);
  root.add(bodyPivot);

  // --- PELVIS / BELT BLOCK (12x5x9) ---
  const pelvisG = new VoxelGrid(12, 5, 9, vs);
  pelvisG.fillBox(1, 0, 1, 10, 3, 7, PAL.DENIM);
  pelvisG.fillBox(0, 3, 0, 11, 4, 8, PAL.INK); // Rockstar belt
  pelvisG.fillBox(4, 3, 8, 7, 4, 8, PAL.CYAN_BRIGHT, true); // Music-player belt buckle!
  pelvisG.fillBox(5, 3, 0, 6, 4, 0, PAL.YELLOW, true);      // Back belt stud
  bodyPivot.add(pelvisG.createMeshGroup({ customPivot: [6, 2.5, 4.5], outlineThickness: 0.022 }));

  // --- TORSO + CROPPED ORANGE PUNK JACKET + COLLAR (16x16x12) ---
  const torsoG = new VoxelGrid(16, 16, 12, vs);
  torsoG.fillBox(4, 0, 3, 11, 13, 8, PAL.CHARCOAL);
  // Glowing cyan chest equalizer bar
  torsoG.fillBox(6, 7, 9, 9, 9, 9, PAL.CYAN_BRIGHT, true);
  torsoG.fillBox(7, 10, 9, 8, 10, 9, PAL.YELLOW, true);
  // Bright Tangerine-Orange cropped punk jacket
  torsoG.fillBox(3, 1, 2, 12, 13, 6, PAL.ORANGE);
  torsoG.fillBox(3, 1, 6, 5, 13, 9, PAL.ORANGE);
  torsoG.fillBox(10, 1, 6, 12, 13, 9, PAL.ORANGE);
  // Bold back emblem (super clear from 3rd-person camera!)
  torsoG.fillBox(5, 3, 1, 10, 11, 2, PAL.CHARCOAL);
  torsoG.fillBox(7, 4, 1, 8, 10, 1, PAL.YELLOW, true);
  torsoG.fillBox(6, 7, 1, 9, 8, 1, PAL.CYAN_BRIGHT, true);
  torsoG.fillBox(3, 12, 3, 12, 14, 9, PAL.ORANGE_BRIGHT);
  // Yellow rockstar scarf collar
  torsoG.fillBox(4, 13, 3, 11, 15, 9, PAL.YELLOW);

  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 2.0 * vs, 0);
  torsoPivot.add(torsoG.createMeshGroup({ pivotMode: 'bottom-center', outlineThickness: 0.024 }));
  bodyPivot.add(torsoPivot);

  // --- 2-JOINT ARTICULATED FLYING YELLOW SCARF TAIL (Upper Scarf + Scarf Tip!) ---
  const scarfUpperG = new VoxelGrid(6, 8, 4, vs);
  scarfUpperG.fillBox(1, 0, 1, 4, 7, 2, PAL.YELLOW);
  const scarfPivot = new THREE.Group();
  scarfPivot.position.set(2.2 * vs, 13.5 * vs, -4.2 * vs);
  scarfPivot.add(scarfUpperG.createMeshGroup({ customPivot: [3, 7, 2], outlineThickness: 0.02 }));
  torsoPivot.add(scarfPivot);

  const scarfTipG = new VoxelGrid(6, 8, 4, vs);
  scarfTipG.fillBox(1, 2, 1, 4, 7, 2, PAL.YELLOW_DARK);
  scarfTipG.fillBox(1, 0, 0, 4, 2, 3, PAL.ORANGE_BRIGHT);
  const scarfTipPivot = new THREE.Group();
  scarfTipPivot.position.set(0, -6.5 * vs, 0);
  scarfTipPivot.add(scarfTipG.createMeshGroup({ customPivot: [3, 7, 2], outlineThickness: 0.02 }));
  scarfPivot.add(scarfTipPivot);

  // --- HEAD + SPIKY ANIME HAIR + CYBER HEADPHONES (18x20x18) ---
  const headG = new VoxelGrid(18, 20, 18, vs);
  headG.fillBox(7, 0, 7, 10, 2, 10, PAL.SKIN_SHADE);
  headG.fillBox(4, 3, 4, 13, 12, 13, PAL.SKIN);
  headG.clearBox(4, 3, 12, 4, 4, 13);
  headG.clearBox(13, 3, 12, 13, 4, 13);
  headG.stampPixelArtZ(4, 4, 13, 13, [
    '.KKK..KKK.',
    'KWWK..KWWK',
    'KCBK..KCBK',
    '..........',
    '...WWWW...',
    '....WW....',
  ], { K: PAL.INK, W: PAL.WHITE, C: PAL.CYAN_BRIGHT, B: PAL.INK }, 'C');
  headG.fillBox(3, 11, 3, 14, 16, 14, PAL.HAIR_DARK);
  headG.fillBox(3, 5, 3, 14, 12, 7, PAL.HAIR_DARK);
  headG.fillBox(3, 6, 7, 4, 11, 11, PAL.HAIR_DARK);
  headG.fillBox(13, 6, 7, 14, 11, 11, PAL.HAIR_DARK);
  headG.fillBox(4, 15, 5, 7, 19, 10, PAL.HAIR_DARK);
  headG.fillBox(8, 15, 4, 12, 19, 9, PAL.HAIR_DARK);
  headG.fillBox(11, 14, 8, 15, 18, 13, PAL.HAIR_DARK);
  headG.fillBox(3, 13, 10, 6, 17, 15, PAL.HAIR_DARK);
  headG.fillBox(6, 12, 12, 10, 17, 16, PAL.CYAN);
  headG.fillBox(7, 14, 15, 9, 16, 17, PAL.CYAN_BRIGHT, true);
  headG.fillBox(7, 15, 2, 10, 18, 4, PAL.CYAN_BRIGHT, true);
  headG.fillBox(1, 5, 6, 3, 11, 11, PAL.ORANGE);
  headG.fillBox(14, 5, 6, 16, 11, 11, PAL.ORANGE);
  headG.fillBox(0, 6, 7, 1, 10, 10, PAL.CYAN_BRIGHT, true);
  headG.fillBox(16, 6, 7, 17, 10, 10, PAL.CYAN_BRIGHT, true);
  headG.fillBox(2, 15, 8, 15, 17, 10, PAL.ORANGE_BRIGHT);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 14.5 * vs, 0);
  headPivot.add(headG.createMeshGroup({ pivotMode: 'bottom-center', outlineThickness: 0.024 }));
  torsoPivot.add(headPivot);

  // --- LEFT ARM: 2-SEGMENT ARTICULATED (Shoulder/Upper Arm + Elbow/Forearm & Glove!) ---
  const leftUpperG = new VoxelGrid(7, 9, 7, vs);
  leftUpperG.fillBox(1, 2, 1, 5, 8, 5, PAL.ORANGE);      // Cropped jacket sleeve
  leftUpperG.fillBox(1, 1, 1, 5, 2, 5, PAL.WHITE);       // Sleeve cuff
  leftUpperG.fillBox(2, 0, 2, 4, 1, 4, PAL.SKIN_SHADE);  // Elbow joint ball
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(7.4 * vs, 12.2 * vs, 0);
  leftArmPivot.add(leftUpperG.createMeshGroup({ customPivot: [3.5, 7.5, 3.5], outlineThickness: 0.021 }));
  torsoPivot.add(leftArmPivot);

  const leftForeG = new VoxelGrid(7, 9, 7, vs);
  leftForeG.fillBox(2, 4, 2, 4, 8, 4, PAL.SKIN);         // Exposed muscular forearm
  leftForeG.fillBox(1, 3, 1, 5, 4, 5, PAL.CYAN_BRIGHT, true); // Neon wristband
  leftForeG.fillBox(1, 0, 1, 5, 3, 5, PAL.INK);          // Fingerless punk glove
  leftForeG.fillBox(2, 1, 5, 4, 2, 5, PAL.YELLOW);       // Knuckle plate
  const leftElbowPivot = new THREE.Group();
  leftElbowPivot.position.set(0, -7.2 * vs, 0);
  leftElbowPivot.add(leftForeG.createMeshGroup({ customPivot: [3.5, 8.0, 3.5], outlineThickness: 0.021 }));
  leftArmPivot.add(leftElbowPivot);

  // --- RIGHT ARM: 2-SEGMENT CYBERNETIC BEAT-GAUNTLET ARM (Shoulder + Elbow + Hand!) ---
  const rightUpperG = new VoxelGrid(7, 9, 7, vs);
  rightUpperG.fillBox(1, 3, 1, 5, 8, 5, PAL.ORANGE);     // Jacket shoulder
  rightUpperG.fillBox(1, 0, 1, 5, 3, 5, PAL.STEEL_DARK); // Cyber bicep & elbow hinge
  rightUpperG.fillBox(2, 1, 5, 4, 2, 5, PAL.YELLOW);
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(-7.4 * vs, 12.2 * vs, 0);
  rightArmPivot.add(rightUpperG.createMeshGroup({ customPivot: [3.5, 7.5, 3.5], outlineThickness: 0.021 }));
  torsoPivot.add(rightArmPivot);

  const rightForeG = new VoxelGrid(8, 10, 8, vs);
  rightForeG.fillBox(1, 3, 1, 6, 9, 6, PAL.STEEL_LIGHT); // Cybernetic forearm chassis
  rightForeG.fillBox(1, 5, 1, 6, 6, 6, PAL.CYAN_BRIGHT, true); // Glowing beat ring!
  rightForeG.fillBox(1, 0, 1, 6, 3, 6, PAL.CHARCOAL);    // Robotic grip hand
  rightForeG.fillBox(2, 1, 6, 5, 2, 6, PAL.ORANGE_BRIGHT, true);
  const rightElbowPivot = new THREE.Group();
  rightElbowPivot.position.set(0, -7.2 * vs, 0);
  rightElbowPivot.add(rightForeG.createMeshGroup({ customPivot: [4, 8.5, 4], outlineThickness: 0.022 }));
  rightArmPivot.add(rightElbowPivot);

  // --- WEAPON HAND MOUNT (Child of rightElbowPivot so KAI's cyber hand grips & drags the Bass!) ---
  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(-0.6 * vs, -7.5 * vs, 0.5 * vs);
  rightElbowPivot.add(weaponPivot);

  const weaponVs = vs * 0.96;
  const weaponMeshes = {
    guitar: buildFlyingVGuitarMesh(weaponVs),
    keytar: buildKeytarMesh(vs * 0.96),
    bass:   buildBassHammerMesh(vs * 0.90),
  };

  // Orient each weapon inside weaponPivot so its broad iconic face shows clearly AND its tail drags cleanly!
  weaponMeshes.guitar.rotation.set(0, 0.55, 0);
  weaponMeshes.keytar.rotation.set(0, 0.55, 0);
  weaponMeshes.bass.rotation.set(Math.PI, 0.35, 0); // Flip Amp-Hammer during drag/carry so heavy speaker head trails!

  // 3D World Marker right at the bottom skid-bumper of the dragged Punk Bass ([0, -37.5*weaponVs, 0])!
  const dragTipMarker = new THREE.Object3D();
  dragTipMarker.position.set(0, -37.5 * weaponVs, 0);
  weaponMeshes.guitar.add(dragTipMarker);

  weaponMeshes.keytar.visible = false;
  weaponMeshes.bass.visible = false;
  weaponPivot.add(weaponMeshes.guitar, weaponMeshes.keytar, weaponMeshes.bass);

  // --- LEFT & RIGHT 3-SEGMENT ARTICULATED LEGS (Hip/Thigh + Knee/Shin + Ankle/Sneaker!) ---
  // Thigh length = 7*vs, Shin length = 7*vs, Sneaker sole height = 4*vs
  const buildArticulatedLeg = () => {
    const hipPivot = new THREE.Group();

    // 1. THIGH (7x8x7) with reinforced knee pad
    const thighG = new VoxelGrid(7, 8, 7, vs);
    thighG.fillBox(1, 1, 1, 5, 7, 5, PAL.DENIM);
    thighG.fillBox(1, 0, 4, 5, 2, 6, PAL.ORANGE); // Punk knee guard!
    thighG.fillBox(2, 1, 6, 4, 1, 6, PAL.YELLOW);
    hipPivot.add(thighG.createMeshGroup({ customPivot: [3.5, 7.2, 3.5], outlineThickness: 0.021 }));

    // 2. KNEE -> SHIN / CALF (7x8x7)
    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -7.0 * vs, 0);
    const shinG = new VoxelGrid(7, 8, 7, vs);
    shinG.fillBox(1, 2, 1, 5, 7, 5, PAL.DENIM_LIGHT);
    shinG.fillBox(1, 0, 1, 5, 2, 5, PAL.WHITE); // High-top ribbed athletic sock!
    kneePivot.add(shinG.createMeshGroup({ customPivot: [3.5, 7.2, 3.5], outlineThickness: 0.021 }));
    hipPivot.add(kneePivot);

    // 3. ANKLE -> OVERSIZED HI-FI HIGH-TOP SNEAKER (8x5x11 — stays flat on floor!)
    const anklePivot = new THREE.Group();
    anklePivot.position.set(0, -7.0 * vs, 0);
    const footG = new VoxelGrid(8, 5, 11, vs);
    footG.fillBox(1, 1, 1, 6, 4, 8, PAL.ORANGE);            // Sneaker upper
    footG.fillBox(1, 0, 0, 6, 1, 10, PAL.WHITE);            // Thick white rubber outsole
    footG.fillBox(2, 1, 8, 5, 2, 10, PAL.WHITE);            // Classic shell toe-cap!
    footG.fillBox(2, 3, 6, 5, 4, 8, PAL.CYAN_BRIGHT, true); // Glowing tongue equalizer!
    footG.fillBox(1, 2, 3, 6, 2, 6, PAL.YELLOW);            // Side lightning stripe
    anklePivot.add(footG.createMeshGroup({ customPivot: [4, 4.0, 3.5], outlineThickness: 0.022 }));
    // Sole contact markers (heel & toe bottom) for 0mm-clipping floor grounding!
    const soleHeel = new THREE.Object3D();
    soleHeel.position.set(0, -4.0 * vs, -3.2 * vs);
    const soleToe = new THREE.Object3D();
    soleToe.position.set(0, -4.0 * vs, 6.2 * vs);
    anklePivot.add(soleHeel, soleToe);
    kneePivot.add(anklePivot);

    return { hipPivot, kneePivot, anklePivot, soleHeel, soleToe };
  };

  const leftLegObj = buildArticulatedLeg();
  leftLegObj.hipPivot.position.set(3.5 * vs, 0, 0);
  const rightLegObj = buildArticulatedLeg();
  rightLegObj.hipPivot.position.set(-3.5 * vs, 0, 0);

  bodyPivot.add(leftLegObj.hipPivot, rightLegObj.hipPivot);

  // --- FLOATING BEAT-DRONE CAT BUDDY "808-VOX" (10x10x10) ---
  const droneG = new VoxelGrid(10, 10, 10, vs * 0.85);
  droneG.fillEllipsoid(4.5, 4.5, 4.5, 4, 3.6, 4, PAL.WHITE);
  droneG.fillBox(1, 7, 4, 3, 9, 6, PAL.ORANGE);
  droneG.fillBox(6, 7, 4, 8, 9, 6, PAL.ORANGE);
  droneG.fillBox(2, 4, 8, 7, 6, 9, PAL.INK);
  droneG.fillBox(3, 5, 9, 3, 5, 9, PAL.CYAN_BRIGHT, true);
  droneG.fillBox(6, 5, 9, 6, 5, 9, PAL.CYAN_BRIGHT, true);
  droneG.fillBox(1, 3, 1, 8, 3, 8, PAL.CYAN_BRIGHT, true);
  const droneMesh = droneG.createMeshGroup({ pivotMode: 'center', outlineThickness: 0.018 });
  droneMesh.position.set(1.55, 2.55, -0.2);
  root.add(droneMesh);

  // --- GROUND-PROJECTED HI-FI RUSH BEAT RING DIRECTLY UNDER KAI! ---
  const beatRingGeo = new THREE.RingGeometry(0.95, 1.22, 32);
  beatRingGeo.rotateX(-Math.PI / 2);
  const beatRingMat = new THREE.MeshBasicMaterial({
    color: PAL.CYAN_BRIGHT,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });
  const beatRing = new THREE.Mesh(beatRingGeo, beatRingMat);
  beatRing.position.y = 0.07;
  root.add(beatRing);

  const pulseRingGeo = new THREE.RingGeometry(1.12, 1.26, 32);
  pulseRingGeo.rotateX(-Math.PI / 2);
  const pulseRingMat = new THREE.MeshBasicMaterial({
    color: PAL.YELLOW,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });
  const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
  pulseRing.position.y = 0.075;
  root.add(pulseRing);

  return {
    root,
    vs,
    parts: {
      body: bodyPivot,
      torso: torsoPivot,
      scarf: scarfPivot,
      scarfTip: scarfTipPivot,
      head: headPivot,
      leftArm: leftArmPivot,
      leftElbow: leftElbowPivot,
      rightArm: rightArmPivot,
      rightElbow: rightElbowPivot,
      weaponPivot,
      weaponMeshes,
      dragTipMarker,
      leftLeg: leftLegObj.hipPivot,
      leftKnee: leftLegObj.kneePivot,
      leftAnkle: leftLegObj.anklePivot,
      rightLeg: rightLegObj.hipPivot,
      rightKnee: rightLegObj.kneePivot,
      rightAnkle: rightLegObj.anklePivot,
      soleMarkers: [leftLegObj.soleHeel, leftLegObj.soleToe, rightLegObj.soleHeel, rightLegObj.soleToe],
      drone: droneMesh,
      beatRing,
      beatRingMat,
      pulseRing,
      pulseRingMat,
    }
  };
}

// =========================================================================
// 2. BOSS: REX-808, THE AMP TITAN (Giant Articulated True-Voxel Mech!)
// =========================================================================
export function buildBossModel() {
  const vs = 0.135;
  const root = new THREE.Group();

  // --- CHEST / AMPLIFIER TORSO CHASSIS (42x34x26) ---
  const torsoG = new VoxelGrid(42, 34, 26, vs);
  torsoG.fillBox(3, 3, 3, 38, 31, 22, PAL.TEAL_ARMOR);
  torsoG.fillBox(5, 0, 5, 36, 5, 20, PAL.CHARCOAL);
  torsoG.fillBox(1, 27, 2, 40, 33, 23, PAL.STEEL_DARK);
  torsoG.fillBox(4, 30, 4, 37, 33, 21, PAL.ORANGE);
  for (let y = 7; y <= 24; y++) {
    const isYel = (y % 4) < 2;
    torsoG.fillBox(2, y, 6, 3, y, 19, isYel ? PAL.YELLOW : PAL.INK);
    torsoG.fillBox(38, y, 6, 39, y, 19, isYel ? PAL.YELLOW : PAL.INK);
  }
  torsoG.clearBox(10, 7, 19, 31, 25, 23);
  torsoG.fillBox(10, 7, 17, 31, 25, 19, PAL.INK);
  torsoG.fillRingZ(20.5, 16, 20, 22, 8.2, 10.2, PAL.STEEL_LIGHT);
  torsoG.fillRingZ(20.5, 16, 22, 23, 7.6, 8.6, PAL.CYAN_BRIGHT, true);
  for (let y = 8; y <= 22; y += 2) {
    const col = y > 18 ? PAL.MAGENTA : (y > 13 ? PAL.YELLOW : PAL.CYAN_BRIGHT);
    torsoG.fillBox(6, y, 22, 8, y, 23, col, true);
    torsoG.fillBox(33, y, 22, 35, y, 23, col, true);
  }
  torsoG.fillCylinderY(11, 14, 33, 1, 2.6, PAL.BRASS);
  torsoG.fillCylinderY(30, 14, 33, 1, 2.6, PAL.BRASS);
  torsoG.fillBox(15, 8, 1, 26, 24, 3, PAL.ORANGE_BRIGHT, true);

  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 20 * vs, 0);
  const torsoMesh = torsoG.createMeshGroup({ pivotMode: 'bottom-center', outlineThickness: 0.045 });
  torsoPivot.add(torsoMesh);

  // Separate pumping Subwoofer Cone inside chest
  const coneG = new VoxelGrid(18, 18, 6, vs);
  coneG.fillCylinderZ(8.5, 8.5, 0, 2, 7.2, PAL.CHARCOAL);
  coneG.fillCylinderZ(8.5, 8.5, 2, 4, 4.6, PAL.STEEL_DARK);
  coneG.fillCylinderZ(8.5, 8.5, 4, 5, 2.6, PAL.ORANGE_BRIGHT, true);
  const coneMesh = coneG.createMeshGroup({ pivotMode: 'center', outlineThickness: 0.03 });
  coneMesh.position.set(0, 16 * vs, 9.2 * vs);
  torsoPivot.add(coneMesh);

  // --- BOSS HEAD WITH ANGRY EQUALIZER LED VISOR (30x24x24) ---
  const headG = new VoxelGrid(30, 24, 24, vs);
  headG.fillBox(3, 2, 3, 26, 20, 20, PAL.CHARCOAL);
  headG.fillBox(2, 16, 2, 27, 21, 21, PAL.TEAL_ARMOR);
  headG.fillBox(6, 20, 5, 23, 22, 18, PAL.ORANGE);
  headG.fillCylinderZ(2, 11, 8, 15, 3.5, PAL.BRASS);
  headG.fillCylinderZ(27, 11, 8, 15, 3.5, PAL.BRASS);
  headG.fillBox(6, 21, 11, 7, 23, 12, PAL.STEEL_LIGHT);
  headG.fillBox(22, 21, 11, 23, 23, 12, PAL.STEEL_LIGHT);
  headG.fillBox(5, 8, 19, 24, 16, 21, PAL.INK);
  headG.stampPixelArtZ(6, 9, 21, 21, [
    'OO............OO',
    'OOOO........OOOO',
    '.OOOOO....OOOOO.',
    '..OOYOO..OOYOO..',
    '...OOO....OOO...',
    '................',
  ], { O: PAL.ORANGE_BRIGHT, Y: PAL.YELLOW }, 'OY');
  for (let x = 6; x <= 23; x++) {
    const c = (x % 4) < 2 ? PAL.YELLOW : PAL.INK;
    headG.fillBox(x, 2, 19, x, 6, 22, c);
  }
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 32 * vs, 0);
  headPivot.add(headG.createMeshGroup({ pivotMode: 'bottom-center', outlineThickness: 0.042 }));
  torsoPivot.add(headPivot);

  const rageVisorG = new VoxelGrid(20, 8, 3, vs);
  rageVisorG.stampPixelArtZ(2, 1, 1, 2, [
    'RR............RR',
    'RRRR........RRRR',
    '.RRRRR....RRRRR.',
    '..RRYRR..RRYRR..',
    '...RRR....RRR...',
  ], { R: PAL.RED_CORE, Y: PAL.YELLOW }, 'RY');
  const rageVisorMesh = rageVisorG.createMeshGroup({ pivotMode: 'center', outline: false });
  rageVisorMesh.position.set(0, 12 * vs, 10.6 * vs);
  rageVisorMesh.visible = false;
  headPivot.add(rageVisorMesh);

  // --- GIANT ARTICULATED SPEAKER FIST ARMS ---
  const buildBossArm = (side) => {
    const armRoot = new THREE.Group();
    armRoot.position.set(side * 25 * vs, 25 * vs, 0);

    const upperG = new VoxelGrid(14, 16, 14, vs);
    upperG.fillBox(2, 2, 2, 11, 14, 11, PAL.STEEL_DARK);
    upperG.fillBox(1, 9, 1, 12, 15, 12, PAL.ORANGE);
    upperG.fillBox(5, 0, 5, 8, 4, 8, PAL.BRASS);
    armRoot.add(upperG.createMeshGroup({ customPivot: [7, 13, 7], outlineThickness: 0.038 }));

    const fistG = new VoxelGrid(22, 22, 22, vs);
    fistG.fillBox(2, 2, 2, 19, 19, 19, PAL.CHARCOAL);
    fistG.fillBox(1, 15, 1, 20, 20, 20, PAL.TEAL_ARMOR);
    for (let x = 2; x <= 19; x++) {
      const c = (x % 4) < 2 ? PAL.YELLOW : PAL.INK;
      fistG.fillBox(x, 14, 1, x, 16, 20, c);
    }
    fistG.fillRingZ(10.5, 8, 19, 21, 3.5, 6.2, PAL.STEEL_LIGHT);
    fistG.fillCylinderZ(10.5, 8, 19, 20, 3.5, PAL.ORANGE_BRIGHT, true);
    for (let k = 0; k < 4; k++) {
      const kx = 3 + k * 4;
      fistG.fillBox(kx, 0, 4, kx + 2, 3, 17, PAL.STEEL_LIGHT);
      fistG.fillBox(kx, 0, 17, kx + 2, 2, 19, PAL.CYAN_BRIGHT, true);
    }
    const fistPivot = new THREE.Group();
    fistPivot.position.set(0, -14 * vs, 2 * vs);
    const fistMesh = fistG.createMeshGroup({ customPivot: [11, 19, 11], outlineThickness: 0.044 });
    fistPivot.add(fistMesh);
    armRoot.add(fistPivot);

    return { armRoot, fistPivot, fistMesh };
  };

  const leftArm = buildBossArm(1);
  const rightArm = buildBossArm(-1);
  torsoPivot.add(leftArm.armRoot, rightArm.armRoot);

  // --- DETACHABLE SHOULDER TURRET PODS ---
  const buildTurretPod = () => {
    const g = new VoxelGrid(16, 16, 16, vs * 0.95);
    g.fillBox(2, 2, 2, 13, 13, 13, PAL.CHARCOAL);
    g.fillBox(1, 11, 1, 14, 14, 14, PAL.ORANGE);
    g.fillBox(1, 1, 1, 14, 4, 14, PAL.TEAL_ARMOR);
    g.fillRingZ(7.5, 7.5, 13, 15, 3, 5.2, PAL.YELLOW);
    g.fillCylinderZ(7.5, 7.5, 13, 15, 2.8, PAL.MAGENTA_BRIGHT, true);
    return g.createMeshGroup({ pivotMode: 'center', outlineThickness: 0.036 });
  };
  const leftPod = buildTurretPod();
  const rightPod = buildTurretPod();
  leftPod.position.set(22 * vs, 39 * vs, -2 * vs);
  rightPod.position.set(-22 * vs, 39 * vs, -2 * vs);

  // --- HEAVY HYDRAULIC MECH LEGS ---
  const buildBossLeg = () => {
    const g = new VoxelGrid(16, 22, 18, vs);
    g.fillBox(3, 10, 4, 12, 21, 13, PAL.STEEL_DARK);
    g.fillBox(2, 8, 3, 13, 12, 14, PAL.ORANGE);
    g.fillBox(4, 3, 5, 11, 9, 12, PAL.CHARCOAL);
    g.fillBox(1, 0, 1, 14, 4, 16, PAL.TEAL_ARMOR);
    g.fillBox(2, 1, 15, 13, 3, 17, PAL.YELLOW);
    return g.createMeshGroup({ customPivot: [8, 21, 9], outlineThickness: 0.042 });
  };
  const leftLeg = buildBossLeg();
  leftLeg.position.set(11 * vs, 21 * vs, 0);
  const rightLeg = buildBossLeg();
  rightLeg.position.set(-11 * vs, 21 * vs, 0);

  root.add(torsoPivot, leftLeg, rightLeg);

  return {
    root,
    parts: {
      torso: torsoPivot,
      cone: coneMesh,
      head: headPivot,
      rageVisor: rageVisorMesh,
      leftArm,
      rightArm,
      leftPod,
      rightPod,
      leftLeg,
      rightLeg,
    }
  };
}

// =========================================================================
// 3. DESTRUCTIBLE TRUE-VOXEL SCENE PROPS (Carvable & Shatterable!)
// =========================================================================

export function createAmpStackGrid() {
  const g = new VoxelGrid(16, 24, 12, 0.11);
  g.fillBox(0, 0, 0, 15, 23, 11, PAL.CHARCOAL);
  g.fillBox(0, 18, 0, 15, 23, 11, PAL.ORANGE);
  g.fillBox(1, 19, 11, 14, 21, 11, PAL.INK);
  g.fillBox(2, 20, 11, 3, 20, 11, PAL.CYAN_BRIGHT, true);
  for (let x = 6; x <= 13; x += 2) g.set(x, 20, 11, PAL.YELLOW, false);
  g.fillBox(1, 1, 10, 14, 16, 11, PAL.INK);
  g.fillRingZ(7.5, 12, 10, 11, 2.2, 3.8, PAL.STEEL_LIGHT);
  g.fillCylinderZ(7.5, 12, 10, 11, 1.5, PAL.ORANGE_BRIGHT, true);
  g.fillRingZ(7.5, 5, 10, 11, 2.2, 3.8, PAL.STEEL_LIGHT);
  g.fillCylinderZ(7.5, 5, 10, 11, 1.5, PAL.CYAN_BRIGHT, true);
  for (const x of [0, 15]) {
    for (const y of [0, 17, 23]) {
      for (const z of [0, 11]) g.set(x, y, z, PAL.STEEL_LIGHT);
    }
  }
  return g;
}

export function createTechCrateGrid() {
  const g = new VoxelGrid(15, 15, 15, 0.115);
  g.fillBox(1, 1, 1, 13, 13, 13, PAL.ORANGE);
  for (let i = 0; i < 15; i++) {
    g.fillBox(i, 0, 0, i, 1, 1, PAL.CHARCOAL);
    g.fillBox(i, 13, 0, i, 14, 1, PAL.CHARCOAL);
    g.fillBox(i, 0, 13, i, 1, 14, PAL.CHARCOAL);
    g.fillBox(i, 13, 13, i, 14, 14, PAL.CHARCOAL);
    g.fillBox(0, i, 0, 1, i, 1, PAL.CHARCOAL);
    g.fillBox(13, i, 0, 14, i, 1, PAL.CHARCOAL);
    g.fillBox(0, i, 13, 1, i, 14, PAL.CHARCOAL);
    g.fillBox(13, i, 13, 14, i, 14, PAL.CHARCOAL);
    g.fillBox(0, 0, i, 1, 1, i, PAL.CHARCOAL);
    g.fillBox(13, 0, i, 14, 1, i, PAL.CHARCOAL);
    g.fillBox(0, 13, i, 1, 14, i, PAL.CHARCOAL);
    g.fillBox(13, 13, i, 14, 14, i, PAL.CHARCOAL);
  }
  for (let d = 3; d <= 11; d++) {
    g.set(d, d, 14, PAL.YELLOW);
    g.set(d, d, 0, PAL.YELLOW);
    g.set(14, d, d, PAL.YELLOW);
    g.set(0, d, d, PAL.YELLOW);
  }
  g.fillBox(6, 6, 14, 8, 8, 14, PAL.CYAN_BRIGHT, true);
  g.fillBox(6, 6, 0, 8, 8, 0, PAL.CYAN_BRIGHT, true);
  g.fillBox(14, 6, 6, 14, 8, 8, PAL.CYAN_BRIGHT, true);
  g.fillBox(0, 6, 6, 0, 8, 8, PAL.CYAN_BRIGHT, true);
  return g;
}

export function createEqualizerPillarGrid() {
  const g = new VoxelGrid(12, 32, 12, 0.12);
  g.fillBox(0, 0, 0, 11, 4, 11, PAL.CHARCOAL);
  for (let x = 0; x < 12; x++) {
    const c = (x % 4) < 2 ? PAL.YELLOW : PAL.INK;
    g.fillBox(x, 1, 0, x, 3, 11, c);
  }
  g.fillBox(1, 4, 1, 10, 29, 10, PAL.TEAL_ARMOR);
  g.fillBox(0, 29, 0, 11, 31, 11, PAL.ORANGE);
  for (let y = 6; y <= 26; y += 3) {
    const col = y > 20 ? PAL.MAGENTA : (y > 14 ? PAL.YELLOW : PAL.CYAN_BRIGHT);
    g.fillBox(4, y, 11, 7, y + 1, 11, col, true);
    g.fillBox(4, y, 0, 7, y + 1, 0, col, true);
    g.fillBox(11, y, 4, 11, y + 1, 7, col, true);
    g.fillBox(0, y, 4, 0, y + 1, 7, col, true);
  }
  return g;
}

export function createMiniAmpPylonGrid() {
  const g = new VoxelGrid(14, 22, 14, 0.11);
  g.fillBox(1, 0, 1, 12, 4, 12, PAL.CHARCOAL);
  g.fillBox(2, 4, 2, 11, 18, 11, PAL.STEEL_DARK);
  for (let y = 6; y <= 16; y += 3) {
    g.fillBox(1, y, 1, 12, y + 1, 12, PAL.MAGENTA_BRIGHT, true);
  }
  g.fillBox(3, 18, 3, 10, 21, 10, PAL.YELLOW, true);
  return g;
}

/** Special Tutorial Soundcheck Dummy Target (Glowing Neon Target Amp!) */
export function createTutorialDummyGrid() {
  const g = new VoxelGrid(16, 22, 14, 0.115);
  g.fillBox(1, 0, 1, 14, 3, 12, PAL.CHARCOAL);
  g.fillBox(2, 3, 2, 13, 19, 11, PAL.CYAN);
  g.fillBox(1, 18, 1, 14, 21, 12, PAL.YELLOW);
  // Bullseye speaker target on front & back
  g.fillRingZ(7.5, 11, 11, 12, 3.2, 4.6, PAL.ORANGE_BRIGHT, true);
  g.fillCylinderZ(7.5, 11, 11, 12, 2.0, PAL.YELLOW, true);
  g.fillRingZ(7.5, 11, 1, 2, 3.2, 4.6, PAL.ORANGE_BRIGHT, true);
  g.fillCylinderZ(7.5, 11, 1, 2, 2.0, PAL.YELLOW, true);
  return g;
}

// =========================================================================
// 4. TRUE-VOXEL PROJECTILES & PICKUPS
// =========================================================================

export function createVinylDiscMesh(isParryable = false) {
  const g = new VoxelGrid(20, 4, 20, 0.095);
  const cx = 9.5, cz = 9.5;
  const edgeCol = isParryable ? PAL.MAGENTA_BRIGHT : PAL.ORANGE_BRIGHT;
  const bodyCol = isParryable ? PAL.MAGENTA : PAL.INK;
  const labelCol = isParryable ? PAL.WHITE : PAL.YELLOW;

  for (let z = 0; z < 20; z++) {
    for (let x = 0; x < 20; x++) {
      const d = Math.hypot(x - cx, z - cz);
      if (d <= 9.2) {
        let col = bodyCol;
        let em = isParryable;
        if (d > 7.6) {
          const ang = Math.atan2(z - cz, x - cx);
          if (Math.sin(ang * 8) > -0.25) { col = edgeCol; em = true; }
          else continue;
        } else if (d < 3.2) {
          col = labelCol; em = true;
        }
        g.set(x, 1, z, col, em);
        g.set(x, 2, z, col, em);
      }
    }
  }
  return g.createMeshGroup({ pivotMode: 'center', outlineThickness: 0.025, castShadow: false });
}

export function createBatteryPickupMesh() {
  const g = new VoxelGrid(10, 14, 10, 0.075);
  g.fillBox(2, 0, 2, 7, 2, 7, PAL.STEEL_LIGHT);
  g.fillBox(1, 2, 1, 8, 11, 8, PAL.GREEN_HEAL, true);
  g.fillBox(3, 11, 3, 6, 13, 6, PAL.YELLOW, true);
  return g.createMeshGroup({ pivotMode: 'center', outlineThickness: 0.02, castShadow: false });
}

/**
 * MOB ENEMY A: BOOM-BOT (Melee Beat-Boxer Voxel Robot!)
 * High-density 16x22x14 true-voxel grunt with glowing angry visor,
 * boxy speaker torso, bouncy feet, and twin swinging cymbal fists!
 */
export function buildBoomBotModel() {
  const vs = 0.085;
  const root = new THREE.Group();

  // Torso/Head chassis (16x16x14)
  const bodyG = new VoxelGrid(16, 16, 14, vs);
  bodyG.fillBox(2, 1, 2, 13, 14, 11, PAL.CHARCOAL);
  bodyG.fillBox(1, 11, 1, 14, 15, 12, PAL.ORANGE); // Top orange helmet hood
  bodyG.fillBox(7, 15, 6, 8, 15, 7, PAL.YELLOW, true); // Antenna bulb
  // Angry glowing LED visor face on +Z
  bodyG.fillBox(3, 7, 11, 12, 11, 12, PAL.INK);
  bodyG.fillBox(4, 9, 12, 6, 10, 12, PAL.RED_CORE, true);
  bodyG.fillBox(9, 9, 12, 11, 10, 12, PAL.RED_CORE, true);
  bodyG.fillBox(6, 8, 12, 9, 8, 12, PAL.YELLOW, true);
  // Chest mini-speaker cone
  bodyG.fillRingZ(7.5, 4, 11, 12, 1.5, 2.7, PAL.STEEL_LIGHT);
  bodyG.fillCylinderZ(7.5, 4, 11, 12, 1.3, PAL.CYAN_BRIGHT, true);
  // Hazard stripe band on back
  for (let x = 2; x <= 13; x++) {
    bodyG.fillBox(x, 3, 1, x, 5, 2, (x % 4) < 2 ? PAL.YELLOW : PAL.INK);
  }
  const bodyPivot = new THREE.Group();
  bodyPivot.position.set(0, 6 * vs, 0);
  bodyPivot.add(bodyG.createMeshGroup({ pivotMode: 'bottom-center', outlineThickness: 0.024 }));
  root.add(bodyPivot);

  // Twin Swinging Punch-Speaker Fists
  const buildFist = () => {
    const fg = new VoxelGrid(7, 9, 8, vs);
    fg.fillBox(1, 1, 1, 5, 8, 6, PAL.STEEL_DARK);
    fg.fillBox(0, 0, 0, 6, 4, 7, PAL.ORANGE);
    fg.fillBox(1, 1, 7, 5, 3, 7, PAL.YELLOW, true);
    return fg.createMeshGroup({ customPivot: [3.5, 8, 4], outlineThickness: 0.022 });
  };
  const leftArm = new THREE.Group();
  leftArm.position.set(8.5 * vs, 10 * vs, 0);
  leftArm.add(buildFist());
  const rightArm = new THREE.Group();
  rightArm.position.set(-8.5 * vs, 10 * vs, 0);
  rightArm.add(buildFist());
  bodyPivot.add(leftArm, rightArm);

  // Stubby Stomping Legs
  const buildLeg = () => {
    const lg = new VoxelGrid(5, 7, 7, vs);
    lg.fillBox(1, 2, 2, 3, 6, 4, PAL.STEEL);
    lg.fillBox(0, 0, 0, 4, 2, 6, PAL.TEAL_ARMOR);
    return lg.createMeshGroup({ customPivot: [2.5, 6, 3.5], outlineThickness: 0.02 });
  };
  const leftLeg = new THREE.Group();
  leftLeg.position.set(3.5 * vs, 6 * vs, 0);
  leftLeg.add(buildLeg());
  const rightLeg = new THREE.Group();
  rightLeg.position.set(-3.5 * vs, 6 * vs, 0);
  rightLeg.add(buildLeg());
  root.add(leftLeg, rightLeg);

  return { root, parts: { body: bodyPivot, leftArm, rightArm, leftLeg, rightLeg } };
}

/**
 * MOB ENEMY B: VINYL-BOT (Hovering Turntable Shooter that fires PINK PARRYABLE Vinyls!)
 * Distinct floating teal & magenta DJ-turret drone with spinning disc crown!
 */
export function buildVinylBotModel() {
  const vs = 0.085;
  const root = new THREE.Group();

  const bodyG = new VoxelGrid(18, 16, 16, vs);
  bodyG.fillBox(3, 3, 3, 14, 12, 12, PAL.TEAL_ARMOR);
  bodyG.fillBox(2, 9, 2, 15, 13, 13, PAL.CHARCOAL);
  // Pink glowing turntable cannon mouth on front (+Z)!
  bodyG.fillRingZ(8.5, 7, 12, 14, 2.2, 4.0, PAL.MAGENTA_BRIGHT, true);
  bodyG.fillCylinderZ(8.5, 7, 12, 13, 2.0, PAL.YELLOW, true);
  // Hover thruster glow underneath
  bodyG.fillBox(6, 0, 6, 11, 2, 11, PAL.CYAN_BRIGHT, true);
  // Side wing fins
  bodyG.fillBox(0, 6, 5, 2, 10, 10, PAL.MAGENTA);
  bodyG.fillBox(15, 6, 5, 17, 10, 10, PAL.MAGENTA);

  const bodyPivot = new THREE.Group();
  bodyPivot.position.set(0, 1.35, 0);
  bodyPivot.add(bodyG.createMeshGroup({ pivotMode: 'center', outlineThickness: 0.024 }));
  root.add(bodyPivot);

  // Spinning Pink Vinyl Crown on top!
  const discCrown = createVinylDiscMesh(true);
  discCrown.scale.setScalar(0.85);
  discCrown.position.set(0, 0.78, 0);
  bodyPivot.add(discCrown);

  return { root, parts: { body: bodyPivot, crown: discCrown } };
}

export function createBackdropTowerMesh(heightVox = 44) {
  const g = new VoxelGrid(20, heightVox, 14, 0.22);
  g.fillBox(1, 0, 1, 18, heightVox - 1, 12, PAL.CHARCOAL);
  g.fillBox(0, heightVox - 6, 0, 19, heightVox - 1, 13, PAL.TEAL_ARMOR);
  for (let cy = 9; cy <= heightVox - 12; cy += 12) {
    g.fillRingZ(9.5, cy, 12, 13, 3.8, 6.2, PAL.STEEL);
    g.fillCylinderZ(9.5, cy, 12, 13, 2.2, PAL.ORANGE, true);
  }
  for (let y = 4; y < heightVox - 6; y += 3) {
    const c = (y % 6 === 0) ? PAL.CYAN_BRIGHT : PAL.YELLOW;
    g.set(0, y, 12, c, true);
    g.set(19, y, 12, c, true);
  }
  return g.createMeshGroup({ pivotMode: 'bottom-center', outline: false, castShadow: false, receiveShadow: false });
}
