import * as THREE from 'three';

/**
 * A live Destructible True-Voxel Prop in the arena!
 * - Built from a live VoxelGrid
 * - Taking a hit carves a REAL 3D voxel crater out of its geometry, remeshes it live,
 *   and launches matching colored micro-voxel physics cubes!
 * - Dropping to 0 HP shatters the entire remaining prop into a massive fountain of voxel blocks!
 * - Bounces subtly to the 128 BPM beat!
 */
export class DestructibleProp {
  constructor({ id, type, grid, position, rotationY = 0, hp = 60, radius = 1.15, isPylon = false, scene }) {
    this.id = id;
    this.type = type;
    this.grid = grid;
    this.hp = hp;
    this.maxHp = hp;
    this.radius = radius;
    this.isPylon = isPylon;
    this.destroyed = false;
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.rotation.y = rotationY;

    this.meshGroup = null;
    this.rebuildMesh();
    scene.add(this.group);

    this.shakeTimer = 0;
    this.basePos = position.clone();
    this.beatPulse = 0;
  }

  rebuildMesh() {
    if (this.meshGroup) {
      this.group.remove(this.meshGroup);
      this.meshGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
      });
    }
    this.meshGroup = this.grid.createMeshGroup({
      pivotMode: 'bottom-center',
      outline: true,
      outlineThickness: 0.032,
      castShadow: true,
      receiveShadow: true,
    });
    this.group.add(this.meshGroup);
  }

  /**
   * Apply damage & carve real voxels at world-space impactPoint!
   * Returns { destroyed, voxelsRemoved }
   */
  takeDamage(amount, impactWorldPos, particles, blastPower = 11) {
    if (this.destroyed) return { destroyed: false, voxelsRemoved: 0 };

    this.hp -= amount;
    this.shakeTimer = 0.22;
    this.group.updateMatrixWorld(true);

    const offset = this.meshGroup.userData.voxelOffset;
    const vs = this.grid.voxelSize;

    if (this.hp <= 0 || this.grid.count < 40) {
      // TOTAL SHATTER! Turn entire remaining voxel grid into flying cubes!
      this.destroyed = true;
      const allVox = this.grid.sampleAllVoxels(200);
      particles.spawnVoxelDebris(
        allVox,
        this.group.matrixWorld,
        offset,
        vs,
        impactWorldPos,
        blastPower * 1.25
      );
      this.destroy();
      return { destroyed: true, voxelsRemoved: allVox.length };
    }

    // PARTIAL CARVE! Convert world impact point into local VoxelGrid coordinates
    const invMat = new THREE.Matrix4().copy(this.group.matrixWorld).invert();
    const localHit = impactWorldPos.clone().applyMatrix4(invMat);
    const vx = (localHit.x - offset.x) / vs;
    const vy = Math.max(2, Math.min(this.grid.sy - 2, (localHit.y - offset.y) / vs));
    const vz = (localHit.z - offset.z) / vs;

    const craterRadius = 5.2 + Math.random() * 2.2;
    const removed = this.grid.carveSphere(vx, vy, vz, craterRadius, 120);
    if (removed.length > 0) {
      particles.spawnVoxelDebris(
        removed,
        this.group.matrixWorld,
        offset,
        vs,
        impactWorldPos,
        blastPower
      );
      this.rebuildMesh();
    }
    return { destroyed: false, voxelsRemoved: removed.length };
  }

  onBeat() {
    this.beatPulse = 1.0;
  }

  update(dt) {
    if (this.destroyed) return;

    if (this.beatPulse > 0) {
      this.beatPulse = Math.max(0, this.beatPulse - dt * 5.5);
    }
    const bounce = this.beatPulse * (this.type === 'amp' || this.isPylon ? 0.08 : 0.035);
    this.group.scale.set(1 + bounce * 0.45, 1 + bounce, 1 + bounce * 0.45);

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const mag = this.shakeTimer * 0.55;
      this.group.position.set(
        this.basePos.x + (Math.random() - 0.5) * mag,
        this.basePos.y,
        this.basePos.z + (Math.random() - 0.5) * mag
      );
    } else {
      this.group.position.copy(this.basePos);
    }
  }

  destroy() {
    if (this.meshGroup) {
      this.meshGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
      });
    }
    this.scene.remove(this.group);
  }
}
