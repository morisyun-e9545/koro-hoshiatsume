// 効果音とBGM。音声ファイルは使わず Web Audio でその場で鳴らす。
(function () {
  'use strict';

  let ctx = null;
  let master = null;
  let muted = false;
  let timer = null;
  let step = 0;
  let song = null;

  try { muted = localStorage.getItem('koro.muted') === '1'; } catch (e) { /* 保存できない環境 */ }

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    return true;
  }

  function tone(freq, start, length, type, volume, slideTo) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + length);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + length);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  function sequence(notes, gap, type, volume, length) {
    if (!ensure()) return;
    const now = ctx.currentTime;
    notes.forEach((freq, i) => tone(freq, now + i * gap, length || gap * 1.4, type, volume));
  }

  const SFX = {
    jump() { if (ensure()) tone(300, ctx.currentTime, 0.14, 'square', 0.09, 620); },
    jump2() { if (ensure()) tone(460, ctx.currentTime, 0.16, 'square', 0.09, 980); },
    star() { sequence([988, 1319], 0.06, 'square', 0.07); },
    stomp() { if (ensure()) tone(240, ctx.currentTime, 0.13, 'triangle', 0.2, 90); },
    hurt() { if (ensure()) tone(320, ctx.currentTime, 0.3, 'sawtooth', 0.1, 80); },
    crate() { sequence([392, 523], 0.05, 'triangle', 0.16); },
    item() { sequence([523, 659, 784, 1047], 0.07, 'square', 0.07); },
    spring() { if (ensure()) tone(200, ctx.currentTime, 0.3, 'triangle', 0.2, 900); },
    lantern() { sequence([659, 880], 0.1, 'triangle', 0.16); },
    clear() { sequence([523, 659, 784, 1047, 784, 1047, 1319], 0.11, 'square', 0.08); },
    over() { sequence([392, 330, 262, 196], 0.2, 'triangle', 0.18); },
    boss() { if (ensure()) tone(120, ctx.currentTime, 0.35, 'sawtooth', 0.16, 50); },
  };

  // 0 は休符。ステージごとに短いループを鳴らす。
  const n = {
    C3: 131, D3: 147, E3: 165, F3: 175, G3: 196, A3: 220, B3: 247,
    C4: 262, D4: 294, E4: 330, G4: 392, A4: 440, C5: 523, D5: 587, E5: 659, G5: 784, A5: 880,
  };
  const SONGS = {
    forest: {
      tempo: 150,
      lead: [n.E5, 0, n.G5, n.E5, n.D5, 0, n.C5, 0, n.D5, 0, n.E5, n.G4, n.A4, 0, 0, 0,
        n.C5, 0, n.D5, n.E5, n.G5, 0, n.A5, 0, n.G5, n.E5, n.D5, 0, n.C5, 0, 0, 0],
      bass: [n.C3, 0, n.G3, 0, n.A3, 0, n.E3, 0, n.F3, 0, n.C3, 0, n.G3, 0, n.G3, 0],
    },
    dusk: {
      tempo: 165,
      lead: [n.A4, 0, n.C5, 0, n.E5, n.D5, n.C5, 0, n.G4, 0, n.A4, n.C5, n.D5, 0, 0, 0,
        n.E5, 0, n.G5, 0, n.E5, n.D5, n.C5, n.A4, n.C5, 0, n.D5, 0, n.A4, 0, 0, 0],
      bass: [n.A3, 0, n.A3, 0, n.F3, 0, n.F3, 0, n.C3, 0, n.C3, 0, n.G3, 0, n.E3, 0],
    },
    cave: {
      tempo: 190,
      lead: [n.E4, 0, 0, n.G4, 0, 0, n.A4, 0, n.C5, 0, 0, n.A4, 0, 0, n.G4, 0,
        n.E4, 0, 0, n.D4, 0, 0, n.E4, 0, n.G4, 0, 0, n.E4, 0, 0, 0, 0],
      bass: [n.A3, 0, n.E3, 0, n.A3, 0, n.E3, 0, n.F3, 0, n.C3, 0, n.G3, 0, n.E3, 0],
    },
  };

  function tick() {
    if (!ctx || !song || muted) { step++; return; }
    const now = ctx.currentTime;
    const dur = song.tempo / 1000;
    const lead = song.lead[step % song.lead.length];
    if (lead) tone(lead, now, dur * 1.3, 'square', 0.03);
    if (step % 2 === 0) {
      const bass = song.bass[(step / 2) % song.bass.length];
      if (bass) tone(bass, now, dur * 1.8, 'triangle', 0.1);
    }
    step++;
  }

  function playSong(name) {
    stopSong();
    if (!ensure()) return;
    song = SONGS[name] || null;
    if (!song) return;
    step = 0;
    timer = setInterval(tick, song.tempo);
  }

  function stopSong() {
    clearInterval(timer);
    timer = null;
    song = null;
  }

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('koro.muted', muted ? '1' : '0'); } catch (e) { /* 無視 */ }
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }

  window.GameAudio = {
    sfx: SFX,
    playSong,
    stopSong,
    toggleMute,
    isMuted: () => muted,
    unlock: ensure,
  };
})();
