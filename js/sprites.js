// グラフィック生成。画像ファイルは使わず、起動時に高解像度の絵を描いて保存しておく。
// 座標は「論理ピクセル」(画面全体が 400x224)。RES 倍の解像度で描画する。
(function () {
  'use strict';

  const RES = 2;
  const BG_RES = 1.5;

  function bake(w, h, paint, res = RES) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * res);
    canvas.height = Math.ceil(h * res);
    canvas.logicalW = w;
    canvas.logicalH = h;
    const ctx = canvas.getContext('2d');
    ctx.scale(res, res);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    paint(ctx);
    return canvas;
  }

  // 模様や地形の乱数は固定シードにして、毎回同じ見た目にする
  function seeded(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  const linear = (ctx, x0, y0, x1, y1, stops) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((color, i) => g.addColorStop(i / (stops.length - 1), color));
    return g;
  };

  const radial = (ctx, x, y, r0, r1, stops, fx = x, fy = y) => {
    const g = ctx.createRadialGradient(fx, fy, r0, x, y, r1);
    stops.forEach((color, i) => g.addColorStop(i / (stops.length - 1), color));
    return g;
  };

  function ellipse(ctx, x, y, rx, ry, fill, rotation = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---- 主人公 ----
  const SUIT = '#8f959f';
  const SUIT_DARK = '#5e646e';
  const TROUSERS = '#6b717b';
  const SKIN_HI = '#ffe0bf';
  const SKIN = '#f0bb8e';
  const SKIN_LO = '#c98a62';

  function limb(ctx, x0, y0, x1, y1, width, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  function leg(ctx, hipX, hipY, angle, bend, color) {
    const kneeX = hipX + Math.sin(angle) * 3.7;
    const kneeY = hipY + Math.cos(angle) * 3.7;
    const footX = kneeX + Math.sin(angle - bend) * 3.7;
    const footY = kneeY + Math.cos(angle - bend) * 3.7;
    limb(ctx, hipX, hipY, kneeX, kneeY, 3.4, color);
    limb(ctx, kneeX, kneeY, footX, footY, 3, color);
    ctx.fillStyle = linear(ctx, footX, footY - 1, footX, footY + 2, ['#3a3d47', '#14151b']);
    ctx.beginPath();
    ctx.ellipse(footX + 1.2, footY + 0.9, 2.9, 1.5, -0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  function arm(ctx, x, y, angle, bend, color) {
    const elbowX = x + Math.sin(angle) * 3.6;
    const elbowY = y + Math.cos(angle) * 3.6;
    const handX = elbowX + Math.sin(angle + bend) * 3.6;
    const handY = elbowY + Math.cos(angle + bend) * 3.6;
    limb(ctx, x, y, elbowX, elbowY, 2.7, color);
    limb(ctx, elbowX, elbowY, handX, handY, 2.5, color);
    ellipse(ctx, handX, handY, 1.35, 1.35, SKIN);
  }

  function torso(ctx, bob) {
    ctx.save();
    ctx.translate(0, bob);
    roundRect(ctx, 5.6, 12.8, 13, 9.1, 3.2);
    ctx.fillStyle = linear(ctx, 5, 13, 18, 22, ['#adb2bb', SUIT, SUIT_DARK]);
    ctx.fill();
    ctx.save();
    ctx.clip();
    // ピンストライプ
    ctx.strokeStyle = '#ffffff33';
    ctx.lineWidth = 0.22;
    for (let x = 6; x < 19; x += 1.15) {
      ctx.beginPath();
      ctx.moveTo(x, 12);
      ctx.lineTo(x, 22);
      ctx.stroke();
    }
    ctx.restore();
    // シャツとネクタイ
    ctx.fillStyle = '#fbfbfb';
    ctx.beginPath();
    ctx.moveTo(10.2, 12.7);
    ctx.lineTo(15.4, 12.7);
    ctx.lineTo(13.2, 18.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b3172d';
    ctx.beginPath();
    ctx.moveTo(12, 13.1);
    ctx.lineTo(13.6, 13.1);
    ctx.lineTo(13.2, 14.1);
    ctx.lineTo(14, 18.4);
    ctx.lineTo(12.9, 19.6);
    ctx.lineTo(11.8, 18.4);
    ctx.lineTo(12.5, 14.1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff5a68';
    [[12.7, 15.1], [13.2, 16.3], [12.5, 16.9], [13, 18.1]].forEach(([x, y]) => ctx.fillRect(x, y, 0.42, 0.42));
    // 襟とバッジ
    ctx.strokeStyle = '#4f545d';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(10.2, 12.9);
    ctx.lineTo(12.6, 19.2);
    ctx.moveTo(15.5, 12.9);
    ctx.lineTo(13.8, 19.2);
    ctx.stroke();
    ellipse(ctx, 15.2, 15.2, 0.5, 0.5, '#ffd84d');
    ctx.restore();
  }

  function head(ctx, bob) {
    ctx.save();
    ctx.translate(0, bob);
    // 首
    ellipse(ctx, 12.2, 12.4, 3.2, 2, SKIN_LO);
    // 耳
    ellipse(ctx, 5.1, 7.8, 1.3, 1.9, SKIN);
    ellipse(ctx, 5.2, 7.9, 0.6, 1, SKIN_LO);
    // 顔は丸く、頬をふっくらさせる
    ctx.beginPath();
    ctx.moveTo(4.5, 6);
    ctx.bezierCurveTo(4.5, 1, 19.9, 1, 20.3, 6.2);
    ctx.bezierCurveTo(21.2, 11.2, 17.8, 14.1, 12.8, 14.1);
    ctx.bezierCurveTo(7.4, 14.1, 3.8, 11.2, 4.5, 6);
    ctx.closePath();
    ctx.fillStyle = radial(ctx, 12.8, 8, 1, 11, [SKIN_HI, SKIN, SKIN_LO], 15, 5.8);
    ctx.fill();
    // 頬の赤み
    ellipse(ctx, 16.6, 9.7, 1.7, 1.1, '#ff8d7433');
    ellipse(ctx, 9.4, 9.9, 1.8, 1.2, '#ff8d7426');
    // 眉
    ctx.strokeStyle = '#6d4322';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(9, 5.8);
    ctx.quadraticCurveTo(10.8, 5.1, 12.4, 5.7);
    ctx.moveTo(14.8, 5.7);
    ctx.quadraticCurveTo(16.4, 5.1, 18, 5.8);
    ctx.stroke();
    // 目
    ellipse(ctx, 11, 7.6, 0.58, 0.55, '#26211f');
    ellipse(ctx, 16.5, 7.6, 0.56, 0.55, '#26211f');
    ellipse(ctx, 11.15, 7.42, 0.16, 0.16, '#fff');
    ellipse(ctx, 16.65, 7.42, 0.16, 0.16, '#fff');
    // 鼻と口
    ctx.strokeStyle = SKIN_LO;
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(14, 8.4);
    ctx.quadraticCurveTo(15.9, 10.2, 13.4, 10.2);
    ctx.stroke();
    ellipse(ctx, 14.4, 9.3, 0.8, 0.5, '#fff0dd66');
    // 笑いじわで大人の顔つきにする
    ctx.strokeStyle = '#b5775566';
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(11.4, 9.7);
    ctx.quadraticCurveTo(10.3, 10.6, 10.2, 11.5);
    ctx.moveTo(16.5, 9.6);
    ctx.quadraticCurveTo(17.5, 10.4, 17.5, 11.3);
    ctx.stroke();
    ctx.strokeStyle = '#8a4b3b';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(10.9, 11.3);
    ctx.quadraticCurveTo(13.6, 12.9, 16.6, 11);
    ctx.stroke();
    // 細いシルバーのメガネ
    ctx.strokeStyle = '#eef2f6';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#d7ecff44';
    roundRect(ctx, 8.6, 6, 4.6, 3.1, 1);
    ctx.fill();
    ctx.stroke();
    roundRect(ctx, 14.3, 6, 4.5, 3.1, 1);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(13.2, 7.1);
    ctx.lineTo(14.3, 7.1);
    ctx.moveTo(8.6, 7.1);
    ctx.lineTo(5.5, 7.5);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff99';
    ctx.lineWidth = 0.25;
    ctx.beginPath();
    ctx.moveTo(9.4, 8.4);
    ctx.lineTo(10.4, 6.7);
    ctx.moveTo(15.1, 8.4);
    ctx.lineTo(16.1, 6.7);
    ctx.stroke();
    // 短く立ち上げた明るい茶色の髪
    const spikes = [
      [4.4, 7.4], [3.8, 4.6], [5, 4.3], [4.9, 2.2], [6.8, 2.6], [7.4, 0.8], [9.2, 1.8],
      [10.7, 0.2], [12.2, 1.5], [14, 0.1], [15.4, 1.6], [17.4, 0.9], [18, 2.7], [20.1, 2.9],
      [19.9, 4.8], [20.5, 5.6],
    ];
    ctx.beginPath();
    ctx.moveTo(spikes[0][0], spikes[0][1]);
    spikes.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.quadraticCurveTo(14.8, 3.5, 8.8, 4.6);
    ctx.quadraticCurveTo(6.2, 5, 5.5, 8);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, 12, 0, 12, 6.5, ['#eeb062', '#c67f33', '#854f20']);
    ctx.fill();
    ctx.strokeStyle = '#f5cd8c99';
    ctx.lineWidth = 0.28;
    ctx.beginPath();
    [[7, 4], [10, 3.2], [13, 3], [16, 3.1], [18.4, 3.4]].forEach(([x, y]) => {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.7, y - 2);
    });
    ctx.stroke();
    ctx.restore();
  }

  function paintHero(ctx, pose) {
    const hipY = 21.2 + pose.bob;
    arm(ctx, 7.2, 14.8 + pose.bob, pose.armBack, 0.5, SUIT_DARK);
    leg(ctx, 10.6, hipY, pose.legBack, pose.bendBack, '#565c66');
    leg(ctx, 13.6, hipY, pose.legFront, pose.bendFront, TROUSERS);
    torso(ctx, pose.bob);
    head(ctx, pose.bob);
    arm(ctx, 16.8, 14.8 + pose.bob, pose.armFront, 0.55, SUIT);
  }

  const HERO_POSES = {
    heroStand: { bob: 0, legBack: 0.1, legFront: -0.1, bendBack: 0, bendFront: 0, armBack: -0.15, armFront: 0.15 },
    heroRun0: { bob: -0.3, legBack: -0.8, legFront: 0.8, bendBack: 0.9, bendFront: 0.3, armBack: 0.7, armFront: -0.7 },
    heroRun1: { bob: -0.8, legBack: -0.2, legFront: 0.3, bendBack: 1.5, bendFront: 0.3, armBack: 0.2, armFront: -0.2 },
    heroRun2: { bob: -0.3, legBack: 0.8, legFront: -0.8, bendBack: 0.3, bendFront: 0.9, armBack: -0.7, armFront: 0.7 },
    heroRun3: { bob: -0.8, legBack: 0.3, legFront: -0.2, bendBack: 0.3, bendFront: 1.5, armBack: -0.2, armFront: 0.2 },
    heroJump: { bob: -0.6, legBack: -0.5, legFront: 1, bendBack: 1, bendFront: 1.3, armBack: 2.3, armFront: 2.5 },
    heroFall: { bob: 0, legBack: -0.4, legFront: 0.5, bendBack: 0.5, bendFront: 0.5, armBack: 1.8, armFront: 1.9 },
  };

  function paintCape(ctx) {
    ctx.beginPath();
    ctx.moveTo(8, 12.6);
    ctx.quadraticCurveTo(4, 12.4, 3.2, 17);
    ctx.quadraticCurveTo(1.8, 21, 0.3, 24.6);
    ctx.quadraticCurveTo(3.8, 23.4, 5.6, 25.4);
    ctx.quadraticCurveTo(8, 23.2, 10.6, 24);
    ctx.lineTo(13, 13);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, 2, 12, 11, 25, ['#58e0cd', '#1fa797', '#0e6a60']);
    ctx.fill();
  }

  // ---- 敵 ----
  function paintBeetle(ctx, frame, colors) {
    const legs = frame ? [3.6, 8, 13.2] : [4.8, 9.2, 12];
    ctx.strokeStyle = '#17181f';
    ctx.lineWidth = 0.9;
    legs.forEach((x, i) => {
      ctx.beginPath();
      ctx.moveTo(x + 1, 10.4);
      ctx.lineTo(x - 0.5 + (frame ? i * 0.3 : 0), 12.8);
      ctx.lineTo(x - 1.7, 13.4);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(1.6, 6.8);
    ctx.bezierCurveTo(2.6, 1.3, 15.6, 0.4, 17.4, 8.4);
    ctx.quadraticCurveTo(17.8, 10.9, 15, 11.2);
    ctx.lineTo(3.6, 11.2);
    ctx.quadraticCurveTo(1.2, 10, 1.6, 6.8);
    ctx.closePath();
    ctx.fillStyle = radial(ctx, 8, 6, 0.5, 11, [colors[0], colors[1], colors[2]], 6, 3.4);
    ctx.fill();
    ctx.strokeStyle = colors[3];
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(5.2, 3.3);
    ctx.quadraticCurveTo(7.4, 7, 7.1, 11);
    ctx.stroke();
    ellipse(ctx, 8.6, 3.6, 3.1, 0.75, '#ffffff66', -0.2);
    ellipse(ctx, 2.8, 8.8, 2.7, 2.5, colors[2]);
    ellipse(ctx, 2.1, 7.9, 1.05, 1.1, '#fff');
    ellipse(ctx, 1.8, 8, 0.52, 0.65, '#111');
    ctx.strokeStyle = colors[2];
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(1.6, 6.6);
    ctx.quadraticCurveTo(-0.3, 4.6, 0.8, 3.6);
    ctx.stroke();
  }

  const BEETLE = ['#8fb0c6', '#3f6079', '#172a3a', '#0d1b26'];
  const BOSS = ['#ff9db0', '#b32e50', '#4a0e26', '#2d0717'];

  function paintHedge(ctx, frame) {
    const feet = frame ? [4.2, 12.4] : [6.2, 10.4];
    feet.forEach((x) => ellipse(ctx, x, 13.8, 1.8, 0.95, '#42281e'));
    ellipse(ctx, 9.5, 9.5, 8, 4.8, linear(ctx, 0, 6, 0, 14, ['#f1dbb7', '#c79e74']));
    const rand = seeded(44);
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i <= 7; i++) {
        const t = i / 7;
        const a = Math.PI * (1.08 + t * 0.92);
        const r = 7.9 - row * 1.5;
        const bx = 10.3 + Math.cos(a) * r * 1.02;
        const by = 10 + Math.sin(a) * r * 0.9;
        const len = 3.9 + rand() * 0.9;
        ctx.beginPath();
        ctx.moveTo(bx - 0.9, by);
        ctx.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len);
        ctx.lineTo(bx + 0.9, by);
        ctx.closePath();
        ctx.fillStyle = linear(ctx, bx, by, bx + Math.cos(a) * len, by + Math.sin(a) * len, ['#4a2b73', '#8a5cc6', '#efe4ff']);
        ctx.fill();
      }
    }
    ellipse(ctx, 2.6, 10.3, 2.4, 2.1, '#f1dbb7');
    ellipse(ctx, 0.8, 10.7, 0.75, 0.7, '#1b1218');
    ellipse(ctx, 2.8, 9.5, 0.65, 0.75, '#111');
    ellipse(ctx, 2.6, 9.25, 0.2, 0.2, '#fff');
  }

  function paintBird(ctx, frame) {
    const wing = (dir, color) => {
      ctx.beginPath();
      ctx.moveTo(6.5, 7.7);
      ctx.quadraticCurveTo(10, 7.2 + dir * 4.5, 13.5 + (dir > 0 ? -1 : 2), 7.2 + dir * 6);
      ctx.quadraticCurveTo(13.5, 8, 12.4, 7.8);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };
    ctx.beginPath();
    ctx.moveTo(12, 7);
    ctx.lineTo(19.5, 5);
    ctx.lineTo(18.4, 7.8);
    ctx.lineTo(19.6, 9.8);
    ctx.lineTo(12, 9);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, 12, 7, 20, 7, ['#2a79c6', '#10406f']);
    ctx.fill();
    ellipse(ctx, 8.7, 8.1, 6.1, 3.3, linear(ctx, 0, 4.5, 0, 11.5, ['#73c5f4', '#2f8fdc', '#fff4dc']));
    ellipse(ctx, 4.2, 7, 2.8, 2.7, '#4fa9ea');
    ctx.beginPath();
    ctx.moveTo(2, 6.2);
    ctx.lineTo(-0.2, 7.2);
    ctx.lineTo(2, 8.1);
    ctx.closePath();
    ctx.fillStyle = '#f6bb2c';
    ctx.fill();
    ellipse(ctx, 3.5, 6.2, 0.9, 0.95, '#fff');
    ellipse(ctx, 3.3, 6.25, 0.46, 0.55, '#111');
    wing(frame ? 1 : -1, linear(ctx, 8, 2, 12, 13, ['#2d82d1', '#144d86']));
  }

  // ---- アイテム ----
  function starPath(ctx, x, y, outer, inner) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? inner : outer;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

  function paintStar(ctx) {
    ellipse(ctx, 7, 7, 7, 7, radial(ctx, 7, 7, 1, 7, ['#ffe48a88', '#ffe48a33', '#ffe48a00']));
    starPath(ctx, 7, 7.2, 5.4, 2.5);
    ctx.fillStyle = linear(ctx, 3, 2, 10, 12, ['#fff7c4', '#ffd447', '#ee9c1b']);
    ctx.fill();
    ctx.strokeStyle = '#c7770f';
    ctx.lineWidth = 0.35;
    ctx.stroke();
    ellipse(ctx, 5.6, 5.8, 1.1, 0.65, '#ffffffcc', -0.6);
  }

  function paintHeart(ctx) {
    ctx.beginPath();
    ctx.moveTo(6, 10.6);
    ctx.bezierCurveTo(-1.4, 5.6, 0.6, 0.4, 3.5, 0.8);
    ctx.bezierCurveTo(5, 1, 5.8, 2, 6, 2.8);
    ctx.bezierCurveTo(6.2, 2, 7, 1, 8.5, 0.8);
    ctx.bezierCurveTo(11.4, 0.4, 13.4, 5.6, 6, 10.6);
    ctx.closePath();
    ctx.fillStyle = radial(ctx, 6, 5, 0.5, 7.5, ['#ff9aa8', '#f4405e', '#a8112f'], 3.8, 3);
    ctx.fill();
    ellipse(ctx, 3.5, 3, 1.2, 0.75, '#ffffffbb', -0.6);
  }

  function paintCapeItem(ctx) {
    ctx.beginPath();
    ctx.moveTo(3.4, 1);
    ctx.quadraticCurveTo(6, 2.3, 8.6, 1);
    ctx.lineTo(11.6, 9.8);
    ctx.quadraticCurveTo(9.4, 8.6, 7.6, 10);
    ctx.quadraticCurveTo(5.6, 8.6, 3.8, 10);
    ctx.quadraticCurveTo(2, 9, 0.4, 9.8);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, 1, 1, 11, 10, ['#6ff0dc', '#1fa797', '#0e6a60']);
    ctx.fill();
    ctx.strokeStyle = '#ffd84d';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(3.4, 1);
    ctx.quadraticCurveTo(6, 2.3, 8.6, 1);
    ctx.stroke();
  }

  function paintLantern(ctx, lit) {
    ctx.fillStyle = linear(ctx, 6, 0, 8, 0, ['#5d3a22', '#8c5f3a', '#4b2e1a']);
    ctx.fillRect(6, 10, 2, 15);
    ellipse(ctx, 7, 25.2, 4, 0.9, '#3e2616');
    roundRect(ctx, 2.8, 2.7, 8.4, 8.2, 1.3);
    ctx.fillStyle = lit
      ? radial(ctx, 7, 7, 0.5, 6, ['#ffffff', '#ffe27a', '#ff9e2c'])
      : linear(ctx, 3, 3, 11, 11, ['#56607a88', '#2d334a99']);
    ctx.fill();
    ctx.strokeStyle = '#2c2a30';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = linear(ctx, 2, 0, 12, 0, ['#2e2c33', '#67646f', '#2e2c33']);
    ctx.beginPath();
    ctx.moveTo(1.8, 3);
    ctx.lineTo(7, 0.4);
    ctx.lineTo(12.2, 3);
    ctx.closePath();
    ctx.fill();
  }

  function paintSpring(ctx, pressed) {
    const plateY = pressed ? 4.2 : 2.2;
    ctx.fillStyle = linear(ctx, 0, 6, 0, 8, ['#7d8596', '#3d4351']);
    roundRect(ctx, 1.4, 6.3, 13.2, 1.7, 0.5);
    ctx.fill();
    ctx.strokeStyle = '#d7dde8';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = plateY + 1 + ((6.5 - plateY - 1) * i) / steps;
      ctx.lineTo(i % 2 ? 11.2 : 4.8, y);
    }
    ctx.stroke();
    roundRect(ctx, 1.4, plateY - 0.8, 13.2, 2.1, 0.8);
    ctx.fillStyle = linear(ctx, 0, plateY - 1, 0, plateY + 1.5, ['#ff8a94', '#d92d44', '#8f1228']);
    ctx.fill();
  }

  function paintMover(ctx) {
    ctx.fillStyle = linear(ctx, 0, 0, 0, 4.5, ['#ffe29a', '#d2963a', '#6e4620']);
    ctx.fillRect(0, 0, 16, 4.2);
    ctx.fillStyle = '#ffffff55';
    ctx.fillRect(0, 0, 16, 0.5);
    ctx.fillStyle = '#5b3a1b99';
    ctx.fillRect(15.6, 0.4, 0.4, 3.6);
    ellipse(ctx, 3, 2.2, 0.55, 0.55, '#7a5426');
    ellipse(ctx, 12.6, 2.2, 0.55, 0.55, '#7a5426');
  }

  function paintGoal(ctx) {
    ellipse(ctx, 20, 42, 17, 22, radial(ctx, 20, 42, 2, 22, ['#fff4b0dd', '#ffd96688', '#ffd96600']));
    ctx.beginPath();
    ctx.moveTo(8, 60);
    ctx.lineTo(8, 26);
    ctx.quadraticCurveTo(20, 8, 32, 26);
    ctx.lineTo(32, 60);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, 0, 14, 0, 60, ['#fffdf0', '#ffe27a', '#ff9e47']);
    ctx.fill();
    const pillar = (x) => {
      ctx.fillStyle = linear(ctx, x, 0, x + 7, 0, ['#c7b8e8', '#7f64b3', '#3c2a63']);
      roundRect(ctx, x, 20, 7, 40, 1.4);
      ctx.fill();
      ctx.fillStyle = '#ffffff33';
      ctx.fillRect(x + 1.2, 22, 0.8, 37);
    };
    pillar(3);
    pillar(30);
    ctx.strokeStyle = linear(ctx, 0, 6, 40, 22, ['#d9ccf2', '#7f64b3', '#3c2a63']);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(6.5, 26);
    ctx.quadraticCurveTo(20, 2, 33.5, 26);
    ctx.stroke();
  }

  function paintGlow(ctx) {
    ellipse(ctx, 32, 32, 32, 32, radial(ctx, 32, 32, 1, 32, ['#ffdc8caa', '#ffb95c33', '#ffb95c00']));
  }

  function buildAll() {
    const out = {};
    Object.keys(HERO_POSES).forEach((name) => {
      out[name] = bake(26, 33, (ctx) => paintHero(ctx, HERO_POSES[name]));
    });
    out.cape = bake(26, 33, paintCape);
    [0, 1].forEach((f) => {
      out[`beetle${f}`] = bake(18, 14, (ctx) => paintBeetle(ctx, f, BEETLE));
      out[`hedge${f}`] = bake(19, 15, (ctx) => paintHedge(ctx, f));
      out[`bird${f}`] = bake(20, 14, (ctx) => paintBird(ctx, f));
      out[`boss${f}`] = bake(54, 42, (ctx) => {
        ctx.scale(3, 3);
        paintBeetle(ctx, f, BOSS);
        // 親玉らしい角
        ctx.beginPath();
        ctx.moveTo(6.5, 3.4);
        ctx.quadraticCurveTo(5.8, -0.2, 2.6, 0.2);
        ctx.quadraticCurveTo(5, 1.6, 4.3, 4.3);
        ctx.closePath();
        ctx.fillStyle = linear(ctx, 2, 0, 6, 4, ['#fff0c0', '#d99a3c']);
        ctx.fill();
      });
    });
    out.star = bake(14, 14, paintStar);
    out.heart = bake(12, 11, paintHeart);
    out.capeItem = bake(12, 11, paintCapeItem);
    out.lanternOff = bake(14, 26, (ctx) => paintLantern(ctx, false));
    out.lanternOn = bake(14, 26, (ctx) => paintLantern(ctx, true));
    out.spring1 = bake(16, 8, (ctx) => paintSpring(ctx, false));
    out.spring2 = bake(16, 8, (ctx) => paintSpring(ctx, true));
    out.mover = bake(16, 5, paintMover);
    out.goal = bake(40, 60, paintGoal);
    out.glow = bake(64, 64, paintGlow, 2);
    return out;
  }

  // ---- 地形 ----
  // 16 タイルを横に並べても継ぎ目が目立たないよう、はみ出す模様は反対側にも描く
  function wrapped(paintAt, x) {
    paintAt(x);
    if (x < 3) paintAt(x + 16);
    if (x > 13) paintAt(x - 16);
  }

  function paintDirt(ctx, theme, seed) {
    ctx.fillStyle = theme.dirt;
    ctx.fillRect(0, 0, 16, 16);
    const rand = seeded(seed);
    for (let i = 0; i < 12; i++) {
      const x = rand() * 16;
      const y = 1 + rand() * 14;
      const r = 0.8 + rand() * 2.4;
      const color = rand() < 0.5 ? '#00000014' : '#ffffff0d';
      wrapped((px) => ellipse(ctx, px, y, r * 1.3, r * 0.7, color), x);
    }
    for (let i = 0; i < 3; i++) {
      const x = 2 + rand() * 12;
      const y = 3 + rand() * 11;
      const rx = 0.8 + rand() * 0.9;
      const ry = rx * 0.7;
      ellipse(ctx, x, y + 0.25, rx, ry, '#00000040');
      ellipse(ctx, x, y, rx, ry, linear(ctx, x, y - ry, x, y + ry, [theme.pebble, theme.dirtDark]));
    }
  }

  function buildTiles(theme) {
    const fill = [1, 2, 3, 4].map((v) => bake(16, 16, (ctx) => paintDirt(ctx, theme, v * 97)));
    const top = [1, 2, 3, 4].map((v) => bake(16, 20, (ctx) => {
      ctx.translate(0, 4);
      paintDirt(ctx, theme, v * 131);
      // 土の上の影
      ctx.fillStyle = linear(ctx, 0, 3, 0, 9, ['#00000055', '#00000000']);
      ctx.fillRect(0, 3, 16, 6);
      const rand = seeded(v * 211);
      // 芝の帯
      ctx.beginPath();
      ctx.moveTo(0, -0.2);
      ctx.lineTo(16, -0.2);
      ctx.lineTo(16, 3.6);
      for (let x = 16; x >= 0; x -= 2) ctx.lineTo(x, 3.6 + (x % 16 ? rand() * 2.1 : 0));
      ctx.closePath();
      ctx.fillStyle = linear(ctx, 0, 0, 0, 6, [theme.topLight, theme.top, theme.topDark]);
      ctx.fill();
      // 草の葉
      for (let i = 0; i < 26; i++) {
        const x = 0.4 + rand() * 15.2;
        const len = 1.4 + rand() * 2.6;
        const lean = (rand() - 0.5) * 1.8;
        ctx.strokeStyle = rand() < 0.45 ? theme.topLight : theme.top;
        ctx.lineWidth = 0.32 + rand() * 0.28;
        ctx.beginPath();
        ctx.moveTo(x, 0.5);
        ctx.quadraticCurveTo(x + lean * 0.3, -len * 0.6, x + lean, -len);
        ctx.stroke();
      }
    }));
    return {
      fill,
      top,
      stone: bake(16, 16, (ctx) => {
        ctx.fillStyle = theme.stoneDark;
        ctx.fillRect(0, 0, 16, 16);
        const brick = (x, y, w, h) => {
          roundRect(ctx, x + 0.25, y + 0.25, w - 0.5, h - 0.5, 0.9);
          ctx.fillStyle = linear(ctx, x, y, x + 2, y + h, [theme.stoneLight, theme.stone, theme.stoneDark]);
          ctx.fill();
        };
        brick(0, 0, 9, 8);
        brick(9, 0, 7, 8);
        brick(0, 8, 5, 8);
        brick(5, 8, 11, 8);
      }),
      oneway: bake(16, 10, (ctx) => {
        ctx.fillStyle = linear(ctx, 0, 1, 0, 6, ['#b58250', '#6d4726']);
        ctx.fillRect(0, 2, 16, 3.6);
        ctx.fillStyle = '#4b301a';
        ctx.fillRect(2.6, 5, 1.8, 4);
        ctx.fillRect(11.6, 5, 1.8, 4);
        ctx.fillStyle = linear(ctx, 0, 0, 0, 3, [theme.topLight, theme.top, theme.topDark]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(16, 0);
        ctx.lineTo(16, 2.4);
        for (let x = 14; x >= 0; x -= 2) ctx.lineTo(x, x % 4 ? 3.6 : 2.3);
        ctx.closePath();
        ctx.fill();
      }),
      crate: bake(16, 16, (ctx) => paintCrate(ctx, false)),
      used: bake(16, 16, (ctx) => paintCrate(ctx, true)),
      spike: bake(16, 16, (ctx) => {
        for (let i = 0; i < 4; i++) {
          const x = i * 4;
          ctx.beginPath();
          ctx.moveTo(x + 0.2, 15.4);
          ctx.lineTo(x + 2, 7.2);
          ctx.lineTo(x + 3.8, 15.4);
          ctx.closePath();
          ctx.fillStyle = linear(ctx, x, 0, x + 4, 0, ['#f6f9ff', '#a9b4c8', '#4f596e']);
          ctx.fill();
        }
        ctx.fillStyle = linear(ctx, 0, 14.6, 0, 16, ['#6e788e', '#2d3343']);
        ctx.fillRect(0, 14.6, 16, 1.4);
      }),
      shade: [0, 1, 2, 3].map((depth) => bake(16, 16, (ctx) => {
        const alpha = (d) => `rgba(14, 6, 24, ${Math.min(d, 3) * 0.17})`;
        ctx.fillStyle = linear(ctx, 0, 0, 0, 16, [alpha(depth), alpha(depth + 1)]);
        ctx.fillRect(0, 0, 16, 16);
      }, 1)),
      edge: bake(4, 16, (ctx) => {
        ctx.fillStyle = linear(ctx, 0, 0, 4, 0, ['#00000055', '#00000000']);
        ctx.fillRect(0, 0, 4, 16);
      }),
    };
  }

  function paintCrate(ctx, used) {
    const light = used ? '#94795b' : '#e7b773';
    const mid = used ? '#6e563e' : '#bd8144';
    const dark = used ? '#42311f' : '#70431e';
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = linear(ctx, 0, 1, 15, 15, [light, mid]);
    ctx.fillRect(1, 1, 14, 14);
    ctx.strokeStyle = `${dark}aa`;
    ctx.lineWidth = 0.3;
    [4.2, 7.8, 11.4].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(1, y);
      ctx.lineTo(15, y);
      ctx.stroke();
    });
    ctx.strokeStyle = mid;
    ctx.lineWidth = 2;
    ctx.strokeRect(2.1, 2.1, 11.8, 11.8);
    ctx.strokeStyle = `${dark}cc`;
    ctx.lineWidth = 0.4;
    ctx.strokeRect(3.2, 3.2, 9.6, 9.6);
    [2, 14].forEach((x) => [2, 14].forEach((y) => ellipse(ctx, x, y, 0.6, 0.6, used ? '#3a2b1c' : '#ffe6ad')));
    if (!used) {
      starPath(ctx, 8, 8.2, 3.9, 1.8);
      ctx.fillStyle = linear(ctx, 5, 4, 11, 12, ['#fff7c4', '#ffd447', '#ee9c1b']);
      ctx.fill();
    }
  }

  // ---- 背景 ----
  // 800px で周期がそろう波を重ね、自然な稜線にする
  function ridge(seed, rough) {
    const rand = seeded(seed);
    const waves = [1, 2, 3, 5, 8, 13, 21].map((f, i) => ({
      f, a: 1 / (1 + i * rough), p: rand() * Math.PI * 2,
    }));
    const total = waves.reduce((sum, w) => sum + w.a, 0);
    return (x) => {
      const t = (x / 800) * Math.PI * 2;
      return waves.reduce((sum, w) => sum + Math.sin(t * w.f + w.p) * w.a, 0) / total;
    };
  }

  function paintRidge(ctx, height, base, amp, top, bottom) {
    ctx.beginPath();
    ctx.moveTo(0, 224);
    for (let x = 0; x <= 800; x += 2) ctx.lineTo(x, base + height(x) * amp);
    ctx.lineTo(800, 224);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, 0, base - amp, 0, 224, [top, bottom]);
    ctx.fill();
  }

  function conifer(ctx, x, y, h, color) {
    for (let i = 0; i < 4; i++) {
      const t = i / 4;
      ctx.beginPath();
      ctx.moveTo(x - (h * (0.34 - t * 0.2)), y - h * t);
      ctx.lineTo(x, y - h * (t + 0.42));
      ctx.lineTo(x + (h * (0.34 - t * 0.2)), y - h * t);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  function cloud(ctx, x, y, size, color, rand) {
    for (let i = 0; i < 12; i++) {
      const px = x + (rand() - 0.5) * size * 2;
      const py = y + (rand() - 0.2) * size * 0.3;
      const r = size * (0.16 + rand() * 0.2);
      [px, px - 800, px + 800].forEach((cx) => {
        ctx.fillStyle = radial(ctx, cx, py, 0, r, [color, color, `${color.slice(0, 7)}aa`, `${color.slice(0, 7)}00`]);
        ctx.beginPath();
        ctx.arc(cx, py, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  function buildParallax(theme) {
    const RES_BG = BG_RES;
    const sky = bake(400, 224, (ctx) => {
      ctx.fillStyle = linear(ctx, 0, 0, 0, 224, theme.sky);
      ctx.fillRect(0, 0, 400, 224);
      const [sx, sy, sr] = theme.sun;
      ctx.fillStyle = radial(ctx, sx, sy, 0, sr * 7, [`${theme.sunColor}cc`, `${theme.sunColor}33`, `${theme.sunColor}00`]);
      ctx.fillRect(0, 0, 400, 224);
      ellipse(ctx, sx, sy, sr, sr, radial(ctx, sx, sy, 0, sr, ['#ffffff', theme.sunColor]));
      if (theme.starry) {
        const rand = seeded(1234);
        for (let i = 0; i < 170; i++) {
          const r = 0.2 + rand() * 0.55;
          ellipse(ctx, rand() * 400, rand() * 170, r, r, rand() < 0.2 ? '#ffe7a0' : `#ffffff${rand() < 0.5 ? 'cc' : '66'}`);
        }
        ctx.save();
        ctx.translate(200, 80);
        ctx.rotate(-0.3);
        ellipse(ctx, 0, 0, 240, 42, radial(ctx, 0, 0, 0, 240, ['#8a6be055', '#5a48b022', '#00000000']));
        ctx.restore();
      }
    }, RES_BG);

    const layer = (paint) => bake(800, 224, paint, RES_BG);
    const clouds = layer((ctx) => {
      const rand = seeded(77);
      if (theme.starry) return;
      for (let i = 0; i < 8; i++) {
        cloud(ctx, 40 + i * 100 + rand() * 40, 24 + rand() * 62, 34 + rand() * 30, theme.cloud, rand);
      }
    });
    const far = layer((ctx) => paintRidge(ctx, ridge(11, 0.55), 118, 44, theme.far, theme.farBase));
    const mid = layer((ctx) => {
      const h = ridge(29, 0.8);
      paintRidge(ctx, h, 150, 26, theme.mid, theme.midBase);
      if (theme.trees) {
        const rand = seeded(5);
        for (let x = 2; x < 800; x += 5 + rand() * 8) {
          conifer(ctx, x, 150 + h(x) * 26 + 3, 12 + rand() * 12, theme.midTree);
        }
      }
    });
    const near = layer((ctx) => {
      const h = ridge(53, 1.1);
      paintRidge(ctx, h, 180, 14, theme.near, theme.nearBase);
      const rand = seeded(9);
      if (theme.trees) {
        for (let x = 4; x < 800; x += 12 + rand() * 22) {
          conifer(ctx, x, 180 + h(x) * 14 + 3, 20 + rand() * 20, theme.nearTree);
        }
      }
      if (theme.mesa) {
        for (let i = 0; i < 6; i++) {
          const x = 30 + i * 132 + rand() * 40;
          const w = 34 + rand() * 40;
          const y = 112 + rand() * 40;
          ctx.fillStyle = linear(ctx, x, 0, x + w, 0, [theme.mesaLight, theme.mesaDark]);
          ctx.beginPath();
          ctx.moveTo(x - 8, 224);
          ctx.lineTo(x, y + 5);
          ctx.lineTo(x + 5, y);
          ctx.lineTo(x + w - 6, y + 2);
          ctx.lineTo(x + w, y + 8);
          ctx.lineTo(x + w + 8, 224);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#00000018';
          ctx.lineWidth = 1;
          for (let s = y + 14; s < 210; s += 11) {
            ctx.beginPath();
            ctx.moveTo(x - 3, s);
            ctx.lineTo(x + w + 3, s + 2);
            ctx.stroke();
          }
        }
      }
      if (theme.crystals) {
        for (let i = 0; i < 18; i++) {
          const x = rand() * 790;
          const y = 180 + h(x) * 14 + 3;
          const size = 7 + rand() * 13;
          ctx.fillStyle = radial(ctx, x, y - size / 2, 0, size * 1.8, ['#59f0dc55', '#59f0dc00']);
          ctx.fillRect(x - size * 2, y - size * 2.5, size * 4, size * 4);
          ctx.beginPath();
          ctx.moveTo(x - size * 0.3, y);
          ctx.lineTo(x - size * 0.12, y - size);
          ctx.lineTo(x + size * 0.14, y - size * 1.25);
          ctx.lineTo(x + size * 0.32, y);
          ctx.closePath();
          ctx.fillStyle = linear(ctx, x - 3, 0, x + 3, 0, ['#c5fff4', '#3fbfae', '#1c6f73']);
          ctx.fill();
        }
      }
    });

    return { width: 800, sky, clouds, far, mid, near };
  }

  window.Sprites = { RES, BG_RES, buildAll, buildTiles, buildParallax };
})();
