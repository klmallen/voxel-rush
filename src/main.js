import './styles/comic.css';
import { RhythmAudioEngine } from './audio/RhythmAudioEngine.js';
import { ComicHUD } from './ui/ComicHUD.js';
import { GameEngine } from './game/GameEngine.js';

const canvas = document.getElementById('game-canvas');
const audio = new RhythmAudioEngine(122);
const hud = new ComicHUD();
const game = new GameEngine(canvas, audio, hud);

window.__VOXEL_RUSH__ = { game, audio, hud };

// Title Screen Loadout Selectors (Weapon & Difficulty)
document.querySelectorAll('#title-weapon-select .sel-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#title-weapon-select .sel-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    game.setWeapon(btn.dataset.weapon, true);
  });
});

document.querySelectorAll('#title-diff-select .sel-pill[data-diff]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#title-diff-select .sel-pill[data-diff]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    game.setDifficulty(btn.dataset.diff);
  });
});

// Custom Local MP3 / WAV Track Importer!
const mp3Input = document.getElementById('custom-mp3-input');
const mp3Status = document.getElementById('custom-mp3-status');
mp3Input?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    mp3Status.textContent = '⏳ 正在解码音频并同步节拍网格...';
    mp3Status.classList.remove('hidden');
    const name = await audio.loadCustomAudioFile(file, 128);
    mp3Status.textContent = `✅ 已加载自定义曲目：「${name}」(${audio.bpm} BPM 节拍同步已开启！)`;
  } catch (err) {
    mp3Status.textContent = '❌ 音频解码失败，请尝试标准 MP3 / WAV / OGG 文件。';
  }
});

// Start Full Continuous 5-Zone Exploration OR Direct to Zone 5 Boss Stadium!
document.getElementById('start-tutorial-btn').addEventListener('click', () => {
  game.startNewGame({ directToBoss: false });
});
document.getElementById('start-direct-btn').addEventListener('click', () => {
  game.startNewGame({ directToBoss: true });
});

// Quick Skip to Zone 5 Boss Stadium
document.getElementById('skip-tut-btn').addEventListener('click', () => {
  game.skipToBossStadium();
});

// In-HUD clickable weapon hot-swap slots ([1]/[2]/[3])
document.querySelectorAll('.weapon-slot').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (game.state === 'EXPLORE' || game.state === 'BOSS_FIGHT') {
      game.setWeapon(btn.dataset.weapon);
    }
  });
});

// Blueprint Map ([B]), Jukebox Track Switcher ([M]), Move List ([H]), Mute & Pause
document.getElementById('map-btn')?.addEventListener('click', () => hud.toggleBlueprintMap());
document.getElementById('close-map-btn')?.addEventListener('click', () => hud.toggleBlueprintMap(false));
document.getElementById('jukebox-btn').addEventListener('click', () => game.cycleJukeboxTrack());
const muteBtn = document.getElementById('mute-btn');
muteBtn.addEventListener('click', () => {
  const muted = audio.toggleMute();
  muteBtn.textContent = muted ? '🔇 MUTED' : `🔊 ${audio.bpm} BPM`;
});

document.getElementById('movelist-btn').addEventListener('click', () => hud.toggleMoveList());
document.getElementById('pause-btn').addEventListener('click', () => game.togglePause());
document.getElementById('resume-btn').addEventListener('click', () => game.togglePause());
document.getElementById('pause-restart-btn').addEventListener('click', () => game.startNewGame({ directToBoss: false }));
document.getElementById('pause-title-btn').addEventListener('click', () => game.returnToTitle());

// End screen buttons
document.getElementById('restart-btn').addEventListener('click', () => game.startNewGame({ directToBoss: false }));
document.getElementById('end-title-btn').addEventListener('click', () => game.returnToTitle());

let lastTime = performance.now();
function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  game.update(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
