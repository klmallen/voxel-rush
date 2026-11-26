import * as THREE from 'three';

const MAX_PARTICLES = 2600;

/**
 * High-performance InstancedMesh Micro-Voxel Particle Block Engine!
 * Every impact, guitar slash, parry burst, destroyed prop crate/speaker/pillar,
 * and boss explosion turns into real tumbling 3D voxel cubes with physics bounce!
 */
export class VoxelParticleSystem {
  constructor(scene) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshToonMaterial({
      color: 0xffffff,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;

    // Initialize colors buffer
    const defaultCol = new THREE.Color(0xffffff);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.mesh.setColorAt(i, defaultCol);
    }
    this.mesh.instanceColor.needsUpdate = true;

    scene.add(this.mesh);

    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0, y: -100, z: 0,
        vx: 0, vy: 0, vz: 0,
        rx: 0, ry: 0, rz: 0,
        vrx: 0, vry: 0, vrz: 0,
        size: 0.12,
        life: 0,
        maxLife: 1,
        gravity: 28,
        bounce: 0.48,
        drag: 0.985,
        emissivePop: false,
      });
    }
    this.cursor = 0;
    this.activeCount = 0;
    this.totalSpawned = 0;

    this._dummy = new THREE.Object3D();
    this._color = new THREE.Color();

    // Hide all initially
    this._dummy.position.set(0, -500, 0);
    this._dummy.scale.set(0, 0, 0);
    this._dummy.updateMatrix();
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.mesh.setMatrixAt(i, this._dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  spawnCube({
    x, y, z,
    vx = 0, vy = 5, vz = 0,
    size = 0.14,
    color = 0xff5a1f,
    life = 1.4,
    gravity = 28,
    bounce = 0.45,
    drag = 0.985,
  }) {
    const idx = this.cursor;
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;
    const p = this.particles[idx];
    if (!p.active) this.activeCount++;
    p.active = true;
    p.x = x; p.y = y; p.z = z;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.rx = Math.random() * 6.28;
    p.ry = Math.random() * 6.28;
    p.rz = Math.random() * 6.28;
    p.vrx = (Math.random() - 0.5) * 14;
    p.vry = (Math.random() - 0.5) * 14;
    p.vrz = (Math.random() - 0.5) * 14;
    p.size = size;
    p.life = life;
    p.maxLife = life;
    p.gravity = gravity;
    p.bounce = bounce;
    p.drag = drag;
    this.totalSpawned++;

    this._color.setHex(color);
    this.mesh.setColorAt(idx, this._color);
    this.mesh.instanceColor.needsUpdate = true;
  }

  /**
   * Burst Hi-Fi RUSH cel-colored micro-voxel cubes at an impact or slash!
   */
  burst(x, y, z, {
    count = 24,
    colors = [0x00f0ff, 0xff5a1f, 0xffe600, 0xffffff],
    speedMin = 4,
    speedMax = 14,
    upBias = 6,
    sizeMin = 0.08,
    sizeMax = 0.2,
    lifeMin = 0.45,
    lifeMax = 1.1,
    gravity = 24,
    spread = 0.4,
  } = {}) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.2) * Math.PI * 0.7;
      const spd = speedMin + Math.random() * (speedMax - speedMin);
      const col = colors[(Math.random() * colors.length) | 0];
      this.spawnCube({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        z: z + (Math.random() - 0.5) * spread,
        vx: Math.cos(ang) * Math.cos(elev) * spd,
        vy: Math.sin(elev) * spd + upBias * Math.random(),
        vz: Math.sin(ang) * Math.cos(elev) * spd,
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
        color: col,
        life: lifeMin + Math.random() * (lifeMax - lifeMin),
        gravity,
      });
    }
  }

  /**
   * Spawn physical tumbling micro-voxel debris directly from carved/shattered VoxelGrid cells!
   */
  spawnVoxelDebris(removedVoxels, worldMatrix, voxelOffset, voxelSize, blastOrigin, blastPower = 11) {
    const tmpPos = new THREE.Vector3();
    for (let i = 0; i < removedVoxels.length; i++) {
      const v = removedVoxels[i];
      tmpPos.set(
        voxelOffset.x + (v.x + 0.5) * voxelSize,
        voxelOffset.y + (v.y + 0.5) * voxelSize,
        voxelOffset.z + (v.z + 0.5) * voxelSize
      );
      tmpPos.applyMatrix4(worldMatrix);

      let dx = tmpPos.x - blastOrigin.x;
      let dy = tmpPos.y - blastOrigin.y;
      let dz = tmpPos.z - blastOrigin.z;
      const d = Math.hypot(dx, dy, dz) || 0.1;
      dx /= d; dy /= d; dz /= d;

      const pwr = blastPower * (0.55 + Math.random() * 0.9);
      this.spawnCube({
        x: tmpPos.x,
        y: Math.max(0.1, tmpPos.y),
        z: tmpPos.z,
        vx: dx * pwr + (Math.random() - 0.5) * 4,
        vy: Math.max(2.5, dy * pwr + 3.5 + Math.random() * 5),
        vz: dz * pwr + (Math.random() - 0.5) * 4,
        size: voxelSize * (1.05 + Math.random() * 0.45),
        color: v.color,
        life: 1.5 + Math.random() * 1.4,
        gravity: 30,
        bounce: 0.48,
      });
    }
  }

  /**
   * Spawn an arc of glowing slash-trail micro-voxels!
   */
  spawnSlashArc(origin, yaw, radius, colors = [0x00f0ff, 0xffe600, 0xff5a1f], count = 20) {
    for (let i = 0; i < count; i++) {
      const t = (i / (count - 1)) - 0.5;
      const a = yaw + t * 2.1;
      const r = radius * (0.75 + Math.random() * 0.35);
      const sx = origin.x + Math.sin(a) * r;
      const sz = origin.z + Math.cos(a) * r;
      const sy = origin.y + 1.05 + t * 0.55 + (Math.random() - 0.5) * 0.25;
      this.spawnCube({
        x: sx, y: sy, z: sz,
        vx: Math.sin(a) * (3 + Math.random() * 4),
        vy: 1.5 + Math.random() * 3,
        vz: Math.cos(a) * (3 + Math.random() * 4),
        size: 0.11 + Math.random() * 0.11,
        color: colors[i % colors.length],
        life: 0.28 + Math.random() * 0.22,
        gravity: 8,
        bounce: 0.2,
      });
    }
  }

  update(dt) {
    const dummy = this._dummy;
    let dirty = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirty = true;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.activeCount--;
        dummy.position.set(0, -500, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        this.mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      const half = p.size * 0.5;
      if (p.y < half) {
        p.y = half;
        p.vy = -p.vy * p.bounce;
        p.vx *= 0.78;
        p.vz *= 0.78;
        p.vrx *= 0.72;
        p.vry *= 0.72;
        p.vrz *= 0.72;
      }

      p.vx *= p.drag;
      p.vz *= p.drag;

      p.rx += p.vrx * dt;
      p.ry += p.vry * dt;
      p.rz += p.vrz * dt;

      // Shrink smoothly during final 25% of lifetime
      const t = p.life / p.maxLife;
      const scaleFactor = t < 0.25 ? (t / 0.25) : 1.0;
      const s = p.size * scaleFactor;

      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx, p.ry, p.rz);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }

    if (dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
