import * as THREE from 'three';
import { PAL, buildBoomBotModel, buildVinylBotModel } from '../voxel/VoxelModels.js';
import { ARENA_RADIUS } from './ArenaBuilder.js';

/**
 * Manages True-Voxel Mob Enemies for Act 1 Warmup / Onboarding Waves:
 * - 'boom': BOOM-BOT (melee beat-boxer robot with telegraphed beat punches & knockback/juggle!)
 * - 'vinyl': VINYL-BOT (hovering DJ turret drone firing HOT-PINK PARRYABLE vinyl discs!)
 */
export class MobManager {
  constructor(scene) {
    this.scene = scene;
    this.mobs = [];
    this._id = 1;
    this.activeBounds = null; // Optional { minX, maxX, minZ, maxZ } for courtyard containment!
  }

  setBounds(bounds) {
    this.activeBounds = bounds;
  }

  clearAll() {
    for (const m of this.mobs) {
      this.scene.remove(m.model.root);
    }
    this.mobs = [];
  }

  get aliveCount() {
    return this.mobs.length;
  }

  spawnMob(type, x, z, hpOverride = null, baseY = 0) {
    const isVinyl = (type === 'vinyl');
    const model = isVinyl ? buildVinylBotModel() : buildBoomBotModel();
    const pos = new THREE.Vector3(x, baseY, z);
    model.root.position.copy(pos);
    this.scene.add(model.root);

    // Floating crisp HP bar above each mob
    const hpBg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.18),
      new THREE.MeshBasicMaterial({ color: 0x11131b, side: THREE.DoubleSide })
    );
    hpBg.position.set(0, isVinyl ? 2.75 : 2.35, 0);
    const hpFill = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 0.12),
      new THREE.MeshBasicMaterial({ color: isVinyl ? PAL.MAGENTA_BRIGHT : PAL.ORANGE_BRIGHT, side: THREE.DoubleSide })
    );
    hpFill.position.z = 0.01;
    hpBg.add(hpFill);
    model.root.add(hpBg);

    const maxHp = hpOverride ?? (isVinyl ? 70 : 105);
    const mob = {
      id: this._id++,
      type,
      model,
      hpBg,
      hpFill,
      pos,
      baseY,
      vel: new THREE.Vector3(),
      yaw: 0,
      hp: maxHp,
      maxHp,
      radius: 1.05,
      hitFlash: 0,
      stunTimer: 0,
      beatCounter: Math.floor(Math.random() * 2),
      attackTelegraph: 0,
      dead: false,
    };
    this.mobs.push(mob);
    return mob;
  }

  onBeat(beatIdx, playerPos, callbacks) {
    for (const m of this.mobs) {
      if (m.dead || m.stunTimer > 0) continue;
      m.beatCounter++;

      const dist = Math.hypot(playerPos.x - m.pos.x, playerPos.z - m.pos.z);

      if (m.type === 'vinyl') {
        // Fires a slow HOT-PINK PARRYABLE vinyl disc every 4 beats!
        if (m.beatCounter % 4 === 2) {
          m.attackTelegraph = 0.45;
          callbacks.onTelegraph?.(m.pos, 'PINK PARRY [F]!', '#ff2a85');
        } else if (m.beatCounter % 4 === 3) {
          const origin = new THREE.Vector3(m.pos.x, 1.35, m.pos.z);
          const dir = new THREE.Vector3().subVectors(playerPos, origin).setY(0).normalize();
          callbacks.onFirePinkVinyl?.(origin, dir, m.id);
        }
      } else {
        // BOOM-BOT lively rhythmic hop + melee wind-up on beat!
        if (m.pos.y <= m.baseY + 0.05 && dist > 2.6) {
          m.vel.y = 7.2; // Energetic Cuphead-style beat hop toward KAI!
        }
        if (dist < 3.4) {
          if (m.attackTelegraph > 0) {
            m.attackTelegraph = 0;
            callbacks.onMeleeAttack?.(m);
          } else if (m.beatCounter % 2 === 0) {
            m.attackTelegraph = 0.52;
            callbacks.onTelegraph?.(m.pos, 'WATCH OUT!', '#ff5a1f');
          }
        }
      }
    }
  }

  damageMob(mob, amount, knockDir, launchUp, particles) {
    if (mob.dead) return false;
    mob.hp = Math.max(0, mob.hp - amount);
    mob.hitFlash = 0.16;
    mob.stunTimer = 0.32;
    mob.attackTelegraph = 0;

    // Juicy knockback + air juggle!
    if (knockDir) {
      mob.vel.x = knockDir.x * 7.5;
      mob.vel.z = knockDir.z * 7.5;
    }
    if (launchUp > 0) {
      mob.vel.y = Math.max(mob.vel.y, launchUp);
    }

    const ratio = Math.max(0.001, mob.hp / mob.maxHp);
    mob.hpFill.scale.x = ratio;
    mob.hpFill.position.x = -(1 - ratio) * 0.65;

    // Knock micro-voxel sparks off mob!
    particles.burst(mob.pos.x, mob.pos.y + 1.2, mob.pos.z, {
      count: 14,
      colors: mob.type === 'vinyl' ? [PAL.MAGENTA_BRIGHT, PAL.TEAL_ARMOR, PAL.YELLOW] : [PAL.ORANGE, PAL.YELLOW, PAL.CHARCOAL],
      speedMin: 4, speedMax: 12, upBias: 5, sizeMin: 0.09, sizeMax: 0.18
    });

    if (mob.hp <= 0) {
      mob.dead = true;
      // EXPLODE INTO 105 COLORFUL TRUE-VOXEL CUBES!
      particles.burst(mob.pos.x, mob.pos.y + 1.1, mob.pos.z, {
        count: 105,
        colors: mob.type === 'vinyl'
          ? [PAL.TEAL_ARMOR, PAL.MAGENTA_BRIGHT, PAL.YELLOW, PAL.CYAN_BRIGHT, PAL.CHARCOAL]
          : [PAL.ORANGE, PAL.CHARCOAL, PAL.YELLOW, PAL.CYAN_BRIGHT, PAL.RED_CORE],
        speedMin: 5, speedMax: 18, upBias: 11, sizeMin: 0.1, sizeMax: 0.24, lifeMin: 1.0, lifeMax: 2.1
      });
      this.scene.remove(mob.model.root);
      this.mobs = this.mobs.filter((x) => x !== mob);
      return true; // Killed!
    }
    return false;
  }

  update(dt, playerPos, camera, beatFloat) {
    const sway = Math.sin(beatFloat * Math.PI);
    const beatDip = Math.pow(Math.max(0, 1 - (beatFloat % 1) * 2.4), 2);

    for (const m of this.mobs) {
      m.hitFlash = Math.max(0, m.hitFlash - dt);
      m.stunTimer = Math.max(0, m.stunTimer - dt);
      m.attackTelegraph = Math.max(0, m.attackTelegraph - dt);

      // Face player
      const dx = playerPos.x - m.pos.x;
      const dz = playerPos.z - m.pos.z;
      const dist = Math.hypot(dx, dz) || 0.001;
      m.yaw = Math.atan2(dx, dz);

      // AI Movement when not stunned
      if (m.stunTimer <= 0) {
        if (m.type === 'boom') {
          if (dist > 2.35) {
            const spd = 4.4;
            m.pos.x += (dx / dist) * spd * dt;
            m.pos.z += (dz / dist) * spd * dt;
          }
        } else {
          // VINYL-BOT keeps mid-range distance & strafes musically!
          const desired = 9.5;
          const radial = dist < desired - 1.5 ? -1 : (dist > desired + 1.5 ? 1 : 0);
          const strafe = Math.sin(beatFloat * 0.5 + m.id) * 2.4;
          m.pos.x += ((dx / dist) * radial * 3.5 + (-dz / dist) * strafe) * dt;
          m.pos.z += ((dz / dist) * radial * 3.5 + (dx / dist) * strafe) * dt;
        }
      }

      // Physics knockback + air juggle gravity (respects balcony baseY!)
      m.vel.y -= 28 * dt;
      m.pos.x += m.vel.x * dt;
      m.pos.y += m.vel.y * dt;
      m.pos.z += m.vel.z * dt;
      m.vel.x *= Math.pow(0.06, dt);
      m.vel.z *= Math.pow(0.06, dt);
      if (m.pos.y < m.baseY) {
        m.pos.y = m.baseY;
        m.vel.y = 0;
      }

      // Clamp inside active courtyard bounds (or fallback circular arena)
      if (this.activeBounds) {
        m.pos.x = Math.max(this.activeBounds.minX, Math.min(this.activeBounds.maxX, m.pos.x));
        m.pos.z = Math.max(this.activeBounds.minZ, Math.min(this.activeBounds.maxZ, m.pos.z));
      } else {
        const r = Math.hypot(m.pos.x, m.pos.z);
        if (r > ARENA_RADIUS - 1.6) {
          const s = (ARENA_RADIUS - 1.6) / r;
          m.pos.x *= s;
          m.pos.z *= s;
        }
      }

      // Separate overlapping mobs
      for (const o of this.mobs) {
        if (o === m) continue;
        const ox = m.pos.x - o.pos.x;
        const oz = m.pos.z - o.pos.z;
        const od = Math.hypot(ox, oz);
        if (od < 2.2 && od > 0.001) {
          m.pos.x += (ox / od) * (2.2 - od) * dt * 5;
          m.pos.z += (oz / od) * (2.2 - od) * dt * 5;
        }
      }

      // Beat-Groove Animation!
      m.model.root.position.copy(m.pos);
      if (m.hitFlash > 0) {
        m.model.root.position.x += (Math.random() - 0.5) * 0.25;
      }
      m.model.root.rotation.y = m.yaw;
      m.hpBg.lookAt(camera.position);

      if (m.type === 'vinyl') {
        m.model.parts.body.position.y = 1.45 + Math.sin(beatFloat * Math.PI * 2 + m.id) * 0.22;
        m.model.parts.body.rotation.z = sway * 0.16;
        m.model.parts.crown.rotation.y += dt * 9;
        const sc = m.attackTelegraph > 0 ? 1.18 : (1 + beatDip * 0.1);
        m.model.parts.body.scale.setScalar(sc);
      } else {
        m.model.parts.body.position.y = 6 * 0.085 + beatDip * 0.16;
        m.model.parts.body.rotation.z = sway * 0.14;
        const punchRaise = m.attackTelegraph > 0 ? -1.8 : -0.35 + sway * 0.35;
        m.model.parts.leftArm.rotation.x = punchRaise;
        m.model.parts.rightArm.rotation.x = m.attackTelegraph > 0 ? -1.8 : -0.35 - sway * 0.35;
        m.model.parts.leftLeg.rotation.x = sway * 0.4;
        m.model.parts.rightLeg.rotation.x = -sway * 0.4;
      }
    }
  }
}
