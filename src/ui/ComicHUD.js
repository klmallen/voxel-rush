/**
 * Commercial-Grade Hi-Fi RUSH × Cuphead Comic HUD Controller
 */
export class ComicHUD {
  constructor() {
    this.hudEl = document.getElementById('hud');
    this.hudBossEl = document.getElementById('hud-boss');
    this.titleEl = document.getElementById('title-screen');
    this.pauseEl = document.getElementById('pause-screen');
    this.endEl = document.getElementById('end-screen');
    this.introEl = document.getElementById('boss-intro');
    this.popupLayer = document.getElementById('popup-layer');
    this.damageFlash = document.getElementById('damage-flash');
    this.slowMoVignette = document.getElementById('slowmo-vignette');
    this.speedLines = document.getElementById('comic-speedlines');

    this.ipBox = document.getElementById('interactive-prompt');
    this.ipTag = document.getElementById('ip-tag');
    this.ipTitle = document.getElementById('ip-title');
    this.ipKeys = document.getElementById('ip-keys');
    this.ipSub = document.getElementById('ip-sub');

    this.heroHpFill = document.getElementById('hero-hp-fill');
    this.heroHpText = document.getElementById('hero-hp-text');
    this.heroReverbFill = document.getElementById('hero-reverb-fill');
    this.heroReverbText = document.getElementById('hero-reverb-text');
    this.overdrivePill = document.getElementById('overdrive-ready-pill');
    this.weaponSlots = Array.from(document.querySelectorAll('.weapon-slot'));

    this.bossHpFill = document.getElementById('boss-hp-fill');
    this.bossNameMain = document.getElementById('boss-name-main');
    this.bossNameSub = document.getElementById('boss-name-sub');
    this.muteBtn = document.getElementById('mute-btn');
    this.nextStageBtn = document.getElementById('next-stage-btn');
    this.stageCards = Array.from(document.querySelectorAll('.stage-card'));
    this.currentBpmLabel = '122 BPM';
    this.phasePills = [
      document.getElementById('phase-pill-1'),
      document.getElementById('phase-pill-2'),
      document.getElementById('phase-pill-3'),
    ];

    this.styleRankEl = document.getElementById('style-rank');
    this.rankCalloutEl = document.getElementById('rank-callout');
    this.comboNumEl = document.getElementById('combo-num');
    this.scoreNumEl = document.getElementById('score-num');
    this.voxelNumEl = document.getElementById('voxel-num');
    this.vinylNumEl = document.getElementById('vinyl-num');
    this.trackCreditEl = document.getElementById('track-credit');

    this.beatGradeEl = document.getElementById('beat-grade');
    this.beatCoreEl = document.getElementById('beat-core');
    this.beatTicks = Array.from(document.querySelectorAll('.beat-tick'));

    this.tutorialCard = document.getElementById('tutorial-card');
    this.tutBadge = document.getElementById('tut-badge');
    this.tutProgress = document.getElementById('tut-progress');
    this.tutTitle = document.getElementById('tut-title');
    this.tutDesc = document.getElementById('tut-desc');
    this.tutBarFill = document.getElementById('tut-bar-fill');

    this.moveListPanel = document.getElementById('movelist-panel');
    this.blueprintPanel = document.getElementById('blueprint-panel');
    this.bpPlayerPin = document.getElementById('bp-player-pin');
    this.grapplePill = document.getElementById('grapple-pill');
    this.liveChainEl = document.getElementById('live-chain');
    this.moveRows = Array.from(document.querySelectorAll('.ml-row'));
    this._moveHighlightTimer = null;

    this.eventBanner = document.getElementById('event-banner');
    this.bannerTitle = document.getElementById('banner-title');
    this.bannerSub = document.getElementById('banner-sub');

    this.clashPrompt = document.getElementById('clash-prompt');
    this.clashSub = document.getElementById('clash-sub');
    this.clashDots = [
      document.getElementById('clash-dot-1'),
      document.getElementById('clash-dot-2'),
      document.getElementById('clash-dot-3'),
    ];

    this._bannerTimeout = null;
    this._gradeTimeout = null;
    this._speedLinesTimeout = null;
  }

  showTitle() {
    this.titleEl.classList.remove('hidden');
    this.hudEl.classList.add('hidden');
  }

  hideTitle() {
    this.titleEl.classList.add('hidden');
    this.hudEl.classList.remove('hidden');
  }

  showPause() { this.pauseEl.classList.remove('hidden'); }
  hidePause() { this.pauseEl.classList.add('hidden'); }

