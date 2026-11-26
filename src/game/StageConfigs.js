import { PAL } from '../voxel/VoxelModels.js';

/**
 * 4-STAGE WORLD TOUR CAMPAIGN CONFIGURATION
 * Each stage features:
 * - Distinct musical genre & BPM (locked to the entire world & boss AI!)
 * - Distinct cel-shaded lighting, sky fog, floor neon inlays & voxel prop mood
 * - Curated Act 1 Mob Waves (onboarding in Stage 1, escalating gauntlets in Stages 2-4)
 * - Unique Cuphead-style Boss Variant (visual color theme, HP, signature attack pool!)
 */
export const STAGES = [
  {
    id: 0,
    code: 'STAGE 01',
    name: 'SOUNDCHECK GARAGE',
    cnName: '第一关：废土排练车间',
    subtitle: '新手试音热身 · 放克朋克摇滚',
    trackId: 'funkPunk',
    bpm: 122,
    genreTag: '🎸 FUNK PUNK · 122 BPM',
    isOnboarding: true,
    theme: {
      sky: 0x162236,
      fog: 0x162236,
      hemiTop: 0xa9f7ff,
      hemiBot: 0x2b1d3d,
      keyColor: 0xfff4e0,
      rimColor: 0x00f0ff,
      bossLight: 0xff5a1f,
      ringColorA: PAL.CYAN_BRIGHT,
      ringColorB: PAL.YELLOW,
      floorTileA: 0x2f3950,
      floorTileB: 0x212838,
      floorRingInner: PAL.CYAN_BRIGHT,
      floorRingOuter: PAL.ORANGE_BRIGHT,
    },
    boss: {
      name: 'REX-808',
      title: '音箱泰坦',
      baseHp: 1150,
      phases: 2, // Friendly 2-phase Stage 1 Boss!
      tint: null,
      p1Pool: ['FIST_SLAM', 'VINYL_VOLLEY', 'FIST_SLAM', 'SWEEP_PUNCH'],
      p2Pool: ['PYLON_DROP', 'VINYL_VOLLEY', 'LASER_SWEEP', 'FIST_SLAM'],
      p3Pool: ['PARRY_CLASH', 'FLOOR_ERUPTION', 'NOTE_SPIRAL'],
    },
    waves: [
      {
        badge: 'STAGE 01 · 教学 1/4（基础四连）',
        title: '🎸 击败 2 只音箱小怪：练习 J-J-J-J 节拍四连!',
        desc: '踩着脚下收缩的黄色节拍环，按 [J/左键] 连打四下触发 BEAT HIT! 终结技，把小怪炸成满地体素方块！',
        spawns: [
          { type: 'boom', x: -3.6, z: 0.5, hp: 90 },
          { type: 'boom', x: 3.6,  z: 0.5, hp: 90 },
        ]
      },
      {
        badge: 'STAGE 01 · 教学 2/4（衍生连招 & 砸地破体素）',
        title: '💥 砸裂地面：试试 J→J→K 或 跳起+K 坠地重劈!',
        desc: '轻击后接 [K] 发动「音浪裂地重砸」，或 [SPACE→K] 空中下劈！地面会实时炸出真 3D 体素大坑并露出地下发光电路！',
        spawns: [
          { type: 'boom', x: -4.2, z: -1.0, hp: 105 },
          { type: 'boom', x: 4.2,  z: -1.0, hp: 105 },
        ]
      },
      {
        badge: 'STAGE 01 · 教学 3/4（粉色弹反 & 切换乐器）',
        title: '💖 弹反唱片炮手 [F] + 切乐器 [1/2/3]!',
        desc: '浮空唱片炮手会发射粉色唱片！靠近时按 [F/E] 直接弹回秒杀，按 [1/2/3] 随时切换吉他/键盘斧/贝斯巨锤！',
        spawns: [
          { type: 'vinyl', x: -5.5, z: -3.5, hp: 65 },
          { type: 'vinyl', x: 5.5,  z: -3.5, hp: 65 },
        ]
      },
      {
        badge: 'STAGE 01 · 教学 4/4（满能清场 → Boss 降临）',
        title: '⚡ 满能按 [Q] 过载激光清场 — 音箱泰坦即将空降!',
        desc: 'Reverb 能量已充满！按 [Q] 释放吉他激光横扫小怪军团，清场后迎接第一关 Boss REX-808 空降！',
        grantFullReverb: true,
        spawns: [
          { type: 'boom',  x: -3.8, z: -1.5, hp: 85 },
          { type: 'boom',  x: 3.8,  z: -1.5, hp: 85 },
          { type: 'vinyl', x: -7.2, z: -5.0, hp: 65 },
          { type: 'vinyl', x: 7.2,  z: -5.0, hp: 65 },
        ]
      }
    ]
  },

  {
    id: 1,
    code: 'STAGE 02',
    name: 'NEON SYNTH ROOFTOP',
    cnName: '第二关：赛博霓虹天台',
    subtitle: '电音弹幕狂潮 · 合成器浪潮摇滚',
    trackId: 'cyberSynth',
    bpm: 132,
    genreTag: '🎹 CYBER SYNTH · 132 BPM',
    isOnboarding: false,
    theme: {
      sky: 0x1b1138,
      fog: 0x1b1138,
      hemiTop: 0xff94e8,
      hemiBot: 0x120b29,
      keyColor: 0xe6f0ff,
      rimColor: 0xff2a85,
      bossLight: 0x00f0ff,
      ringColorA: PAL.MAGENTA_BRIGHT,
      ringColorB: PAL.CYAN_BRIGHT,
      floorTileA: 0x2c1d4d,
      floorTileB: 0x1c1236,
      floorRingInner: PAL.MAGENTA_BRIGHT,
      floorRingOuter: PAL.CYAN_BRIGHT,
    },
    boss: {
      name: 'DJ VOLT-909',
      title: '霓虹电音领主',
      baseHp: 1450,
      phases: 3,
      tint: 0xd99bff,
      p1Pool: ['VINYL_VOLLEY', 'LASER_SWEEP', 'VINYL_VOLLEY', 'FIST_SLAM'],
      p2Pool: ['LASER_SWEEP', 'NOTE_SPIRAL', 'PYLON_DROP', 'VINYL_VOLLEY'],
      p3Pool: ['NOTE_SPIRAL', 'PARRY_CLASH', 'LASER_SWEEP', 'FLOOR_ERUPTION'],
    },
    waves: [
      {
        badge: 'STAGE 02 · WAVE 1/2',
        title: '🎹 霓虹天台突袭：击破唱片炮手编队!',
        desc: '3 架浮空唱片炮手与 2 只先锋杂兵已封锁天台！多用 [F] 粉色弹反秒杀炮手并攒满大招能量！',
        spawns: [
          { type: 'vinyl', x: -6.5, z: -4.5, hp: 75 },
          { type: 'vinyl', x: 0.0,  z: -6.0, hp: 75 },
          { type: 'vinyl', x: 6.5,  z: -4.5, hp: 75 },
          { type: 'boom',  x: -3.2, z: 0.2,  hp: 105 },
          { type: 'boom',  x: 3.2,  z: 0.2,  hp: 105 },
        ]
      },
      {
        badge: 'STAGE 02 · WAVE 2/2',
        title: '⚡ 电音护卫队全员出击 — 击溃后 Boss 登场!',
        desc: '利用 [2] 键盘斧高速广域斩击 + [SHIFT→J] 冲刺斩快速清场，准备迎战 DJ VOLT-909！',
        spawns: [
          { type: 'boom',  x: -5.5, z: -1.0, hp: 120 },
          { type: 'boom',  x: 0.0,  z: -2.0, hp: 120 },
          { type: 'boom',  x: 5.5,  z: -1.0, hp: 120 },
          { type: 'vinyl', x: -7.5, z: -5.5, hp: 80 },
          { type: 'vinyl', x: 7.5,  z: -5.5, hp: 80 },
        ]
      }
    ]
  },

  {
    id: 2,
    code: 'STAGE 03',
    name: 'MOLTEN METAL FOUNDRY',
    cnName: '第三关：重金属熔炉舞台',
    subtitle: '碎地重拳狂轰 · 工业重金属摇滚',
    trackId: 'industrialMetal',
    bpm: 140,
    genreTag: '🔥 METAL THRASH · 140 BPM',
    isOnboarding: false,
    theme: {
      sky: 0x2c1115,
      fog: 0x2c1115,
      hemiTop: 0xffb36b,
      hemiBot: 0x1a0808,
      keyColor: 0xffd2a6,
      rimColor: 0xff5a1f,
      bossLight: 0xff2233,
      ringColorA: PAL.ORANGE_BRIGHT,
      ringColorB: PAL.RED_CORE,
      floorTileA: 0x3b2226,
      floorTileB: 0x261518,
      floorRingInner: PAL.ORANGE_BRIGHT,
      floorRingOuter: PAL.YELLOW,
    },
    boss: {
      name: 'VULCAN-MAX',
      title: '熔炉重金属暴君',
      baseHp: 1700,
      phases: 3,
      tint: 0xff9d7a,
      p1Pool: ['FIST_SLAM', 'SWEEP_PUNCH', 'FIST_SLAM', 'VINYL_VOLLEY'],
      p2Pool: ['FIST_SLAM', 'PYLON_DROP', 'FLOOR_ERUPTION', 'SWEEP_PUNCH'],
      p3Pool: ['FLOOR_ERUPTION', 'FIST_SLAM', 'PARRY_CLASH', 'NOTE_SPIRAL'],
    },
    waves: [
      {
        badge: 'STAGE 03 · WAVE 1/2',
        title: '🔥 140 BPM 重金属狂飙：粉碎重装拳击群!',
        desc: '推荐切换 [3] 贝斯巨锤配合 J→J→K 裂地重砸，一举凿碎重装小怪与整个熔炉地板！',
        spawns: [
          { type: 'boom', x: -6.0, z: -2.0, hp: 135 },
          { type: 'boom', x: -2.0, z: -4.0, hp: 135 },
          { type: 'boom', x: 2.0,  z: -4.0, hp: 135 },
          { type: 'boom', x: 6.0,  z: -2.0, hp: 135 },
        ]
      },
      {
        badge: 'STAGE 03 · WAVE 2/2',
        title: '💥 熔炉精英混合小队 — 突破进入 Boss 战!',
        desc: '重装拳击手 + 双炮台夹击！善用 [SPACE→K] 空中重劈控场与 [Q] 过载激光破阵！',
        spawns: [
          { type: 'boom',  x: -4.5, z: 0.0,  hp: 140 },
          { type: 'boom',  x: 4.5,  z: 0.0,  hp: 140 },
          { type: 'boom',  x: 0.0,  z: -3.5, hp: 150 },
          { type: 'vinyl', x: -8.0, z: -6.0, hp: 85 },
          { type: 'vinyl', x: 8.0,  z: -6.0, hp: 85 },
        ]
      }
    ]
  },

  {
    id: 3,
    code: 'STAGE 04',
    name: 'FINAL ENCORE ARENA',
    cnName: '第四关：终极安可巨蛋',
    subtitle: '全明星总决战 · 铜管放克摇滚',
    trackId: 'bigBandRock',
    bpm: 136,
    genreTag: '🎺 BIG-BAND ROCK · 136 BPM',
    isOnboarding: false,
    theme: {
      sky: 0x101c2e,
      fog: 0x101c2e,
      hemiTop: 0xffe999,
      hemiBot: 0x241436,
      keyColor: 0xfff8e6,
      rimColor: 0xffe600,
      bossLight: 0xff2a85,
      ringColorA: PAL.YELLOW,
      ringColorB: PAL.MAGENTA_BRIGHT,
      floorTileA: 0x2b344d,
      floorTileB: 0x1c2338,
      floorRingInner: PAL.YELLOW,
      floorRingOuter: PAL.MAGENTA_BRIGHT,
    },
    boss: {
      name: 'OMEGA-808',
      title: '终极音箱帝王',
      baseHp: 2100,
      phases: 3,
      tint: 0xffe58a,
      p1Pool: ['FIST_SLAM', 'VINYL_VOLLEY', 'LASER_SWEEP', 'SWEEP_PUNCH'],
      p2Pool: ['PYLON_DROP', 'LASER_SWEEP', 'NOTE_SPIRAL', 'FIST_SLAM'],
      p3Pool: ['PARRY_CLASH', 'FLOOR_ERUPTION', 'NOTE_SPIRAL', 'PARRY_CLASH', 'LASER_SWEEP'],
    },
    waves: [
      {
        badge: 'FINAL STAGE · 安可前哨战',
        title: '🎺 终极巨蛋全明星热身：击溃皇家禁卫团!',
        desc: '6 只全编队精英机器人拦截舞台！展现你的最高 Style 评级，随后迎战最终帝王 OMEGA-808！',
        spawns: [
          { type: 'boom',  x: -5.5, z: -1.5, hp: 135 },
          { type: 'boom',  x: 0.0,  z: -2.5, hp: 145 },
          { type: 'boom',  x: 5.5,  z: -1.5, hp: 135 },
          { type: 'vinyl', x: -7.5, z: -5.5, hp: 85 },
          { type: 'vinyl', x: 0.0,  z: -7.0, hp: 85 },
          { type: 'vinyl', x: 7.5,  z: -5.5, hp: 85 },
        ]
      }
    ]
  }
];
