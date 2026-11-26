import * as THREE from 'three';

/**
 * Shared Hi-Fi RUSH cel-shaded toon gradient texture (3 crisp comic bands)
 */
let _toonGradient = null;
export function getToonGradient() {
  if (_toonGradient) return _toonGradient;
  const data = new Uint8Array([
    92, 92, 92, 255,     // Deep comic shadow band
    185, 185, 185, 255,  // Mid cel tone
    255, 255, 255, 255,  // Crisp bright highlight
    255, 255, 255, 255
  ]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  _toonGradient = tex;
  return _toonGradient;
}

let _sharedVoxelMat = null;
export function getSharedVoxelMaterial() {
  if (_sharedVoxelMat) return _sharedVoxelMat;
  _sharedVoxelMat = new THREE.MeshToonMaterial({
    vertexColors: true,
    gradientMap: getToonGradient(),
  });
  return _sharedVoxelMat;
}

let _sharedEmissiveMat = null;
export function getSharedEmissiveMaterial() {
  if (_sharedEmissiveMat) return _sharedEmissiveMat;
  _sharedEmissiveMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
  });
  return _sharedEmissiveMat;
}

let _sharedOutlineMat = null;
export function getSharedOutlineMaterial() {
  if (_sharedOutlineMat) return _sharedOutlineMat;
  _sharedOutlineMat = new THREE.MeshBasicMaterial({
    color: 0x0d0e15,
    side: THREE.BackSide,
  });
  return _sharedOutlineMat;
}

/**
 * True 3D Voxel Grid (X x Y x Z) with face-culled BufferGeometry compiler,
 * 4-corner per-vertex Ambient Occlusion (AO), emissive voxel separation,
 * comic ink outline hull generation, and live voxel carving/destruction!
 */
export class VoxelGrid {
  constructor(sx, sy, sz, voxelSize = 0.1) {
    this.sx = sx;
    this.sy = sy;
    this.sz = sz;
    this.voxelSize = voxelSize;
    this.size = sx * sy * sz;
    // 0 = empty; otherwise 0xRRGGBB + 1 (or stored in palette)
    this.data = new Uint32Array(this.size);
    this.emissive = new Uint8Array(this.size);
    this.count = 0;
  }

  clone() {
    const g = new VoxelGrid(this.sx, this.sy, this.sz, this.voxelSize);
    g.data.set(this.data);
    g.emissive.set(this.emissive);
    g.count = this.count;
    return g;
  }

  idx(x, y, z) {
    return x + this.sx * (y + this.sy * z);
  }

  inBounds(x, y, z) {
    return x >= 0 && x < this.sx && y >= 0 && y < this.sy && z >= 0 && z < this.sz;
  }

  set(x, y, z, colorHex, isEmissive = false) {
    x = Math.round(x);
    y = Math.round(y);
    z = Math.round(z);
    if (!this.inBounds(x, y, z)) return;
    const i = this.idx(x, y, z);
    const prev = this.data[i];
    if (colorHex === 0 || colorHex === null || colorHex === undefined) {
      if (prev !== 0) {
        this.data[i] = 0;
        this.emissive[i] = 0;
        this.count--;
      }
      return;
    }
    const stored = (colorHex & 0xffffff) + 1;
    if (prev === 0) this.count++;
    this.data[i] = stored;
    this.emissive[i] = isEmissive ? 1 : 0;
  }

  get(x, y, z) {
    if (!this.inBounds(x, y, z)) return 0;
    return this.data[this.idx(x, y, z)];
  }

  has(x, y, z) {
    if (!this.inBounds(x, y, z)) return false;
    return this.data[this.idx(x, y, z)] !== 0;
  }