  setActiveWeapon(weaponId) {
    this.weaponSlots.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.weapon === weaponId);
    });
  }

  setMoveListOpen(open) {
    this.moveListPanel.classList.toggle('hidden', !open);
  }

  toggleMoveList() {
    this.moveListPanel.classList.toggle('hidden');
  }

  toggleBlueprintMap(forceOpen) {
    if (!this.blueprintPanel) return;
    if (typeof forceOpen === 'boolean') {
      this.blueprintPanel.classList.toggle('hidden', !forceOpen);
    } else {
      this.blueprintPanel.classList.toggle('hidden');
    }
  }

  highlightMove(moveId, chainText) {
    if (this.liveChainEl && chainText) {
      this.liveChainEl.textContent = chainText;
    }
    this.moveRows.forEach((row) => {
      row.classList.toggle('lit', row.dataset.move === moveId);
    });
    clearTimeout(this._moveHighlightTimer);
    this._moveHighlightTimer = setTimeout(() => {
      this.moveRows.forEach((row) => row.classList.remove('lit'));
    }, 950);
  }

  setBossHeader(name, title) {
    if (this.bossNameMain) this.bossNameMain.textContent = name;
    if (this.bossNameSub) this.bossNameSub.textContent = `// ${title}`;
  }

  showTrackCredit(artist, song, meta) {
    if (!this.trackCreditEl) return;
    document.getElementById('tc-artist').textContent = artist;
    document.getElementById('tc-song').textContent = `"${song}"`;
    document.getElementById('tc-meta').textContent = meta;
    this.trackCreditEl.classList.add('hidden');
    void this.trackCreditEl.offsetWidth; // Restart animation cleanly
    this.trackCreditEl.classList.remove('hidden');
  }

  setTrackDisplay(trackLabel, bpm) {
    this.currentBpmLabel = `${bpm} BPM`;
    if (this.muteBtn && !this.muteBtn.textContent.includes('MUTED')) {
      this.muteBtn.textContent = `🔊 ${bpm} BPM`;
    }
    this.beatGradeEl.textContent = `${trackLabel}`;
    this.showTrackCredit('VOXEL RUSH BAND', trackLabel.replace(/^[^\w\u4e00-\u9fff]+/, ''), `${bpm} BPM · DYNAMIC MIX`);
  }

  refreshStageCards(activeIdx, rankMap = {}) {
    this.stageCards.forEach((card) => {
      const idx = Number(card.dataset.stage);
      card.classList.toggle('active', idx === activeIdx);
      const badge = card.querySelector('.st-rank');
      if (badge) {
        const r = rankMap[idx];
        badge.textContent = r || 'NEW';
        badge.classList.toggle('cleared', Boolean(r));
      }
    });
  }

  showZoneTracker(badge, enName, desc, progressText, fillRatio) {
    this.tutBadge.textContent = `${badge} // ${enName}`;
    this.tutTitle.textContent = badge;
    this.tutDesc.textContent = desc;
    this.tutProgress.textContent = progressText;
    this.tutBarFill.style.width = `${Math.min(100, Math.max(8, fillRatio * 100))}%`;
    this.tutorialCard.classList.remove('hidden');
    this.hudBossEl.classList.add('hidden');
  }

  hideZoneTracker() {
    this.tutorialCard.classList.add('hidden');
    this.hudBossEl.classList.remove('hidden');
  }

  /**
   * Renders the compact LEFT-DOCKED VERTICAL Gamepad-Style Interactive Prompt!
   * keys: [{ gp: 'X', gpClass: 'gp-x', action: '轻击', kbd: 'J / 左键', state: 'done' | 'active' | 'locked' | 'pending' }]
   */
  showInteractivePrompt({ tag, title, keys = [], sub = '', bulletTime = false, mode = '' }) {
    this.ipTag.textContent = tag;
    this.ipTitle.textContent = title;
    this.ipSub.textContent = sub;
    this.ipKeys.innerHTML = '';

    keys.forEach((k) => {
      const row = document.createElement('div');
      row.className = `ip-step-row ${k.state || ''}`;

      const gp = document.createElement('span');
      gp.className = `gp-btn ${k.gpClass || 'gp-x'}`;
      gp.textContent = k.gp || k.label;

      const info = document.createElement('div');
      info.className = 'ip-step-info';
      const act = document.createElement('span');
      act.className = 'ip-step-action';
      act.textContent = k.action || k.label;
      const kbd = document.createElement('span');
      kbd.className = 'ip-step-kbd';
      kbd.textContent = `键盘: ${k.kbd || ''}`;
      info.append(act, kbd);

      row.append(gp, info);
      if (k.state === 'done') {
        const chk = document.createElement('span');
        chk.className = 'ip-check';
        chk.textContent = '✓';
        row.appendChild(chk);
      }
      this.ipKeys.appendChild(row);
    });

    this.ipBox.classList.toggle('bullet-time', bulletTime);
    this.ipBox.classList.remove('hidden');

    if (this.slowMoVignette) {
      this.slowMoVignette.classList.toggle('active', bulletTime);
      this.slowMoVignette.classList.toggle('mode-dodge', bulletTime && mode === 'dodge');
      this.slowMoVignette.classList.toggle('mode-parry', bulletTime && mode === 'parry');
    }
  }

  hideInteractivePrompt() {
    this.ipBox.classList.add('hidden');
    this.ipBox.classList.remove('bullet-time');
    if (this.slowMoVignette) {
      this.slowMoVignette.classList.remove('active', 'mode-dodge', 'mode-parry');
    }
  }

  showTutorial(badge, title, desc, progress, goal) {
    this.tutBadge.textContent = badge;
    this.tutTitle.textContent = title;
    this.tutDesc.textContent = desc;
    this.tutProgress.textContent = `${progress} / ${goal}`;
    this.tutBarFill.style.width = `${Math.min(100, (progress / Math.max(1, goal)) * 100)}%`;
    this.tutorialCard.classList.remove('hidden');
    this.hudBossEl.classList.add('hidden');
  }

  hideTutorial() {
    this.tutorialCard.classList.add('hidden');
    this.hudBossEl.classList.remove('hidden');
  }

  showBossIntro(name, sub) {
    document.getElementById('intro-boss-name').textContent = name;
    document.getElementById('intro-boss-sub').textContent = sub;
    this.introEl.classList.remove('hidden');
    this.hudBossEl.classList.remove('hidden');
  }

  hideBossIntro() { this.introEl.classList.add('hidden'); }

  showBanner(title, sub, accentColor = '#ff5a1f', durationSec = 2.0) {
    this.bannerTitle.textContent = title;
    this.bannerSub.textContent = sub;
    this.eventBanner.style.background = accentColor;
    this.eventBanner.classList.remove('hidden');
    clearTimeout(this._bannerTimeout);
    this._bannerTimeout = setTimeout(() => {
      this.eventBanner.classList.add('hidden');
    }, durationSec * 1000);
  }

  flashSpeedLines(colorHex = '#ffe600') {
    this.speedLines.style.background = `repeating-conic-gradient(from 0deg, ${colorHex}55 0deg 2deg, transparent 2deg 12deg)`;
    this.speedLines.classList.add('active');
    clearTimeout(this._speedLinesTimeout);
    this._speedLinesTimeout = setTimeout(() => {
      this.speedLines.classList.remove('active');
    }, 260);
  }

  showClashPrompt(text, step = 0) {
    this.clashSub.textContent = text;
    this.clashPrompt.classList.remove('hidden');
    this.clashDots.forEach((dot, i) => {
      dot.classList.toggle('active', i + 1 === step);
    });
  }

  hideClashPrompt() { this.clashPrompt.classList.add('hidden'); }

  flashBeatFeedback(grade) {
    const map = {
      PERFECT: { text: '⚡ PERFECT BEAT! ×1.5', color: '#ffe600' },
      GOOD:    { text: '♪ GOOD GROOVE! ×1.2', color: '#00f0ff' },
      OFFBEAT: { text: '• OFF-BEAT', color: '#ff7b54' },
    };
    const info = map[grade] || map.GOOD;
    this.beatGradeEl.textContent = info.text;
    this.beatGradeEl.style.color = info.color;
    clearTimeout(this._gradeTimeout);
    this._gradeTimeout = setTimeout(() => {
      this.beatGradeEl.textContent = `${this.currentBpmLabel} // FEEL THE BEAT!`;
      this.beatGradeEl.style.color = '#4dfcff';
    }, 650);
  }

  flashDamage() {
    this.damageFlash.classList.add('active');
    setTimeout(() => this.damageFlash.classList.remove('active'), 180);
  }

  spawnComicPopup(text, screenX, screenY, color = '#ffe600', big = false) {
    const el = document.createElement('div');
    el.className = 'comic-popup' + (big ? ' big' : '');
    el.textContent = text;
    el.style.color = color;
    const clampedX = Math.max(90, Math.min(window.innerWidth - 90, screenX + (Math.random() - 0.5) * 34));
    const clampedY = Math.max(145, Math.min(window.innerHeight - 110, screenY + (Math.random() - 0.5) * 20));
    el.style.left = `${clampedX}px`;
    el.style.top = `${clampedY}px`;
    this.popupLayer.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  showEndScreen(victory, stats, rank, hasNextStage = false, stageCfg = null) {
    this.endEl.classList.remove('hidden');
    const stageTag = stageCfg ? `${stageCfg.code} · ${stageCfg.cnName}` : 'ENCORE COMPLETE!!';
    document.getElementById('end-kicker').textContent = victory ? `${stageTag} CLEAR!!` : 'STAGE WIPED OUT...';
    document.getElementById('end-title').textContent = victory ? 'KNOCKOUT!!' : 'TRY AGAIN!!';
    document.getElementById('end-title').style.color = victory ? '#ffe600' : '#ff2a85';

    if (this.nextStageBtn) {
      this.nextStageBtn.classList.toggle('hidden', !(victory && hasNextStage));
    }

    const mins = Math.floor(stats.fightTime / 60);
    const secs = Math.floor(stats.fightTime % 60);
    document.getElementById('stat-time').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    document.getElementById('stat-score').textContent = stats.score.toLocaleString();
    document.getElementById('stat-combo').textContent = `${stats.maxCombo} HITS`;
    const acc = stats.totalActions > 0 ? Math.round((stats.perfectHits / stats.totalActions) * 100) : 100;
    document.getElementById('stat-perfect').textContent = `${acc}%`;
    document.getElementById('stat-parries').textContent = `${stats.parries}`;
    document.getElementById('stat-voxels').textContent = stats.voxelsSmashed.toLocaleString();

    const finalRank = victory
      ? (acc >= 60 && stats.damageTaken < 60 ? 'S+' : (stats.score > 9000 ? 'S' : rank))
      : 'C';
    document.getElementById('final-rank-stamp').textContent = finalRank;
  }

  hideEndScreen() { this.endEl.classList.add('hidden'); }

  update({ player, boss, stats, rank, beatPhase, beatPulse, nearGrapple = false }) {
    const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
    this.heroHpFill.style.width = `${hpPct}%`;
    this.heroHpText.textContent = `${Math.ceil(player.hp)}`;

    const revPct = Math.min(100, Math.floor(player.reverb));
    this.heroReverbFill.style.width = `${revPct}%`;
    this.heroReverbText.textContent = `${revPct}%`;
    this.overdrivePill.classList.toggle('hidden', revPct < 100);

    if (this.grapplePill) {
      this.grapplePill.classList.toggle('hidden', !nearGrapple);
    }

    // Live KAI marker mapped onto the isometric Level Blueprint image!
    if (this.bpPlayerPin && player?.pos) {
      const u = Math.max(12, Math.min(90, 25 + (player.pos.x / 115) * 60));
      const v = Math.max(14, Math.min(88, 76 + (player.pos.z / 105) * 58));
      this.bpPlayerPin.style.left = `${u.toFixed(1)}%`;
      this.bpPlayerPin.style.top = `${v.toFixed(1)}%`;
    }

    const bossPct = Math.max(0, (boss.hp / boss.maxHp) * 100);
    this.bossHpFill.style.width = `${bossPct}%`;
    this.phasePills.forEach((pill, i) => {
      const pNum = i + 1;
      pill.classList.toggle('active', boss.phase === pNum);
      pill.classList.toggle('done', boss.phase > pNum);
    });

    this.styleRankEl.textContent = rank;
    this.styleRankEl.className = `rank-letter rank-${rank === 'S+' ? 'Sp' : rank}`;
    if (this.rankCalloutEl) {
      const callouts = { D: 'WARMUP!', C: 'GROOVY!', B: 'GNARLY!', A: 'OUTRAGEOUS!', S: 'ROCKSTAR!!', 'S+': 'LEGENDARY!!' };
      this.rankCalloutEl.textContent = callouts[rank] || 'GROOVY!';
    }
    this.comboNumEl.textContent = stats.combo;
    this.scoreNumEl.textContent = stats.score.toLocaleString();
    this.voxelNumEl.textContent = stats.voxelsSmashed.toLocaleString();
    if (this.vinylNumEl) this.vinylNumEl.textContent = `${stats.goldenVinyls || 0}/6`;

    this.beatCoreEl.classList.toggle('pulse', beatPulse > 0.55);
    const wingW = 160;
    for (const tick of this.beatTicks) {
      const side = tick.dataset.side;
      const idx = Number(tick.dataset.idx);
      const frac = ((beatPhase + idx * 0.5) % 1);
      if (side === 'L') tick.style.left = `${frac * wingW}px`;
      else tick.style.right = `${frac * wingW}px`;
      tick.style.opacity = (0.35 + frac * 0.65).toFixed(2);
    }
  }
}
