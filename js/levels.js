// ステージ定義。座標はすべてタイル単位（1タイル=16px、高さは14タイル）。
// 地面の表面は基本 11 行目。ジャンプで上がれる段差はおよそ4タイルまで。
(function () {
  'use strict';

  const ROWS = 14;
  const T = { EMPTY: 0, GROUND: 1, ONEWAY: 2, CRATE: 3, USED: 4, SPIKE: 5, STONE: 6 };

  const THEMES = {
    forest: {
      song: 'forest', sky: ['#3f9fe6', '#8fd2f2', '#e6f5dc'], sun: [320, 42, 13], sunColor: '#fff3b8',
      cloud: '#ffffffee', trees: true, vignette: '#0a2a2a55',
      far: '#a9cfe0', farBase: '#cfe9e0', mid: '#79b58f', midBase: '#a7d5ab', midTree: '#5c9c7a',
      near: '#3f8a58', nearBase: '#5ba56b', nearTree: '#2d6e49',
      dirt: '#90623f', dirtDark: '#583722', pebble: '#b39a80',
      top: '#57ad3f', topLight: '#b4ec6c', topDark: '#2f7a2f',
      stone: '#9ca4b2', stoneLight: '#cfd5df', stoneDark: '#646b79',
    },
    dusk: {
      song: 'dusk', sky: ['#51347f', '#d2566e', '#ffb35e', '#ffe29a'], sun: [255, 118, 24], sunColor: '#ffd98a',
      cloud: '#ffb48fdd', mesa: true, vignette: '#2a082f77',
      far: '#a5597f', farBase: '#f0996f', mid: '#8a4470', midBase: '#d9775f', midTree: '#6d3560',
      near: '#5e2b55', nearBase: '#8f3f5a', nearTree: '#4a2149',
      mesaLight: '#a85058', mesaDark: '#5a2a50',
      dirt: '#a65a3f', dirtDark: '#5e2c2b', pebble: '#c99a7a',
      top: '#d9973b', topLight: '#ffe08a', topDark: '#96582a',
      stone: '#b38a7e', stoneLight: '#dcb9a8', stoneDark: '#6f4a4c',
    },
    cave: {
      song: 'cave', sky: ['#070a22', '#141a4a', '#2c2268'], sun: [90, 54, 11], sunColor: '#cfd8ff', starry: true,
      crystals: true, vignette: '#00000099',
      far: '#1f2560', farBase: '#2b2a70', mid: '#171b4c', midBase: '#20205c', midTree: '#141642',
      near: '#101238', nearBase: '#171848', nearTree: '#0d0f30',
      dirt: '#454a80', dirtDark: '#20234c', pebble: '#7f88bd',
      top: '#35b5a6', topLight: '#a8ffee', topDark: '#17666b',
      stone: '#50548c', stoneLight: '#8388c4', stoneDark: '#2c2e5e',
    },
  };

  class Builder {
    constructor(name, theme, width) {
      this.name = name;
      this.theme = THEMES[theme];
      this.width = width;
      this.grid = Array.from({ length: ROWS }, () => new Array(width).fill(T.EMPTY));
      this.stars = [];
      this.enemies = [];
      this.movers = [];
      this.springs = [];
      this.lanterns = [];
      this.crateItems = {};
      this.goal = null;
      this.boss = null;
      this.gate = null;
    }

    set(x, y, tile) {
      if (x >= 0 && x < this.width && y >= 0 && y < ROWS) this.grid[y][x] = tile;
    }

    ground(x0, x1, top = 11) {
      for (let x = x0; x <= x1; x++) for (let y = top; y < ROWS; y++) this.set(x, y, T.GROUND);
      return this;
    }

    ceiling(x0, x1, bottom = 1) {
      for (let x = x0; x <= x1; x++) for (let y = 0; y <= bottom; y++) this.set(x, y, T.STONE);
      return this;
    }

    wall(x, y0, y1) {
      for (let y = y0; y <= y1; y++) this.set(x, y, T.STONE);
      return this;
    }

    plat(x, y, len) {
      for (let i = 0; i < len; i++) this.set(x + i, y, T.ONEWAY);
      return this;
    }

    spikes(x0, x1, y) {
      for (let x = x0; x <= x1; x++) this.set(x, y, T.SPIKE);
      return this;
    }

    crate(x, y, item = 'star') {
      this.set(x, y, T.CRATE);
      this.crateItems[`${x},${y}`] = item;
      return this;
    }

    star(x, y) { this.stars.push({ x, y }); return this; }

    starRow(x, y, n) {
      for (let i = 0; i < n; i++) this.star(x + i, y);
      return this;
    }

    // 山なりに並べて、ジャンプの軌道を示す
    starArc(x, y, n) {
      for (let i = 0; i < n; i++) {
        const t = n > 1 ? i / (n - 1) : 0.5;
        this.star(x + i, y - Math.round(Math.sin(t * Math.PI) * 2));
      }
      return this;
    }

    beetle(x, y = 10) { this.enemies.push({ type: 'beetle', x, y }); return this; }
    hedge(x, y = 10) { this.enemies.push({ type: 'hedge', x, y }); return this; }
    bird(x, y) { this.enemies.push({ type: 'bird', x, y }); return this; }

    mover(x, y, len, dx, dy, period = 4) {
      this.movers.push({ x, y, len, dx, dy, period });
      return this;
    }

    spring(x, y = 10) { this.springs.push({ x, y }); return this; }
    lantern(x, y = 10) { this.lanterns.push({ x, y }); return this; }
    setGoal(x, y = 10) { this.goal = { x, y }; return this; }

    done() {
      const crateStars = Object.values(this.crateItems).filter((item) => item === 'star').length;
      this.totalStars = this.stars.length + crateStars;
      return this;
    }
  }

  function stage1() {
    return new Builder('はじまりの森', 'forest', 160)
      .ground(0, 34)
      .starRow(11, 8, 3)
      .crate(18, 7, 'star').crate(19, 7, 'cape').crate(20, 7, 'star')
      .beetle(27)
      .starArc(34, 8, 5)
      .ground(38, 68)
      .ground(44, 50, 9)
      .starRow(45, 7, 5)
      .beetle(55).beetle(62)
      .plat(55, 7, 4).starRow(55, 6, 4)
      .starArc(68, 8, 5)
      .ground(72, 100)
      .lantern(74)
      .ground(80, 81, 10).ground(82, 83, 9).ground(84, 85, 8)
      .starRow(82, 6, 4)
      .hedge(93)
      .spring(99)
      .plat(100, 5, 6).starRow(100, 4, 6)
      .ground(105, 130)
      .bird(112, 7)
      .crate(118, 7, 'heart')
      .beetle(122).beetle(127)
      .plat(133, 9, 2).star(133, 7).star(134, 7)
      .ground(137, 159)
      .beetle(143)
      .starRow(146, 8, 4)
      .setGoal(153)
      .done();
  }

  function stage2() {
    return new Builder('ゆうやけ峡谷', 'dusk', 190)
      .ground(0, 20)
      .crate(10, 7, 'star').crate(11, 7, 'cape')
      .beetle(15)
      .ground(24, 27, 10).ground(31, 33, 9).ground(37, 40, 10)
      .starArc(21, 7, 3).starArc(28, 6, 3).starArc(34, 6, 3)
      .ground(41, 56)
      .spikes(45, 46, 10).starRow(45, 7, 2)
      .hedge(52)
      .mover(58, 10, 3, 7, 0, 5).starRow(59, 7, 8)
      .ground(69, 88)
      .lantern(71)
      .bird(76, 7).bird(85, 6)
      .ground(78, 83, 8).beetle(80, 7)
      .ground(92, 96, 9).ground(100, 103, 7)
      .starArc(89, 7, 4).starArc(96, 5, 4)
      .mover(105, 7, 3, 0, -4, 4)
      .plat(110, 4, 6).starRow(110, 3, 6)
      .ground(118, 140)
      .lantern(120)
      .crate(125, 7, 'heart')
      .hedge(130).beetle(135)
      .starArc(140, 8, 5)
      .ground(145, 154)
      .spikes(147, 148, 10)
      .spring(151)
      .ground(155, 160, 4).star(156, 2).star(158, 2)
      .ground(161, 189)
      .beetle(170).beetle(176).bird(178, 6)
      .starRow(165, 9, 3)
      .setGoal(183)
      .done();
  }

  function stage3() {
    const b = new Builder('ほしぞら洞窟', 'cave', 205)
      .ceiling(0, 204, 1)
      .ground(0, 24)
      .crate(8, 7, 'cape').crate(9, 7, 'heart')
      .hedge(18)
      .starRow(13, 9, 3)
      // トゲの谷
      .ground(25, 30, 12).spikes(25, 30, 11)
      .plat(27, 8, 2).star(27, 6).star(28, 6)
      .ground(31, 50)
      .beetle(36).beetle(42).bird(47, 6)
      // 天井の低い通路
      .ground(51, 72)
      .ceiling(54, 68, 6)
      .hedge(61).starRow(56, 9, 3).starRow(64, 9, 3)
      .ground(73, 90)
      .lantern(74)
      .spikes(80, 81, 10).beetle(86)
      .mover(92, 9, 3, 8, 0, 6).starRow(93, 6, 9)
      .bird(98, 5)
      .ground(105, 125)
      .hedge(112).hedge(118)
      .spikes(122, 123, 10)
      .ground(126, 135, 9).beetle(130, 8).starRow(127, 7, 3)
      .ground(140, 177)
      .starArc(135, 7, 6)
      .lantern(143)
      .crate(148, 7, 'heart').crate(149, 7, 'star').crate(150, 7, 'cape')
      .hedge(158).beetle(165)
      .ground(178, 204)
      .wall(203, 2, 10).wall(204, 2, 10);
    b.boss = { x: 195, y: 7 };
    b.gate = { x: 179, y0: 2, y1: 10 }; // 入るとボス部屋の入口が閉じる
    b.bossGoal = { x: 192, y: 10 };
    return b.done();
  }

  window.Levels = { ROWS, T, list: [stage1, stage2, stage3] };
})();
