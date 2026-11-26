import * as THREE from 'three';
import {
  PAL,
  buildHeroModel,
  buildBossModel,
  createMiniAmpPylonGrid,
  createVinylDiscMesh,
  createBatteryPickupMesh,
} from '../voxel/VoxelModels.js';
import { VoxelParticleSystem } from '../voxel/VoxelParticles.js';
import { DestructibleProp } from '../voxel/DestructibleProp.js';
import {
  buildContinuousWorld,
  WORLD_ZONES,
  STADIUM_CENTER_X,
  STADIUM_CENTER_Z,
  STADIUM_RADIUS,
  BOSS_HOME_X,
  BOSS_HOME_Z,
} from './WorldBuilder.js';
import { MobManager } from './MobManager.js';
import { TRACK_LIST } from '../audio/RhythmAudioEngine.js';

export const WEAPONS = {
  guitar: {
    id: 'guitar',
    name: '重型四弦朋克电贝斯',
    shortName: 'PUNK BASS',
    damageMult: 1.05,
    speedMult: 1.0,
    reachBonus: 0.25,
    voxelPower: 1.15,
    colors: [PAL.ORANGE_BRIGHT, PAL.CYAN_BRIGHT, PAL.YELLOW],
    slashColor: PAL.CYAN_BRIGHT,
  },
  keytar: {
    id: 'keytar',
    name: '雷霆合成器键盘刃',
    shortName: 'KEYTAR',
    damageMult: 0.94,
    speedMult: 1.28,
    reachBonus: 0.75,
    voxelPower: 0.95,
    colors: [PAL.MAGENTA_BRIGHT, PAL.CYAN_BRIGHT, PAL.YELLOW],
    slashColor: PAL.MAGENTA_BRIGHT,
  },
  bass: {
    id: 'bass',
    name: '双核重低音音箱巨锤',
    shortName: 'AMP HAMMER',
    damageMult: 1.35,
    speedMult: 0.84,
    reachBonus: 0.6,
    voxelPower: 1.85,
    colors: [PAL.YELLOW, PAL.ORANGE, PAL.WHITE],
    slashColor: PAL.YELLOW,
  },
};

export const DIFFICULTIES = {
  normal: { id: 'normal', label: 'GROOVE 普通', bossHp: 1400, dmgMult: 0.85 },
  hard:   { id: 'hard',   label: 'ROCKSTAR 摇滚', bossHp: 1750, dmgMult: 1.15 },
  master: { id: 'master', label: 'MASTER 大师', bossHp: 2100, dmgMult: 1.45 },
};

/**
 * VOXEL RUSH — Winding 5-Zone Hi-Fi RUSH Blueprint World + 15-Joint Street-Dance KAI + Cuphead Boss Engine!
 */
