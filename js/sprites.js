// ドット絵データ。1文字が1ピクセルで、"." は透明。色は PALETTE で決まる。
(function () {
  'use strict';

  const PALETTE = {
    o: '#f28c38', O: '#c9651c', c: '#fff1d6', k: '#1b1f3b', w: '#ffffff',
    t: '#2bb3a3', T: '#1a8578', r: '#ff6b7f', R: '#c93f5a', y: '#ffd84d',
    Y: '#e8a91c', g: '#6b7a8f', G: '#47536a', p: '#8b5fbf', P: '#5f3d94',
    b: '#4aa8e8', B: '#2c74b8', s: '#c7ccd8', d: '#7a4a2b',
  };

  // コロの上半身。脚だけ差し替えて動きをつける。
  const KORO_BODY = [
    '....o......o....',
    '....oo....oo....',
    '....oooooooo....',
    '...oooooooooo...',
    '...oowkoowkoo...',
    '...occcccccco...',
    '...occckkccco...',
    '....cccccccc....',
    '.c..oooooooo....',
    'cco.occcccoo....',
    'coo.occcccoo....',
    '.ooooocccooo....',
  ];

  const KORO_LEGS = {
    stand: ['..ooooooooo.....', '....oo...oo.....', '....oo...oo.....', '....kk...kk.....'],
    run1: ['..ooooooooo.....', '...ooo...ooo....', '..kk.......kk...', '................'],
    run2: ['..ooooooooo.....', '.....ooooo......', '.....kk.kk......', '................'],
    jump: ['..oooooooooo....', '...oo.....ooo...', '...kk.......kk..', '................'],
  };

  const koro = (legs) => KORO_BODY.concat(KORO_LEGS[legs]);

  const SHEETS = {
    koroStand: koro('stand'),
    koroRun1: koro('run1'),
    koroRun2: koro('run2'),
    koroJump: koro('jump'),
    cape: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '...ttttttttt....',
      '..tTtttttttt....',
      '.ttTt...........',
      'ttTTt...........',
      'tTTt............',
      'tTt.............',
      '.t..............',
      '................',
      '................',
    ],
    beetle1: [
      '................',
      '.....gggggg.....',
      '...ggsgggggg....',
      '..ggsggggggGG...',
      '.gggggggggggGG..',
      'kwkggggggggggG..',
      'kkkggggggggggG..',
      '.GGGGGGGGGGGGG..',
      '..k..k....k..k..',
      '.k...k...k...k..',
      '................',
      '................',
    ],
    beetle2: [
      '................',
      '.....gggggg.....',
      '...ggsgggggg....',
      '..ggsggggggGG...',
      '.gggggggggggGG..',
      'kwkggggggggggG..',
      'kkkggggggggggG..',
      '.GGGGGGGGGGGGG..',
      '...k..k..k..k...',
      '...k...k.k...k..',
      '................',
      '................',
    ],
    hedge1: [
      '.....p..p..p....',
      '....pPp.pPp.p...',
      '..p.pPPpPPPpP.p.',
      '..PpPPPPPPPPPpP.',
      '.pPPPPPPPPPPPPP.',
      'ccPPPPPPPPPPPPP.',
      'wkcPPPPPPPPPPPP.',
      'ccccPPPPPPPPPP..',
      '.ccccccccccccc..',
      '..kk.......kk...',
      '................',
      '................',
    ],
    hedge2: [
      '.....p..p..p....',
      '....pPp.pPp.p...',
      '..p.pPPpPPPpP.p.',
      '..PpPPPPPPPPPpP.',
      '.pPPPPPPPPPPPPP.',
      'ccPPPPPPPPPPPPP.',
      'wkcPPPPPPPPPPPP.',
      'ccccPPPPPPPPPP..',
      '.ccccccccccccc..',
      '.....kk..kk.....',
      '................',
      '................',
    ],
    bird1: [
      '........bb......',
      '.......bBb......',
      '......bBBb......',
      '.....bbBBb......',
      '...bbbbbbbbb....',
      'yykwbbbbbbbbbb..',
      'yybbbbbbbbbb.BB.',
      '...cccccccc...B.',
      '................',
      '................',
    ],
    bird2: [
      '................',
      '................',
      '................',
      '................',
      '...bbbbbbbbb....',
      'yykwbbbbbbbbbb..',
      'yybbbbBBbbbb.BB.',
      '...ccccBBcc...B.',
      '.......BBb......',
      '........Bb......',
    ],
    star: [
      '....yy....',
      '....yy....',
      '...yyyy...',
      'yyyywyyyyy',
      '.yyywyyyy.',
      '..yyyyyy..',
      '..yyYYyy..',
      '.yyY..Yyy.',
      '.yY....Yy.',
      '..........',
    ],
    heart: [
      '.rr...rr..',
      'rwrr.rrrr.',
      'rwrrrrrrR.',
      'rrrrrrrrR.',
      '.rrrrrrR..',
      '..rrrrR...',
      '...rrR....',
      '....R.....',
    ],
    capeItem: [
      '...tttttt...',
      '..tttttttt..',
      '.ttTttttTtt.',
      '.tTtttttttt.',
      '.tttttttttT.',
      'ttttttttttTt',
      'ttttttttttTT',
      'tTtttttTttTT',
      '.t.tt.tt.tt.',
    ],
    lanternOff: [
      '.....dd.....',
      '.....dd.....',
      '...GGGGGG...',
      '..G......G..',
      '..G......G..',
      '..G......G..',
      '..G......G..',
      '...GGGGGG...',
      '.....dd.....',
      '.....dd.....',
      '.....dd.....',
      '.....dd.....',
      '.....dd.....',
      '.....dd.....',
      '....dddd....',
      '...dddddd...',
    ],
    lanternOn: [
      '.....dd.....',
      '.....dd.....',
      '...GGGGGG...',
      '..GyyyyyyG..',
      '..GywwyyyG..',
      '..GywwyyyG..',
      '..GyyyyyyG..',
      '...GGGGGG...',
      '.....dd.....',
      '.....dd.....',
      '.....dd.....',
      '.....dd.....',
      '.....dd.....',
      '.....dd.....',
      '....dddd....',
      '...dddddd...',
    ],
    spring1: [
      '................',
      '................',
      '................',
      '..rrrrrrrrrrrr..',
      '..RRRRRRRRRRRR..',
      '....ss.ss.ss....',
      '...ss.ss.ss.....',
      '..GGGGGGGGGGGG..',
    ],
    spring2: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '..rrrrrrrrrrrr..',
      '..RRRRRRRRRRRR..',
      '..GGGGGGGGGGGG..',
    ],
    mover: [
      'yyyyyyyyyyyyyyyy',
      'YYYYYYYYYYYYYYYY',
      'dddddddddddddddd',
      '.d..d..d..d..d..',
    ],
  };

  // 文字列のドット絵をキャンバスへ変換する。overrides で色を差し替えられる。
  function bake(rows, overrides) {
    const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = rows.length;
    const ctx = canvas.getContext('2d');
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        ctx.fillStyle = (overrides && overrides[ch]) || PALETTE[ch] || '#f0f';
        ctx.fillRect(x, y, 1, 1);
      });
    });
    return canvas;
  }

  function buildAll() {
    const out = {};
    Object.keys(SHEETS).forEach((name) => { out[name] = bake(SHEETS[name]); });
    // ボスはゴロムシの色違いを拡大して使う
    const bossColors = { g: '#a33f5f', G: '#6e2745', s: '#ff9db0', k: '#1b1f3b' };
    out.boss1 = bake(SHEETS.beetle1, bossColors);
    out.boss2 = bake(SHEETS.beetle2, bossColors);
    return out;
  }

  // 背景まわりの乱数は固定シードにして、毎回同じ見た目にする
  function seeded(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function makeTile(paint) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    paint(canvas.getContext('2d'));
    return canvas;
  }

  function speckle(ctx, color, count, seed) {
    const rand = seeded(seed);
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      ctx.fillRect(Math.floor(rand() * 15), Math.floor(rand() * 15), 2, 1);
    }
  }

  function buildTiles(theme) {
    const fill = (ctx) => {
      ctx.fillStyle = theme.dirt;
      ctx.fillRect(0, 0, 16, 16);
      speckle(ctx, theme.dirtDark, 7, 7);
    };
    return {
      fill: makeTile(fill),
      top: makeTile((ctx) => {
        fill(ctx);
        ctx.fillStyle = theme.top;
        ctx.fillRect(0, 0, 16, 5);
        ctx.fillStyle = theme.topLight;
        ctx.fillRect(0, 0, 16, 2);
        ctx.fillStyle = theme.top;
        [1, 5, 8, 12, 14].forEach((x) => ctx.fillRect(x, 5, 2, 1));
      }),
      stone: makeTile((ctx) => {
        ctx.fillStyle = theme.stone;
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = theme.stoneDark;
        ctx.fillRect(0, 7, 16, 1);
        ctx.fillRect(0, 15, 16, 1);
        ctx.fillRect(7, 0, 1, 7);
        ctx.fillRect(12, 8, 1, 7);
        ctx.fillRect(3, 8, 1, 7);
      }),
      oneway: makeTile((ctx) => {
        ctx.fillStyle = theme.top;
        ctx.fillRect(0, 0, 16, 3);
        ctx.fillStyle = theme.topLight;
        ctx.fillRect(0, 0, 16, 1);
        ctx.fillStyle = theme.dirtDark;
        ctx.fillRect(0, 3, 16, 2);
        ctx.fillRect(2, 5, 2, 3);
        ctx.fillRect(12, 5, 2, 3);
      }),
      crate: makeTile((ctx) => {
        ctx.fillStyle = '#7a4a2b';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#c98f52';
        ctx.fillRect(1, 1, 14, 14);
        ctx.fillStyle = '#a56c38';
        ctx.fillRect(1, 5, 14, 1);
        ctx.fillRect(1, 10, 14, 1);
        ctx.fillStyle = '#ffd84d';
        ctx.fillRect(7, 3, 2, 10);
        ctx.fillRect(3, 7, 10, 2);
        ctx.fillRect(5, 5, 6, 6);
      }),
      used: makeTile((ctx) => {
        ctx.fillStyle = '#51402f';
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#7d6549';
        ctx.fillRect(1, 1, 14, 14);
        ctx.fillStyle = '#65513b';
        ctx.fillRect(1, 5, 14, 1);
        ctx.fillRect(1, 10, 14, 1);
      }),
      spike: makeTile((ctx) => {
        ctx.fillStyle = '#d5dbe8';
        for (let i = 0; i < 4; i++) {
          const x = i * 4;
          for (let h = 0; h < 8; h++) {
            const half = Math.ceil((8 - h) / 4);
            ctx.fillRect(x + 2 - half, 15 - (7 - h) * 1 - 0, half * 2, 1);
          }
        }
        ctx.fillStyle = '#8791a8';
        ctx.fillRect(0, 15, 16, 1);
      }),
    };
  }

  // 横につなげて繰り返せる遠景の帯を作る
  function buildParallax(theme) {
    const width = 800;
    const makeRidge = (color, base, amp, f1, f2, seed) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = 224;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      const p = seeded(seed)() * Math.PI * 2;
      for (let x = 0; x < width; x += 2) {
        const t = (x / width) * Math.PI * 2;
        const h = Math.sin(t * f1 + p) * amp + Math.sin(t * f2 + p * 2) * amp * 0.45;
        const y = Math.round((base + h) / 2) * 2;
        ctx.fillRect(x, y, 2, 224 - y);
      }
      return canvas;
    };
    const decor = document.createElement('canvas');
    decor.width = width;
    decor.height = 224;
    const ctx = decor.getContext('2d');
    const rand = seeded(1234);
    if (theme.starry) {
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = rand() < 0.25 ? '#ffd84d' : '#ffffffaa';
        ctx.fillRect(Math.floor(rand() * width), Math.floor(rand() * 160), 1 + Math.floor(rand() * 2), 1);
      }
    } else {
      ctx.fillStyle = theme.cloud;
      for (let i = 0; i < 7; i++) {
        const x = Math.floor(rand() * (width - 80));
        const y = 20 + Math.floor(rand() * 60);
        const w = 36 + Math.floor(rand() * 34);
        ctx.fillRect(x, y + 6, w, 8);
        ctx.fillRect(x + 8, y, w - 16, 16);
        ctx.fillRect(x + 16, y - 4, w - 32, 6);
      }
    }
    return {
      width,
      decor,
      far: makeRidge(theme.far, 130, 24, 3, 7, 11),
      near: makeRidge(theme.near, 165, 16, 4, 9, 29),
    };
  }

  window.Sprites = { buildAll, buildTiles, buildParallax };
})();
