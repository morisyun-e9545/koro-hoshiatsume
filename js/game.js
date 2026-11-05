// ゲーム本体。物理・当たり判定・描画・画面遷移をまとめている。
(function () {
  'use strict';

  const TS = 16;
  const VIEW_W = 400;
  const VIEW_H = 224;
  const STEP = 1 / 60;
  const { ROWS, T } = window.Levels;
  const MAX_HP = 3;

  const canvas = document.getElementById('game');
  const screenCtx = canvas.getContext('2d');
  let ctx = screenCtx; // 地形を事前に描くときだけ描画先を切り替える
  const bgCanvas = document.getElementById('bg');
  const bgCtx = bgCanvas.getContext('2d', { alpha: false });
  const { RES, BG_RES } = window.Sprites;
  bgCanvas.width = VIEW_W * BG_RES;
  bgCanvas.height = VIEW_H * BG_RES;
  canvas.width = VIEW_W * RES;
  canvas.height = VIEW_H * RES;

  const $ = (id) => document.getElementById(id);
  const ui = {
    hud: $('hud'), hearts: $('hud-hearts'), cape: $('hud-cape'), stage: $('hud-stage'),
    stars: $('hud-stars'), time: $('hud-time'), overlay: $('overlay'), touch: $('touch'),
    sound: $('btn-sound'), pause: $('btn-pause'), vignette: $('vignette'),
  };

  const sprites = window.Sprites.buildAll();
  const sfx = window.GameAudio.sfx;

  // ---- セーブデータ ----
  const save = { unlocked: 0, best: {} };
  try {
    const raw = JSON.parse(localStorage.getItem('koro.save') || 'null');
    if (raw) {
      save.unlocked = raw.unlocked || 0;
      save.best = raw.best || {};
    }
  } catch (e) { /* 読めなくても最初から遊べる */ }

  function persist() {
    try { localStorage.setItem('koro.save', JSON.stringify(save)); } catch (e) { /* 無視 */ }
  }

  // ---- 入力 ----
  const input = { left: false, right: false, jump: false, run: false };
  const KEYS = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', KeyJ: 'jump',
    KeyX: 'run', KeyK: 'run', // Shift は連打で Windows の固定キー画面が出るので使わない
  };
  // 次の処理までに離された短い入力も取りこぼさないよう覚えておく
  const pulse = { left: false, right: false, jump: false, run: false };
  const held = (key) => input[key] || pulse[key];

  window.addEventListener('keydown', (e) => {
    const action = KEYS[e.code];
    if (action || e.code === 'ArrowDown') e.preventDefault();
    if (e.repeat) return;
    if (mode === 'play') {
      if (e.code === 'KeyP' || e.code === 'Escape') { pause(); return; }
    } else if (e.code === 'Enter' || e.code === 'Space') {
      const primary = ui.overlay.querySelector('button:not(:disabled)');
      if (primary) { primary.click(); e.preventDefault(); return; }
    } else if (mode === 'pause' && (e.code === 'KeyP' || e.code === 'Escape')) {
      resume();
      return;
    }
    if (e.code === 'KeyM') toggleSound();
    if (action) {
      input[action] = true;
      pulse[action] = true;
    }
  });

  window.addEventListener('keyup', (e) => {
    const action = KEYS[e.code];
    if (action) input[action] = false;
  });

  document.querySelectorAll('#touch button').forEach((button) => {
    const key = button.dataset.key;
    const press = (down) => (e) => {
      e.preventDefault();
      input[key] = down;
      button.classList.toggle('down', down);
    };
    button.addEventListener('pointerdown', press(true));
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((name) => {
      button.addEventListener(name, press(false));
    });
  });

  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('blur', () => {
    Object.keys(input).forEach((key) => {
      input[key] = false;
      pulse[key] = false;
    });
    if (mode === 'play') pause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'play') pause();
  });

  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  // ---- 状態 ----
  let mode = 'title';
  let level = null;
  let levelIndex = 0;
  let tiles = null;
  let parallax = null;
  let chunks = [];
  const CHUNK = 32; // 地形をこのタイル数ごとに1枚の画像へまとめて描画回数を減らす
  let player = null;
  let entities = null; // 動く物をまとめたもの
  let particles = [];
  let cam = { x: 0, shake: 0, look: 0 };
  let clock = 0;
  let frame = 0;
  let starsThisRun = 0;
  let checkpoint = null;
  let bossFight = false;
  let prevJump = false;
  let clearTimer = 0;
  const god = new URLSearchParams(location.search).has('god'); // 調整用の無敵モード

  // ---- タイル判定 ----
  const tile = (c, r) => {
    if (r < 0 || r >= ROWS || c < 0 || c >= level.width) return T.EMPTY;
    return level.grid[r][c];
  };
  const isSolid = (t) => t === T.GROUND || t === T.CRATE || t === T.USED || t === T.STONE;
  const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function moveX(e, dx) {
    e.x += dx;
    const top = Math.floor(e.y / TS);
    const bottom = Math.floor((e.y + e.h - 0.01) / TS);
    if (dx > 0) {
      const col = Math.floor((e.x + e.w - 0.01) / TS);
      for (let r = top; r <= bottom; r++) {
        if (isSolid(tile(col, r))) { e.x = col * TS - e.w; return true; }
      }
    } else if (dx < 0) {
      const col = Math.floor(e.x / TS);
      for (let r = top; r <= bottom; r++) {
        if (isSolid(tile(col, r))) { e.x = (col + 1) * TS; return true; }
      }
    }
    return false;
  }

  // 戻り値は {landed, headCol, headRow}
  function moveY(e, dy) {
    const prevBottom = e.y + e.h;
    e.y += dy;
    const left = Math.floor(e.x / TS);
    const right = Math.floor((e.x + e.w - 0.01) / TS);
    if (dy > 0) {
      const row = Math.floor((e.y + e.h - 0.01) / TS);
      for (let c = left; c <= right; c++) {
        const t = tile(c, row);
        if (isSolid(t) || (t === T.ONEWAY && prevBottom <= row * TS + 0.5)) {
          e.y = row * TS - e.h;
          return { landed: true };
        }
      }
    } else if (dy < 0) {
      const row = Math.floor(e.y / TS);
      // 頭の中心に近いタイルから調べると、箱の角でも狙った箱が開く
      const center = Math.floor((e.x + e.w / 2) / TS);
      const cols = [center, left, right];
      for (const c of cols) {
        if (isSolid(tile(c, row))) {
          e.y = (row + 1) * TS;
          return { landed: false, headCol: c, headRow: row };
        }
      }
    }
    return { landed: false };
  }

  // ---- 粒子 ----
  function burst(x, y, color, count, speed = 60) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      particles.push({
        x, y, vx: Math.cos(a) * speed * Math.random(), vy: Math.sin(a) * speed * Math.random() - 20,
        life: 0.3 + Math.random() * 0.3, color,
      });
    }
  }

  // ---- ステージ読み込み ----
  function makeEnemy(def) {
    const size = { beetle: [14, 10], hedge: [14, 10], bird: [14, 9] }[def.type];
    const bottom = (def.y + 1) * TS;
    return {
      type: def.type, x: def.x * TS + 1, y: bottom - size[1], w: size[0], h: size[1],
      vx: def.type === 'bird' ? -38 : -26, vy: 0, baseY: bottom - size[1], t: Math.random() * 6,
      alive: true, squash: 0,
    };
  }

  function loadLevel(index) {
    levelIndex = index;
    level = window.Levels.list[index]();
    tiles = window.Sprites.buildTiles(level.theme);
    parallax = window.Sprites.buildParallax(level.theme);
    chunks = Array.from({ length: Math.ceil(level.width / CHUNK) }, () => ({ canvas: null, dirty: true }));
    ui.vignette.style.background = `radial-gradient(ellipse at center, transparent 58%, ${level.theme.vignette})`;
    entities = {
      enemies: level.enemies.map(makeEnemy),
      stars: level.stars.map((s) => ({ x: s.x * TS + 3, y: s.y * TS + 3, w: 10, h: 10, kind: 'star', got: false })),
      items: [],
      movers: level.movers.map((m) => ({
        x0: m.x * TS, y0: m.y * TS, x: m.x * TS, y: m.y * TS, w: m.len * TS, h: 4,
        dx: m.dx * TS, dy: m.dy * TS, period: m.period, t: 0, mx: 0, my: 0,
      })),
      springs: level.springs.map((s) => ({ x: s.x * TS, y: (s.y + 1) * TS - 8, w: TS, h: 8, press: 0 })),
      lanterns: level.lanterns.map((l) => ({ x: l.x * TS + 2, y: (l.y + 1) * TS - 16, w: 12, h: 16, lit: false })),
      goal: level.goal ? makeGoal(level.goal) : null,
      boss: null,
    };
    particles = [];
    bossFight = false;
    checkpoint = { x: 2 * TS, y: 9 * TS };
    starsThisRun = 0;
    clock = 0;
    player = makePlayer(checkpoint.x, checkpoint.y);
    cam.x = 0;
    cam.shake = 0;
    cam.look = 0;
    updateHud();
  }

  function makeGoal(def) {
    return { x: def.x * TS - 8, y: (def.y + 1) * TS - 48, w: 32, h: 48 };
  }

  function makePlayer(x, y) {
    return {
      x, y, w: 12, h: 28, vx: 0, vy: 0, face: 1, ground: false, on: null, coyote: 0, buffer: 0,
      hp: MAX_HP, cape: false, airJumps: 0, invuln: 0, boosted: false, walk: 0, jumping: false,
      prevBottom: y + 28,
    };
  }

  function respawn() {
    const p = player;
    p.x = checkpoint.x;
    p.y = checkpoint.y;
    p.vx = p.vy = 0;
    p.on = null;
    p.invuln = 1.5;
  }

  // ---- 更新処理 ----
  function hurt(fromX) {
    const p = player;
    if (p.invuln > 0 || god) return;
    if (p.cape) {
      p.cape = false; // マントが身代わりになる
    } else {
      p.hp -= 1;
    }
    p.invuln = 1.6;
    p.vx = (p.x < fromX ? -1 : 1) * 130;
    p.vy = -210;
    p.boosted = false;
    p.jumping = false;
    cam.shake = 0.2;
    sfx.hurt();
    burst(p.x + 6, p.y + 12, '#ff6b7f', 10);
    updateHud();
    if (p.hp <= 0) gameOver();
  }

  function fell() {
    const p = player;
    if (window.__fallLog) window.__fallLog.push(Math.round(p.x / TS));
    if (!god) {
      p.hp -= 1;
      p.cape = false;
    }
    sfx.hurt();
    cam.shake = 0.2;
    updateHud();
    if (p.hp <= 0) gameOver();
    else respawn();
  }

  function collect(amount) {
    starsThisRun += amount;
    sfx.star();
    updateHud();
  }

  const markDirty = (c) => { chunks[Math.floor(c / CHUNK)].dirty = true; };

  function openCrate(c, r) {
    const key = `${c},${r}`;
    const item = level.crateItems[key];
    level.grid[r][c] = T.USED;
    markDirty(c);
    sfx.crate();
    const x = c * TS;
    const y = r * TS;
    burst(x + 8, y, '#ffd84d', 6, 40);
    if (item === 'star') {
      collect(1);
      particles.push({ x: x + 3, y: y - 12, vx: 0, vy: -60, life: 0.45, sprite: 'star' });
    } else {
      // 箱の上で止まらないよう、転がって地面まで落ちてくる
      entities.items.push({ x: x + 2, y: y - 12, w: 12, h: 10, kind: item, age: 0, vx: 40 * player.face, vy: -90 });
    }
  }

  function stepMovers(dt) {
    const p = player;
    for (const m of entities.movers) {
      m.t += dt;
      const phase = (m.t / m.period) % 1;
      const k = phase < 0.5 ? phase * 2 : 2 - phase * 2; // 三角波で往復
      const eased = k * k * (3 - 2 * k);
      const nx = m.x0 + m.dx * eased;
      const ny = m.y0 + m.dy * eased;
      m.mx = nx - m.x;
      m.my = ny - m.y;
      m.x = nx;
      m.y = ny;
      if (p.on === m) {
        moveX(p, m.mx);
        p.y = m.y - p.h;
      }
    }
  }

  function stepPlayer(dt) {
    const p = player;
    const dir = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
    const maxSpeed = held('run') ? 150 : 100;
    const reversing = dir && p.vx && Math.sign(p.vx) !== dir;
    const accel = (p.ground ? 1000 : 900) * (reversing ? 2 : 1);

    if (dir) {
      p.face = dir;
      if (Math.abs(p.vx) <= maxSpeed || reversing) {
        // 加速は上限で必ず止める
        p.vx = Math.max(-maxSpeed, Math.min(maxSpeed, p.vx + dir * accel * dt));
      } else {
        // ダッシュをやめたときなど、上限より速ければなめらかに落とす
        p.vx = Math.max(maxSpeed, Math.abs(p.vx) - 900 * dt) * Math.sign(p.vx);
      }
    } else {
      // キーを離したら地上でも空中でも、すぐ横移動を止める
      const drag = (p.ground ? 2600 : 1400) * dt;
      p.vx = Math.abs(p.vx) <= drag ? 0 : p.vx - Math.sign(p.vx) * drag;
    }

    p.coyote = p.ground ? 0.1 : Math.max(0, p.coyote - dt);
    const jumpHeld = held('jump');
    const pressed = jumpHeld && !prevJump;
    prevJump = jumpHeld;
    p.buffer = pressed ? 0.15 : Math.max(0, p.buffer - dt);

    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -340;
      p.coyote = 0;
      p.buffer = 0;
      p.ground = false;
      p.on = null;
      p.jumping = true;
      sfx.jump();
      burst(p.x + 6, p.y + p.h, '#ffffffaa', 4, 25);
    } else if (pressed && !p.ground && p.cape && p.airJumps > 0) {
      p.vy = -300;
      p.airJumps -= 1;
      p.buffer = 0;
      p.jumping = true;
      sfx.jump2();
      burst(p.x + 6, p.y + p.h, '#5fe8d4', 10, 45);
    }

    // 軌道は常に同じ。キーを離すと、そこで上昇を打ち切る
    if (p.jumping && !jumpHeld && p.vy < -120) p.vy = -120;
    p.vy = Math.min(p.vy + (p.vy < 0 ? 850 : 1100) * dt, 380);
    if (p.vy >= 0) p.boosted = false;

    moveX(p, p.vx * dt);
    if (p.x < 0) { p.x = 0; p.vx = 0; }
    const rightEdge = level.width * TS - p.w;
    if (p.x > rightEdge) { p.x = rightEdge; p.vx = 0; }

    p.prevBottom = p.y + p.h;
    const result = moveY(p, p.vy * dt);
    p.ground = false;
    p.on = null;
    if (result.landed) landPlayer();
    if (result.headCol !== undefined) {
      p.vy = Math.max(p.vy, 30);
      if (tile(result.headCol, result.headRow) === T.CRATE) openCrate(result.headCol, result.headRow);
    }

    if (p.vy >= 0) {
      for (const m of entities.movers) {
        const within = p.x + p.w > m.x && p.x < m.x + m.w;
        if (within && p.prevBottom <= m.y + 4 && p.y + p.h >= m.y) {
          p.y = m.y - p.h;
          p.on = m;
          landPlayer();
          break;
        }
      }
    }

    Object.keys(pulse).forEach((key) => { pulse[key] = false; });
    p.walk += Math.abs(p.vx) * dt;
    p.invuln = Math.max(0, p.invuln - dt);

    // トゲは見た目より少し小さい判定にして理不尽さを減らす
    const footRow = Math.floor((p.y + p.h - 3) / TS);
    const leftCol = Math.floor((p.x + 2) / TS);
    const rightCol = Math.floor((p.x + p.w - 2) / TS);
    if (tile(leftCol, footRow) === T.SPIKE || tile(rightCol, footRow) === T.SPIKE) {
      if ((p.y + p.h) % TS > 8 || (p.y + p.h) % TS === 0) hurt(p.x + (p.face > 0 ? 8 : 0));
    }

    if (p.y > ROWS * TS + 24) fell();
  }

  function landPlayer() {
    const p = player;
    if (!p.ground && p.vy > 200) burst(p.x + 6, p.y + p.h, '#ffffff88', 4, 20);
    p.ground = true;
    p.vy = 0;
    p.jumping = false;
    p.boosted = false;
    p.airJumps = 1;
  }

  function stomp(bounce) {
    const p = player;
    p.vy = input.jump ? -330 : bounce;
    p.jumping = input.jump;
    p.airJumps = 1;
    sfx.stomp();
  }

  function stepEnemies(dt) {
    const p = player;
    // 敵との接触は見た目より少し狭くして、かすっただけのダメージを減らす
    const body = { x: p.x + 2, y: p.y + 4, w: p.w - 4, h: p.h - 4 };
    for (const e of entities.enemies) {
      if (!e.alive) {
        e.squash -= dt;
        continue;
      }
      if (Math.abs(e.x - p.x) > VIEW_W) continue; // 画面外は休ませる
      e.t += dt;
      if (e.type === 'bird') {
        e.x += e.vx * dt;
        e.y = e.baseY + Math.sin(e.t * 2.6) * 18;
        if (Math.abs(e.x - (e.startX ?? (e.startX = e.x))) > 56) e.vx = -e.vx;
      } else {
        const hit = moveX(e, e.vx * dt);
        e.vy = Math.min(e.vy + 900 * dt, 300);
        moveY(e, e.vy * dt).landed && (e.vy = 0);
        const aheadX = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
        const below = tile(Math.floor(aheadX / TS), Math.floor((e.y + e.h + 2) / TS));
        if (hit || !(isSolid(below) || below === T.ONEWAY)) e.vx = -e.vx;
        if (tile(Math.floor(aheadX / TS), Math.floor((e.y + e.h - 2) / TS)) === T.SPIKE) e.vx = -e.vx;
      }
      if (e.y > ROWS * TS + 20) e.alive = false;

      if (overlaps(body, e)) {
        const fromAbove = p.vy > 0 && p.prevBottom <= e.y + 7;
        if (fromAbove && e.type !== 'hedge') {
          e.alive = false;
          e.squash = 0.35;
          burst(e.x + 7, e.y + 5, '#ffffff', 6, 50);
          stomp(-210);
        } else {
          hurt(e.x + e.w / 2);
        }
      }
    }
  }

  function stepBoss(dt) {
    const b = entities.boss;
    if (!b) return;
    const p = player;
    b.flash = Math.max(0, b.flash - dt);
    b.t += dt;
    if (!b.alive) {
      b.y += 120 * dt;
      if (b.t > 0.05 && Math.random() < 0.5) burst(b.x + Math.random() * b.w, b.y + 10, '#ffd84d', 2, 70);
      if (b.y > ROWS * TS + 40) entities.boss = null;
      return;
    }
    const speed = 46 + (3 - b.hp) * 32;
    if (b.ground && b.hopTimer <= 0) {
      b.vy = -300;
      b.ground = false;
      b.hopTimer = 2 + Math.random();
    }
    b.hopTimer -= dt;
    b.vx += Math.sign(p.x - b.x) * 240 * dt;
    b.vx = Math.max(-speed, Math.min(speed, b.vx));
    if (moveX(b, b.vx * dt)) b.vx = -b.vx * 0.6;
    b.vy = Math.min(b.vy + 800 * dt, 400);
    const res = moveY(b, b.vy * dt);
    if (res.landed) {
      if (!b.ground) { cam.shake = 0.12; sfx.boss(); }
      b.vy = 0;
      b.ground = true;
    }

    if (overlaps(p, b) && p.invuln <= 0) {
      const fromAbove = p.vy > 0 && p.prevBottom <= b.y + 14;
      if (fromAbove && b.flash <= 0) {
        b.hp -= 1;
        b.flash = 0.9;
        burst(b.x + 22, b.y + 4, '#ffffff', 14, 90);
        stomp(-300);
        p.invuln = 0.5;
        cam.shake = 0.2;
        if (b.hp <= 0) {
          b.alive = false;
          b.t = 0;
          sfx.clear();
          // 出口が開き、ゴールの門が現れる
          for (let r = level.gate.y0; r <= level.gate.y1; r++) level.grid[r][level.gate.x] = T.EMPTY;
          markDirty(level.gate.x);
          entities.goal = makeGoal(level.bossGoal);
          burst(entities.goal.x + 16, entities.goal.y + 24, '#ffd84d', 30, 110);
        }
      } else if (b.flash <= 0) {
        hurt(b.x + b.w / 2);
      }
    }
  }

  function startBoss() {
    bossFight = true;
    for (let r = level.gate.y0; r <= level.gate.y1; r++) level.grid[r][level.gate.x] = T.STONE;
    markDirty(level.gate.x);
    entities.boss = {
      x: level.boss.x * TS, y: level.boss.y * TS, w: 44, h: 30, vx: -30, vy: 0, hp: 3, alive: true,
      ground: false, hopTimer: 2, flash: 0, t: 0,
    };
    sfx.boss();
    cam.shake = 0.25;
    updateHud();
  }

  function stepPickups(dt) {
    const p = player;
    for (const s of entities.stars) {
      if (!s.got && overlaps(p, s)) {
        s.got = true;
        collect(1);
        burst(s.x + 5, s.y + 5, '#ffd84d', 5, 40);
      }
    }
    entities.items = entities.items.filter((item) => {
      item.age += dt;
      if (item.vx || !item.rest) {
        if (moveX(item, item.vx * dt)) item.vx = -item.vx;
        item.vy = Math.min(item.vy + 600 * dt, 240);
        if (moveY(item, item.vy * dt).landed) {
          item.vy = 0;
          const row = Math.floor((item.y + item.h + 1) / TS);
          const onCrate = [item.x, item.x + item.w - 0.01].some((x) => {
            const under = tile(Math.floor(x / TS), row);
            return under === T.CRATE || under === T.USED;
          });
          if (!onCrate) {
            item.vx = 0;
            item.rest = true;
          }
        }
      }
      if (!overlaps(p, item) || item.age < 0.15) return true;
      sfx.item();
      if (item.kind === 'cape') {
        p.cape = true;
        p.airJumps = 1;
      } else {
        p.hp = Math.min(MAX_HP, p.hp + 1);
      }
      burst(item.x + 6, item.y + 5, item.kind === 'cape' ? '#2bb3a3' : '#ff6b7f', 10, 60);
      updateHud();
      return false;
    });
    for (const s of entities.springs) {
      s.press = Math.max(0, s.press - dt);
      if (overlaps(p, s) && p.vy >= 0 && p.prevBottom <= s.y + 8) {
        p.y = s.y - p.h;
        p.vy = -480;
        p.boosted = true;
        p.jumping = false;
        p.ground = false;
        p.airJumps = 1;
        s.press = 0.2;
        sfx.spring();
      }
    }
    for (const l of entities.lanterns) {
      if (!l.lit && p.x + p.w > l.x) {
        l.lit = true;
        checkpoint = { x: l.x, y: l.y + l.h - player.h - 1 };
        sfx.lantern();
        burst(l.x + 6, l.y + 5, '#ffd84d', 12, 60);
      }
    }
    if (entities.goal && overlaps(p, entities.goal)) stageClear();
  }

  function stepCamera(dt) {
    const p = player;
    const max = level.width * TS - VIEW_W;
    // 向きを変えても画面が振られないよう、先読みはゆっくり動かす
    cam.look += (p.face * 22 - cam.look) * Math.min(1, dt * 2.5);
    const target = p.x + p.w / 2 - VIEW_W / 2 + cam.look;
    cam.x += (target - cam.x) * Math.min(1, dt * 12);
    cam.x = Math.max(0, Math.min(max, cam.x));
    if (level.gate && !bossFight && p.x > (level.gate.x + 3) * TS) startBoss();
    if (bossFight && entities.boss) cam.x = Math.max(cam.x, max);
    cam.shake = Math.max(0, cam.shake - dt);
  }

  function stepParticles(dt) {
    for (const q of particles) {
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (!q.sprite) q.vy += 240 * dt;
    }
    particles = particles.filter((q) => q.life > 0);
  }

  function step(dt) {
    clock += dt;
    stepMovers(dt);
    stepPlayer(dt);
    if (mode !== 'play') return;
    stepEnemies(dt);
    if (mode !== 'play') return;
    stepBoss(dt);
    if (mode !== 'play') return;
    stepPickups(dt);
    stepCamera(dt);
    stepParticles(dt);
  }

  // ---- 描画 ----
  const snap = (v) => Math.round(v * RES) / RES;

  function drawImage(image, x, y) {
    ctx.drawImage(image, snap(x), snap(y), image.logicalW, image.logicalH);
  }

  function drawSprite(name, x, y, flip) {
    const image = sprites[name];
    if (flip) {
      ctx.save();
      ctx.translate(snap(x) + image.logicalW, snap(y));
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0, image.logicalW, image.logicalH);
      ctx.restore();
    } else {
      drawImage(image, x, y);
    }
  }

  function drawGlow(x, y, size, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprites.glow, snap(x - size / 2), snap(y - size / 2), size, size);
    ctx.restore();
  }

  function drawBackground() {
    bgCtx.drawImage(parallax.sky, 0, 0);
    const layer = (image, rate) => {
      const x = Math.round(-((cam.x * rate) % parallax.width) * BG_RES);
      bgCtx.drawImage(image, x, 0);
      if (x + image.width < bgCanvas.width) bgCtx.drawImage(image, x + image.width, 0);
    };
    layer(parallax.clouds, 0.06);
    layer(parallax.far, 0.14);
    layer(parallax.mid, 0.28);
    layer(parallax.near, 0.46);
  }

  // 同じ模様が並ばないよう、位置から土の種類を決める
  const variant = (c, r) => ((c * 7 + r * 13) ^ (c >> 2)) & 3;

  function paintChunk(index) {
    const chunk = chunks[index];
    if (!chunk.canvas) {
      chunk.canvas = document.createElement('canvas');
      chunk.canvas.width = CHUNK * TS * RES;
      chunk.canvas.height = VIEW_H * RES;
    }
    const chunkCtx = chunk.canvas.getContext('2d');
    chunkCtx.setTransform(RES, 0, 0, RES, 0, 0);
    chunkCtx.clearRect(0, 0, CHUNK * TS, VIEW_H);
    ctx = chunkCtx;
    const c0 = index * CHUNK;
    paintTiles(-c0 * TS, c0, Math.min(level.width - 1, c0 + CHUNK - 1));
    ctx = screenCtx;
    chunk.dirty = false;
  }

  function drawTiles(ox) {
    const first = Math.max(0, Math.floor(cam.x / (CHUNK * TS)));
    const last = Math.min(chunks.length - 1, Math.floor((cam.x + VIEW_W + 8) / (CHUNK * TS)));
    for (let i = first; i <= last; i++) {
      if (chunks[i].dirty) paintChunk(i);
      ctx.drawImage(chunks[i].canvas, snap(i * CHUNK * TS + ox), 0, CHUNK * TS, VIEW_H);
    }
  }

  function paintTiles(ox, c0, c1) {
    const at = (c, r) => (r < 0 || r >= ROWS || c < 0 || c >= level.width ? T.GROUND : level.grid[r][c]);
    // 芝は上のタイルへはみ出すので、下の行から順に描くと土が芝を隠さない
    for (let r = ROWS - 1; r >= 0; r--) {
      for (let c = c0; c <= c1; c++) {
        const t = level.grid[r][c];
        if (t === T.EMPTY) continue;
        const x = c * TS + ox;
        const y = r * TS;
        if (t === T.GROUND) {
          const covered = at(c, r - 1) === T.GROUND || at(c, r - 1) === T.STONE;
          drawImage(covered ? tiles.fill[variant(c, r)] : tiles.top[variant(c, r)], x, covered ? y : y - 4);
          if (!isSolid(at(c - 1, r))) drawImage(tiles.edge, x, y);
          if (!isSolid(at(c + 1, r))) {
            ctx.save();
            ctx.translate(snap(x) + TS, y);
            ctx.scale(-1, 1);
            ctx.drawImage(tiles.edge, 0, 0, 4, TS);
            ctx.restore();
          }
          // 深い土ほど暗くして奥行きを出す
          let depth = 0;
          while (depth < 3 && at(c, r - depth - 1) === T.GROUND) depth++;
          drawImage(tiles.shade[depth], x, y);
        } else if (t === T.ONEWAY) drawImage(tiles.oneway, x, y);
        else if (t === T.CRATE) drawImage(tiles.crate, x, y);
        else if (t === T.USED) drawImage(tiles.used, x, y);
        else if (t === T.SPIKE) drawImage(tiles.spike, x, y);
        else if (t === T.STONE) drawImage(tiles.stone, x, y);
      }
    }
  }

  // 足元の地面を探して、接地感を出す影を落とす
  function drawShadow(cx, bottom, radius, ox) {
    const c = Math.floor(cx / TS);
    for (let r = Math.max(0, Math.floor(bottom / TS)); r < ROWS; r++) {
      const t = tile(c, r);
      if (isSolid(t) || t === T.ONEWAY) {
        const gap = r * TS - bottom;
        const k = Math.max(0, 1 - gap / 70);
        if (k <= 0) return;
        ctx.fillStyle = `rgba(0, 0, 0, ${0.32 * k})`;
        ctx.beginPath();
        ctx.ellipse(cx + ox, r * TS + 1, radius * (0.6 + 0.4 * k), 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
    }
  }

  function drawGoal(g, ox) {
    drawGlow(g.x + 16 + ox, g.y + 26, 110, 0.55 + Math.sin(frame / 24) * 0.15);
    drawSprite('goal', g.x - 4 + ox, g.y - 12);
    drawSprite('star', g.x + 9 + ox, g.y - 19 + Math.sin(frame / 18) * 2);
  }

  function drawPlayer(ox) {
    const p = player;
    if (p.x < 0) return;
    drawShadow(p.x + p.w / 2, p.y + p.h, 8, ox);
    if (p.invuln > 0 && Math.floor(frame / 4) % 2 === 0) return;
    let name = 'heroStand';
    if (!p.ground) name = p.vy < 0 ? 'heroJump' : 'heroFall';
    else if (Math.abs(p.vx) > 8) name = `heroRun${Math.floor(p.walk / 9) % 4}`;
    const sx = p.x + p.w / 2 - 12;
    const sy = p.y + p.h - 29.9;
    if (p.cape) drawSprite('cape', sx, sy, p.face < 0);
    drawSprite(name, sx, sy, p.face < 0);
  }

  function render() {
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    if (!level) return;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawBackground();
    const shakeX = cam.shake > 0 ? (Math.random() - 0.5) * 4 : 0;
    const ox = snap(-cam.x + shakeX);
    const onScreen = (e) => e.x + (e.w || 16) + ox > -40 && e.x + ox < VIEW_W + 40;

    for (const l of entities.lanterns) {
      if (!onScreen(l)) continue;
      if (l.lit) drawGlow(l.x + 6 + ox, l.y - 3, 70, 0.7 + Math.sin(frame / 20) * 0.12);
      drawSprite(l.lit ? 'lanternOn' : 'lanternOff', l.x - 1 + ox, l.y - 10);
    }
    if (entities.goal) drawGoal(entities.goal, ox);
    drawTiles(ox);
    for (const m of entities.movers) {
      if (!onScreen(m)) continue;
      for (let i = 0; i < m.w; i += TS) drawSprite('mover', m.x + i + ox, m.y);
    }
    for (const s of entities.springs) if (onScreen(s)) drawSprite(s.press > 0 ? 'spring2' : 'spring1', s.x + ox, s.y);
    for (const s of entities.stars) {
      if (!s.got && onScreen(s)) drawSprite('star', s.x - 2 + ox, s.y - 2 + Math.sin(frame / 18 + s.x) * 1.5);
    }
    for (const item of entities.items) {
      drawGlow(item.x + 6 + ox, item.y + 5, 30, 0.5);
      drawSprite(item.kind === 'cape' ? 'capeItem' : 'heart', item.x + ox, item.y + Math.sin(frame / 14) * 1.5);
    }
    const flipFrame = Math.floor(frame / 12) % 2;
    const OFFSET = { beetle: [-2, -4], hedge: [-2, -5], bird: [-3, -4] };
    for (const e of entities.enemies) {
      if (!onScreen(e)) continue;
      const flip = e.vx > 0;
      const [dx, dy] = OFFSET[e.type];
      if (!e.alive) {
        if (e.squash > 0) {
          const image = sprites[`${e.type}0`];
          ctx.globalAlpha = Math.min(1, e.squash * 4);
          ctx.drawImage(image, snap(e.x + dx + ox), snap(e.y + e.h - 5), image.logicalW, 5);
          ctx.globalAlpha = 1;
        }
        continue;
      }
      if (e.type !== 'bird') drawShadow(e.x + e.w / 2, e.y + e.h, 7, ox);
      drawSprite(e.type + flipFrame, e.x + dx + ox, e.y + dy, flip);
    }
    const b = entities.boss;
    if (b) {
      drawShadow(b.x + b.w / 2, b.y + b.h, 24, ox);
      if (!(b.flash > 0 && Math.floor(frame / 3) % 2)) drawSprite(`boss${flipFrame}`, b.x - 5 + ox, b.y - 11, b.vx > 0);
    }
    drawPlayer(ox);
    for (const q of particles) {
      if (q.sprite) {
        drawSprite(q.sprite, q.x + ox, q.y);
      } else {
        ctx.globalAlpha = Math.min(1, q.life * 3);
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.arc(q.x + ox, q.y, 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    if (b && b.alive) {
      ctx.fillStyle = '#000a';
      ctx.fillRect(150, 26, 100, 7);
      ctx.fillStyle = '#ff5a78';
      ctx.fillRect(151, 27, (98 * b.hp) / 3, 5);
    }
  }

  // ---- HUDと画面 ----
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  function updateHud() {
    if (!player) return;
    const hp = Math.max(0, player.hp);
    ui.hearts.textContent = '♥'.repeat(hp) + '♡'.repeat(MAX_HP - hp);
    ui.cape.hidden = !player.cape;
    ui.stars.textContent = `${starsThisRun}/${level.totalStars}`;
    ui.stage.textContent = `${levelIndex + 1}. ${level.name}`;
  }

  function toggleSound() {
    ui.sound.classList.toggle('off', window.GameAudio.toggleMute());
  }

  function showPanel(html, handlers = {}, plain = false) {
    ui.overlay.innerHTML = `<div class="panel${plain ? ' plain' : ''}">${html}</div>`;
    ui.overlay.querySelectorAll('[data-act]').forEach((button) => {
      button.addEventListener('click', (e) => {
        e.currentTarget.blur();
        window.GameAudio.unlock();
        handlers[button.dataset.act](button.dataset.arg);
      });
    });
  }

  const clearPanel = () => { ui.overlay.innerHTML = ''; };

  function showTitle() {
    mode = 'title';
    window.GameAudio.stopSong();
    ui.hud.hidden = true;
    ui.touch.hidden = true;
    if (!level) loadLevel(0);
    player.x = -100;
    const buttons = window.Levels.list.map((make, i) => {
      const locked = i > save.unlocked;
      const name = locked ? '？？？' : make().name;
      return `<button type="button" data-act="start" data-arg="${i}"${locked ? ' disabled' : ''}>${i + 1}. ${name}</button>`;
    });
    // 先頭のボタンがEnterで始まるので、進んでいるステージを先頭に置く
    const order = [...buttons.keys()].sort((a, b) => (b === Math.min(save.unlocked, buttons.length - 1)) - (a === Math.min(save.unlocked, buttons.length - 1)));
    showPanel(`
      <h1>コロのほしあつめ</h1>
      <p>スーツ姿のコロさんと、星のかけらを集めて走ろう！</p>
      <dl class="keys">
        ${isTouch ? `
          <dt>◀ ▶</dt><dd>移動</dd>
          <dt>A</dt><dd>ジャンプ（マントがあれば空中でもう一回）</dd>
          <dt>B</dt><dd>押しながらダッシュ</dd>
        ` : `
          <dt>← → / A D</dt><dd>移動</dd>
          <dt>Space / ↑ / Z</dt><dd>ジャンプ（マントがあれば空中でもう一回）</dd>
          <dt>X / K</dt><dd>押しながらダッシュ</dd>
          <dt>P ・ M</dt><dd>ポーズ ・ 音のオンオフ</dd>
        `}
      </dl>
      <div class="actions">${order.map((i) => buttons[i]).join('')}</div>
    `, { start: (arg) => startLevel(Number(arg)) });
  }

  function startLevel(index) {
    loadLevel(index);
    mode = 'intro';
    ui.hud.hidden = false;
    ui.touch.hidden = !isTouch;
    window.GameAudio.playSong(level.theme.song);
    showPanel(`<h2>ステージ ${index + 1}</h2><p>${level.name}</p>`, {}, true);
    setTimeout(() => {
      if (mode === 'intro') {
        clearPanel();
        mode = 'play';
      }
    }, debug ? 0 : 1200);
  }

  function pause() {
    mode = 'pause';
    showPanel(`
      <h2>ポーズ</h2>
      <div class="actions">
        <button type="button" data-act="resume">つづける</button>
        <button type="button" class="secondary" data-act="retry">やりなおす</button>
        <button type="button" class="secondary" data-act="title">タイトルへ</button>
      </div>
    `, { resume, retry: () => startLevel(levelIndex), title: showTitle });
  }

  function resume() {
    clearPanel();
    mode = 'play';
  }

  function gameOver() {
    mode = 'over';
    window.GameAudio.stopSong();
    sfx.over();
    showPanel(`
      <h2>ゲームオーバー</h2>
      <p>ここまでに集めた星 ★ ${starsThisRun}</p>
      <div class="actions">
        <button type="button" data-act="retry">もういちど</button>
        <button type="button" class="secondary" data-act="title">タイトルへ</button>
      </div>
    `, { retry: () => startLevel(levelIndex), title: showTitle });
  }

  function stageClear() {
    mode = 'clear';
    window.GameAudio.stopSong();
    sfx.clear();
    const key = String(levelIndex);
    const prev = save.best[key];
    const isBest = !prev || starsThisRun > prev.stars || (starsThisRun === prev.stars && clock < prev.time);
    if (isBest) save.best[key] = { stars: starsThisRun, time: clock };
    const isLast = levelIndex === window.Levels.list.length - 1;
    if (!isLast) save.unlocked = Math.max(save.unlocked, levelIndex + 1);
    persist();
    const best = save.best[key];
    showPanel(`
      <h2>${isLast ? 'ぜんぶクリア！おめでとう！' : 'ステージクリア！'}</h2>
      <p>星 ★ ${starsThisRun} / ${level.totalStars}　タイム ${formatTime(clock)}${isBest ? '　<b>ベスト更新！</b>' : ''}</p>
      <p class="sub">ベスト：★ ${best.stars}　${formatTime(best.time)}</p>
      <div class="actions">
        ${isLast ? '' : '<button type="button" data-act="next">つぎのステージ</button>'}
        <button type="button" class="${isLast ? '' : 'secondary'}" data-act="retry">もういちど</button>
        <button type="button" class="secondary" data-act="title">タイトルへ</button>
      </div>
    `, { next: () => startLevel(levelIndex + 1), retry: () => startLevel(levelIndex), title: showTitle });
  }

  ui.sound.classList.toggle('off', window.GameAudio.isMuted());
  ui.sound.addEventListener('click', (e) => { e.currentTarget.blur(); toggleSound(); });
  ui.pause.addEventListener('click', (e) => {
    e.currentTarget.blur();
    if (mode === 'play') pause();
    else if (mode === 'pause') resume();
  });

  // ---- メインループ ----
  let last = performance.now();
  let lastSecond = -1;

  function loop(now) {
    const delta = Math.min(0.05, (now - last) / 1000);
    last = now;
    frame = now / 16.67; // 画面の更新回数に関係なくアニメーションの速さをそろえる
    if (mode === 'play' && delta > 0) {
      // 画面の更新ごとに進めると、遅れとブレが出にくい
      const steps = Math.ceil(delta * 50);
      for (let i = 0; i < steps && mode === 'play'; i++) step(delta / steps);
      const sec = Math.floor(clock);
      if (sec !== lastSecond) {
        lastSecond = sec;
        ui.time.textContent = formatTime(clock);
      }
    } else if (mode === 'title') {
      cam.x = (Math.sin(now / 6000) * 0.5 + 0.5) * 900;
      stepParticles(delta);
    }
    render();
    requestAnimationFrame(loop);
  }

  // ?debug を付けたときだけ、自動テスト用の窓口を公開する
  const debug = new URLSearchParams(location.search).has('debug');
  if (debug) {
    window.KoroDebug = {
      input,
      keys: KEYS,
      render,
      player: () => player,
      sprites,
      step: (dt) => { if (mode === 'play') step(dt || STEP); },
      startLevel,
      state: () => ({
        mode, levelIndex, x: player.x, y: player.y, vx: player.vx, vy: player.vy, ground: player.ground,
        hp: player.hp, cape: player.cape, stars: starsThisRun, total: level.totalStars,
        clock, bossHp: entities.boss ? entities.boss.hp : null, bossFight,
      }),
      world: () => ({ level, entities, tile, isSolid }),
      resetSave: () => { save.unlocked = 0; save.best = {}; persist(); },
      unlockAll: () => { save.unlocked = 2; },
      showTitle,
    };
  }

  showTitle();
  requestAnimationFrame(loop);
})();