  // --- Sculpting Helpers ---
  fillBox(x0, y0, z0, x1, y1, z1, color, emissive = false) {
    const ix0 = Math.max(0, Math.floor(Math.min(x0, x1)));
    const ix1 = Math.min(this.sx - 1, Math.floor(Math.max(x0, x1)));
    const iy0 = Math.max(0, Math.floor(Math.min(y0, y1)));
    const iy1 = Math.min(this.sy - 1, Math.floor(Math.max(y0, y1)));
    const iz0 = Math.max(0, Math.floor(Math.min(z0, z1)));
    const iz1 = Math.min(this.sz - 1, Math.floor(Math.max(z0, z1)));
    for (let z = iz0; z <= iz1; z++) {
      for (let y = iy0; y <= iy1; y++) {
        for (let x = ix0; x <= ix1; x++) {
          this.set(x, y, z, color, emissive);
        }
      }
    }
  }

  clearBox(x0, y0, z0, x1, y1, z1) {
    this.fillBox(x0, y0, z0, x1, y1, z1, 0, false);
  }

  fillEllipsoid(cx, cy, cz, rx, ry, rz, color, emissive = false) {
    const ix0 = Math.max(0, Math.floor(cx - rx));
    const ix1 = Math.min(this.sx - 1, Math.ceil(cx + rx));
    const iy0 = Math.max(0, Math.floor(cy - ry));
    const iy1 = Math.min(this.sy - 1, Math.ceil(cy + ry));
    const iz0 = Math.max(0, Math.floor(cz - rz));
    const iz1 = Math.min(this.sz - 1, Math.ceil(cz + rz));
    for (let z = iz0; z <= iz1; z++) {
      for (let y = iy0; y <= iy1; y++) {
        for (let x = ix0; x <= ix1; x++) {
          const dx = (x - cx) / rx;
          const dy = (y - cy) / ry;
          const dz = (z - cz) / rz;
          if (dx * dx + dy * dy + dz * dz <= 1.0) {
            this.set(x, y, z, color, emissive);
          }
        }
      }
    }
  }

  fillCylinderY(cx, y0, y1, cz, radius, color, emissive = false) {
    const iy0 = Math.max(0, Math.floor(Math.min(y0, y1)));
    const iy1 = Math.min(this.sy - 1, Math.floor(Math.max(y0, y1)));
    const r2 = radius * radius;
    const ix0 = Math.max(0, Math.floor(cx - radius));
    const ix1 = Math.min(this.sx - 1, Math.ceil(cx + radius));
    const iz0 = Math.max(0, Math.floor(cz - radius));
    const iz1 = Math.min(this.sz - 1, Math.ceil(cz + radius));
    for (let y = iy0; y <= iy1; y++) {
      for (let z = iz0; z <= iz1; z++) {
        for (let x = ix0; x <= ix1; x++) {
          const dx = x - cx;
          const dz = z - cz;
          if (dx * dx + dz * dz <= r2) {
            this.set(x, y, z, color, emissive);
          }
        }
      }
    }
  }