export class GameEngine {
  constructor(canvas, audio, hud) {
    this.canvas = canvas;
    this.audio = audio;
    this.hud = hud;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x5ec2ff);
    this.scene.fog = new THREE.Fog(0x8cd7ff, 95, 240);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 280);
    this.camera.position.set(-14, 7.5, 18);

    // Comfortable pulled-back 3rd-person camera settings (Mouse Wheel zoomable + smooth winding-path yaw!)
    this.camDist = 14.2;
    this.camYaw = 0;
    this.manualCamOffset = 0;
    this._dragWorldPos = new THREE.Vector3();

    this._setupLights();

    this.particles = new VoxelParticleSystem(this.scene);
    this.world = buildContinuousWorld(this.scene);
    this.mobs = new MobManager(this.scene);

    this.heroModel = buildHeroModel();
    this.scene.add(this.heroModel.root);

    this.bossModel = buildBossModel();
    this.bossModel.root.scale.setScalar(1.42);
    this.scene.add(this.bossModel.root);
    this.bossModel.parts.torso.add(this.bossModel.parts.leftPod);
    this.bossModel.parts.torso.add(this.bossModel.parts.rightPod);

    this.projectiles = [];
    this.playerProjectiles = [];
    this.shockwaves = [];
    this.telegraphs = [];
    this.lasers = [];
    this.pickups = [];
    this.overdriveBeams = [];

    this.slashArcMesh = this._createSlashArcMesh();
    this.scene.add(this.slashArcMesh);

    this.parryRingMesh = this._createParryRingMesh();
    this.scene.add(this.parryRingMesh);

    this.beatHitRing = new THREE.Mesh(
      new THREE.RingGeometry(1.4, 2.2, 36),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0 })
    );
    this.beatHitRing.visible = false;
    this.beatHitRingTimer = 0;
    this.scene.add(this.beatHitRing);
    this.camRoll = 0;
    this.camFovPunch = 0;

    this.state = 'TITLE';
    this.prePauseState = 'EXPLORE';
    this.difficulty = DIFFICULTIES.normal;
    this.selectedWeapon = 'guitar';

    this.hitStopTimer = 0;
    this.slowMoTimer = 0;
    this.shakeIntensity = 0;
    this.elapsedTime = 0;
    this.beatPulse = 0;
    this.beatCount = 0;
    this.introTimer = 0;
    this.bossDropLanded = false;

    this.progress = {
      zoneIdx: 0,
      zone1Cleared: false,
      zone2BarricadeBroken: false,
      zone3Started: false,
      zone3Wave: 0,
      zone3Cleared: false,
      zone4Reached: false,
      bossTriggered: false,
    };

    this.tutor = {
      active: false,
      lesson: 0,
      step: 0,
      waitTimer: 0,
      bulletTimeMode: null,
      slowMoLeft: 0,
      attackCueTimer: 0,
      vinylSpawned: false,
    };
    this._prevGpButtons = [];

    this.stats = this._createEmptyStats();
    this._resetEntities();
    this.setWeapon('guitar', true);
    this._bindInput();

    this.audio.onBeat((bi) => this._onBeat(bi));
    window.addEventListener('resize', () => this._onResize());
  }

  _createEmptyStats() {
    return {
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfectHits: 0,
      totalActions: 0,
      parries: 0,
      voxelsSmashed: 0,
      mobsDefeated: 0,
      goldenVinyls: 0,
      damageTaken: 0,
      fightTime: 0,
    };
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xdbf4ff, 0x8ea8c2, 1.38);
    this.hemiLight = hemi;
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff9eb, 1.95);
    this.keyLight = sun;
    sun.position.set(22, 38, 28);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 130;
    const d = 38;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0006;
    this.scene.add(sun);
    this.scene.add(sun.target);

    const rimCyan = new THREE.DirectionalLight(0x4dfcff, 0.72);
    this.rimLight = rimCyan;
    rimCyan.position.set(-22, 16, -20);
    this.scene.add(rimCyan);

    const bossLight = new THREE.PointLight(0xff7733, 2.6, 56);
    bossLight.position.set(BOSS_HOME_X, 12, BOSS_HOME_Z);
    this.bossPointLight = bossLight;
    this.scene.add(bossLight);
  }

  _createSlashArcMesh() {
    const geo = new THREE.RingGeometry(1.1, 3.3, 24, 1, -Math.PI * 0.55, Math.PI * 1.1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: PAL.CYAN_BRIGHT, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    const m = new THREE.Mesh(geo, mat);
    m.visible = false;
    return m;
  }

  _createParryRingMesh() {
    const geo = new THREE.TorusGeometry(1.5, 0.13, 8, 24);
    const mat = new THREE.MeshBasicMaterial({ color: PAL.MAGENTA_BRIGHT, transparent: true, opacity: 0 });
    const m = new THREE.Mesh(geo, mat);
    m.visible = false;
    return m;
  }

  setDifficulty(diffId) {
    this.difficulty = DIFFICULTIES[diffId] || DIFFICULTIES.normal;
  }

  cycleJukeboxTrack() {
    const curIdx = TRACK_LIST.findIndex((t) => t.id === this.audio.trackId);
    const next = TRACK_LIST[(curIdx + 1) % TRACK_LIST.length];
    this.audio.setTrack(next.id);
    this.hud.setTrackDisplay(next.label, next.bpm);
    this._spawnWorldPopup(`🎵 ${next.label}`, this.player.pos, '#00f0ff', false);
  }

  setWeapon(weaponId, silent = false) {
    if (!WEAPONS[weaponId]) return;
    this.selectedWeapon = weaponId;
    const wm = this.heroModel.parts.weaponMeshes;
    wm.guitar.visible = (weaponId === 'guitar');
    wm.keytar.visible = (weaponId === 'keytar');
    wm.bass.visible = (weaponId === 'bass');
    this.hud.setActiveWeapon(weaponId);

    if (!silent) {
      this.audio.playWeaponSwap(weaponId);
      const w = WEAPONS[weaponId];
      this.particles.burst(this.player.pos.x, this.player.pos.y + 1.4, this.player.pos.z, {
        count: 20, colors: w.colors, speedMin: 3, speedMax: 10, upBias: 4
      });
      this._spawnWorldPopup(`⚡ ${w.shortName}!`, this.player.pos, '#00f0ff', false);
      this.hud.highlightMove('swap', `[${weaponId === 'guitar' ? '1' : (weaponId === 'keytar' ? '2' : '3')}] ${w.shortName}!`);
      if (this.tutor.active && this.tutor.lesson === 4 && this.tutor.step === 0 && (weaponId === 'keytar' || weaponId === 'bass')) {
        this.tutor.step = 1;
        this.player.reverb = 100;
        this.audio.playTutorialStepClear();
        this._renderTutorPrompt();
      }
    }
  }

  _resetEntities() {
    this.player = {
      pos: new THREE.Vector3(-4.5, 0, 7.5), // Zone 01 Octagonal Fountain Plaza!
      lastSafePos: new THREE.Vector3(-4.5, 0, 7.5),
      vel: new THREE.Vector3(),
      yaw: Math.PI * 0.85,
      hp: 100,
      maxHp: 100,
      reverb: 35,
      onGround: true,
      jumpsLeft: 2,
      invulnTimer: 0,
      dashTimer: 0,
      dashSlashWindow: 0,
      dashCooldown: 0,
      dashDir: new THREE.Vector3(0, 0, -1),
      attackTimer: 0,
      attackDuration: 0.25,
      attackType: 'none',
      rangedCooldown: 0,
      airDunking: false,
      comboStep: 0,
      comboResetTimer: 0,
      parryWindow: 0,
      parryCooldown: 0,
      runCycle: 0,
      moving: false,
      slashTimer: 0,
      // Sonic Rail Grinding & 5-Ring Magnet Chain states!
      grinding: false,
      grindT: 0,
      grindCooldown: 0,
      ringChainActive: false,
      ringChainT: 0,
      ringChainNextIdx: 0,
    };
    this.camYaw = 0;
    this.manualCamOffset = 0;

    const maxHp = this.difficulty.bossHp;
    this.boss = {
      pos: new THREE.Vector3(BOSS_HOME_X, 26, BOSS_HOME_Z),
      vel: new THREE.Vector3(),
      yaw: 0,
      hp: maxHp,
      maxHp: maxHp,
      phase: 1,
      state: 'IDLE',
      stateBeats: 0,
      stateTimer: 0,
      cooldownBeats: 2,
      hitFlash: 0,
      staggerTimer: 0,
      attackIndex: 0,
      activeArm: 'right',
      slamTarget: new THREE.Vector3(STADIUM_CENTER_X, 0, STADIUM_CENTER_Z + 5),
      leapStart: new THREE.Vector3(),
      leapTarget: new THREE.Vector3(),
      leapProgress: 0,
      isLeaping: false,
      patrolDir: 1,
      podsDetached: false,
      podAngle: 0,
      parryClashDoneCount: 0,
      clashWindowTimer: 0,
    };

    this.progress = {
      zoneIdx: 0,
      zone1Cleared: false,
      zone2BarricadeBroken: false,
      zone3Started: false,
      zone3Wave: 0,
      zone3Cleared: false,
      zone4Reached: false,
      bossTriggered: false,
    };

    this.heroModel.root.position.copy(this.player.pos);
    this.heroModel.root.rotation.y = this.player.yaw;
    this.bossModel.root.position.copy(this.boss.pos);
    this.bossModel.root.rotation.y = 0;
    this.bossModel.root.visible = false;
    this.bossModel.parts.rageVisor.visible = false;
    this.bossPointLight.color.setHex(0xff5a1f);
    this.bossPointLight.position.set(BOSS_HOME_X, 12, BOSS_HOME_Z);

    if (this.bossModel.parts.leftPod.parent !== this.bossModel.parts.torso) {
      this.scene.remove(this.bossModel.parts.leftPod);
      this.scene.remove(this.bossModel.parts.rightPod);
      this.bossModel.parts.torso.add(this.bossModel.parts.leftPod);
      this.bossModel.parts.torso.add(this.bossModel.parts.rightPod);
      this.bossModel.parts.leftPod.position.set(22 * 0.135, 39 * 0.135, -2 * 0.135);
      this.bossModel.parts.rightPod.position.set(-22 * 0.135, 39 * 0.135, -2 * 0.135);
      this.bossModel.parts.leftPod.rotation.set(0, 0, 0);
      this.bossModel.parts.rightPod.rotation.set(0, 0, 0);
    }

    this.mobs.clearAll();
    this._clearCombatObjects();
  }

  _clearCombatObjects() {
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
    for (const pp of this.playerProjectiles) this.scene.remove(pp.mesh);
    this.playerProjectiles = [];
    for (const s of this.shockwaves) this.scene.remove(s.mesh);
    this.shockwaves = [];
    for (const t of this.telegraphs) this.scene.remove(t.mesh);
    this.telegraphs = [];
    for (const l of this.lasers) this.scene.remove(l.mesh);
    this.lasers = [];
    for (const pk of this.pickups) this.scene.remove(pk.mesh);
    this.pickups = [];
    for (const b of this.overdriveBeams) this.scene.remove(b.mesh);
    this.overdriveBeams = [];
    for (const tile of this.world.floorTiles) {
      tile.hazardState = 0;
      tile.hazardTimer = 0;
      tile.glowMat.color.setHex(tile.baseColor);
    }
  }

  _rebuildWorld() {
    for (const prop of this.world.props) {
      if (!prop.destroyed) prop.destroy();
    }
    this.world.destroyAllFloors();
    this.scene.remove(this.world.arenaGroup);
    this.world = buildContinuousWorld(this.scene);
  }

  startNewGame({ directToBoss = false } = {}) {
    this._rebuildWorld();
    this.stats = this._createEmptyStats();
    this._resetEntities();
    this.setWeapon(this.selectedWeapon, true);

    if (!this.audio.useCustomTrack) {
      this.audio.setTrack('funkPunk', 122);
      this.hud.setTrackDisplay('🎸 FUNK PUNK (122 BPM)', 122);
    } else {
      this.hud.setTrackDisplay(`🎵 ${this.audio.customTrackName}`, this.audio.bpm);
    }

    this.audio.setPhase(1);
    this.audio.setHype(0);
    this.audio.start();

    this.hud.hideTitle();
    this.hud.hideEndScreen();
    this.hud.hidePause();
    this.hud.setMoveListOpen(false);
    this.hud.showTrackCredit('VOXEL RUSH BAND', 'FUNK PUNK OVERDRIVE', '122 BPM · TRACK 01');

    if (directToBoss) {
      this.tutor.active = false;
      this.tutor.bulletTimeMode = null;
      this.hud.hideInteractivePrompt();
      this.world.gates.zone1.locked = false;
      this.world.gates.zone1.laserGroup.visible = false;
      this.world.gates.zone3.locked = false;
      this.world.gates.zone3.laserGroup.visible = false;
      this.progress.zoneIdx = 4;
      this.progress.zone1Cleared = true;
      this.progress.zone3Cleared = true;
      this.player.pos.set(STADIUM_CENTER_X, 0, STADIUM_CENTER_Z + 14);
      this.player.lastSafePos.copy(this.player.pos);
      this.player.yaw = Math.PI;
      this._triggerZone5BossEntrance();
    } else {
      this.state = 'EXPLORE';
      // Spawn 1 BOOM-BOT right on the open Plaza floor ahead of KAI!
      this.mobs.setBounds({ minX: -12, maxX: 11, minZ: -1.5, maxZ: 12.5 });
      this.mobs.spawnMob('boom', -1.5, 2.5, 160);
      this._startInteractiveTutor();
      this._syncZoneHUD();
    }
  }

  // =========================================================================
  // INTERACTIVE HANDS-ON TUTORIAL (ZONE 01 OCTAGONAL FOUNTAIN PLAZA)
  // =========================================================================
  _startInteractiveTutor() {
    this.tutor = {
      active: true,
      lesson: 0,
      step: 0,
      waitTimer: 0,
      bulletTimeMode: null,
      slowMoLeft: 0,
      attackCueTimer: 0,
      vinylSpawned: false,
    };
    this._renderTutorPrompt();
  }

  _stopInteractiveTutor() {
    this.tutor.active = false;
    this.tutor.bulletTimeMode = null;
    this.hud.hideInteractivePrompt();
  }

  _completeTutorLesson(popupText) {
    this.audio.playTutorialStepClear();
    this.hud.flashSpeedLines('#22f57a');
    this._spawnWorldPopup(popupText, this.player.pos, '#22f57a', true);
    this.tutor.bulletTimeMode = null;
    this.tutor.waitTimer = 0.72;
    this._renderTutorPrompt(true);
  }

  _advanceTutorLesson() {
    this.tutor.lesson++;
    this.tutor.step = 0;
    this.tutor.bulletTimeMode = null;
    this.tutor.attackCueTimer = 1.05;
    this.tutor.vinylSpawned = false;

    if (this.tutor.lesson === 2) {
      if (this.mobs.aliveCount === 0) {
        this.mobs.spawnMob('boom', -1.5, 2.5, 140);
      } else {
        const m = this.mobs.mobs[0];
        m.pos.set(this.player.pos.x + 1.5, 0, Math.max(-1, this.player.pos.z - 3.6));
      }
      this.audio.playBossTelegraph(480);
    } else if (this.tutor.lesson === 3) {
      const vb = this.mobs.spawnMob('vinyl', 4.5, 2.0, 65);
      this.tutor.vinylSpawned = true;
      const origin = new THREE.Vector3(vb.pos.x, 1.35, vb.pos.z);
      const dir = new THREE.Vector3().subVectors(this.player.pos, origin).setY(0).normalize();
      this._spawnVinylProjectile(origin, dir, 9.2, true, vb.id);
      this.audio.playBossTelegraph(680);
    } else if (this.tutor.lesson === 4) {
      if (this.mobs.aliveCount === 0) {
        this.mobs.spawnMob('boom', 2.0, 4.0, 100);
      }
    } else if (this.tutor.lesson >= 5) {
      this._stopInteractiveTutor();
      this.mobs.clearAll();
      this.progress.zone1Cleared = true;
      this._unlockGate(this.world.gates.zone1, '🎉 实战热身通关！沿右侧东南白色阶梯踏上高空跳石 ➡');
      return;
    }
    this._renderTutorPrompt();
  }

  _renderTutorPrompt(justCleared = false) {
    if (!this.tutor.active) return;
    const L = this.tutor.lesson;
    const st = this.tutor.step;

    if (L === 0) {
      const visibleCount = Math.min(4, st + 1);
      const keys = [];
      for (let i = 0; i < visibleCount; i++) {
        keys.push({
          gp: 'X',
          gpClass: 'gp-x',
          action: i === 3 ? '⚡ BEAT HIT 终结!' : `贝斯挥击 第${i + 1}段`,
          kbd: 'J / 左键',
          state: (justCleared || i < st) ? 'done' : 'active',
        });
      }
      this.hud.showInteractivePrompt({
        tag: '教学 1/5 · 拖地贝斯四连',
        title: st === 0 ? '靠近小怪按 X/J 抡起电贝斯' : (st < 3 ? `连按 X/J 衔接 (${st}/4)` : '最后一击 BEAT HIT!'),
        keys,
        sub: '支持键鼠 & 手柄，滚轮可自由缩放视角距离',
      });
    } else if (L === 1) {
      const keys = [
        { gp: 'X', gpClass: 'gp-x', action: '轻击 第1段', kbd: 'J', state: (justCleared || st > 0) ? 'done' : 'active' },
        { gp: 'X', gpClass: 'gp-x', action: '轻击 第2段', kbd: 'J', state: (justCleared || st > 1) ? 'done' : (st === 1 ? 'active' : 'locked') },
        { gp: 'Y', gpClass: 'gp-y', action: '💥 贝斯裂地砸坑', kbd: 'K / 右键', state: justCleared ? 'done' : (st >= 2 ? 'active' : 'locked') },
      ];
      this.hud.showInteractivePrompt({
        tag: '教学 2/5 · 衍生裂地',
        title: st < 2 ? '按 X→X→Y 砸裂地板!' : '按下 Y/K 砸出 3D 大坑!',
        keys,
        sub: '重砸会直接把八角广场地板凿出立体深坑',
      });
    } else if (L === 2) {
      const isSlow = this.tutor.bulletTimeMode === 'dodge';
      this.hud.showInteractivePrompt({
        tag: isSlow ? '⚡ 慢动作 · 极限闪避' : '教学 3/5 · 冲刺闪避',
        title: isSlow ? '⚠ 敌人出拳了！快闪避！' : (justCleared ? '极限闪避成功!! ✓' : '小怪正在蓄力扑击...'),
        keys: [{ gp: 'B', gpClass: 'gp-b', action: '无敌冲刺闪避', kbd: 'SHIFT / L', state: justCleared ? 'done' : 'active' }],
        sub: isSlow ? '动作已放慢，立刻按 B / SHIFT 穿过去！' : '攻击临近时会放慢动作提示你闪避',
        bulletTime: isSlow,
        mode: 'dodge',
      });
    } else if (L === 3) {
      const isSlow = this.tutor.bulletTimeMode === 'parry';
      this.hud.showInteractivePrompt({
        tag: isSlow ? '💖 慢动作 · 粉色弹反' : '教学 4/5 · 粉色弹反',
        title: isSlow ? '💖 粉色唱片来袭！弹反！' : (justCleared ? '粉色弹反秒杀!! ✓' : '炮手发射了粉色唱片...'),
        keys: [{ gp: 'RB', gpClass: 'gp-bumper', action: '弹反粉色攻击', kbd: 'F / E', state: justCleared ? 'done' : 'active' }],
        sub: isSlow ? '动作已放慢，按 RB / F 直接砸回它脸上！' : '所有粉色攻击都可按 RB / F 弹反',
        bulletTime: isSlow,
        mode: 'parry',
      });
    } else if (L === 4) {
      const keys = [
        { gp: '◀▶', gpClass: 'gp-dpad', action: '切换乐器武器', kbd: '2 / 3', state: (justCleared || st > 0) ? 'done' : 'active' },
        { gp: 'RT', gpClass: 'gp-trigger', action: '⚡ 过载激光大招', kbd: 'Q / R', state: justCleared ? 'done' : (st >= 1 ? 'active' : 'locked') },
      ];
      this.hud.showInteractivePrompt({
        tag: '教学 5/5 · 切武器 & 大招',
        title: st === 0 ? '先切换一把新乐器！' : '满能了！释放过载激光！',
        keys,
        sub: st === 0 ? '按 2(键盘刃) 或 3(音箱巨锤)' : '按 RT / Q 清场并开启东南阶梯大门',
      });
    }
  }

  _updateInteractiveTutor(dtReal) {
    if (!this.tutor.active) return;

    if (this.tutor.waitTimer > 0) {
      this.tutor.waitTimer -= dtReal;
      if (this.tutor.waitTimer <= 0) this._advanceTutorLesson();
      return;
    }

    if (this.tutor.bulletTimeMode) {
      this.tutor.slowMoLeft -= dtReal;
      if (this.tutor.slowMoLeft <= 0) {
        this.tutor.bulletTimeMode = null;
        this.tutor.attackCueTimer = 1.4;
        this._renderTutorPrompt();
      }
      return;
    }

    if (this.tutor.lesson === 2) {
      this.tutor.attackCueTimer -= dtReal;
      if (this.mobs.mobs.length > 0) {
        const m = this.mobs.mobs[0];
        m.attackTelegraph = 0.6;
        const dist = Math.hypot(this.player.pos.x - m.pos.x, this.player.pos.z - m.pos.z);
        if (dist < 3.8 || this.tutor.attackCueTimer <= 0) {
          this.tutor.bulletTimeMode = 'dodge';
          this.tutor.slowMoLeft = 2.6;
          this.audio.playBossTelegraph(740);
          this._renderTutorPrompt();
        }
      }
    }

    if (this.tutor.lesson === 3) {
      let activePink = null;
      for (const proj of this.projectiles) {
        if (proj.isParryable && !proj.reflected) {
          activePink = proj;
          const d = Math.hypot(proj.pos.x - this.player.pos.x, proj.pos.z - this.player.pos.z);
          if (d < 5.4 && d > 1.4) {
            this.tutor.bulletTimeMode = 'parry';
            this.tutor.slowMoLeft = 2.6;
            this.audio.playBossTelegraph(860);
            this._renderTutorPrompt();
            break;
          }
        }
      }
      if (!activePink && this.mobs.mobs.length > 0) {
        this.tutor.attackCueTimer -= dtReal;
        if (this.tutor.attackCueTimer <= 0) {
          const vb = this.mobs.mobs[0];
          const origin = new THREE.Vector3(vb.pos.x, 1.35, vb.pos.z);
          const dir = new THREE.Vector3().subVectors(this.player.pos, origin).setY(0).normalize();
          this._spawnVinylProjectile(origin, dir, 9.2, true, vb.id);
          this.tutor.attackCueTimer = 1.8;
        }
      }
    }
  }

  _pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads[0];
    if (!gp) return;

    const pressed = (idx) => Boolean(gp.buttons[idx]?.pressed);
    const justPressed = (idx) => pressed(idx) && !this._prevGpButtons[idx];

    if (this.state === 'EXPLORE' || this.state === 'BOSS_FIGHT') {
      if (justPressed(2)) this._playerLightAttack();
      if (justPressed(3)) this._playerHeavyAttack();
      if (justPressed(0)) this._playerJump();
      if (justPressed(1)) this._playerDash();
      if (justPressed(5)) this._playerParryOrGrapple();
      if (justPressed(4)) this._playerRangedAttack();
      if (justPressed(7) || justPressed(6)) this._playerOverdriveSpecial();
      if (justPressed(14)) this.setWeapon('guitar');
      if (justPressed(12)) this.setWeapon('keytar');
      if (justPressed(15)) this.setWeapon('bass');
      if (gp.axes.length >= 4 && Math.abs(gp.axes[2]) > 0.25) {
        this.manualCamOffset -= gp.axes[2] * 0.035;
      }
    }
    if (justPressed(9)) this.togglePause();

    this._prevGpButtons = gp.buttons.map((b) => Boolean(b.pressed));
  }

  skipToBossStadium() {
    if (this.state !== 'EXPLORE') return;
    this._stopInteractiveTutor();
    this.mobs.clearAll();
    this._clearCombatObjects();
    this.world.gates.zone1.locked = false;
    this.world.gates.zone1.laserGroup.visible = false;
    this.world.gates.zone3.locked = false;
    this.world.gates.zone3.laserGroup.visible = false;
    this.progress.zoneIdx = 4;
    this.progress.zone1Cleared = true;
    this.progress.zone3Cleared = true;
    this.player.grinding = false;
    this.player.ringChainActive = false;
    this.player.pos.set(STADIUM_CENTER_X, 0, STADIUM_CENTER_Z + 14);
    this.player.lastSafePos.copy(this.player.pos);
    this.player.hp = this.player.maxHp;
    this.player.reverb = Math.max(this.player.reverb, 50);
    this._triggerZone5BossEntrance();
  }

  returnToTitle() {
    this.state = 'TITLE';
    this._stopInteractiveTutor();
    this.audio.stop();
    this.mobs.clearAll();
    this.hud.hidePause();
    this.hud.hideEndScreen();
    this.hud.hideZoneTracker();
    this.hud.hideBossIntro();
    this.hud.showTitle();
  }

  togglePause() {
    if (this.state === 'EXPLORE' || this.state === 'BOSS_FIGHT') {
      this.prePauseState = this.state;
      this.state = 'PAUSED';
      this.hud.showPause();
    } else if (this.state === 'PAUSED') {
      this.state = this.prePauseState;
      this.hud.hidePause();
    }
  }

  // =========================================================================
  // WINDING S-CURVE 5-ZONE WORLD PROGRESSION & INTERACTIVE MECHANICS!
  // =========================================================================
  _detectCurrentZoneIdx() {
    const px = this.player.pos.x;
    const pz = this.player.pos.z;
    if (px > 76 && pz < -50) return 4; // Zone 05 Colosseum & Forecourt
    if (px < 12.5 && pz < -26) return 3; // Zone 04 Cargo Sky-Rings (or high summit)
    if (pz < -66 && px < 80) return 3;   // Zone 04 Summit & 5 Cyan Sonic Rings
    if (px >= 12.5 && px <= 46 && pz <= -19 && pz >= -50) return 2; // Zone 03 Vandelay Atrium
    if (px > 18.5 && pz > -38) return 1; // Zone 02 Stepping Stones, Crusher Bridge & Sonic Rail
    return 0; // Zone 01 Octagonal Fountain Plaza
  }

  _updateWorldExplorationTriggers(dt) {
    const px = this.player.pos.x;
    const pz = this.player.pos.z;

    const newZone = this._detectCurrentZoneIdx();
    if (newZone !== this.progress.zoneIdx) {
      this.progress.zoneIdx = newZone;
      this._applyZoneAtmosphere(newZone);
      if (newZone === 1) {
        this.hud.showBanner('ZONE 02 // 液压节拍桥 & 弧形音轨', '二段跳踏过悬浮跳板，看准节拍穿过液压重锤并滑上青色音轨！', '#ff8c2b', 2.5);
      } else if (newZone === 3 && !this.progress.zone4Reached) {
        this.progress.zone4Reached = true;
        this.hud.showBanner('ZONE 04 // 悬空货柜 & 5连音速光环', '跃上彩色集装箱与弹跳浮岛，在山巅穿行 5 道青色光环飞往斗兽场！', '#00e5cc', 2.6);
      }
      this._syncZoneHUD();
    }

    // 1. Collectibles ("808 Golden Vinyls")
    for (const c of this.world.collectibles) {
      if (c.collected) continue;
      c.mesh.rotation.y += dt * 3.2;
      c.mesh.position.y = c.baseY + Math.sin(this.elapsedTime * 4.0 + c.id) * 0.25;
      const d = Math.hypot(px - c.pos.x, this.player.pos.y + 1.0 - c.mesh.position.y, pz - c.pos.z);
      if (d < 2.3) {
        c.collected = true;
        c.mesh.visible = false;
        this.stats.goldenVinyls++;
        this.stats.score += 600;
        this.player.maxHp += 10;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
        this.player.reverb = Math.min(100, this.player.reverb + 25);
        this.audio.playTutorialStepClear();
        this.hud.flashSpeedLines('#ffe600');
        this._spawnWorldPopup(`💿 金唱片 ${this.stats.goldenVinyls}/6 · +10 HP上限!`, c.pos, '#ffe600', true);
        this.particles.burst(c.pos.x, c.baseY, c.pos.z, {
          count: 42, colors: [PAL.YELLOW, PAL.MAGENTA_BRIGHT, PAL.CYAN_BRIGHT, PAL.WHITE], speedMin: 5, speedMax: 15, upBias: 8
        });
      }
    }

    // 2. Beat Jump-Pads (supports elevated islands!)
    for (const pad of this.world.jumpPads) {
      pad.cooldown = Math.max(0, pad.cooldown - dt);
      pad.ring.scale.setScalar(1 + this.beatPulse * 0.16);
      if (
        pad.cooldown <= 0 &&
        Math.hypot(px - pad.x, pz - pad.z) < pad.radius &&
        Math.abs(this.player.pos.y - pad.y) < 1.35
      ) {
        pad.cooldown = 0.7;
        this.player.vel.y = pad.boostY;
        this.player.onGround = false;
        this.player.jumpsLeft = 1;
        this.player.dashDir.set(pad.dirX, 0, pad.dirZ).normalize();
        this.player.dashTimer = 0.28;
        this.audio.playJump();
        this.hud.flashSpeedLines('#00f0ff');
        this._spawnWorldPopup('BEAT BOOST!! ♪', this.player.pos, '#00f0ff', true);
        this.particles.burst(pad.x, pad.y + 0.35, pad.z, {
          count: 28, colors: [PAL.CYAN_BRIGHT, PAL.YELLOW], speedMin: 4, speedMax: 12, upBias: 10
        });
      }
    }

    // 3. Zone 02 Hydraulic Beat-Crusher Piston Hazards!
    for (const cr of this.world.crushers) {
      if (cr.currentHeight < 1.35) {
        if (Math.abs(px - cr.x) < 2.65 && Math.abs(pz - cr.z) < 1.55 && this.player.pos.y < 2.1) {
          this._damagePlayer(12);
          this.player.pos.z += 2.2;
        }
      }
    }

    // 4. Zone 02 Curved Cyan Sonic Grind Rail Auto-Mount!
    if (!this.player.grinding && !this.player.ringChainActive && this.player.grindCooldown <= 0) {
      const railStart = this.world.railCurve.getPoint(0);
      const dStart = Math.hypot(px - railStart.x, pz - railStart.z);
      if (dStart < 2.5 && Math.abs(this.player.pos.y - railStart.y) < 2.2) {
        this._startRailGrind(0.0);
      } else if (!this.player.onGround && px > 42 && px < 70 && pz < -26 && pz > -45) {
        // Also allow mid-air snap onto any part of the curved Sonic Rail!
        for (let s = 0.08; s <= 0.78; s += 0.1) {
          const rp = this.world.railCurve.getPoint(s);
          if (this.player.pos.distanceTo(rp) < 2.2) {
            this._startRailGrind(s);
            break;
          }
        }
      }
    }

    // 5. Zone 04 5-Ring Sonic Sky-Grapple Auto-Trigger when jumping into Ring 1!
    if (!this.player.ringChainActive && !this.player.grinding) {
      const ring1 = this.world.grappleChainPoints[0];
      if (this.player.pos.distanceTo(ring1) < 4.4) {
        this._startSonicRingChain();
      }
    }

    // 6. Zone 1 Clear -> Unlock Gate 1
    if (!this.tutor.active && !this.progress.zone1Cleared && this.mobs.aliveCount === 0) {
      this.progress.zone1Cleared = true;
      this._unlockGate(this.world.gates.zone1, 'GATE 01 UNLOCKED! 沿东南白色阶梯踏上悬浮跳石 ➡');
    }

    // 7. Zone 2 Barricade Wall Smashed!
    if (!this.progress.zone2BarricadeBroken && this.world.barricadeWall.destroyed) {
      this.progress.zone2BarricadeBroken = true;
      this.audio.playTutorialStepClear();
      this.hud.flashSpeedLines('#ffe600');
      this._spawnWorldPopup('BARRICADE SMASHED!! 冲上青色音轨!', new THREE.Vector3(62, 2.5, -22), '#ffe600', true);
      this._syncZoneHUD();
    }

    // 8. Enter Zone 03 Vandelay Atrium -> Trigger CHORUS 02 Multi-Level Battle!
    if (!this.progress.zone3Started && newZone === 2 && px < 42.5) {
      this.progress.zone3Started = true;
      this.progress.zone3Wave = 1;
      if (!this.audio.useCustomTrack) {
        this.audio.setTrack('cyberSynth', 132);
        this.hud.setTrackDisplay('🎹 CYBER SYNTH (132 BPM)', 132);
      }
      this.mobs.setBounds({ minX: 14.5, maxX: 42.5, minZ: -46.0, maxZ: -21.5 });
      this.mobs.spawnMob('boom', 24.0, -30.0, 105, 0);
      this.mobs.spawnMob('boom', 31.0, -34.0, 105, 0);
      // Snipers perched high on the 2nd-Floor L-Shaped Mezzanine (y = 3.6)!
      this.mobs.spawnMob('vinyl', 40.5, -40.5, 70, 3.6);
      this.mobs.spawnMob('vinyl', 24.0, -44.2, 70, 3.6);
      this.hud.flashSpeedLines('#ff2a85');
      this.hud.showBanner('CHORUS 02 // 木格双层中庭战!', '冲上右侧白楼梯近战清剿二楼炮手，或用 [U] 远程音浪轰击！', '#ff2a85', 2.6);
      this._syncZoneHUD();
    }

    if (this.progress.zone3Started && !this.progress.zone3Cleared && this.mobs.aliveCount === 0) {
      if (this.progress.zone3Wave === 1) {
        this.progress.zone3Wave = 2;
        this.audio.playTutorialStepClear();
        this.player.reverb = 100;
        this.mobs.spawnMob('boom', 22.0, -33.0, 115, 0);
        this.mobs.spawnMob('boom', 30.5, -29.0, 115, 0);
        this.mobs.spawnMob('vinyl', 32.0, -44.2, 75, 3.6);
        this.mobs.spawnMob('vinyl', 18.5, -44.2, 70, 3.6);
        this._spawnWorldPopup('WAVE 2/2 — 大招 [Q] 已满能!', this.player.pos, '#ffe600', true);
        this._syncZoneHUD();
      } else {
        this.progress.zone3Cleared = true;
        this.world.unlockShortcutBridge();
        this._unlockGate(this.world.gates.zone3, 'CHORUS 02 肃清！西侧拱门 & 广场捷径木桥已开启 ➡');
      }
    }

    // 9. Enter Zone 05 Circular Amp Titan Colosseum (z < -65.5 near x = 96) -> DROP REX-808!
    if (!this.progress.bossTriggered && px > 78 && pz < -65.5) {
      this._triggerZone5BossEntrance();
    }
  }

  _startRailGrind(initialT = 0) {
    this.player.grinding = true;
    this.player.grindT = initialT;
    this.player.vel.set(0, 0, 0);
    this.player.onGround = false;
    this.player.jumpsLeft = 2;
    this.audio.playDash(true);
    this.hud.flashSpeedLines('#00f0ff');
    this._spawnWorldPopup('⚡ SONIC RAIL GRIND!!', this.player.pos, '#4dfcff', true);
  }

  _startSonicRingChain() {
    this.player.ringChainActive = true;
    this.player.ringChainT = 0;
    this.player.ringChainNextIdx = 0;
    this.player.vel.set(0, 0, 0);
    this.player.invulnTimer = 2.6;
    this.audio.playDash(true);
    this.hud.flashSpeedLines('#4dfcff');
    this._spawnWorldPopup('⚡ 808 SONIC RINGS!! 1/5', this.player.pos, '#4dfcff', true);
  }

  _unlockGate(gate, bannerSub) {
    gate.locked = false;
    gate.laserGroup.visible = false;
    this.audio.playTutorialStepClear();
    this.hud.flashSpeedLines('#22f57a');
    this.hud.showBanner('GATE UNLOCKED!! ➡', bannerSub, '#00e5cc', 2.4);
    this.particles.burst(gate.x, 2.5, gate.z, {
      count: 45, colors: [PAL.CYAN_BRIGHT, PAL.YELLOW, PAL.GREEN_HEAL], speedMin: 5, speedMax: 15, upBias: 6
    });
    this._syncZoneHUD();
  }

  _applyZoneAtmosphere(zoneIdx) {
    const palettes = [
      { sky: 0x5ec2ff, fog: 0x8fd9ff, rim: 0x4dfcff },
      { sky: 0x62beff, fog: 0x95daff, rim: 0xff8c2b },
      { sky: 0x52c4ff, fog: 0x8cdbff, rim: 0xff6bb0 },
      { sky: 0x4db5ff, fog: 0x85d2ff, rim: 0xffe600 },
      { sky: 0x48b0ff, fog: 0x80ccff, rim: 0x00f0ff },
    ];
    const p = palettes[zoneIdx] || palettes[0];
    this.scene.background.setHex(p.sky);
    this.scene.fog.color.setHex(p.fog);
    this.rimLight.color.setHex(p.rim);
  }

  _syncZoneHUD() {
    const z = WORLD_ZONES[this.progress.zoneIdx] || WORLD_ZONES[0];
    let subText = z.objective;
    let progressText = `${this.progress.zoneIdx + 1} / 5`;

    if (this.progress.zoneIdx === 0 && !this.progress.zone1Cleared) {
      progressText = `热身教学`;
    } else if (this.progress.zoneIdx === 0 && this.progress.zone1Cleared) {
      subText = '✅ 八角广场已解锁！向右走下东南白色阶梯踏上悬浮跳石！';
      progressText = '向东 ➡';
    } else if (this.progress.zoneIdx === 2 && this.progress.zone3Started && !this.progress.zone3Cleared) {
      progressText = `WAVE ${this.progress.zone3Wave}/2 · 剩余 ${this.mobs.aliveCount}`;
    } else if (this.progress.zoneIdx === 2 && this.progress.zone3Cleared) {
      subText = '✅ 中庭肃清！穿过西侧拱门踏上悬空集装箱区！';
      progressText = '前进 ➡';
    }

    this.hud.showZoneTracker(
      `${z.code} · ${z.name}`,
      z.enName,
      subText,
      progressText,
      (this.progress.zoneIdx + 1) / 5
    );
  }

  _triggerZone5BossEntrance() {
    this.progress.bossTriggered = true;
    this.progress.zoneIdx = 4;
    this._applyZoneAtmosphere(4);

    this.world.gates.bossBack.locked = true;
    this.world.gates.bossBack.laserGroup.visible = true;

    if (!this.audio.useCustomTrack) {
      this.audio.setTrack('bigBandRock', 136);
      this.hud.setTrackDisplay('🎺 BIG-BAND ROCK (136 BPM)', 136);
    }

    this.state = 'INTRO';
    this.introTimer = 2.1;
    this.bossDropLanded = false;
    this.boss.pos.set(BOSS_HOME_X, 26, BOSS_HOME_Z);
    this.bossModel.root.position.copy(this.boss.pos);
    this.bossModel.root.visible = true;

    this.hud.hideZoneTracker();
    this.hud.setBossHeader('REX-808', '终极音箱泰坦');
    this.hud.showBossIntro('REX-808 // 终极音箱泰坦', `ZONE 05: AMP TITAN COLOSSEUM · ${this.audio.bpm} BPM`);
    this.hud.flashSpeedLines('#ffe600');
    this.audio.playPhaseShift();
  }

  // =========================================================================
  // INPUT HANDLING (Camera Zoom + Orbit + Full Gamepad & Keyboard)
  // =========================================================================
  _bindInput() {
    this.keys = {};
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(code)) {
        e.preventDefault();
      }
      const wasDown = this.keys[code];
      this.keys[code] = true;
      if (wasDown) return;

      if (code === 'Escape') {
        if (this.state === 'EXPLORE' || this.state === 'BOSS_FIGHT' || this.state === 'PAUSED') {
          this.togglePause();
        }
        return;
      }

      if (code === 'KeyH' && (this.state === 'EXPLORE' || this.state === 'BOSS_FIGHT')) {
        this.hud.toggleMoveList();
        return;
      }
      if (code === 'KeyB' && (this.state === 'EXPLORE' || this.state === 'BOSS_FIGHT')) {
        this.hud.toggleBlueprintMap?.();
        return;
      }
      if (code === 'KeyM' && (this.state === 'EXPLORE' || this.state === 'BOSS_FIGHT')) {
        this.cycleJukeboxTrack();
        return;
      }
      if (code === 'Tab' && this.state === 'EXPLORE') {
        this.skipToBossStadium();
        return;
      }

      if (this.state !== 'EXPLORE' && this.state !== 'BOSS_FIGHT') return;

      if (code === 'Digit1') this.setWeapon('guitar');
      else if (code === 'Digit2') this.setWeapon('keytar');
      else if (code === 'Digit3') this.setWeapon('bass');
      else if (code === 'Space') this._playerJump();
      else if (code === 'KeyJ') this._playerLightAttack();
      else if (code === 'KeyK') this._playerHeavyAttack();
      else if (code === 'KeyU' || code === 'KeyI') this._playerRangedAttack();
      else if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyL') this._playerDash();
      else if (code === 'KeyG') this._trySonicGrapple() || this._playerParry();
      else if (code === 'KeyF' || code === 'KeyE') this._playerParryOrGrapple();
      else if (code === 'KeyQ' || code === 'KeyR') this._playerOverdriveSpecial();
    });

    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    // Mouse Wheel Zoom (lets player pull camera even further back or closer smoothly: 9.5m .. 22.0m!)
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camDist = THREE.MathUtils.clamp(this.camDist + Math.sign(e.deltaY) * 1.1, 9.5, 22.0);
    }, { passive: false });

    this.canvas.addEventListener('mousedown', (e) => {
      if (this.state !== 'EXPLORE' && this.state !== 'BOSS_FIGHT') return;
      if (e.button === 0) this._playerLightAttack();
      else if (e.button === 1) { e.preventDefault(); this._playerRangedAttack(); }
      else if (e.button === 2) this._playerHeavyAttack();
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _trySonicGrapple() {
    if (this.state !== 'EXPLORE' || this.player.ringChainActive || this.player.grinding) return false;
    const ring1 = this.world.grappleChainPoints[0];
    if (this.player.pos.distanceTo(ring1) < 14.5) {
      this._startSonicRingChain();
      return true;
    }
    return false;
  }

  _playerParryOrGrapple() {
    if (this._trySonicGrapple()) return;
    this._playerParry();
  }

  // =========================================================================
  // PLAYER RHYTHM-COMBAT & REAL FLOOR CRATERING
  // =========================================================================
  _recordTiming() {
    const t = this.audio.judgeTiming();
    this.stats.totalActions++;
    if (t.grade === 'PERFECT') this.stats.perfectHits++;
    this.hud.flashBeatFeedback(t.grade);
    return t;
  }

  _addCombo(pts = 100) {
    this.stats.combo++;
    if (this.stats.combo > this.stats.maxCombo) this.stats.maxCombo = this.stats.combo;
    this.stats.score += Math.round(pts * (1 + this.stats.combo * 0.08));
    this.player.comboResetTimer = 3.2;

    const rank = this.getStyleRank();
    const hype = rank === 'S+' || rank === 'S' ? 3 : (rank === 'A' ? 2 : (rank === 'B' ? 1 : 0));
    this.audio.setHype(hype);
  }

  getStyleRank() {
    const c = this.stats.combo;
    if (c >= 36) return 'S+';
    if (c >= 24) return 'S';
    if (c >= 15) return 'A';
    if (c >= 9) return 'B';
    if (c >= 4) return 'C';
    return 'D';
  }

  _carveFloorAt(x, z, radius, depth = 2) {
    const removed = this.world.carveFloorAt(x, z, radius, depth, this.particles);
    if (removed > 0) {
      this.stats.voxelsSmashed += removed;
      this.audio.playVoxelShatter(radius >= 2.5);
    }
    return removed;
  }

  _playerJump() {
    if (this.player.grinding) {
      // Trick jump off the Sonic Grind Rail!
      this.player.grinding = false;
      this.player.grindCooldown = 0.55;
      this.player.vel.y = 14.5;
      this.player.jumpsLeft = 1;
      this.audio.playJump();
      this._spawnWorldPopup('RAIL TRICK!! ♪', this.player.pos, '#ffe600', false);
      return;
    }
    if (this.player.ringChainActive || this.player.jumpsLeft <= 0) return;
    this.player.vel.y = this.player.jumpsLeft === 2 ? 14.5 : 12.8;
    this.player.onGround = false;
    this.player.jumpsLeft--;
    this.player.airDunking = false;
    this.audio.playJump();
    this.particles.burst(this.player.pos.x, this.player.pos.y + 0.15, this.player.pos.z, {
      count: 12, colors: [PAL.CYAN_BRIGHT, PAL.YELLOW], speedMin: 2, speedMax: 6, upBias: 1.8, sizeMin: 0.07, sizeMax: 0.14
    });
  }

  _playerDash() {
    if (this.player.dashCooldown > 0 || this.player.grinding || this.player.ringChainActive) return;
    const timing = this._recordTiming();
    const moveDir = this._getMoveInputVector();
    if (moveDir.lengthSq() > 0.01) {
      this.player.dashDir.copy(moveDir).normalize();
      this.player.yaw = Math.atan2(this.player.dashDir.x, this.player.dashDir.z);
    } else {
      this.player.dashDir.set(Math.sin(this.player.yaw), 0, Math.cos(this.player.yaw));
    }

    const onBeat = timing.grade !== 'OFFBEAT';
    this.player.dashTimer = 0.21;
    this.player.dashSlashWindow = 0.42;
    this.player.invulnTimer = Math.max(this.player.invulnTimer, 0.28);
    this.player.dashCooldown = onBeat ? 0.30 : 0.56;
    this.audio.playDash(onBeat);

    if (timing.grade === 'PERFECT') {
      this._spawnWorldPopup('BEAT DASH! ♪', this.player.pos, '#00f0ff');
      this.player.reverb = Math.min(100, this.player.reverb + 5);
    }
    if (this.tutor.active && this.tutor.lesson === 2 && this.tutor.bulletTimeMode === 'dodge') {
      this.player.invulnTimer = 0.85;
      this._completeTutorLesson('⚡ 极限闪避成功!! ✓');
    }
    this.particles.burst(this.player.pos.x, this.player.pos.y + 0.9, this.player.pos.z, {
      count: 18, colors: WEAPONS[this.selectedWeapon].colors, speedMin: 3, speedMax: 9, upBias: 2
    });
  }

  _playerLightAttack() {
    if (this.player.attackTimer > 0.08 || this.player.grinding || this.player.ringChainActive) return;
    const w = WEAPONS[this.selectedWeapon];
    const timing = this._recordTiming();
    this._aimAssistForward();

    if (this.player.dashSlashWindow > 0 && this.player.onGround) {
      this.player.dashSlashWindow = 0;
      this.player.attackType = 'dashRiff';
      this.player.attackDuration = 0.26;
      this.player.attackTimer = 0.26;
      this.player.slashTimer = 0.24;
      this.player.comboStep = 2;
      this.player.comboResetTimer = 1.75;

      const fwdX = Math.sin(this.player.yaw);
      const fwdZ = Math.cos(this.player.yaw);
      this.player.pos.x += fwdX * 1.8;
      this.player.pos.z += fwdZ * 1.8;

      this.audio.playInstrumentAttack(this.selectedWeapon, 4, true, timing.grade);
      this.hud.highlightMove('dashRiff', '[SHIFT] → [J] 冲刺贝斯横扫!!');
      this._showSlashFX(1.55, PAL.CYAN_BRIGHT, 3.6, 28);
      this._performMeleeHitCheck(Math.round(38 * w.damageMult * timing.multiplier), 4.8 + w.reachBonus, true, timing.grade, false, 7, 'DASH RIFF!!');
      return;
    }

    if (!this.player.onGround) {
      this.player.comboStep = (this.player.comboStep % 3) + 1;
      this.player.attackType = 'airSlash';
      this.player.attackDuration = 0.22;
      this.player.attackTimer = 0.22;
      this.player.slashTimer = 0.2;
      this.player.vel.y = Math.max(this.player.vel.y, 5.2);
      this.audio.playInstrumentAttack(this.selectedWeapon, this.player.comboStep, false, timing.grade);
      this.hud.highlightMove('airCombo', `[SPACE] → [J] 空中连斩 ×${this.player.comboStep}!`);
      this._showSlashFX(1.3, w.slashColor, 3.0, 20);
      this._performMeleeHitCheck(Math.round(25 * w.damageMult * timing.multiplier), 4.3 + w.reachBonus, false, timing.grade, false, 8.5, 'AIR RAVE!');
      return;
    }

    this.player.comboStep = (this.player.comboStep % 4) + 1;
    const isBeatHit = this.player.comboStep === 4;
    this.player.attackType = isBeatHit ? 'beatHit' : 'light';
    const dur = (isBeatHit ? 0.34 : 0.22) / w.speedMult;
    this.player.attackTimer = dur;
    this.player.attackDuration = dur;
    this.player.comboResetTimer = 1.75;
    this.player.slashTimer = isBeatHit ? 0.28 : 0.18;

    const fwdX = Math.sin(this.player.yaw);
    const fwdZ = Math.cos(this.player.yaw);
    this.player.pos.x += fwdX * (isBeatHit ? 0.85 : 0.4);
    this.player.pos.z += fwdZ * (isBeatHit ? 0.85 : 0.4);

    this.audio.playInstrumentAttack(this.selectedWeapon, this.player.comboStep, isBeatHit, timing.grade);
    const trail = Array(this.player.comboStep).fill('[J]').join(' → ');
    this.hud.highlightMove('basic4', isBeatHit ? `${trail} ⚡ BEAT HIT!!` : `${trail}`);

    if (isBeatHit) {
      if (this.player.onGround) this.player.vel.y = 5.2;
      this.hud.flashSpeedLines('#ffe600');
      this._triggerBeatHitRing(new THREE.Vector3(this.player.pos.x + fwdX * 2.2, this.player.pos.y + 1.4, this.player.pos.z + fwdZ * 2.2), 0x4dfcff);
      this.camFovPunch = 5.5;
      this.camRoll = (Math.random() < 0.5 ? 1 : -1) * 0.045;
      this._carveFloorAt(this.player.pos.x + fwdX * 2.2, this.player.pos.z + fwdZ * 2.2, 2.1 * Math.sqrt(w.voxelPower), 2);
    }

    this._showSlashFX((isBeatHit ? 1.65 : 1.15) + w.reachBonus * 0.12, isBeatHit ? PAL.YELLOW : w.slashColor, (isBeatHit ? 3.7 : 2.6) + w.reachBonus, isBeatHit ? 38 : 18);
    const dmg = Math.round((isBeatHit ? 58 : 22) * w.damageMult * timing.multiplier);
    const reach = (isBeatHit ? 5.3 : 4.1) + w.reachBonus;
    this._performMeleeHitCheck(dmg, reach, isBeatHit, timing.grade, false, isBeatHit ? 10 : 0);

    if (this.tutor.active && this.tutor.waitTimer <= 0) {
      if (this.tutor.lesson === 0) {
        this.tutor.step++;
        if (this.tutor.step >= 4) this._completeTutorLesson('🎸 电贝斯四连 BEAT HIT!! ✓');
        else this._renderTutorPrompt();
      } else if (this.tutor.lesson === 1 && this.tutor.step < 2) {
        this.tutor.step++;
        this._renderTutorPrompt();
      }
    }
  }

  _playerHeavyAttack() {
    if (this.player.attackTimer > 0.1 || this.player.grinding || this.player.ringChainActive) return;
    const w = WEAPONS[this.selectedWeapon];
    const timing = this._recordTiming();
    this._aimAssistForward();

    if (!this.player.onGround) {
      this.player.attackType = 'airDunk';
      this.player.attackDuration = 0.45;
      this.player.attackTimer = 0.45;
      this.player.airDunking = true;
      this.player.vel.y = -28;
      this.hud.highlightMove('airCombo', '[SPACE] → [K] 空中坠地重劈!!');
      this.audio.playHeavySmash();
      return;
    }

    const isCraterCombo = this.player.comboStep >= 1;
    this.player.attackType = isCraterCombo ? 'craterSlam' : 'heavy';
    const dur = 0.38 / w.speedMult;
    this.player.attackTimer = dur;
    this.player.attackDuration = dur;
    this.player.slashTimer = 0.30;
    this.player.comboStep = 0;

    if (this.player.onGround) this.player.vel.y = isCraterCombo ? 6.8 : 5.5;
    this.audio.playHeavySmash();
    if (this.selectedWeapon === 'bass' || isCraterCombo) {
      this.audio.playInstrumentAttack(this.selectedWeapon, 4, true, timing.grade);
    }

    const fwdX = Math.sin(this.player.yaw);
    const fwdZ = Math.cos(this.player.yaw);
    const impactX = this.player.pos.x + fwdX * 2.4;
    const impactZ = this.player.pos.z + fwdZ * 2.4;

    this._carveFloorAt(impactX, impactZ, (isCraterCombo ? 3.1 : 2.35) * Math.sqrt(w.voxelPower), isCraterCombo ? 3 : 2);
    this.shakeIntensity = Math.max(this.shakeIntensity, isCraterCombo ? 0.65 : 0.42);

    if (isCraterCombo) {
      this.hud.flashSpeedLines('#ff5a1f');
      this.hud.highlightMove('craterSlam', '[J] → [J] → [K] 💥 贝斯裂地重砸!!');
      this._spawnShockwaveRing(new THREE.Vector3(impactX, this.player.pos.y, impactZ), 6.5, PAL.YELLOW, 18, true);
    } else {
      this.hud.highlightMove('craterSlam', '[K] 重砸破地!');
    }

    this._showSlashFX(1.8 + w.reachBonus * 0.18, PAL.ORANGE_BRIGHT, 3.8, 36);
    this.particles.burst(impactX, this.player.pos.y + 0.4, impactZ, { count: isCraterCombo ? 54 : 36, colors: w.colors, speedMin: 5, speedMax: 17, upBias: 10 });

    const dmg = Math.round((isCraterCombo ? 64 : 46) * w.damageMult * timing.multiplier);
    this._performMeleeHitCheck(dmg, (isCraterCombo ? 5.8 : 5.0) + w.reachBonus, true, timing.grade, true, isCraterCombo ? 11.5 : 6.5, isCraterCombo ? 'CRATER SLAM!!' : 'GROUND SMASH!');

    if (this.tutor.active && this.tutor.lesson === 1 && this.tutor.waitTimer <= 0 && this.tutor.step >= 2) {
      this._completeTutorLesson('💥 贝斯裂地砸坑掌握!! ✓');
    }
  }

  _executeAirDunkLanding() {
    const w = WEAPONS[this.selectedWeapon];
    this.player.airDunking = false;
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.8);
    this.hud.flashSpeedLines('#00f0ff');
    this.audio.playBossSlam();
    this._carveFloorAt(this.player.pos.x, this.player.pos.z, 3.45 * Math.sqrt(w.voxelPower), 3);
    this._spawnShockwaveRing(this.player.pos, 7.5, PAL.CYAN_BRIGHT, 20, true);
    this.particles.burst(this.player.pos.x, this.player.pos.y + 0.4, this.player.pos.z, {
      count: 68, colors: [PAL.CYAN_BRIGHT, PAL.YELLOW, PAL.ORANGE, PAL.WHITE], speedMin: 6, speedMax: 19, upBias: 12
    });
    this._performMeleeHitCheck(Math.round(72 * w.damageMult), 6.4 + w.reachBonus, true, 'PERFECT', true, 12.5, 'AIR DUNK CRATER!!');
  }

  _playerRangedAttack() {
    if (this.player.rangedCooldown > 0) return;
    const w = WEAPONS[this.selectedWeapon];
    const timing = this._recordTiming();

    let targetPoint = null;
    if (this.state === 'BOSS_FIGHT' && this.boss.state !== 'DEFEATED') {
      targetPoint = new THREE.Vector3(this.boss.pos.x, this.boss.pos.y + 3.2, this.boss.pos.z);
    } else if (this.mobs.mobs.length > 0) {
      let best = null, bestD = 30;
      for (const m of this.mobs.mobs) {
        const d = this.player.pos.distanceTo(m.pos);
        if (d < bestD) { bestD = d; best = m; }
      }
      if (best) targetPoint = new THREE.Vector3(best.pos.x, best.pos.y + 1.3, best.pos.z);
    }

    const origin = new THREE.Vector3(this.player.pos.x, this.player.pos.y + 1.4, this.player.pos.z);
    let dir;
    if (targetPoint) {
      dir = new THREE.Vector3().subVectors(targetPoint, origin).normalize();
      this.player.yaw = Math.atan2(dir.x, dir.z);
    } else {
      dir = new THREE.Vector3(Math.sin(this.player.yaw), 0, Math.cos(this.player.yaw));
    }

    this.player.attackTimer = 0.16;
    this.player.attackDuration = 0.16;
    this.player.attackType = 'light';
    this.audio.playInstrumentAttack(this.selectedWeapon, 3, timing.grade === 'PERFECT', timing.grade);

    this.particles.burst(origin.x + dir.x * 0.9, origin.y, origin.z + dir.z * 0.9, {
      count: 14, colors: w.colors, speedMin: 3, speedMax: 9, upBias: 2, sizeMin: 0.08, sizeMax: 0.15, lifeMin: 0.2, lifeMax: 0.45
    });

    const spawnVoxelShot = (shotDir, speed, size, dmg, colorHex, explosive = false, homing = false) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        new THREE.MeshBasicMaterial({ color: colorHex })
      );
      mesh.position.copy(origin).addScaledVector(shotDir, 1.0);
      this.scene.add(mesh);
      this.playerProjectiles.push({
        mesh,
        pos: mesh.position.clone(),
        vel: shotDir.clone().multiplyScalar(speed),
        size,
        dmg: Math.round(dmg * timing.multiplier),
        color: colorHex,
        trailColors: w.colors,
        explosive,
        homing,
        life: 1.8,
      });
    };

    if (this.selectedWeapon === 'guitar') {
      this.player.rangedCooldown = 0.26;
      this.hud.highlightMove('ranged', '[U] 🎸 朋克电贝斯三连音浪!');
      [-0.08, 0, 0.08].forEach((ang, idx) => {
        const d = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
        spawnVoxelShot(d, 34, 0.34, 15, idx === 1 ? PAL.YELLOW : PAL.CYAN_BRIGHT, false, false);
      });
    } else if (this.selectedWeapon === 'keytar') {
      this.player.rangedCooldown = 0.30;
      this.hud.highlightMove('ranged', '[U] 🎹 键盘霓虹五连追踪音符!');
      [-0.26, -0.13, 0, 0.13, 0.26].forEach((ang, idx) => {
        const d = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
        spawnVoxelShot(d, 28, 0.28, 12, idx % 2 === 0 ? PAL.MAGENTA_BRIGHT : PAL.CYAN_BRIGHT, false, true);
      });
    } else {
      this.player.rangedCooldown = 0.50;
      this.hud.highlightMove('ranged', '[U] 🔊 音箱巨锤体素爆弹!');
      spawnVoxelShot(dir, 24, 0.72, 46, PAL.ORANGE_BRIGHT, true, false);
    }
  }

  _showSlashFX(scale, colorHex, radius, sparkCount) {
    this.slashArcMesh.visible = true;
    this.slashArcMesh.position.set(this.player.pos.x, this.player.pos.y + 1.15, this.player.pos.z);
    this.slashArcMesh.rotation.y = this.player.yaw - Math.PI / 2;
    this.slashArcMesh.scale.setScalar(scale);
    this.slashArcMesh.material.color.setHex(colorHex);
    this.slashArcMesh.material.opacity = 0.94;
    this.particles.spawnSlashArc(this.player.pos, this.player.yaw, radius, WEAPONS[this.selectedWeapon].colors, sparkCount);
  }

  _playerParry() {
    if (this.player.parryCooldown > 0) return;
    this.player.parryWindow = 0.32;
    this.player.parryCooldown = 0.32;
    this.parryRingMesh.visible = true;
    this.parryRingMesh.material.opacity = 0.96;
    this.parryRingMesh.scale.setScalar(0.85);

    if (this.state === 'BOSS_FIGHT' && this.boss.state === 'PARRY_CLASH' && this.boss.clashWindowTimer > 0) {
      this._handleClashParrySuccess();
      return;
    }

    let parriedAny = false;
    for (const proj of this.projectiles) {
      if (!proj.isParryable || proj.reflected) continue;
      const dist = proj.pos.distanceTo(new THREE.Vector3(this.player.pos.x, proj.pos.y, this.player.pos.z));
      if (dist < 5.2) {
        proj.reflected = true;
        const target = this._findParryReflectTarget(proj);
        proj.vel.copy(target).sub(proj.pos).normalize().multiplyScalar(34);
        proj.life = 2.0;
        parriedAny = true;
        break;
      }
    }

    if (!parriedAny) {
      for (const sw of this.shockwaves) {
        if (sw.parried || sw.friendly) continue;
        const distToOrigin = Math.hypot(this.player.pos.x - sw.origin.x, this.player.pos.z - sw.origin.z);
        if (Math.abs(distToOrigin - sw.radius) < 2.1 && this.player.pos.y < 1.6) {
          sw.parried = true;
          parriedAny = true;
          this.player.invulnTimer = Math.max(this.player.invulnTimer, 0.35);
          break;
        }
      }
    }

    if (parriedAny) {
      this._triggerParrySuccessFeedback();
      if (this.tutor.active && this.tutor.lesson === 3 && this.tutor.bulletTimeMode === 'parry') {
        this._completeTutorLesson('💖 粉色弹反大师!! ✓');
      }
    } else this.audio.playDash(false);
  }

  _findParryReflectTarget(proj) {
    if (this.state === 'EXPLORE' && this.mobs.mobs.length > 0) {
      const shooter = this.mobs.mobs.find((m) => m.id === proj.shooterMobId) || this.mobs.mobs[0];
      return new THREE.Vector3(shooter.pos.x, shooter.pos.y + 1.2, shooter.pos.z);
    }
    return new THREE.Vector3(this.boss.pos.x, this.boss.pos.y + 2.0, this.boss.pos.z);
  }

  _triggerParrySuccessFeedback() {
    this.stats.parries++;
    this.stats.perfectHits++;
    this.stats.totalActions++;
    this._addCombo(350);
    this.player.reverb = Math.min(100, this.player.reverb + 26);
    this.player.invulnTimer = 0.45;
    this.hitStopTimer = 0.085;
    this.shakeIntensity = 0.55;
    this.audio.playParry(1);
    this.hud.flashSpeedLines('#ff2a85');
    this.hud.highlightMove('parry', '[F] 💖 PINK PARRY COUNTER!!');
    this._spawnWorldPopup('PARRY!! ♪', this.player.pos, '#ff2a85', true);
    this.particles.burst(this.player.pos.x, this.player.pos.y + 1.1, this.player.pos.z, {
      count: 42, colors: [PAL.MAGENTA_BRIGHT, PAL.YELLOW, PAL.WHITE, PAL.CYAN_BRIGHT], speedMin: 6, speedMax: 16, upBias: 5
    });
  }

  _handleClashParrySuccess() {
    this.boss.clashWindowTimer = 0;
    this.boss.parryClashDoneCount++;
    this.stats.parries++;
    this.stats.perfectHits++;
    this.stats.totalActions++;
    this._addCombo(450);
    this.player.reverb = Math.min(100, this.player.reverb + 20);
    this.player.invulnTimer = 0.45;
    this.hitStopTimer = 0.095;
    this.shakeIntensity = 0.65;
    this.audio.playParry(this.boss.parryClashDoneCount);
    this.hud.flashSpeedLines('#ff2a85');
    this._spawnWorldPopup(`CLANG! ${this.boss.parryClashDoneCount}/3`, this.player.pos, '#ff2a85', true);
    this.particles.burst(this.player.pos.x, this.player.pos.y + 1.4, this.player.pos.z, {
      count: 46, colors: [PAL.MAGENTA_BRIGHT, PAL.YELLOW, PAL.CYAN_BRIGHT, PAL.WHITE], speedMin: 8, speedMax: 19, upBias: 7
    });

    if (this.boss.parryClashDoneCount >= 3) {
      this.boss.state = 'STAGGERED';
      this.boss.staggerTimer = 5.2;
      this.hud.hideClashPrompt();
      this.hud.showBanner('STAGGERED!!', 'UNLEASH BEAT HITS — 2× DAMAGE!', '#ffe600', 1.7);
      this._damageBoss(110, true, 'STAGGER BREAK!');
    }
  }

  _playerOverdriveSpecial() {
    if (this.player.reverb < 100) return;
    this.player.reverb = 0;
    this.player.invulnTimer = 1.15;
    this.hitStopTimer = 0.12;
    this.shakeIntensity = 0.95;

    let targetPos = this.state === 'BOSS_FIGHT' ? this.boss.pos.clone() : null;
    if (!targetPos && this.mobs.mobs.length > 0) targetPos = this.mobs.mobs[0].pos.clone();
    if (targetPos) {
      const toT = new THREE.Vector3().subVectors(targetPos, this.player.pos);
      if (toT.lengthSq() > 0.01) this.player.yaw = Math.atan2(toT.x, toT.z);
    }

    this.audio.playOverdriveSpecial();
    this.hud.flashSpeedLines('#00f0ff');
    this.hud.highlightMove('overdrive', '[Q] ⚡ OVERDRIVE RIFF!!');
    this.hud.showBanner('OVERDRIVE RIFF!!', `${WEAPONS[this.selectedWeapon].name} MAX SHOCKWAVE!`, '#00f0ff', 1.4);
    this._spawnWorldPopup('OVERDRIVE!! ♪', this.player.pos, '#ffe600', true);

    const dir = new THREE.Vector3(Math.sin(this.player.yaw), 0, Math.cos(this.player.yaw));
    const dist = 20;
    const beamGeo = new THREE.BoxGeometry(3.2, 2.4, dist);
    const beamMat = new THREE.MeshBasicMaterial({ color: WEAPONS[this.selectedWeapon].slashColor, transparent: true, opacity: 0.92 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.copy(this.player.pos).addScaledVector(dir, dist * 0.5).setY(this.player.pos.y + 1.8);
    beam.rotation.y = this.player.yaw;
    this.scene.add(beam);
    this.overdriveBeams.push({ mesh: beam, life: 0.58 });

    for (let s = 3; s <= 15; s += 3.5) {
      this._carveFloorAt(this.player.pos.x + dir.x * s, this.player.pos.z + dir.z * s, 2.2, 2);
    }

    for (const prop of this.world.props) {
      if (prop.destroyed) continue;
      if (prop.basePos.distanceTo(this.player.pos) < 15) {
        const res = prop.takeDamage(130, this.player.pos, this.particles, 16);
        this.stats.voxelsSmashed += res.voxelsRemoved;
      }
    }

    if (this.state === 'EXPLORE') {
      for (const m of [...this.mobs.mobs]) {
        const knock = new THREE.Vector3().subVectors(m.pos, this.player.pos).setY(0).normalize();
        const killed = this.mobs.damageMob(m, 220, knock, 12, this.particles);
        if (killed) {
          this.stats.mobsDefeated++;
          this.stats.voxelsSmashed += 105;
          this._addCombo(250);
        }
      }
      if (this.tutor.active && this.tutor.lesson === 4 && this.tutor.step >= 1) {
        this._completeTutorLesson('⚡ 过载激光终结!! ✓');
      }
      this._syncZoneHUD();
    } else if (this.state === 'BOSS_FIGHT') {
      this._damageBoss(220, true, 'OVERDRIVE +220!');
    }
  }

  _aimAssistForward() {
    const moveDir = this._getMoveInputVector();
    if (moveDir.lengthSq() > 0.05) {
      this.player.yaw = Math.atan2(moveDir.x, moveDir.z);
      return;
    }
    if (this.mobs.mobs.length > 0) {
      let best = null, bestD = 9.5;
      for (const m of this.mobs.mobs) {
        const d = this.player.pos.distanceTo(m.pos);
        if (d < bestD && Math.abs(m.pos.y - this.player.pos.y) < 2.5) { bestD = d; best = m; }
      }
      if (best) {
        this.player.yaw = Math.atan2(best.pos.x - this.player.pos.x, best.pos.z - this.player.pos.z);
        return;
      }
    }
    if (this.state === 'BOSS_FIGHT' && this.player.pos.distanceTo(this.boss.pos) < 10.5) {
      this.player.yaw = Math.atan2(this.boss.pos.x - this.player.pos.x, this.boss.pos.z - this.player.pos.z);
    }
  }

  _performMeleeHitCheck(damage, reach, isBigHit, timingGrade, isHeavy = false, launchUp = 0, customLabel = null) {
    const w = WEAPONS[this.selectedWeapon];
    const hitCenter = new THREE.Vector3(
      this.player.pos.x + Math.sin(this.player.yaw) * (reach * 0.5),
      this.player.pos.y + 1.2,
      this.player.pos.z + Math.cos(this.player.yaw) * (reach * 0.5)
    );

    if (this.mobs.mobs.length > 0) {
      for (const m of [...this.mobs.mobs]) {
        const d = Math.hypot(hitCenter.x - m.pos.x, hitCenter.z - m.pos.z);
        if (d < m.radius + reach * 0.72 && Math.abs(this.player.pos.y - m.pos.y) < 2.6) {
          const knock = new THREE.Vector3().subVectors(m.pos, this.player.pos).setY(0).normalize();
          const effectiveDmg = (this.tutor.active && this.tutor.lesson <= 2) ? Math.min(damage, Math.max(0, m.hp - 25)) : damage;
          const killed = this.mobs.damageMob(m, effectiveDmg, knock, launchUp, this.particles);
          this._addCombo(killed ? 280 : (isBigHit ? 140 : 80));
          this.player.reverb = Math.min(100, this.player.reverb + (killed ? 18 : 8));
          if (isBigHit || killed) {
            this.hitStopTimer = Math.max(this.hitStopTimer, 0.055);
            this.shakeIntensity = Math.max(this.shakeIntensity, 0.35);
          }
          if (killed) {
            this.stats.mobsDefeated++;
            this.stats.voxelsSmashed += 105;
            this.audio.playVoxelShatter(true);
            this._spawnWorldPopup(customLabel || 'VOXEL KO!!', m.pos, '#ffe600', true);
            if (Math.random() < 0.65) this._spawnBatteryPickup(m.pos);
            this._syncZoneHUD();
          } else {
            this._spawnWorldPopup(`${customLabel || (timingGrade === 'PERFECT' ? 'PERFECT!' : 'SMASH!')} ${damage}`, m.pos, isBigHit ? '#ffe600' : '#00f0ff', isBigHit);
          }
        }
      }
    }

    if (this.state === 'BOSS_FIGHT') {
      const bossDist = Math.hypot(hitCenter.x - this.boss.pos.x, hitCenter.z - this.boss.pos.z);
      if (bossDist < 3.9 + reach * 0.45 && this.boss.pos.y < 3.6 && this.boss.state !== 'PHASE_SHIFT' && this.boss.state !== 'DEFEATED') {
        const mult = this.boss.state === 'STAGGERED' ? 2.0 : 1.0;
        const finalDmg = Math.round(damage * mult);
        this._damageBoss(finalDmg, isBigHit, customLabel || (isBigHit ? (isHeavy ? 'CRUSH!' : 'BEAT HIT!!') : (timingGrade === 'PERFECT' ? 'PERFECT! ♪' : 'SMASH!')));
        this._addCombo(isBigHit ? 220 : 90);
        this.player.reverb = Math.min(100, this.player.reverb + (isBigHit ? 12 : 6));
      }
    }

    for (const prop of this.world.props) {
      if (prop.destroyed) continue;
      const d = Math.hypot(hitCenter.x - prop.basePos.x, hitCenter.z - prop.basePos.z);
      if (d < prop.radius + reach * 0.68 && Math.abs(this.player.pos.y - prop.basePos.y) < 2.8) {
        const propDmg = Math.round((isHeavy ? 75 : (isBigHit ? 60 : 30)) * w.voxelPower);
        const res = prop.takeDamage(propDmg, hitCenter, this.particles, (isBigHit ? 14 : 9) * w.voxelPower);
        if (res.voxelsRemoved > 0) {
          this.stats.voxelsSmashed += res.voxelsRemoved;
          this.audio.playVoxelShatter(res.destroyed);
          this.player.reverb = Math.min(100, this.player.reverb + (res.destroyed ? 15 : 4));
          this._addCombo(res.destroyed ? 180 : 40);
          if (res.destroyed) {
            this._spawnWorldPopup(prop.isPylon ? 'PYLON SMASH!' : 'SHATTER!!', prop.basePos, '#ffe600', true);
            this.shakeIntensity = Math.max(this.shakeIntensity, 0.36);
            if (prop.isPylon || Math.random() < 0.6) this._spawnBatteryPickup(prop.basePos);
            if (prop.isPylon && this.state === 'BOSS_FIGHT') this._damageBoss(65, true, 'AMP FEEDBACK!');
          }
        }
      }
    }
  }

  _damageBoss(amount, isBigHit = false, label = 'HIT!') {
    if (this.boss.state === 'DEFEATED') return;
    this.boss.hp = Math.max(0, this.boss.hp - amount);
    this.boss.hitFlash = 0.14;
    if (isBigHit) {
      this.hitStopTimer = Math.max(this.hitStopTimer, 0.065);
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.45);
    }

    const sparkPos = new THREE.Vector3(this.boss.pos.x + (Math.random() - 0.5) * 2.5, 2.2 + Math.random() * 2.2, this.boss.pos.z + 2.4);
    this.particles.burst(sparkPos.x, sparkPos.y, sparkPos.z, {
      count: isBigHit ? 38 : 16,
      colors: isBigHit ? [PAL.YELLOW, PAL.ORANGE, PAL.CYAN_BRIGHT, PAL.WHITE] : [PAL.ORANGE_BRIGHT, PAL.TEAL_ARMOR, PAL.YELLOW],
      speedMin: 5, speedMax: 15, upBias: 6, sizeMin: 0.1, sizeMax: 0.22
    });
    this.stats.voxelsSmashed += isBigHit ? 28 : 10;
    this._spawnWorldPopup(`${label} ${amount}`, sparkPos, isBigHit ? '#ffe600' : '#00f0ff', isBigHit);

    const hpRatio = this.boss.hp / this.boss.maxHp;
    if (this.boss.hp <= 0) this._triggerBossDefeat();
    else if (this.boss.phase === 1 && hpRatio <= 0.66) this._triggerPhaseShift(2);
    else if (this.boss.phase === 2 && hpRatio <= 0.33) this._triggerPhaseShift(3);
  }

  _damagePlayer(amount) {
    if (this.player.invulnTimer > 0) return;
    if (this.state !== 'EXPLORE' && this.state !== 'BOSS_FIGHT') return;

    const scaled = Math.round(amount * (this.state === 'EXPLORE' ? 0.6 : this.difficulty.dmgMult));
    if (this.tutor.active) {
      this.player.hp = Math.max(35, this.player.hp - Math.round(scaled * 0.5));
    } else {
      this.player.hp = Math.max(0, this.player.hp - scaled);
    }
    this.player.invulnTimer = 0.95;
    this.stats.damageTaken += scaled;
    this.stats.combo = 0;
    this.audio.setHype(0);
    this.audio.playPlayerHit();
    this.shakeIntensity = 0.55;
    this.hud.flashDamage();
    this._spawnWorldPopup(`-${scaled} HP!`, this.player.pos, '#ff2233', true);
    this.particles.burst(this.player.pos.x, this.player.pos.y + 1.1, this.player.pos.z, {
      count: 24, colors: [PAL.RED_CORE, PAL.ORANGE, PAL.YELLOW], speedMin: 4, speedMax: 12, upBias: 5
    });

    if (this.player.hp <= 0) {
      this.state = 'DEFEAT';
      this.audio.stop();
      this.hud.hideClashPrompt();
      this.hud.showEndScreen(false, this.stats, this.getStyleRank());
    }
  }

  // =========================================================================
  // ZONE 05 COLOSSEUM 3-PHASE BOSS AI (CENTERED AT x = 96, z = -86!)
  // =========================================================================
  _triggerPhaseShift(newPhase) {
    this.boss.phase = newPhase;
    this.boss.state = 'PHASE_SHIFT';
    this.boss.stateTimer = 2.1;
    this.boss.staggerTimer = 0;
    this.boss.cooldownBeats = 2;
    this.boss.isLeaping = false;
    this.boss.pos.y = 0;
    this._clearCombatObjects();
    this.hud.hideClashPrompt();

    this.audio.setPhase(newPhase);
    this.audio.playPhaseShift();
    this.hud.flashSpeedLines(newPhase === 3 ? '#ff2a85' : '#ff5a1f');
    this.shakeIntensity = 0.9;

    this.particles.burst(this.boss.pos.x, 4.0, this.boss.pos.z, {
      count: 110,
      colors: newPhase === 3 ? [PAL.RED_CORE, PAL.YELLOW, PAL.ORANGE, PAL.MAGENTA_BRIGHT] : [PAL.CYAN_BRIGHT, PAL.ORANGE, PAL.YELLOW, PAL.TEAL_ARMOR],
      speedMin: 7, speedMax: 22, upBias: 12, sizeMin: 0.14, sizeMax: 0.32, lifeMin: 1.0, lifeMax: 2.2
    });

    if (newPhase === 2) {
      this.boss.podsDetached = true;
      const lpWorld = new THREE.Vector3();
      const rpWorld = new THREE.Vector3();
      this.bossModel.parts.leftPod.getWorldPosition(lpWorld);
      this.bossModel.parts.rightPod.getWorldPosition(rpWorld);
      this.bossModel.parts.torso.remove(this.bossModel.parts.leftPod);
      this.bossModel.parts.torso.remove(this.bossModel.parts.rightPod);
      this.scene.add(this.bossModel.parts.leftPod);
      this.scene.add(this.bossModel.parts.rightPod);
      this.bossModel.parts.leftPod.position.copy(lpWorld);
      this.bossModel.parts.rightPod.position.copy(rpWorld);
      this.hud.showBanner('PHASE 2 // TURBO AMP OVERLOAD!', 'TURRET PODS DETACHED — SMASH AMP PYLONS!', '#ff5a1f', 2.2);
    } else if (newPhase === 3) {
      this.bossModel.parts.rageVisor.visible = true;
      this.bossPointLight.color.setHex(PAL.RED_CORE);
      this.hud.showBanner('FINAL PHASE // MELTDOWN ENCORE!', 'GET READY FOR RHYTHM PARRY SHOWDOWN!', '#ff2a85', 2.2);
    }
  }

  _triggerBossDefeat() {
    this.boss.state = 'DEFEATED';
    this.state = 'VICTORY';
    this._clearCombatObjects();
    this.hud.hideClashPrompt();
    this.slowMoTimer = 1.6;
    this.shakeIntensity = 1.4;
    this.audio.playVictory();
    this.hud.flashSpeedLines('#ffe600');
    this.hud.showBanner('KNOCKOUT!!', 'REX-808 DEMOLISHED — TRACK 01 COMPLETE!', '#ffe600', 2.8);

    for (let burst = 0; burst < 4; burst++) {
      this.particles.burst(
        this.boss.pos.x + (Math.random() - 0.5) * 4,
        2.5 + burst * 1.4,
        this.boss.pos.z + (Math.random() - 0.5) * 3,
        {
          count: 140,
          colors: [PAL.TEAL_ARMOR, PAL.ORANGE, PAL.YELLOW, PAL.CYAN_BRIGHT, PAL.CHARCOAL, PAL.MAGENTA_BRIGHT],
          speedMin: 6, speedMax: 24, upBias: 14, sizeMin: 0.14, sizeMax: 0.38, lifeMin: 1.8, lifeMax: 3.2
        }
      );
    }
    this.stats.voxelsSmashed += 560;
    this.stats.score += 5000;

    setTimeout(() => {
      if (this.state === 'VICTORY') {
        const acc = this.stats.totalActions > 0 ? Math.round((this.stats.perfectHits / this.stats.totalActions) * 100) : 100;
        const finalRank = acc >= 60 && this.stats.damageTaken < 60 ? 'S+' : (this.stats.score > 9000 ? 'S' : this.getStyleRank());
        this.hud.showEndScreen(true, this.stats, finalRank);
      }
    }, 2400);
  }

  _onBeat(beatIdx) {
    this.beatCount = beatIdx;
    this.beatPulse = 1.0;

    for (const prop of this.world.props) {
      if (!prop.destroyed) prop.onBeat();
    }
    this.world.neonRingMat.color.setHex(beatIdx % 2 === 0 ? PAL.CYAN_BRIGHT : PAL.YELLOW);

    if (this.state === 'EXPLORE') {
      this.mobs.onBeat(beatIdx, this.player.pos, {
        onTelegraph: (pos, text, col) => {
          this.audio.playBossTelegraph(620);
          this._spawnWorldPopup(text, pos, col, false);
        },
        onFirePinkVinyl: (origin, dir, mobId) => {
          this._spawnVinylProjectile(origin, dir, 10.5, true, mobId);
        },
        onMeleeAttack: (mob) => {
          const d = Math.hypot(this.player.pos.x - mob.pos.x, this.player.pos.z - mob.pos.z);
          this.particles.burst(mob.pos.x, mob.pos.y + 1.0, mob.pos.z, { count: 14, colors: [PAL.ORANGE, PAL.YELLOW], speedMin: 3, speedMax: 8 });
          if (d < 3.1 && Math.abs(this.player.pos.y - mob.pos.y) < 1.8) this._damagePlayer(10);
        }
      });
      return;
    }

    if (this.state === 'BOSS_FIGHT') this._bossOnBeat(beatIdx);
  }

  _bossOnBeat(beatIdx) {
    const b = this.boss;
    if (b.state === 'DEFEATED' || b.state === 'PHASE_SHIFT' || b.state === 'STAGGERED') return;
    if (b.state === 'IDLE') {
      b.cooldownBeats--;
      if (b.cooldownBeats <= 0) this._chooseNextBossAttack();
      return;
    }
    b.stateBeats++;

    if (b.state === 'BOUNCING_LEAP') {
      if (b.stateBeats === 1 || b.stateBeats === 3 || b.stateBeats === 5) {
        b.isLeaping = true;
        b.leapProgress = 0;
        b.leapStart.set(b.pos.x, 0, b.pos.z);
        const dx = this.player.pos.x - STADIUM_CENTER_X;
        const dz = this.player.pos.z - STADIUM_CENTER_Z;
        const r = Math.hypot(dx, dz);
        const clampR = Math.min(r, STADIUM_RADIUS - 5.2);
        const scale = r > 0.01 ? clampR / r : 0;
        b.leapTarget.set(STADIUM_CENTER_X + dx * scale, 0, STADIUM_CENTER_Z + dz * scale);
        this._spawnFloorTelegraph(b.leapTarget, 4.4, 2 * this.audio.beatDuration, PAL.YELLOW);
        this._spawnWorldPopup(b.stateBeats === 1 ? 'TITAN LEAP! 从下方穿行!' : 'BOUNCE!!', new THREE.Vector3(b.pos.x, 6.5, b.pos.z), '#ffe600', false);
        this.audio.playJump();
      } else if (b.stateBeats >= 7) {
        b.isLeaping = false;
        b.pos.y = 0;
        b.state = 'IDLE';
        b.cooldownBeats = 2;
      }
      return;
    }

    if (b.state === 'FIST_SLAM') {
      if (b.stateBeats === 1) {
        b.activeArm = (b.attackIndex % 2 === 0) ? 'right' : 'left';
        b.slamTarget.set(
          THREE.MathUtils.clamp(this.player.pos.x, STADIUM_CENTER_X - 11, STADIUM_CENTER_X + 11),
          0,
          THREE.MathUtils.clamp(this.player.pos.z, STADIUM_CENTER_Z - 3, STADIUM_CENTER_Z + 12)
        );
        this._spawnFloorTelegraph(b.slamTarget, 4.4, 2 * this.audio.beatDuration, PAL.ORANGE);
        this._spawnWorldPopup('BASS SLAM!', new THREE.Vector3(b.pos.x, 6.2, b.pos.z), '#ff8c2b', false);
        this.audio.playBossTelegraph(360);
      } else if (b.stateBeats === 3) {
        this.audio.playBossSlam();
        this.shakeIntensity = 0.78;
        this._carveFloorAt(b.slamTarget.x, b.slamTarget.z, 3.8, 3);
        this._spawnShockwaveRing(b.slamTarget, 18, PAL.CYAN_BRIGHT, 16);
        this.particles.burst(b.slamTarget.x, 0.5, b.slamTarget.z, { count: 55, colors: [PAL.ORANGE, PAL.YELLOW, PAL.CYAN_BRIGHT, PAL.CHARCOAL], speedMin: 6, speedMax: 18, upBias: 9 });
        for (const prop of this.world.props) {
          if (prop.destroyed) continue;
          if (prop.basePos.distanceTo(b.slamTarget) < 5.0) {
            const res = prop.takeDamage(90, b.slamTarget, this.particles, 15);
            this.stats.voxelsSmashed += res.voxelsRemoved;
          }
        }
        if (Math.hypot(this.player.pos.x - b.slamTarget.x, this.player.pos.z - b.slamTarget.z) < 4.2 && this.player.pos.y < 1.8) {
          this._damagePlayer(18);
        }
      } else if (b.stateBeats >= 5) {
        b.state = 'IDLE'; b.cooldownBeats = b.phase === 1 ? 2 : 1;
      }
    } else if (b.state === 'VINYL_VOLLEY') {
      if (b.stateBeats >= 1 && b.stateBeats <= 3) {
        const isParryable = b.stateBeats === 2 || (b.phase >= 2 && b.stateBeats === 3);
        const origin = new THREE.Vector3(b.pos.x, 1.35, b.pos.z + 2.8);
        const baseDir = new THREE.Vector3().subVectors(this.player.pos, origin).setY(0).normalize();
        const spreadCount = b.phase >= 2 ? 3 : 2;
        for (let i = 0; i < spreadCount; i++) {
          const offsetAng = (i - (spreadCount - 1) * 0.5) * 0.28;
          const dir = baseDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), offsetAng);
          const parryThis = isParryable && i === Math.floor(spreadCount / 2);
          this._spawnVinylProjectile(origin, dir, parryThis ? 14.5 : 16.5, parryThis);
        }
        if (isParryable) this._spawnWorldPopup('PINK PARRY! [F]', new THREE.Vector3(b.pos.x, 6.2, b.pos.z), '#ff2a85', false);
        this.audio.playBossTelegraph(isParryable ? 680 : 440);
      } else if (b.stateBeats >= 5) {
        b.state = 'IDLE'; b.cooldownBeats = 2;
      }
    } else if (b.state === 'SWEEP_PUNCH') {
      const sweepZ = STADIUM_CENTER_Z - 1.5;
      if (b.stateBeats === 1) {
        this._spawnFloorTelegraph(new THREE.Vector3(STADIUM_CENTER_X, 0, sweepZ), 8.2, 2 * this.audio.beatDuration, PAL.RED_CORE);
        this._spawnWorldPopup('SWEEP PUNCH!', new THREE.Vector3(b.pos.x, 6.2, b.pos.z), '#ff2233', false);
        this.audio.playBossTelegraph(300);
      } else if (b.stateBeats === 3) {
        this.audio.playBossSlam();
        this.shakeIntensity = 0.55;
        this.particles.burst(STADIUM_CENTER_X, 1.6, sweepZ, { count: 45, colors: [PAL.ORANGE_BRIGHT, PAL.YELLOW], speedMin: 8, speedMax: 18, upBias: 4 });
        if (Math.hypot(this.player.pos.x - STADIUM_CENTER_X, this.player.pos.z - sweepZ) < 8.0 && this.player.pos.y < 2.2) this._damagePlayer(16);
      } else if (b.stateBeats >= 5) {
        b.state = 'IDLE'; b.cooldownBeats = 2;
      }
    } else if (b.state === 'LASER_SWEEP') {
      if (b.stateBeats === 1) {
        this.audio.playBossTelegraph(720);
        this._spawnWorldPopup('LASER SWEEP — JUMP!', new THREE.Vector3(b.pos.x, 6.4, b.pos.z), '#ff2a85', false);
        this._spawnLaserSweep(4 * this.audio.beatDuration);
      } else if (b.stateBeats >= 6) {
        b.state = 'IDLE'; b.cooldownBeats = 2;
      }
    } else if (b.state === 'PYLON_DROP') {
      if (b.stateBeats === 1) {
        this.audio.playBossSlam();
        this.shakeIntensity = 0.5;
        const spots = [
          new THREE.Vector3(STADIUM_CENTER_X - 8.5, 0, STADIUM_CENTER_Z + 2.5),
          new THREE.Vector3(STADIUM_CENTER_X + 8.5, 0, STADIUM_CENTER_Z + 2.5),
        ];
        spots.forEach((sp) => {
          const pylon = new DestructibleProp({
            id: this.world.nextPropId(), type: 'pylon', grid: createMiniAmpPylonGrid(),
            position: sp, hp: 55, radius: 1.25, isPylon: true, scene: this.scene,
          });
          this.world.props.push(pylon);
          this._carveFloorAt(sp.x, sp.z, 2.1, 2);
          this._spawnShockwaveRing(sp, 9, PAL.MAGENTA_BRIGHT, 14);
          this.particles.burst(sp.x, 1.2, sp.z, { count: 32, colors: [PAL.MAGENTA_BRIGHT, PAL.YELLOW], speedMin: 5, speedMax: 14 });
        });
        this._spawnWorldPopup('SMASH THE PYLONS!', new THREE.Vector3(STADIUM_CENTER_X, 3, STADIUM_CENTER_Z + 2.5), '#ff2a85', true);
      } else if (b.stateBeats >= 3) {
        b.state = 'IDLE'; b.cooldownBeats = 2;
      }
    } else if (b.state === 'FLOOR_ERUPTION') {
      if (b.stateBeats === 1) {
        this.audio.playBossTelegraph(560);
        this._spawnWorldPopup('FLOOR MELTDOWN!', new THREE.Vector3(b.pos.x, 6.4, b.pos.z), '#ffe600', false);
        const parity = beatIdx % 2;
        for (const tile of this.world.floorTiles) {
          if (tile.z < STADIUM_CENTER_Z - 4) continue;
          if (Math.abs(tile.gx + tile.gz) % 2 === parity) {
            tile.hazardState = 1;
            tile.glowMat.color.setHex(PAL.YELLOW);
          }
        }
      } else if (b.stateBeats === 3) {
        this.audio.playBossSlam();
        this.shakeIntensity = 0.65;
        let cratersCarved = 0;
        for (const tile of this.world.floorTiles) {
          if (tile.hazardState === 1) {
            tile.hazardState = 2;
            tile.hazardTimer = 0.55;
            tile.glowMat.color.setHex(PAL.RED_CORE);
            if (cratersCarved < 5 && Math.random() < 0.35) {
              this._carveFloorAt(tile.x, tile.z, 1.6, 2);
              cratersCarved++;
            }
            this.particles.burst(tile.x, 0.3, tile.z, { count: 8, colors: [PAL.RED_CORE, PAL.ORANGE, PAL.YELLOW], speedMin: 3, speedMax: 9, upBias: 11, sizeMin: 0.12, sizeMax: 0.24 });
            if (Math.abs(this.player.pos.x - tile.x) < 1.55 && Math.abs(this.player.pos.z - tile.z) < 1.55 && this.player.pos.y < 1.8) {
              this._damagePlayer(15);
            }
          }
        }
      } else if (b.stateBeats >= 5) {
        b.state = 'IDLE'; b.cooldownBeats = 1;
      }
    } else if (b.state === 'NOTE_SPIRAL') {
      if (b.stateBeats >= 1 && b.stateBeats <= 4) {
        const origin = new THREE.Vector3(b.pos.x, 1.35, b.pos.z + 2.5);
        const count = 6;
        for (let i = 0; i < count; i++) {
          const ang = -Math.PI * 0.42 + (i / (count - 1)) * Math.PI * 0.84 + (b.stateBeats % 2) * 0.14;
          const dir = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
          const isParry = (i === 2 && b.stateBeats % 2 === 0) || (i === 3 && b.stateBeats % 2 === 1);
          this._spawnVinylProjectile(origin, dir, 13.5, isParry);
        }
        this.audio.playBossTelegraph(600 + b.stateBeats * 60);
      } else if (b.stateBeats >= 6) {
        b.state = 'IDLE'; b.cooldownBeats = 1;
      }
    } else if (b.state === 'PARRY_CLASH') {
      if (b.stateBeats === 1) {
        b.parryClashDoneCount = 0;
        this.hud.showClashPrompt('RHYTHM PARRY!! PRESS [F] ON EACH BEAT!', 0);
        this.audio.playBossTelegraph(880);
      } else if (b.stateBeats === 3 || b.stateBeats === 5 || b.stateBeats === 7) {
        const stepNum = (b.stateBeats - 1) / 2;
        b.clashWindowTimer = 0.34;
        this.audio.playBossTelegraph(660 + stepNum * 140);
        this.hud.showClashPrompt(`PARRY BEAT ${stepNum}/3 — PRESS [F] NOW!`, stepNum);
        this._spawnShockwaveRing(this.boss.pos, 16, PAL.MAGENTA_BRIGHT, 22);
      } else if (b.stateBeats >= 9) {
        this.hud.hideClashPrompt();
        b.state = 'IDLE'; b.cooldownBeats = 2;
      }
    }
  }

  _chooseNextBossAttack() {
    const b = this.boss;
    const p1Pool = ['BOUNCING_LEAP', 'VINYL_VOLLEY', 'FIST_SLAM', 'SWEEP_PUNCH'];
    const p2Pool = ['BOUNCING_LEAP', 'LASER_SWEEP', 'PYLON_DROP', 'VINYL_VOLLEY', 'FIST_SLAM'];
    const p3Pool = ['PARRY_CLASH', 'BOUNCING_LEAP', 'FLOOR_ERUPTION', 'NOTE_SPIRAL', 'LASER_SWEEP'];
    const pool = b.phase === 3 ? p3Pool : (b.phase === 2 ? p2Pool : p1Pool);
    b.state = pool[b.attackIndex % pool.length];
    b.attackIndex++;
    b.stateBeats = 0;
  }

  _spawnFloorTelegraph(pos, radius, duration, colorHex) {
    const geo = new THREE.RingGeometry(0.4, radius, 28);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, 0.08, pos.z);
    this.scene.add(mesh);
    this.telegraphs.push({ mesh, mat, life: duration, maxLife: duration });
  }

  _spawnShockwaveRing(origin, maxRadius, colorHex, speed = 15, friendly = false) {
    const geo = new THREE.RingGeometry(0.75, 1.35, 36);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(origin.x, (origin.y || 0) + 0.25, origin.z);
    this.scene.add(mesh);
    this.shockwaves.push({ mesh, mat, origin: origin.clone(), radius: 1.0, maxRadius, speed, hitPlayer: false, parried: false, friendly });
  }

  _spawnVinylProjectile(origin, dir, speed, isParryable, shooterMobId = null) {
    const mesh = createVinylDiscMesh(isParryable);
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, pos: origin.clone(), vel: dir.clone().multiplyScalar(speed), isParryable, reflected: false, shooterMobId, life: 4.5 });
  }

  _spawnLaserSweep(duration) {
    const geo = new THREE.BoxGeometry(0.55, 0.55, 28);
    const mat = new THREE.MeshBasicMaterial({ color: PAL.MAGENTA_BRIGHT, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(BOSS_HOME_X, 0.85, BOSS_HOME_Z);
    this.scene.add(mesh);
    this.lasers.push({ mesh, mat, origin: new THREE.Vector3(BOSS_HOME_X, 0.85, BOSS_HOME_Z), angle: -1.1, angSpeed: 1.15, life: duration, maxLife: duration });
  }

  _spawnBatteryPickup(pos) {
    const mesh = createBatteryPickupMesh();
    mesh.position.set(pos.x, (pos.y || 0) + 1.0, pos.z);
    this.scene.add(mesh);
    this.pickups.push({ mesh, pos: new THREE.Vector3(pos.x, (pos.y || 0) + 1.0, pos.z), life: 16.0 });
  }

  _spawnWorldPopup(text, worldPos, color = '#ffe600', big = false) {
    const projected = worldPos.clone();
    projected.y += 1.8;
    projected.project(this.camera);
    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    this.hud.spawnComicPopup(text, x, y, color, big);
  }

  // =========================================================================
  // CAMERA-RELATIVE MOVEMENT & MAIN LOOP
  // =========================================================================
  _getMoveInputVector() {
    let rightIn = 0, fwdIn = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) fwdIn += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) fwdIn -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) rightIn -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) rightIn += 1;

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads[0];
    if (gp && gp.axes.length >= 2) {
      if (Math.abs(gp.axes[0]) > 0.22) rightIn += gp.axes[0];
      if (Math.abs(gp.axes[1]) > 0.22) fwdIn -= gp.axes[1];
    }

    // Project onto current camera horizontal forward & right so turns around the S-curve feel 100% intuitive!
    const yaw = this.state === 'BOSS_FIGHT' ? 0 : this.camYaw;
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    return new THREE.Vector3(
      fwdX * fwdIn + rightX * rightIn,
      0,
      fwdZ * fwdIn + rightZ * rightIn
    );
  }

  update(rawDt) {
    this._pollGamepad();
    const dtClamped = Math.min(rawDt, 0.05);
    if (this.state === 'PAUSED') {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // Optional manual camera orbit keys [Z]/[C] or [,]/[.]
    if (this.keys['KeyZ'] || this.keys['Comma']) this.manualCamOffset += dtClamped * 1.6;
    if (this.keys['KeyC'] || this.keys['Period']) this.manualCamOffset -= dtClamped * 1.6;

    this.elapsedTime += dtClamped;
    this.audio.pollVisualBeat();
    this.beatPulse = Math.max(0, this.beatPulse - dtClamped * 5.0);

    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dtClamped;
      this._updateCamera(dtClamped);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    let dt = dtClamped;
    if (this.tutor.active && this.tutor.bulletTimeMode) {
      dt *= 0.22;
    } else if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dtClamped;
      dt *= 0.28;
    }

    const beatFloat = this.audio.running ? this.audio.getBeatFloat() : (this.elapsedTime * ((this.audio.bpm || 122) / 60));

    if (this.state === 'INTRO') {
      this.introTimer -= dt;
      if (this.boss.pos.y > 0) {
        this.boss.pos.y = Math.max(0, this.boss.pos.y - dt * 44);
        if (this.boss.pos.y === 0 && !this.bossDropLanded) {
          this.bossDropLanded = true;
          this.audio.playBossSlam();
          this.shakeIntensity = 1.25;
          this._carveFloorAt(this.boss.pos.x, this.boss.pos.z, 5.2, 3);
          this._spawnShockwaveRing(this.boss.pos, 20, PAL.ORANGE_BRIGHT, 26, true);
          this.particles.burst(this.boss.pos.x, 1.0, this.boss.pos.z, {
            count: 95, colors: [PAL.ORANGE, PAL.YELLOW, PAL.CYAN_BRIGHT, PAL.CHARCOAL], speedMin: 7, speedMax: 22, upBias: 13
          });
        }
      }
      if (this.introTimer <= 0) {
        this.state = 'BOSS_FIGHT';
        this.hud.hideBossIntro();
      }
    }

    if (this.state === 'EXPLORE') {
      this.stats.fightTime += dt;
      this.world.updatePlatforms(this.elapsedTime, beatFloat);
      this._updateInteractiveTutor(dtClamped);
      this._updatePlayer(dt);
      this._updateWorldExplorationTriggers(dt);
      this.mobs.update(dt, this.player.pos, this.camera, beatFloat);
      this._updateCombatObjects(dt);
    } else if (this.state === 'BOSS_FIGHT') {
      this.stats.fightTime += dt;
      this.world.updatePlatforms(this.elapsedTime, beatFloat);
      this._updatePlayer(dt);
      this._updateBoss(dt);
      this._updateCombatObjects(dt);
    }

    this.keyLight.position.set(this.player.pos.x + 18, 36, this.player.pos.z + 22);
    this.keyLight.target.position.set(this.player.pos.x, 0, this.player.pos.z - 4);

    this._animateHero(dt);
    if (this.bossModel.root.visible) this._animateBoss(dt);
    this._animateWorld(dt);
    this.particles.update(dt);
    this._updateCamera(dt);

    // Contextual world interaction hint near Zone 04 Sonic Grapple Rings!
    const nearGrapple = (
      this.state === 'EXPLORE' &&
      !this.player.ringChainActive &&
      this.player.pos.distanceTo(this.world.grappleChainPoints[0]) < 13.5
    );

    this.hud.update({
      player: this.player,
      boss: this.boss,
      stats: this.stats,
      rank: this.getStyleRank(),
      beatPhase: beatFloat % 1,
      beatPulse: this.beatPulse,
      state: this.state,
      nearGrapple,
    });

    this.renderer.render(this.scene, this.camera);
  }

  _resolveWallsAndGates(p) {
    // 1. Solid architectural walls & fountain curb
    for (const w of this.world.wallColliders) {
      if (p.pos.y >= w.maxY || p.pos.y + 1.8 <= w.minY) continue;
      if (w.r) {
        const dx = p.pos.x - w.x;
        const dz = p.pos.z - w.z;
        const d = Math.hypot(dx, dz);
        if (d < w.r + 0.55 && d > 0.001) {
          p.pos.x = w.x + (dx / d) * (w.r + 0.55);
          p.pos.z = w.z + (dz / d) * (w.r + 0.55);
        }
      } else {
        const hw = w.w * 0.5 + 0.5;
        const hd = w.d * 0.5 + 0.5;
        const dx = p.pos.x - w.x;
        const dz = p.pos.z - w.z;
        if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
          if (hw - Math.abs(dx) < hd - Math.abs(dz)) {
            p.pos.x = w.x + Math.sign(dx || 1) * hw;
          } else {
            p.pos.z = w.z + Math.sign(dz || 1) * hd;
          }
        }
      }
    }

    // 2. Locked Energy Laser Gates
    const g1 = this.world.gates.zone1;
    if (g1.locked && Math.abs(p.pos.z - g1.z) < 3.6 && p.pos.x > g1.x - 0.8 && p.pos.x < g1.x + 2.5) {
      p.pos.x = g1.x - 0.8;
    }
    const g3 = this.world.gates.zone3;
    if (g3.locked && Math.abs(p.pos.z - g3.z) < 3.8 && p.pos.x < g3.x + 0.8 && p.pos.x > g3.x - 2.5) {
      p.pos.x = g3.x + 0.8;
    }
    const gBoss = this.world.gates.bossBack;
    if (gBoss.locked && p.pos.z > gBoss.z - 1.1) {
      p.pos.z = gBoss.z - 1.1;
    }

    // 3. Zone 02 Physical Voxel Barricade Wall (x:62, z:-21.8)
    if (!this.world.barricadeWall.destroyed && p.pos.y < 2.8 && Math.abs(p.pos.x - 62.0) < 3.4) {
      if (p.pos.z < -20.2 && p.pos.z > -23.2) {
        p.pos.z = -20.2;
      }
    }

    // 4. Keep inside Circular Colosseum during Boss Fight!
    if (this.state === 'BOSS_FIGHT') {
      const dx = p.pos.x - STADIUM_CENTER_X;
      const dz = p.pos.z - STADIUM_CENTER_Z;
      const r = Math.hypot(dx, dz);
      if (r > STADIUM_RADIUS - 1.1) {
        const s = (STADIUM_RADIUS - 1.1) / r;
        p.pos.x = STADIUM_CENTER_X + dx * s;
        p.pos.z = STADIUM_CENTER_Z + dz * s;
      }
      if (this.boss.pos.y < 2.8) {
        const dxB = p.pos.x - this.boss.pos.x;
        const dzB = p.pos.z - this.boss.pos.z;
        const distB = Math.hypot(dxB, dzB);
        if (distB < 3.55 && distB > 0.001) {
          p.pos.x = this.boss.pos.x + (dxB / distB) * 3.55;
          p.pos.z = this.boss.pos.z + (dzB / distB) * 3.55;
        }
      }
    }
  }

  _updatePlayer(dt) {
    const p = this.player;
    p.invulnTimer = Math.max(0, p.invulnTimer - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.dashSlashWindow = Math.max(0, p.dashSlashWindow - dt);
    p.attackTimer = Math.max(0, p.attackTimer - dt);
    p.rangedCooldown = Math.max(0, p.rangedCooldown - dt);
    p.parryWindow = Math.max(0, p.parryWindow - dt);
    p.parryCooldown = Math.max(0, p.parryCooldown - dt);
    p.grindCooldown = Math.max(0, p.grindCooldown - dt);

    if (p.comboResetTimer > 0) {
      p.comboResetTimer -= dt;
      if (p.comboResetTimer <= 0) {
        p.comboStep = 0;
        this.stats.combo = 0;
        this.audio.setHype(0);
      }
    }

    // --- SPECIAL MOVEMENT A: CURVED CYAN SONIC GRIND RAIL! ---
    if (p.grinding) {
      p.grindT += dt * 0.44;
      p.moving = true;
      if (p.grindT >= 1.0) {
        p.grinding = false;
        p.grindCooldown = 0.8;
        const endPt = this.world.railCurve.getPoint(1.0);
        p.pos.set(endPt.x - 1.5, 0, endPt.z);
        p.vel.set(-6, 5.5, 0);
        this.stats.score += 300;
        this.audio.playTutorialStepClear();
        this._spawnWorldPopup('🎸 SONIC GRIND CLEAR!! +300', p.pos, '#ffe600', true);
      } else {
        const pt = this.world.railCurve.getPoint(p.grindT);
        const tan = this.world.railCurve.getTangent(p.grindT);
        p.pos.set(pt.x, pt.y + 0.36, pt.z);
        p.yaw = Math.atan2(tan.x, tan.z);
        if (Math.random() < 0.85) {
          this.particles.spawnCube({
            x: p.pos.x + (Math.random() - 0.5) * 0.5,
            y: p.pos.y + 0.1,
            z: p.pos.z + (Math.random() - 0.5) * 0.5,
            vx: -tan.x * 5 + (Math.random() - 0.5) * 4,
            vy: 2 + Math.random() * 4,
            vz: -tan.z * 5 + (Math.random() - 0.5) * 4,
            size: 0.13,
            color: Math.random() < 0.5 ? PAL.CYAN_BRIGHT : PAL.YELLOW,
            life: 0.35,
            gravity: 9,
          });
        }
      }
      return;
    }

    // --- SPECIAL MOVEMENT B: 5-RING SONIC MAGNET SKY-CHAIN! ---
    if (p.ringChainActive) {
      const pts = this.world.grappleChainPoints;
      p.ringChainT += dt * 2.4; // Zips across all 6 segments in ~2.5s!
      const segIdx = Math.min(pts.length - 2, Math.floor(p.ringChainT));
      const segFrac = p.ringChainT - segIdx;

      if (segIdx > p.ringChainNextIdx && segIdx <= 5) {
        p.ringChainNextIdx = segIdx;
        const rPos = pts[segIdx - 1];
        this.audio.playParry(Math.min(3, segIdx));
        this.particles.burst(rPos.x, rPos.y, rPos.z, {
          count: 26, colors: [PAL.CYAN_BRIGHT, PAL.YELLOW, PAL.WHITE], speedMin: 5, speedMax: 14, upBias: 4
        });
        this._spawnWorldPopup(`⚡ RING ${segIdx}/5!`, rPos, '#4dfcff', false);
      }

      if (p.ringChainT >= pts.length - 1) {
        p.ringChainActive = false;
        const finalPt = pts[pts.length - 1];
        p.pos.set(finalPt.x, 0, finalPt.z);
        p.lastSafePos.copy(p.pos);
        p.vel.set(0, 0, 0);
        p.onGround = true;
        this.stats.score += 500;
        this.audio.playTutorialStepClear();
        this.hud.flashSpeedLines('#ffe600');
        this._spawnWorldPopup('🚀 SKY-RINGS COMPLETE!! +500', p.pos, '#ffe600', true);
      } else {
        const a = pts[segIdx];
        const b = pts[segIdx + 1];
        p.pos.lerpVectors(a, b, segFrac);
        p.yaw = Math.atan2(b.x - a.x, b.z - a.z);
        p.moving = true;
        this.particles.spawnCube({
          x: p.pos.x, y: p.pos.y + 0.8, z: p.pos.z,
          vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: (Math.random() - 0.5) * 3,
          size: 0.16, color: PAL.CYAN_BRIGHT, life: 0.3, gravity: 0,
        });
      }
      return;
    }

    // --- STANDARD RUNNING / DASHING / JUMPING OVER SKY ISLANDS ---
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.moving = true;
      p.pos.addScaledVector(p.dashDir, 26 * dt);
      if (Math.random() < 0.7) {
        this.particles.spawnCube({
          x: p.pos.x, y: p.pos.y + 0.9, z: p.pos.z,
          vx: (Math.random() - 0.5) * 2, vy: 1, vz: (Math.random() - 0.5) * 2,
          size: 0.16, color: WEAPONS[this.selectedWeapon].slashColor, life: 0.25, gravity: 0
        });
      }
    } else {
      const move = this._getMoveInputVector();
      const speed = p.attackTimer > 0 ? 5.4 : 13.6;
      if (move.lengthSq() > 0.01) {
        p.moving = true;
        move.normalize();
        p.pos.addScaledVector(move, speed * dt);
        const targetYaw = Math.atan2(move.x, move.z);
        p.yaw = lerpAngle(p.yaw, targetYaw, dt * 15);
        p.runCycle += dt * 14.2;
      } else {
        p.moving = false;
        p.runCycle *= 0.85;
      }
    }

    const prevY = p.pos.y;
    p.vel.y -= 34 * dt;
    p.pos.y += p.vel.y * dt;

    // UNIFIED 3D SURFACE COLLISION + SILKY STAIR STEP-UP!
    let bestY = -999;
    let standingSurf = null;
    if (p.vel.y <= 2.5) {
      for (const s of this.world.surfaces) {
        if (!s.enabled) continue;
        let inside = false;
        if (s.shape === 'circle') {
          inside = Math.hypot(p.pos.x - s.x, p.pos.z - s.z) <= s.r + 0.35;
        } else {
          inside = Math.abs(p.pos.x - s.x) <= s.w * 0.5 + 0.38 && Math.abs(p.pos.z - s.z) <= s.d * 0.5 + 0.38;
        }
        if (inside && prevY >= s.topY - 0.72 && s.topY > bestY) {
          bestY = s.topY;
          standingSurf = s;
        }
      }
    }

    if (standingSurf && p.pos.y <= bestY + 0.06 && p.vel.y <= 0.5) {
      p.pos.y = bestY;
      if (p.airDunking) this._executeAirDunkLanding();
      p.vel.y = 0;
      p.onGround = true;
      p.jumpsLeft = 2;
      if (standingSurf.dx || standingSurf.dy || standingSurf.dz) {
        p.pos.x += standingSurf.dx;
        p.pos.y += standingSurf.dy;
        p.pos.z += standingSurf.dz;
      }
      if (standingSurf.checkpoint) {
        p.lastSafePos.copy(standingSurf.checkpoint);
      }
    } else {
      p.onGround = false;
    }

    // SKY ABYSS 808-VOX DRONE RESCUE! (Real 3D platforming tension without frustrating game-overs!)
    if (p.pos.y < -7.5) {
      this.particles.burst(p.pos.x, p.pos.y + 1.5, p.pos.z, {
        count: 30, colors: [PAL.CYAN_BRIGHT, PAL.YELLOW, PAL.WHITE], speedMin: 4, speedMax: 12, upBias: 8
      });
      p.pos.copy(p.lastSafePos);
      p.pos.y += 1.2;
      p.vel.set(0, 4.5, 0);
      p.onGround = false;
      p.jumpsLeft = 2;
      p.invulnTimer = 1.2;
      p.hp = Math.max(20, p.hp - 5);
      this.audio.playJump();
      this._spawnWorldPopup('🚁 808 无人机救援! (-5 HP)', p.pos, '#4dfcff', true);
    }

    this._resolveWallsAndGates(p);

    if (p.slashTimer > 0) {
      p.slashTimer -= dt;
      this.slashArcMesh.material.opacity = Math.max(0, p.slashTimer * 4.5);
      if (p.slashTimer <= 0) this.slashArcMesh.visible = false;
    }
    if (p.parryWindow > 0) {
      this.parryRingMesh.position.set(p.pos.x, p.pos.y + 1.15, p.pos.z);
      this.parryRingMesh.rotation.y += dt * 12;
      this.parryRingMesh.scale.addScalar(dt * 1.8);
      this.parryRingMesh.material.opacity = p.parryWindow * 3.2;
    } else {
      this.parryRingMesh.visible = false;
    }
  }

  _updateBoss(dt) {
    const b = this.boss;
    b.hitFlash = Math.max(0, b.hitFlash - dt);

    if (b.isLeaping && b.state === 'BOUNCING_LEAP') {
      const leapDur = this.audio.beatDuration * 1.85;
      b.leapProgress += dt / leapDur;
      if (b.leapProgress >= 1) {
        b.leapProgress = 1;
        b.isLeaping = false;
        b.pos.set(b.leapTarget.x, 0, b.leapTarget.z);
        this.audio.playBossSlam();
        this.shakeIntensity = 0.8;
        this._carveFloorAt(b.pos.x, b.pos.z, 3.6, 3);
        this._spawnShockwaveRing(b.pos, 16, PAL.CYAN_BRIGHT, 15);
        this.particles.burst(b.pos.x, 0.6, b.pos.z, {
          count: 55, colors: [PAL.YELLOW, PAL.ORANGE, PAL.CYAN_BRIGHT, PAL.CHARCOAL], speedMin: 6, speedMax: 18, upBias: 10
        });
        if (Math.hypot(this.player.pos.x - b.pos.x, this.player.pos.z - b.pos.z) < 4.0 && this.player.pos.y < 1.8) {
          this._damagePlayer(16);
        }
      } else {
        const t = b.leapProgress;
        b.pos.x = THREE.MathUtils.lerp(b.leapStart.x, b.leapTarget.x, t);
        b.pos.z = THREE.MathUtils.lerp(b.leapStart.z, b.leapTarget.z, t);
        b.pos.y = Math.sin(t * Math.PI) * 10.5;
      }
    } else if (b.state === 'IDLE') {
      b.pos.x += b.patrolDir * (b.phase === 3 ? 5.6 : 3.8) * dt;
      if (Math.abs(b.pos.x - STADIUM_CENTER_X) > 10.5) b.patrolDir *= -1;
      const targetZ = STADIUM_CENTER_Z - 7 + Math.sin(this.elapsedTime * 1.3) * 4.5;
      b.pos.z = THREE.MathUtils.lerp(b.pos.z, targetZ, dt * 1.8);
      b.pos.y = 0;
    }

    if (b.state === 'PHASE_SHIFT') {
      b.stateTimer -= dt;
      if (b.stateTimer <= 0) b.state = 'IDLE';
    } else if (b.state === 'STAGGERED') {
      b.staggerTimer -= dt;
      if (b.staggerTimer <= 0) { b.state = 'IDLE'; b.cooldownBeats = 2; }
    } else if (b.state === 'PARRY_CLASH' && b.clashWindowTimer > 0) {
      b.clashWindowTimer -= dt;
      if (b.clashWindowTimer <= 0) this._damagePlayer(14);
    }

    if (b.state !== 'STAGGERED' && b.state !== 'DEFEATED') {
      const targetYaw = Math.atan2(this.player.pos.x - b.pos.x, this.player.pos.z - b.pos.z);
      b.yaw = lerpAngle(b.yaw, THREE.MathUtils.clamp(targetYaw, -0.9, 0.9), dt * 3.2);
    }

    if (b.podsDetached && b.state !== 'DEFEATED') {
      b.podAngle += dt * (b.phase === 3 ? 1.55 : 1.05);
      const rad = 11.5;
      this.bossModel.parts.leftPod.position.set(
        STADIUM_CENTER_X + Math.cos(b.podAngle) * rad,
        4.2 + Math.sin(this.elapsedTime * 4) * 0.5,
        STADIUM_CENTER_Z + Math.sin(b.podAngle) * rad
      );
      this.bossModel.parts.rightPod.position.set(
        STADIUM_CENTER_X + Math.cos(b.podAngle + Math.PI) * rad,
        4.2 + Math.cos(this.elapsedTime * 4) * 0.5,
        STADIUM_CENTER_Z + Math.sin(b.podAngle + Math.PI) * rad
      );
      this.bossModel.parts.leftPod.lookAt(this.player.pos.x, 1.5, this.player.pos.z);
      this.bossModel.parts.rightPod.lookAt(this.player.pos.x, 1.5, this.player.pos.z);
    }
  }

  _updateCombatObjects(dt) {
    for (let i = this.playerProjectiles.length - 1; i >= 0; i--) {
      const pp = this.playerProjectiles[i];
      if (!pp) break;
      pp.life -= dt;

      if (pp.homing) {
        let aimT = null;
        if (this.state === 'BOSS_FIGHT' && this.boss.state !== 'DEFEATED') {
          aimT = new THREE.Vector3(this.boss.pos.x, this.boss.pos.y + 3.0, this.boss.pos.z);
        } else if (this.mobs.mobs.length > 0) {
          const m = this.mobs.mobs[0];
          aimT = new THREE.Vector3(m.pos.x, m.pos.y + 1.3, m.pos.z);
        }
        if (aimT) {
          const desired = aimT.sub(pp.pos).normalize().multiplyScalar(pp.vel.length());
          pp.vel.lerp(desired, dt * 4.5);
        }
      }

      pp.pos.addScaledVector(pp.vel, dt);
      pp.mesh.position.copy(pp.pos);
      pp.mesh.rotation.x += dt * 12;
      pp.mesh.rotation.y += dt * 14;

      if (Math.random() < 0.65) {
        this.particles.spawnCube({
          x: pp.pos.x, y: pp.pos.y, z: pp.pos.z,
          vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2,
          size: pp.size * 0.45,
          color: pp.trailColors[(Math.random() * pp.trailColors.length) | 0],
          life: 0.24, gravity: 2,
        });
      }

      let hit = false;
      for (const m of [...this.mobs.mobs]) {
        if (Math.hypot(pp.pos.x - m.pos.x, pp.pos.z - m.pos.z) < m.radius + pp.size + 0.5 && Math.abs(pp.pos.y - (m.pos.y + 1.2)) < 2.2) {
          const effectiveDmg = (this.tutor.active && this.tutor.lesson <= 2) ? Math.min(pp.dmg, Math.max(0, m.hp - 25)) : pp.dmg;
          const killed = this.mobs.damageMob(m, effectiveDmg, pp.vel.clone().setY(0).normalize(), pp.explosive ? 9 : 2, this.particles);
          this._addCombo(killed ? 220 : 45);
          this.player.reverb = Math.min(100, this.player.reverb + (killed ? 14 : 3));
          if (killed) {
            this.stats.mobsDefeated++;
            this.stats.voxelsSmashed += 105;
            this.audio.playVoxelShatter(true);
            this._spawnWorldPopup('RANGED KO!! ♪', m.pos, '#00f0ff', true);
            this._syncZoneHUD();
          }
          hit = true;
          break;
        }
      }

      if (!hit && this.state === 'BOSS_FIGHT' && this.boss.state !== 'PHASE_SHIFT' && this.boss.state !== 'DEFEATED') {
        const dBoss = Math.hypot(pp.pos.x - this.boss.pos.x, pp.pos.z - this.boss.pos.z);
        if (dBoss < 4.2 && pp.pos.y >= this.boss.pos.y - 0.5 && pp.pos.y <= this.boss.pos.y + 8.5) {
          this._damageBoss(pp.dmg, pp.explosive, pp.explosive ? 'BASS CANNON!' : 'RIFF SHOT!');
          this._addCombo(55);
          this.player.reverb = Math.min(100, this.player.reverb + 4);
          hit = true;
        }
      }

      if (!hit) {
        for (const prop of this.world.props) {
          if (prop.destroyed) continue;
          if (Math.hypot(pp.pos.x - prop.basePos.x, pp.pos.z - prop.basePos.z) < prop.radius + pp.size + 0.4 && Math.abs(pp.pos.y - (prop.basePos.y + 1.2)) < 2.5) {
            const res = prop.takeDamage(pp.explosive ? 60 : 22, pp.pos, this.particles, pp.explosive ? 15 : 8);
            this.stats.voxelsSmashed += res.voxelsRemoved;
            if (res.voxelsRemoved > 0) this.audio.playVoxelShatter(res.destroyed);
            hit = true;
            break;
          }
        }
      }

      if (hit) {
        this.particles.burst(pp.pos.x, pp.pos.y, pp.pos.z, {
          count: pp.explosive ? 42 : 14,
          colors: pp.trailColors,
          speedMin: 4, speedMax: pp.explosive ? 16 : 10, upBias: pp.explosive ? 8 : 3,
          sizeMin: 0.09, sizeMax: pp.explosive ? 0.24 : 0.15,
        });
        if (pp.explosive) this._carveFloorAt(pp.pos.x, pp.pos.z, 2.2, 2);
        pp.life = 0;
      }

      if (pp.life <= 0) {
        this.scene.remove(pp.mesh);
        if (this.playerProjectiles[i] === pp) this.playerProjectiles.splice(i, 1);
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj) break;
      proj.life -= dt;
      proj.pos.addScaledVector(proj.vel, dt);
      proj.mesh.position.copy(proj.pos);
      proj.mesh.rotation.y += dt * 16;

      if (proj.reflected) {
        if (this.state === 'EXPLORE') {
          for (const m of [...this.mobs.mobs]) {
            if (Math.hypot(proj.pos.x - m.pos.x, proj.pos.z - m.pos.z) < 2.2) {
              const killed = this.mobs.damageMob(m, 140, proj.vel.clone().setY(0).normalize(), 9, this.particles);
              if (killed) {
                this.stats.mobsDefeated++;
                this.stats.voxelsSmashed += 105;
                this.audio.playVoxelShatter(true);
                this._spawnWorldPopup('PARRY ONE-SHOT!! 💖', m.pos, '#ff2a85', true);
                this._syncZoneHUD();
              }
              proj.life = 0;
              break;
            }
          }
        } else if (Math.hypot(proj.pos.x - this.boss.pos.x, proj.pos.z - this.boss.pos.z) < 4.2) {
          this._damageBoss(95, true, 'PARRY COUNTER!!');
          proj.life = 0;
        }
      } else {
        const d = Math.hypot(proj.pos.x - this.player.pos.x, proj.pos.z - this.player.pos.z);
        if (d < 1.35 && Math.abs(this.player.pos.y + 0.9 - proj.pos.y) < 1.5) {
          if (this.player.parryWindow > 0 && proj.isParryable) {
            proj.reflected = true;
            const target = this._findParryReflectTarget(proj);
            proj.vel.copy(target).sub(proj.pos).normalize().multiplyScalar(34);
            this._triggerParrySuccessFeedback();
          } else {
            this._damagePlayer(14);
            proj.life = 0;
          }
        }
      }

      if (proj.life <= 0) { this.scene.remove(proj.mesh); this.projectiles.splice(i, 1); }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed * dt;
      sw.mesh.scale.setScalar(sw.radius);
      sw.mat.opacity = Math.max(0, 1 - sw.radius / sw.maxRadius);
      if (!sw.friendly && !sw.hitPlayer && !sw.parried) {
        const dist = Math.hypot(this.player.pos.x - sw.origin.x, this.player.pos.z - sw.origin.z);
        if (Math.abs(dist - sw.radius) < 0.85 && this.player.pos.y < 1.05) {
          sw.hitPlayer = true; this._damagePlayer(15);
        }
      }
      if (sw.radius >= sw.maxRadius) { this.scene.remove(sw.mesh); this.shockwaves.splice(i, 1); }
    }

    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const tg = this.telegraphs[i];
      tg.life -= dt;
      const frac = 1 - tg.life / tg.maxLife;
      tg.mat.opacity = 0.28 + Math.sin(this.elapsedTime * 30) * 0.16 + frac * 0.25;
      if (tg.life <= 0) { this.scene.remove(tg.mesh); this.telegraphs.splice(i, 1); }
    }

    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.life -= dt;
      l.angle += l.angSpeed * dt;
      const dirX = Math.sin(l.angle);
      const dirZ = Math.cos(l.angle);
      l.mesh.position.set(l.origin.x + dirX * 14, 0.85, l.origin.z + dirZ * 14);
      l.mesh.rotation.y = l.angle;
      const px = this.player.pos.x - l.origin.x;
      const pz = this.player.pos.z - l.origin.z;
      const proj = px * dirX + pz * dirZ;
      if (proj > 1 && proj < 27 && this.player.pos.y < 1.35) {
        if (Math.abs(px * dirZ - pz * dirX) < 0.9) this._damagePlayer(14);
      }
      if (l.life <= 0) { this.scene.remove(l.mesh); this.lasers.splice(i, 1); }
    }

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.life -= dt;
      pk.mesh.rotation.y += dt * 3.5;
      pk.mesh.position.y = pk.pos.y + Math.sin(this.elapsedTime * 5 + i) * 0.22;
      if (Math.hypot(pk.pos.x - this.player.pos.x, pk.pos.z - this.player.pos.z) < 1.9 && Math.abs(pk.pos.y - (this.player.pos.y + 1.0)) < 2.0) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
        this.player.reverb = Math.min(100, this.player.reverb + 22);
        this.audio.playPickup();
        this._spawnWorldPopup('+20 HP / +REVERB!', this.player.pos, '#22f57a', false);
        this.particles.burst(pk.pos.x, pk.pos.y, pk.pos.z, { count: 16, colors: [PAL.GREEN_HEAL, PAL.YELLOW], speedMin: 3, speedMax: 9 });
        pk.life = 0;
      }
      if (pk.life <= 0) { this.scene.remove(pk.mesh); this.pickups.splice(i, 1); }
    }

    for (let i = this.overdriveBeams.length - 1; i >= 0; i--) {
      const ob = this.overdriveBeams[i];
      ob.life -= dt;
      ob.mesh.scale.set(1 + (0.58 - ob.life) * 2, 1 + (0.58 - ob.life) * 2, 1);
      ob.mesh.material.opacity = Math.max(0, ob.life * 2);
      if (ob.life <= 0) { this.scene.remove(ob.mesh); this.overdriveBeams.splice(i, 1); }
    }

    for (const prop of this.world.props) prop.update(dt);
    for (const tile of this.world.floorTiles) {
      if (tile.hazardState === 2) {
        tile.hazardTimer -= dt;
        if (tile.hazardTimer <= 0) { tile.hazardState = 0; tile.glowMat.color.setHex(tile.baseColor); }
      }
    }
  }

  // =========================================================================
  // 15-JOINT MULTI-SEGMENT STREET-DANCE GROOVE & DRAGGED HEAVY BASS ANIMATION!
  // =========================================================================
  _animateHero(dt) {
    const p = this.player;
    const parts = this.heroModel.parts;
    const vs = this.heroModel.vs || 0.072;

    this.heroModel.root.position.copy(p.pos);
    this.heroModel.root.rotation.y = p.yaw;
    this.heroModel.root.visible = p.invulnTimer <= 0 || Math.floor(this.elapsedTime * 22) % 2 === 0;

    const beatFloat = this.audio.running ? this.audio.getBeatFloat() : (this.elapsedTime * ((this.audio.bpm || 122) / 60));
    const beatPhase = beatFloat % 1;
    const hipSway = Math.sin(beatFloat * Math.PI); // Alternates left/right every beat!
    const beatDip = Math.pow(Math.max(0, 1 - beatPhase * 2.4), 2);
    const grooveBounce = Math.abs(Math.sin(beatFloat * Math.PI));

    // Beat rings stay cleanly projected on the surface beneath KAI!
    parts.beatRing.position.y = 0.06;
    parts.pulseRing.position.y = 0.065;
    parts.pulseRing.scale.setScalar(1.95 - beatPhase * 0.95);
    parts.pulseRingMat.opacity = 0.25 + beatPhase * 0.65;
    parts.beatRingMat.color.setHex(beatPhase > 0.85 || beatPhase < 0.14 ? PAL.YELLOW : PAL.CYAN_BRIGHT);
    parts.beatRing.scale.setScalar(1 + beatDip * 0.16);

    // 1. HEADBANG + 2-JOINT ARTICULATED SCARF WHIP!
    parts.head.rotation.x = 0.06 + beatDip * 0.32 + (p.moving ? 0.08 : 0);
    parts.head.rotation.z = -hipSway * 0.18;
    parts.head.rotation.y = p.moving ? 0 : -hipSway * 0.15;

    parts.scarf.rotation.x = 0.42 + beatDip * 0.34 + (p.moving ? 0.55 : 0);
    parts.scarf.rotation.z = hipSway * 0.24;
    parts.scarfTip.rotation.x = 0.28 + Math.sin(beatFloat * Math.PI * 2 - 0.9) * 0.38 + (p.moving ? 0.32 : 0);
    parts.scarfTip.rotation.z = Math.cos(beatFloat * Math.PI - 0.6) * 0.22;

    // 2. 3-SEGMENT ARTICULATED LEGS (Thigh + Knee + Flat Sneaker Ankle — NEVER straight sticks!)
    if (p.grinding) {
      // Badass bent-knee Sonic Rail surfer crouch!
      parts.body.position.set(0, 15.2 * vs, 0);
      parts.body.rotation.set(0.14, 0.55, -0.12);
      parts.leftLeg.rotation.set(-0.68, 0.18, 0.15);
      parts.leftKnee.rotation.set(1.25, 0, 0);
      parts.leftAnkle.rotation.set(-0.55, 0, 0);
      parts.rightLeg.rotation.set(-0.42, -0.18, -0.15);
      parts.rightKnee.rotation.set(0.95, 0, 0);
      parts.rightAnkle.rotation.set(-0.5, 0, 0);
    } else if (!p.onGround || p.ringChainActive) {
      // Dynamic tucked-knee rockstar jump pose!
      parts.body.position.set(0, 16.5 * vs, 0);
      parts.body.rotation.set(p.airDunking ? 0.48 : 0.16, 0, 0);
      parts.leftLeg.rotation.set(-0.85, 0.08, 0.06);
      parts.leftKnee.rotation.set(1.42, 0, 0);
      parts.leftAnkle.rotation.set(-0.35, 0, 0);
      parts.rightLeg.rotation.set(-0.28, -0.08, -0.06);
      parts.rightKnee.rotation.set(0.92, 0, 0);
      parts.rightAnkle.rotation.set(-0.45, 0, 0);
    } else if (p.moving) {
      // Energetic multi-joint run stride with genuine knee drive & heel kick-up!
      const sL = Math.sin(p.runCycle);
      const cL = Math.cos(p.runCycle);
      const sR = -sL;
      const cR = -cL;
      const bounceY = Math.abs(Math.cos(p.runCycle)) * 0.11;

      parts.body.position.set(0, 17.6 * vs + bounceY, 0);
      parts.body.rotation.set(0.18, 0, hipSway * 0.05);

      const lHipX = -0.26 + sL * 0.72;
      const lKneeX = 0.56 + Math.max(0, -cL) * 0.92;
      parts.leftLeg.rotation.set(lHipX, 0.04, 0.04);
      parts.leftKnee.rotation.set(lKneeX, 0, 0);
      parts.leftAnkle.rotation.set(-(lHipX + lKneeX) * 0.55, 0, 0);

      const rHipX = -0.26 + sR * 0.72;
      const rKneeX = 0.56 + Math.max(0, -cR) * 0.92;
      parts.rightLeg.rotation.set(rHipX, -0.04, -0.04);
      parts.rightKnee.rotation.set(rKneeX, 0, 0);
      parts.rightAnkle.rotation.set(-(rHipX + rKneeX) * 0.55, 0, 0);
    } else {
      // GROUNDED HI-FI STREET-DANCE GROOVE!
      // Knees dynamically flex on every beat while both sneakers stay 100% planted flat on the floor!
      const thetaL = 0.35 + beatDip * 0.28 + Math.max(0, hipSway) * 0.16;
      const thetaR = 0.35 + beatDip * 0.28 + Math.max(0, -hipSway) * 0.16;
      const minTheta = Math.min(thetaL, thetaR);

      parts.body.position.set(
        hipSway * 0.12,
        (4.2 + 14.0 * Math.cos(minTheta)) * vs,
        0
      );
      parts.body.rotation.set(0.04 + beatDip * 0.08, hipSway * 0.12, hipSway * 0.10);

      const splayL = 0.07 + hipSway * 0.05;
      const splayR = -0.07 + hipSway * 0.05;
      parts.leftLeg.rotation.set(-thetaL, 0.10, splayL);
      parts.leftKnee.rotation.set(thetaL * 2.0, 0, 0);
      parts.leftAnkle.rotation.set(-thetaL, 0, -splayL);

      parts.rightLeg.rotation.set(-thetaR, -0.10, splayR);
      parts.rightKnee.rotation.set(thetaR * 2.0, 0, 0);
      parts.rightAnkle.rotation.set(-thetaR, 0, -splayR);
    }

    // EXACT 0mm-CLIPPING SNEAKER FLOOR GROUNDING CLAMP!
    // Measures actual world Y of both heels & toes so KAI's sneakers ALWAYS rest cleanly ON TOP of the floor!
    if (p.onGround && !p.grinding && parts.soleMarkers) {
      this.heroModel.root.updateMatrixWorld(true);
      let lowestY = Infinity;
      for (const mk of parts.soleMarkers) {
        mk.getWorldPosition(this._dragWorldPos);
        if (this._dragWorldPos.y < lowestY) lowestY = this._dragWorldPos.y;
      }
      const floorY = p.pos.y + 0.03;
      if (lowestY < floorY) {
        parts.body.position.y += (floorY - lowestY);
      }
    }

    // 3. 2-SEGMENT ARMS (Shoulder + Elbow) & DRAGGED HEAVY PUNK BASS!
    if (p.parryWindow > 0) {
      parts.torso.rotation.set(0, 0.35, 0);
      parts.rightArm.rotation.set(-1.15, 0.55, -0.35);
      parts.rightElbow.rotation.set(-0.75, 0, 0);
      parts.leftArm.rotation.set(-0.95, -0.45, 0.35);
      parts.leftElbow.rotation.set(-0.95, 0, 0);
      parts.weaponPivot.rotation.set(-0.35, 0.2, 0.85);
    } else if (p.attackTimer > 0) {
      const prog = 1 - (p.attackTimer / Math.max(0.05, p.attackDuration));
      const swing = Math.sin(prog * Math.PI);
      if (p.attackType === 'heavy' || p.attackType === 'beatHit' || p.attackType === 'craterSlam' || p.attackType === 'airDunk') {
        // Huge overhead 2-handed Punk Bass smash from ground drag up over head and down into crater!
        parts.torso.rotation.set(-0.3 + prog * 0.75, 0, 0);
        parts.rightArm.rotation.set(-2.35 + prog * 3.1, 0.15, -0.2);
        parts.rightElbow.rotation.set(-0.65 + prog * 0.35, 0, 0);
        parts.leftArm.rotation.set(-2.0 + prog * 2.6, -0.15, 0.2);
        parts.leftElbow.rotation.set(-0.75, 0, 0);
        parts.weaponPivot.rotation.set(-0.85 + prog * 0.5, 0, 0);
      } else if (p.comboStep === 3 || p.attackType === 'dashRiff') {
        // 360° Rockstar Hurricane Spin Whip!
        parts.body.rotation.y = prog * Math.PI * 2;
        parts.torso.rotation.set(0.12, 0, 0);
        parts.rightArm.rotation.set(-0.85, 0.75, -0.75);
        parts.rightElbow.rotation.set(-0.55, 0, 0);
        parts.leftArm.rotation.set(-0.65, -0.5, 0.65);
        parts.leftElbow.rotation.set(-0.95, 0, 0);
        parts.weaponPivot.rotation.set(-0.55, 0, 0.45);
      } else {
        // Whipping the heavy dragged Bass upward & across!
        const dir = p.comboStep % 2 === 1 ? 1 : -1;
        parts.torso.rotation.set(0.14, dir * (-0.58 + swing * 1.2), 0);
        parts.rightArm.rotation.set(-1.25 + swing * 1.35, dir * (0.85 - swing * 1.75), -0.42);
        parts.rightElbow.rotation.set(-0.75 + swing * 0.35, 0, 0);
        parts.leftArm.rotation.set(-0.65, -dir * 0.35, 0.35);
        parts.leftElbow.rotation.set(-1.05, 0, 0);
        parts.weaponPivot.rotation.set(-0.65, 0, dir * 0.35);
      }
    } else if (p.grinding) {
      // Surfer balance arms while dragging Bass sparks along the cyan tube!
      parts.torso.rotation.set(0.1, -0.35, 0.12);
      parts.leftArm.rotation.set(-0.55, 0.35, 0.75);
      parts.leftElbow.rotation.set(-0.75, 0, 0);
      parts.rightArm.rotation.set(0.45, -0.2, -0.45);
      parts.rightElbow.rotation.set(-0.42, 0, 0);
      parts.weaponPivot.rotation.set(0.95, 0.25, -0.25);
    } else if (p.moving && p.onGround) {
      // ICONIC DRAGGED-BASS RUN!
      // Left arm pumps rhythmically with bent elbow; Right arm trails the heavy Punk Bass behind KAI on the floor!
      const sL = Math.sin(p.runCycle);
      parts.torso.rotation.set(0.08, -sL * 0.14, -hipSway * 0.06);

      parts.leftArm.rotation.set(-0.15 - sL * 0.68, 0.12, 0.26);
      parts.leftElbow.rotation.set(-0.98 - Math.max(0, sL) * 0.35, 0, 0.12);

      parts.rightArm.rotation.set(0.56, -0.16, -0.30);
      parts.rightElbow.rotation.set(-0.38, 0, 0);
      parts.weaponPivot.rotation.set(0.76 + Math.sin(p.runCycle * 2) * 0.04, 0.22, -0.22);

      // Emit real micro-voxel friction sparks right off the dragging Bass bumper!
      if (this.selectedWeapon === 'guitar' && Math.random() < 0.65) {
        this.heroModel.root.updateMatrixWorld(true);
        parts.dragTipMarker.getWorldPosition(this._dragWorldPos);
        this.particles.spawnCube({
          x: this._dragWorldPos.x + (Math.random() - 0.5) * 0.18,
          y: p.pos.y + 0.08,
          z: this._dragWorldPos.z + (Math.random() - 0.5) * 0.18,
          vx: -Math.sin(p.yaw) * 3.5 + (Math.random() - 0.5) * 2.8,
          vy: 1.6 + Math.random() * 2.8,
          vz: -Math.cos(p.yaw) * 3.5 + (Math.random() - 0.5) * 2.8,
          size: 0.095,
          color: Math.random() < 0.55 ? PAL.ORANGE_BRIGHT : (Math.random() < 0.5 ? PAL.YELLOW : PAL.CYAN_BRIGHT),
          life: 0.26,
          gravity: 11,
        });
      }
    } else {
      // ICONIC STREET-DANCE IDLE + HEAVY BASS RESTING/DRAGGING ON FLOOR BEHIND RIGHT HIP!
      parts.torso.rotation.set(0.04 + beatDip * 0.10, hipSway * 0.20, -hipSway * 0.14);

      // Left arm: funky bent-elbow punk groove pump!
      parts.leftArm.rotation.set(-0.32 - grooveBounce * 0.38, 0.22, 0.34 + hipSway * 0.12);
      parts.leftElbow.rotation.set(-1.12 - beatDip * 0.34, 0, 0.22);

      // Right cybernetic arm: elbow bent naturally, hand gripping upper neck while Bass tail rests on ground behind KAI!
      parts.rightArm.rotation.set(0.48 + beatDip * 0.08, -0.14, -0.28);
      parts.rightElbow.rotation.set(-0.42 - beatDip * 0.10, 0, 0);
      parts.weaponPivot.rotation.set(1.06 - beatDip * 0.06, 0.22, -0.18 + hipSway * 0.06);
    }

    // 4. 808-VOX Cat Drone dances beside KAI!
    parts.drone.position.y = 2.65 + Math.sin(beatFloat * Math.PI * 2) * 0.22;
    parts.drone.position.x = 1.55 + hipSway * 0.22;
    parts.drone.scale.setScalar(1 + beatDip * 0.28);
    parts.drone.rotation.y = hipSway * 0.45;
  }

  _animateBoss(dt) {
    const b = this.boss;
    const parts = this.bossModel.parts;
    this.bossModel.root.position.copy(b.pos);
    this.bossModel.root.rotation.y = b.yaw;

    if (b.state === 'DEFEATED') {
      this.bossModel.root.position.y = Math.max(-2.5, this.bossModel.root.position.y - dt * 1.4);
      parts.torso.rotation.x = Math.min(0.65, parts.torso.rotation.x + dt * 0.8);
      return;
    }
    if (b.hitFlash > 0) {
      this.bossModel.root.position.x += (Math.random() - 0.5) * 0.38;
      this.bossModel.root.position.z += (Math.random() - 0.5) * 0.38;
    }

    const beatFloat = this.audio.running ? this.audio.getBeatFloat() : (this.elapsedTime * ((this.audio.bpm || 136) / 60));
    const sway = Math.sin(beatFloat * Math.PI);
    const beatDip = Math.pow(Math.max(0, 1 - (beatFloat % 1) * 2.4), 2);
    const subPump = 1 + beatDip * 0.38;
    parts.cone.scale.set(subPump, subPump, 1 + beatDip * 0.8);
    parts.cone.position.z = 9.2 * 0.135 + beatDip * 0.32;

    if (b.state === 'STAGGERED') {
      parts.torso.position.y = 16 * 0.135;
      parts.torso.rotation.x = 0.38; parts.torso.rotation.z = 0;
      parts.head.rotation.z = Math.sin(this.elapsedTime * 11) * 0.3;
      parts.leftArm.armRoot.rotation.x = 0.5; parts.rightArm.armRoot.rotation.x = 0.5;
      return;
    }

    parts.torso.position.y = 20 * 0.135 + beatDip * 0.42;
    parts.torso.rotation.z = sway * 0.085;
    parts.torso.rotation.x = b.state === 'PHASE_SHIFT' ? -0.22 : 0.05 + beatDip * 0.08;
    parts.head.rotation.x = beatDip * 0.24;
    parts.head.rotation.z = -sway * 0.12;
    parts.leftLeg.rotation.x = Math.max(0, sway) * 0.16;
    parts.rightLeg.rotation.x = Math.max(0, -sway) * 0.16;

    const raiseArm = (arm, raised, sideSign) => {
      const targetX = raised ? -2.35 : -0.3 + sway * sideSign * 0.22;
      arm.armRoot.rotation.x = THREE.MathUtils.lerp(arm.armRoot.rotation.x, targetX, dt * 10);
    };
    if (b.state === 'BOUNCING_LEAP') {
      raiseArm(parts.leftArm, b.isLeaping, 1);
      raiseArm(parts.rightArm, b.isLeaping, -1);
      parts.torso.rotation.x = b.isLeaping ? -0.18 : 0.22;
    } else if (b.state === 'FIST_SLAM') {
      const raising = b.stateBeats < 3;
      const slamArm = b.activeArm === 'right' ? parts.rightArm : parts.leftArm;
      const otherArm = b.activeArm === 'right' ? parts.leftArm : parts.rightArm;
      slamArm.armRoot.rotation.x = THREE.MathUtils.lerp(slamArm.armRoot.rotation.x, raising ? -2.6 : 0.75, dt * 14);
      raiseArm(otherArm, false, 1);
    } else if (b.state === 'SWEEP_PUNCH') {
      const sweep = b.stateBeats >= 3 ? 1.4 : -1.1;
      parts.rightArm.armRoot.rotation.z = THREE.MathUtils.lerp(parts.rightArm.armRoot.rotation.z, sweep, dt * 10);
      parts.rightArm.armRoot.rotation.x = -0.6;
    } else if (b.state === 'PHASE_SHIFT' || b.state === 'PARRY_CLASH') {
      raiseArm(parts.leftArm, true, 1); raiseArm(parts.rightArm, true, -1);
    } else {
      parts.rightArm.armRoot.rotation.z = THREE.MathUtils.lerp(parts.rightArm.armRoot.rotation.z, 0, dt * 8);
      raiseArm(parts.leftArm, false, 1); raiseArm(parts.rightArm, false, -1);
    }
  }

  _animateWorld(dt) {
    const towerBounce = 1 + this.beatPulse * 0.08;
    for (const t of this.world.backdropTowers) t.scale.set(1, towerBounce, 1);
    if (this.world.fountainSpout) {
      this.world.fountainSpout.scale.set(1 + this.beatPulse * 0.22, 1 + this.beatPulse * 0.45, 1 + this.beatPulse * 0.22);
    }
    for (const arr of this.world.guideArrows) {
      arr.mat.opacity = 0.38 + this.beatPulse * 0.55;
    }
    for (const tile of this.world.floorTiles) {
      if (tile.hazardState === 0) {
        const wave = ((Math.abs(tile.gx) + Math.abs(tile.gz) + this.beatCount) % 3 === 0) ? 0.18 : 0.04;
        tile.glowMat.opacity = wave * (0.4 + this.beatPulse * 0.8);
      } else {
        tile.glowMat.opacity = 0.78;
      }
    }
    this.world.spotBeams.forEach((cone, idx) => {
      cone.rotation.z = Math.sin(this.elapsedTime * 1.4 + idx) * 0.45;
    });
  }

  _triggerBeatHitRing(worldPos, colorHex = 0x4dfcff) {
    this.beatHitRing.position.copy(worldPos);
    this.beatHitRing.lookAt(this.camera.position);
    this.beatHitRing.material.color.setHex(colorHex);
    this.beatHitRing.material.opacity = 0.95;
    this.beatHitRing.scale.setScalar(0.5);
    this.beatHitRing.visible = true;
    this.beatHitRingTimer = 0.34;
  }

  // =========================================================================
  // PULLED-BACK PANORAMIC CAMERA WITH SMOOTH S-CURVE PATH GUIDANCE!
  // =========================================================================
  _computeAutoZoneCamYaw() {
    const px = this.player.pos.x;
    const pz = this.player.pos.z;
    if (this.player.grinding) {
      const tan = this.world.railCurve.getTangent(Math.min(0.98, this.player.grindT));
      return Math.atan2(-tan.x, -tan.z);
    }
    if (this.player.ringChainActive) {
      return -1.05; // Looks ENE along the 5 Sonic Rings toward the Colosseum!
    }
    if (this.progress.zoneIdx === 0) {
      return this.progress.zone1Cleared ? -0.62 : -0.18; // Frames Fountain & Atrium, then turns toward SE Stairs!
    }
    if (this.progress.zoneIdx === 1) {
      if (px < 56) return -1.12; // Frames Floating Stepping Stones heading East!
      return 0.0;                // Frames Hydraulic Crusher Bridge heading North!
    }
    if (this.progress.zoneIdx === 2) {
      return this.progress.zone3Cleared ? 0.85 : 0.25; // Frames Atrium & 2F Mezzanine, then West Exit Arch!
    }
    if (this.progress.zoneIdx === 3) {
      if (pz < -74) return -0.95; // Summit Island: turns East to showcase the 5 Giant Cyan Sonic Rings & Colosseum!
      return 0.05;                // Frames Cargo Containers climbing North!
    }
    return 0.0; // Zone 05 Colosseum looks straight North (-Z)!
  }

  _updateCamera(dt) {
    if (this.beatHitRingTimer > 0) {
      this.beatHitRingTimer -= dt;
      const t = 1 - Math.max(0, this.beatHitRingTimer) / 0.34;
      this.beatHitRing.scale.setScalar(0.5 + t * 2.4);
      this.beatHitRing.material.opacity = Math.max(0, 1 - t);
      this.beatHitRing.lookAt(this.camera.position);
      if (this.beatHitRingTimer <= 0) this.beatHitRing.visible = false;
    }

    let desiredPos, lookTarget;

    if (this.state === 'TITLE') {
      // Sweeping panoramic drone shot over the Octagonal Fountain Plaza, Wood Atrium & Distant Colosseum!
      const ang = this.elapsedTime * 0.16;
      desiredPos = new THREE.Vector3(-12 + Math.sin(ang) * 18, 14.5, 22 + Math.cos(ang) * 14);
      lookTarget = new THREE.Vector3(24, 2.5, -26);
    } else if (this.state === 'EXPLORE') {
      const targetYaw = this._computeAutoZoneCamYaw() + this.manualCamOffset;
      this.camYaw = lerpAngle(this.camYaw, targetYaw, dt * 2.6);

      const inCombat = this.mobs.aliveCount > 0;
      const dist = this.camDist + (inCombat ? 1.4 : 0);
      const camH = (inCombat ? 7.4 : 6.6) + (dist - 14.2) * 0.32;

      desiredPos = new THREE.Vector3(
        this.player.pos.x + Math.sin(this.camYaw) * dist,
        this.player.pos.y + camH,
        this.player.pos.z + Math.cos(this.camYaw) * dist
      );
      lookTarget = new THREE.Vector3(
        this.player.pos.x - Math.sin(this.camYaw) * 3.8,
        this.player.pos.y + 2.1,
        this.player.pos.z - Math.cos(this.camYaw) * 3.8
      );
    } else if (this.state === 'INTRO') {
      desiredPos = new THREE.Vector3(
        STADIUM_CENTER_X + Math.sin(this.elapsedTime * 1.6) * 5.0,
        5.5,
        STADIUM_CENTER_Z + 14.5
      );
      lookTarget = new THREE.Vector3(BOSS_HOME_X, Math.max(4.8, this.boss.pos.y * 0.5 + 4.2), BOSS_HOME_Z);
    } else {
      // Comfortable wide Boss Colosseum framing!
      desiredPos = new THREE.Vector3(
        STADIUM_CENTER_X + (this.player.pos.x - STADIUM_CENTER_X) * 0.55,
        6.8 + this.player.pos.y * 0.45,
        Math.min(this.world.gates.bossBack.z - 1.4, Math.max(STADIUM_CENTER_Z + 18.2, this.player.pos.z + 13.8))
      );
      lookTarget = new THREE.Vector3(
        (this.player.pos.x + this.boss.pos.x) * 0.5,
        4.2 + this.boss.pos.y * 0.35,
        (this.player.pos.z + this.boss.pos.z) * 0.5 - 1.5
      );
    }

    this.camera.position.lerp(desiredPos, Math.min(1, dt * 7.2));
    if (this.shakeIntensity > 0.005) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity * 1.3;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 1.3;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.8);
    }

    this.camFovPunch = THREE.MathUtils.lerp(this.camFovPunch, 0, dt * 8);
    this.camRoll = THREE.MathUtils.lerp(this.camRoll, 0, dt * 9);

    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 55 + this.beatPulse * 1.1 + this.camFovPunch, dt * 12);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(lookTarget);
    if (Math.abs(this.camRoll) > 0.001) this.camera.rotation.z += this.camRoll;
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * Math.min(1, t);
}