  fillCylinderZ(cx, cy, z0, z1, radius, color, emissive = false) {
    const iz0 = Math.max(0, Math.floor(Math.min(z0, z1)));
    const iz1 = Math.min(this.sz - 1, Math.floor(Math.max(z0, z1)));
    const r2 = radius * radius;
    const ix0 = Math.max(0, Math.floor(cx - radius));
    const ix1 = Math.min(this.sx - 1, Math.ceil(cx + radius));
    const iy0 = Math.max(0, Math.floor(cy - radius));
    const iy1 = Math.min(this.sy - 1, Math.ceil(cy + radius));
    for (let z = iz0; z <= iz1; z++) {
      for (let y = iy0; y <= iy1; y++) {
        for (let x = ix0; x <= ix1; x++) {
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy <= r2) {
            this.set(x, y, z, color, emissive);
          }
        }
      }
    }
  }

  fillRingZ(cx, cy, z0, z1, rInner, rOuter, color, emissive = false) {
    const iz0 = Math.max(0, Math.floor(Math.min(z0, z1)));
    const iz1 = Math.min(this.sz - 1, Math.floor(Math.max(z0, z1)));
    const rIn2 = rInner * rInner;
    const rOut2 = rOuter * rOuter;
    for (let z = iz0; z <= iz1; z++) {
      for (let y = Math.max(0, Math.floor(cy - rOuter)); y <= Math.min(this.sy - 1, Math.ceil(cy + rOuter)); y++) {
        for (let x = Math.max(0, Math.floor(cx - rOuter)); x <= Math.min(this.sx - 1, Math.ceil(cx + rOuter)); x++) {
          const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
          if (d2 >= rIn2 && d2 <= rOut2) {
            this.set(x, y, z, color, emissive);
          }
        }
      }
    }
  }

  /**
   * Paint 2D ASCII pixel art directly onto the front/back Z slice (great for faces, hazard signs, logos!)
   */
  stampPixelArtZ(originX, originY, z0, z1, rows, palette, emissiveChars = '') {
    const h = rows.length;
    for (let r = 0; r < h; r++) {
      const row = rows[r];
      const y = originY + (h - 1 - r);
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === '.' || ch === ' ') continue;
        const col = palette[ch];
        if (col === undefined) continue;
        const isEm = emissiveChars.includes(ch);
        for (let z = z0; z <= z1; z++) {
          this.set(originX + c, y, z, col, isEm);
        }
      }
    }
  }

  /**
   * Carve a blast crater in local voxel coordinates, returning removed voxels
   * as [{x, y, z, color, emissive}] so we can spawn matching physics debris cubes!
   */
  carveSphere(lx, ly, lz, radius, maxReturn = 180) {
    const removed = [];
    const r2 = radius * radius;
    const ix0 = Math.max(0, Math.floor(lx - radius));
    const ix1 = Math.min(this.sx - 1, Math.ceil(lx + radius));
    const iy0 = Math.max(0, Math.floor(ly - radius));
    const iy1 = Math.min(this.sy - 1, Math.ceil(ly + radius));
    const iz0 = Math.max(0, Math.floor(lz - radius));
    const iz1 = Math.min(this.sz - 1, Math.ceil(lz + radius));
    for (let z = iz0; z <= iz1; z++) {
      for (let y = iy0; y <= iy1; y++) {
        for (let x = ix0; x <= ix1; x++) {
          const dx = x - lx;
          const dy = y - ly;
          const dz = z - lz;
          if (dx * dx + dy * dy + dz * dz <= r2) {
            const i = this.idx(x, y, z);
            const val = this.data[i];
            if (val !== 0) {
              const em = this.emissive[i] === 1;
              this.data[i] = 0;
              this.emissive[i] = 0;
              this.count--;
              if (removed.length < maxReturn) {
                removed.push({ x, y, z, color: val - 1, emissive: em });
              }
            }
          }
        }
      }
    }
    return removed;
  }

  /**
   * Extract sampled occupied voxels (for total shatter explosion!)
   */
  sampleAllVoxels(maxCount = 260) {
    const out = [];
    const step = Math.max(1, Math.floor(this.count / maxCount));
    let seen = 0;
    for (let z = 0; z < this.sz; z++) {
      for (let y = 0; y < this.sy; y++) {
        for (let x = 0; x < this.sx; x++) {
          const i = this.idx(x, y, z);
          const val = this.data[i];
          if (val !== 0) {
            if (seen % step === 0 && out.length < maxCount) {
              out.push({ x, y, z, color: val - 1, emissive: this.emissive[i] === 1 });
            }
            seen++;
          }
        }
      }
    }
    return out;
  }

  /**
   * Compile this VoxelGrid into crisp face-culled BufferGeometries (solid + emissive)
   * with 4-corner per-vertex Ambient Occlusion (AO) for sculptural depth.
   * pivotMode: 'bottom-center' | 'center'
   */
  buildGeometries(pivotMode = 'bottom-center', customPivot = null) {
    const vs = this.voxelSize;
    let ox = -this.sx * 0.5;
    let oy = pivotMode === 'center' ? -this.sy * 0.5 : 0;
    let oz = -this.sz * 0.5;
    if (customPivot) {
      ox = -customPivot[0];
      oy = -customPivot[1];
      oz = -customPivot[2];
    }

    const solid = { pos: [], norm: [], col: [], idx: [], vCount: 0 };
    const emiss = { pos: [], norm: [], col: [], idx: [], vCount: 0 };

    // 6 neighbor faces: normal, 4 quad corners, tangent axes for AO sampling
    const FACES = [
      { // +X
        n: [1, 0, 0],
        corners: [
          [1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]
        ],
        u: [0, 0, 1], v: [0, 1, 0], shade: 0.92
      },
      { // -X
        n: [-1, 0, 0],
        corners: [
          [0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]
        ],
        u: [0, 0, -1], v: [0, 1, 0], shade: 0.84
      },
      { // +Y (top)
        n: [0, 1, 0],
        corners: [
          [0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]
        ],
        u: [1, 0, 0], v: [0, 0, -1], shade: 1.06
      },
      { // -Y (bottom)
        n: [0, -1, 0],
        corners: [
          [0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]
        ],
        u: [1, 0, 0], v: [0, 0, 1], shade: 0.65
      },
      { // +Z (front)
        n: [0, 0, 1],
        corners: [
          [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]
        ],
        u: [1, 0, 0], v: [0, 1, 0], shade: 0.98
      },
      { // -Z (back)
        n: [0, 0, -1],
        corners: [
          [1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]
        ],
        u: [-1, 0, 0], v: [0, 1, 0], shade: 0.80
      }
    ];

    const aoLookup = [1.0, 0.82, 0.68, 0.54];
    const tmpColor = new THREE.Color();

    for (let z = 0; z < this.sz; z++) {
      for (let y = 0; y < this.sy; y++) {
        for (let x = 0; x < this.sx; x++) {
          const i = this.idx(x, y, z);
          const val = this.data[i];
          if (val === 0) continue;

          const isEm = this.emissive[i] === 1;
          const bucket = isEm ? emiss : solid;
          tmpColor.setHex(val - 1);
          const baseR = tmpColor.r;
          const baseG = tmpColor.g;
          const baseB = tmpColor.b;

          for (let f = 0; f < 6; f++) {
            const face = FACES[f];
            const nx = x + face.n[0];
            const ny = y + face.n[1];
            const nz = z + face.n[2];
            if (this.has(nx, ny, nz)) continue; // Culled hidden internal face!

            const vStart = bucket.vCount;
            const aoVals = [1, 1, 1, 1];

            for (let c = 0; c < 4; c++) {
              const corner = face.corners[c];
              const vx = (x + corner[0] + ox) * vs;
              const vy = (y + corner[1] + oy) * vs;
              const vz = (z + corner[2] + oz) * vs;

              bucket.pos.push(vx, vy, vz);
              bucket.norm.push(face.n[0], face.n[1], face.n[2]);

              let ao = 1.0;
              if (!isEm) {
                // Compute 4-corner voxel AO in neighbor plane
                const sxDir = corner[0] === 0 ? -1 : 1;
                const syDir = corner[1] === 0 ? -1 : 1;
                const szDir = corner[2] === 0 ? -1 : 1;

                let s1 = 0, s2 = 0, cr = 0;
                if (face.n[0] !== 0) {
                  s1 = this.has(nx, y + syDir, z) ? 1 : 0;
                  s2 = this.has(nx, y, z + szDir) ? 1 : 0;
                  cr = (s1 && s2) ? 1 : (this.has(nx, y + syDir, z + szDir) ? 1 : 0);
                } else if (face.n[1] !== 0) {
                  s1 = this.has(x + sxDir, ny, z) ? 1 : 0;
                  s2 = this.has(x, ny, z + szDir) ? 1 : 0;
                  cr = (s1 && s2) ? 1 : (this.has(x + sxDir, ny, z + szDir) ? 1 : 0);
                } else {
                  s1 = this.has(x + sxDir, y, nz) ? 1 : 0;
                  s2 = this.has(x, y + syDir, nz) ? 1 : 0;
                  cr = (s1 && s2) ? 1 : (this.has(x + sxDir, y + syDir, nz) ? 1 : 0);
                }
                const occ = (s1 && s2) ? 3 : (s1 + s2 + cr);
                ao = aoLookup[occ] * face.shade;
              }
              aoVals[c] = ao;

              bucket.col.push(
                Math.min(1, baseR * ao),
                Math.min(1, baseG * ao),
                Math.min(1, baseB * ao)
              );
            }

            // Flip quad diagonal to avoid AO interpolation artifacts
            if (aoVals[0] + aoVals[2] > aoVals[1] + aoVals[3]) {
              bucket.idx.push(vStart, vStart + 1, vStart + 2, vStart, vStart + 2, vStart + 3);
            } else {
              bucket.idx.push(vStart + 1, vStart + 2, vStart + 3, vStart + 1, vStart + 3, vStart);
            }
            bucket.vCount += 4;
          }
        }
      }
    }

    const toGeo = (b) => {
      if (b.vCount === 0) return null;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.norm, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      geo.setIndex(b.idx);
      geo.computeBoundingSphere();
      return geo;
    };

    return {
      solidGeo: toGeo(solid),
      emissiveGeo: toGeo(emiss),
      offset: new THREE.Vector3(ox * vs, oy * vs, oz * vs),
    };
  }

  /**
   * Build a Three.js Group containing the cel-shaded solid mesh, emissive mesh,
   * and optional Hi-Fi RUSH crisp black comic ink outline mesh!
   */
  createMeshGroup({
    pivotMode = 'bottom-center',
    customPivot = null,
    outline = true,
    outlineThickness = 0.032,
    castShadow = true,
    receiveShadow = true,
  } = {}) {
    const group = new THREE.Group();
    const { solidGeo, emissiveGeo, offset } = this.buildGeometries(pivotMode, customPivot);
    group.userData.voxelOffset = offset;
    group.userData.voxelSize = this.voxelSize;

    if (solidGeo) {
      const solidMesh = new THREE.Mesh(solidGeo, getSharedVoxelMaterial());
      solidMesh.castShadow = castShadow;
      solidMesh.receiveShadow = receiveShadow;
      solidMesh.name = 'voxelSolid';
      group.add(solidMesh);

      if (outline) {
        // Build smoothly extruded inverted-hull ink outline geometry
        const outGeo = buildSmoothOutlineGeometry(solidGeo, outlineThickness);
        const outMesh = new THREE.Mesh(outGeo, getSharedOutlineMaterial());
        outMesh.name = 'voxelOutline';
        group.add(outMesh);
      }
    }

    if (emissiveGeo) {
      const emMesh = new THREE.Mesh(emissiveGeo, getSharedEmissiveMaterial());
      emMesh.name = 'voxelEmissive';
      group.add(emMesh);
    }

    return group;
  }
}

/**
 * Averages vertex normals at shared positions so inverted-hull comic ink outlines
 * extrude seamlessly without cracking on sharp 90-degree voxel edges!
 */
export function buildSmoothOutlineGeometry(sourceGeo, thickness = 0.03) {
  const posAttr = sourceGeo.getAttribute('position');
  const normAttr = sourceGeo.getAttribute('normal');
  const count = posAttr.count;

  const avgMap = new Map();
  for (let i = 0; i < count; i++) {
    const key = `${Math.round(posAttr.getX(i) * 1000)},${Math.round(posAttr.getY(i) * 1000)},${Math.round(posAttr.getZ(i) * 1000)}`;
    let acc = avgMap.get(key);
    if (!acc) {
      acc = [0, 0, 0];
      avgMap.set(key, acc);
    }
    acc[0] += normAttr.getX(i);
    acc[1] += normAttr.getY(i);
    acc[2] += normAttr.getZ(i);
  }

  const newPos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const key = `${Math.round(x * 1000)},${Math.round(y * 1000)},${Math.round(z * 1000)}`;
    const acc = avgMap.get(key);
    const len = Math.hypot(acc[0], acc[1], acc[2]) || 1;
    newPos[i * 3] = x + (acc[0] / len) * thickness;
    newPos[i * 3 + 1] = y + (acc[1] / len) * thickness;
    newPos[i * 3 + 2] = z + (acc[2] / len) * thickness;
  }

  const outGeo = new THREE.BufferGeometry();
  outGeo.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
  outGeo.setIndex(sourceGeo.getIndex());
  return outGeo;
}
