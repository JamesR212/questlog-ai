'use client';

import React from 'react';
import type { CharacterAppearance } from '@/types';

interface Props {
  appearance: CharacterAppearance;
  morphStage: number;
  size?: number;
  emote?: 'idle' | 'victory' | 'flex' | 'sleep' | 'grimace' | 'coin';
}

// ─── Grid ─────────────────────────────────────────────────────────────────────
// 16 wide × 33 tall.  y=0 is kept EMPTY so auto-outline can place K above hair.
// Layout (all y values include the +1 top-margin):
//   y=0        transparent row (top outline lands here)
//   y=1-3      hair above head
//   y=4-13     head  — face skin x=4-11 (8 px)
//              hair sides at x=1-2 and x=13-14
//              x=3 and x=12 left empty → auto-outline puts K there
//              = dark edge between hair and face  ✓
//   y=14-15    neck  x=6-9
//   y=16       coat collar  x=4-11
//   y=17       coat shoulders  x=3-12
//   y=18-23    coat + arms  x=1-14  (widest — matches reference)
//   y=24-25    lower coat  x=3-12
//   y=26       coat hem  x=4-11
//   y=27-28    legs   L:x=4-7   R:x=8-11
//   y=29-31    boots  L:x=2-8   R:x=7-13
//   y=32       transparent (bottom outline lands here)
const GW = 16;
const GH = 33;
const K_COL = '#1a100a';

// ─── Colour helpers ───────────────────────────────────────────────────────────
function dk(hex: string, t: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return '#' + [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
    .map(c => Math.max(0, Math.round(c * (1 - t))).toString(16).padStart(2, '0')).join('');
}
function lt(hex: string, t: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return '#' + [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
    .map(c => Math.min(255, Math.round(c + (255 - c) * t)).toString(16).padStart(2, '0')).join('');
}

// ─── Skin ─────────────────────────────────────────────────────────────────────
const SKINS: Record<string, { base: string; shadow: string; blush: string }> = {
  '#ffe0bd': { base: '#ffe0bd', shadow: '#c8845a', blush: '#f8a090' },
  '#f5cba7': { base: '#f5cba7', shadow: '#c07848', blush: '#e07868' },
  '#d4956a': { base: '#d4956a', shadow: '#9a5c38', blush: '#c04840' },
  '#c68642': { base: '#c68642', shadow: '#884e20', blush: '#a04028' },
  '#8d5524': { base: '#8d5524', shadow: '#582e10', blush: '#6a2818' },
  '#4a2912': { base: '#4a2912', shadow: '#20100a', blush: '#3e1a10' },
};
const getSkin = (t: string) => SKINS[t] ?? SKINS['#d4956a'];

// ─── Outfit ───────────────────────────────────────────────────────────────────
function getPal(outfit: string, fem: boolean, c?: string) {
  switch (outfit) {
    case 'jeans':    return { shirt: '#6888c0', pant: c ?? '#3060a8', boot: '#6a4828', accent: '#90a8d8' };
    case 'hoodie':   return { shirt: c ?? '#4a5868', pant: '#1a2840',  boot: '#382018', accent: lt(c ?? '#4a5868', 0.35) };
    case 'tshirt':   return { shirt: c ?? '#c05030', pant: '#706050',  boot: '#5a3818', accent: lt(c ?? '#c05030', 0.3) };
    case 'ninja':    return { shirt: '#181820',        pant: '#181820',  boot: '#101018', accent: '#303040' };
    case 'pirate':   return { shirt: '#3a1808',        pant: '#3a2010',  boot: '#180c04', accent: '#c09020' };
    case 'princess': return { shirt: fem ? '#c838a8' : '#7838b8', pant: fem ? '#c838a8' : '#7838b8', boot: fem ? '#a02890' : '#5818a0', accent: fem ? '#e870d8' : '#a870e8' };
    default:         return { shirt: c ?? (fem ? '#b03878' : '#3858a0'), pant: '#1e2830', boot: '#1a2c18', accent: fem ? '#d060a0' : '#3a7020' };
  }
}

// ─── Grid helpers ─────────────────────────────────────────────────────────────
type Grid = string[][];

function makeGrid(): Grid {
  return Array.from({ length: GH }, () => Array(GW).fill('.'));
}

function put(g: Grid, x: number, y: number, tok: string) {
  if (x >= 0 && x < GW && y >= 0 && y < GH) g[y][x] = tok;
}

function fillR(g: Grid, x0: number, y0: number, w: number, h: number, tok: string) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      put(g, x0 + dx, y0 + dy, tok);
}

// Expand filled cells outward 1 px — fills empty neighbours with 'K'
function applyOutline(g: Grid): void {
  const marks: [number, number][] = [];
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      if (g[y][x] !== '.') {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < GH && nx >= 0 && nx < GW && g[ny][nx] === '.') {
              marks.push([nx, ny]);
            }
          }
        }
      }
    }
  }
  for (const [x, y] of marks) {
    if (g[y][x] === '.') g[y][x] = 'K';
  }
}

// ─── Hair styles ──────────────────────────────────────────────────────────────
// Coords are stored WITHOUT the +1 y-margin; it gets added at render time.
// Face top = y=3, hair above starts y=0 (which renders as y=1 with margin).
// Hair sides at x=1-2 (L) and x=13-14 (R).
// Face is at x=4-11, so x=3 & x=12 stay empty → auto-outline = K (hair/face edge).
type HPx = [number, number, 'H' | 'h'];

const HAIR: HPx[][] = [
  // 0 — Rounded puff (compact crown, minimal sides — matches Stardew reference)
  [
    // Crown — widest at y=1, tapers slightly at top
    ...[6,7,8,9].map(x => [x,0,'H'] as HPx),             // tip: 4px
    ...[4,5,6,7,8,9,10,11].map(x => [x,1,'H'] as HPx),   // full crown: 8px
    [3,1,'h'],[12,1,'h'],                                  // crown shadow edges
    ...[4,5,6,7,8,9,10,11].map(x => [x,2,'H'] as HPx),   // brow row: 8px
    [3,2,'h'],[12,2,'h'],                                  // shadow at cheek edge
    // Tiny sideburns — just 1px, only at top 2 rows
    [3,3,'h'],[12,3,'h'],
    [3,4,'h'],[12,4,'h'],
  ],
  // 1 — Medium bob (matches reference — long sides framing face to chin)
  [
    // Crown (gets wider top to bottom)
    ...[5,6,7,8,9,10].map(x => [x,0,'H'] as HPx),              // y=0→1: 6px
    ...[4,5,6,7,8,9,10,11].map(x => [x,1,'H'] as HPx),         // y=1→2: 8px
    [3,1,'h'],[12,1,'h'],                                        // y=1→2: shadow edges
    ...[3,4,5,6,7,8,9,10,11,12].map(x => [x,2,'H'] as HPx),    // y=2→3: 10px
    [2,2,'h'],[13,2,'h'],                                        // y=2→3: shadow edges
    // Sides — 2px wide (x=1-2 left, x=13-14 right), all the way to chin
    [1,3,'H'],[2,3,'H'],[13,3,'H'],[14,3,'H'],                  // →y=4
    [1,4,'H'],[2,4,'H'],[13,4,'H'],[14,4,'H'],                  // →y=5
    [1,5,'H'],[2,5,'H'],[13,5,'H'],[14,5,'H'],                  // →y=6
    [1,6,'H'],[2,6,'H'],[13,6,'H'],[14,6,'H'],                  // →y=7
    [1,7,'H'],[2,7,'H'],[13,7,'H'],[14,7,'H'],                  // →y=8
    [1,8,'h'],[2,8,'h'],[13,8,'h'],[14,8,'h'],                  // →y=9  (shadow)
    [1,9,'h'],[2,9,'h'],[13,9,'h'],[14,9,'h'],                  // →y=10 (shadow)
    [1,10,'h'],[2,10,'h'],[13,10,'h'],[14,10,'h'],              // →y=11 (shadow)
    [1,11,'h'],[2,11,'h'],[13,11,'h'],[14,11,'h'],              // →y=12 (shadow, chin)
  ],
  // 2 — Long
  [
    ...[4,5,6,7,8,9,10,11].map(x => [x,0,'H'] as HPx),
    ...[4,5,6,7,8,9,10,11].map(x => [x,1,'H'] as HPx),
    ...[4,5,6,7,8,9,10,11].map(x => [x,2,'H'] as HPx),
    [2,2,'H'],[13,2,'H'],
    ...[1,2].flatMap(x => Array.from({length:21},(_, i)=>[x,3+i,'H'] as HPx)),
    ...[13,14].flatMap(x => Array.from({length:21},(_, i)=>[x,3+i,'H'] as HPx)),
    ...[4,5,6,7,8,9,10,11].map(x => [x,24,'H'] as HPx),
    [2,24,'H'],[13,24,'H'],
  ],
  // 3 — Buzz
  [
    ...[6,7,8,9].map(x=>[x,1,'H'] as HPx),
    [5,2,'H'],[6,2,'H'],[7,2,'H'],[8,2,'H'],[9,2,'H'],[10,2,'H'],
    [2,3,'h'],[13,3,'h'],
  ],
  // 4 — Spiky
  [
    [7,0,'H'],[8,0,'H'],
    [6,1,'H'],[7,1,'H'],[8,1,'H'],[9,1,'H'],
    ...[4,5,6,7,8,9,10,11].map(x=>[x,2,'H'] as HPx),
    [5,1,'h'],[10,1,'h'],
    [1,3,'H'],[2,3,'H'],[1,4,'H'],[2,4,'H'],
    [13,3,'H'],[14,3,'H'],[13,4,'H'],[14,4,'H'],
  ],
  // 5 — Afro
  [
    ...[4,5,6,7,8,9,10,11].map(x=>[x,0,'H'] as HPx),
    ...[2,3,4,5,6,7,8,9,10,11,12,13].map(x=>[x,1,'H'] as HPx),
    ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(x=>[x,2,'H'] as HPx),
    ...[1,2,14].flatMap(x=>Array.from({length:7},(_,i)=>[x,3+i,'H'] as HPx)),
    ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(x=>[x,10,'H'] as HPx),
  ],
  // 6 — Dreads
  [
    ...[4,5,6,7,8,9,10,11].map(x=>[x,1,'H'] as HPx),
    ...[4,5,6,7,8,9,10,11].map(x=>[x,2,'H'] as HPx),
    [2,2,'H'],[13,2,'H'],
    ...[4,6,8,10,12].flatMap(x=>Array.from({length:20},(_,i)=>[x,4+i,'H'] as HPx)),
    ...[5,7,9,11].flatMap(x=>Array.from({length:18},(_,i)=>[x,6+i,'H'] as HPx)),
  ],
  // 7 — Bob
  [
    ...[4,5,6,7,8,9,10,11].map(x=>[x,1,'H'] as HPx),
    ...[4,5,6,7,8,9,10,11].map(x=>[x,2,'H'] as HPx),
    [2,2,'H'],[13,2,'H'],
    ...[1,2].flatMap(x=>Array.from({length:11},(_,i)=>[x,3+i,'H'] as HPx)),
    ...[13,14].flatMap(x=>Array.from({length:11},(_,i)=>[x,3+i,'H'] as HPx)),
    ...[4,5,6,7,8,9,10,11].map(x=>[x,14,'H'] as HPx),
    [2,14,'H'],[13,14,'H'],
  ],
  // 8 — Ponytail
  [
    ...[4,5,6,7,8,9,10,11].map(x=>[x,2,'H'] as HPx),
    [1,2,'H'],[2,2,'H'],
    [1,3,'H'],[2,3,'H'],[1,4,'H'],[2,4,'H'],[1,5,'H'],[2,5,'H'],
    [13,3,'H'],[14,3,'H'],[13,4,'H'],
    [14,4,'H'],[14,5,'H'],[14,6,'H'],[14,7,'H'],[14,8,'H'],
    [14,9,'H'],[14,10,'H'],[14,11,'H'],[14,12,'H'],[14,13,'H'],
    [13,14,'H'],[13,15,'H'],[13,16,'H'],
  ],
  // 9 — Waves
  [
    ...[4,5,6,7,8,9,10,11].map(x=>[x,1,'H'] as HPx),
    ...[4,5,6,7,8,9,10,11].map(x=>[x,2,'H'] as HPx),
    [2,2,'H'],[13,2,'H'],
    ...[1,2].flatMap(x=>Array.from({length:13},(_,i)=>[x,3+i,'H'] as HPx)),
    ...[13,14].flatMap(x=>Array.from({length:13},(_,i)=>[x,3+i,'H'] as HPx)),
    [0,6,'H'],[0,7,'H'],[0,10,'H'],[0,11,'H'],
    [15,6,'H'],[15,7,'H'],[15,10,'H'],[15,11,'H'],
    ...[4,5,6,7,8,9,10,11].map(x=>[x,16,'H'] as HPx),
    [2,16,'H'],[13,16,'H'],
  ],
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function PixelCharacter({
  appearance, morphStage, size = 140, emote = 'idle',
}: Props) {
  const skin    = getSkin(appearance.skinTone);
  const fem     = appearance.gender === 'feminine';
  const outfit  = appearance.outfit ?? 'default';
  const pal     = getPal(outfit, fem, appearance.outfitColor);
  const hCol    = appearance.hairColor;
  const eyeC    = appearance.race === 'undead' ? '#44ff88' : (appearance.eyeColor ?? '#2460b0');
  const beard   = appearance.race === 'dwarf'
    ? Math.max(1, appearance.beardStyle ?? 1)
    : (appearance.beardStyle ?? 0);
  const muscular = Math.min(4, Math.max(0, morphStage)) >= 3;
  const hStyle  = Math.min(HAIR.length - 1, appearance.hairStyle ?? 0);

  // Token → hex
  const C: Record<string, string> = {
    K: K_COL,
    S: skin.base,
    D: skin.shadow,
    W: '#f2efea',
    I: eyeC,
    U: dk(eyeC, 0.55),
    N: dk(skin.base, 0.38),
    X: dk(skin.base, 0.52),
    T: pal.shirt,
    J: dk(pal.shirt, 0.32),
    L: pal.pant,
    Q: dk(pal.pant, 0.28),
    O: pal.boot,
    V: dk(pal.boot, 0.30),
    H: hCol,
    h: dk(hCol, 0.32),
    G: hCol,
    f: '#f0ece4',   // cheek highlight — cream/white for Stardew Valley look
    E: pal.accent,
    e: dk(pal.accent, 0.3),
    Y: '#c89020',
    Z: '#4a3010',
    P: '#6a4820',
    B: '#b07020',
  };

  // ── Build grid ───────────────────────────────────────────────────────────
  const g = makeGrid();

  // ── HEAD (face skin x=4-11, y=4-13) ─────────────────────────────────────
  // x=3 and x=12 intentionally left empty → auto-outline fills K there
  // creating the classic dark seam between hair sides and face
  fillR(g, 4, 4, 8, 10, 'S');

  // Ear nubs at x=3 and x=12 (the normally-empty seam positions)
  if (appearance.race !== 'elf') {
    put(g, 3, 8, 'S'); put(g, 3, 9, 'S');
    put(g, 12, 8, 'S'); put(g, 12, 9, 'S');
  }
  if (appearance.race === 'elf') {
    put(g, 3, 7, 'S'); put(g, 3, 8, 'S'); put(g, 3, 9, 'S'); put(g, 3, 10, 'S');
    put(g, 2, 6, 'S');
    put(g, 12, 7, 'S'); put(g, 12, 8, 'S'); put(g, 12, 9, 'S'); put(g, 12, 10, 'S');
    put(g, 13, 6, 'S');
  }
  if (appearance.race === 'dwarf') {
    fillR(g, 3, 7, 1, 5, 'S');
    fillR(g, 12, 7, 1, 5, 'S');
  }

  // ── NECK x=6-9, y=14-15 ─────────────────────────────────────────────────
  fillR(g, 6, 14, 4, 2, 'S');

  // ── COAT ─────────────────────────────────────────────────────────────────
  // Coat x=2-13 at arm level → outline lands at x=1/x=14, leaving 1px transparent at each edge
  fillR(g, 4, 16, 8,  1, 'T');   // collar        x=4-11
  fillR(g, 3, 17, 10, 1, 'T');   // shoulders     x=3-12
  fillR(g, 2, 18, 12, 6, 'T');   // body + arms   x=2-13  y=18-23
  fillR(g, 3, 24, 10, 2, 'T');   // lower coat    x=3-12  y=24-25
  fillR(g, 4, 26, 8,  1, 'T');   // hem           x=4-11

  // Arm shadows (outer 2px of coat arms are slightly darker)
  fillR(g, 2, 18, 2, 6, 'J');    // left arm  x=2-3
  fillR(g, 12,18, 2, 6, 'J');    // right arm x=12-13

  // ── UNDERSHIRT centre strip ───────────────────────────────────────────────
  if (outfit !== 'ninja' && outfit !== 'princess') {
    fillR(g, 6, 16, 4, 10, 'E');   // x=6-9, y=16-25
    fillR(g, 6, 16, 4, 1,  'e');   // collar shadow row
    // Two stacked buttons
    put(g, 7, 20, 'Y'); put(g, 8, 20, 'Y');
    put(g, 7, 22, 'Y'); put(g, 8, 22, 'Y');
  }

  // Outfit details
  if (outfit === 'hoodie') {
    fillR(g, 5, 20, 6, 3, 'J');    // front pocket
  }
  if (outfit === 'pirate') {
    put(g, 5, 16, 'Y'); put(g, 5, 17, 'Y'); put(g, 5, 18, 'Y'); put(g, 5, 19, 'Y');
    put(g, 10,16, 'Y'); put(g, 10,17, 'Y'); put(g, 10,18, 'Y'); put(g, 10,19, 'Y');
    fillR(g, 3, 22, 10, 1, 'Z');
  }
  if (outfit === 'princess') {
    fillR(g, 2, 18, 12, 8, 'T');   // wide gown
    fillR(g, 1, 23, 14, 4, 'T');
  }

  // ── HANDS / ARMS ─────────────────────────────────────────────────────────
  if (emote === 'victory') {
    // Arms raised — coat sleeves extend up, hands above
    fillR(g, 1, 7,  2, 12, 'T');
    fillR(g, 13,7,  2, 12, 'T');
    fillR(g, 1, 5,  2, 2,  'S');
    fillR(g, 13,5,  2, 2,  'S');
  } else if (emote === 'flex') {
    // Arms out wide
    fillR(g, 0, 18, 2, 6, 'T');
    fillR(g, 14,18, 2, 6, 'T');
    fillR(g, 0, 23, 2, 3, 'S');
    fillR(g, 14,23, 2, 3, 'S');
  } else {
    // Idle / other emotes: small wrist nubs peek below the coat hem
    const hSkin = (outfit === 'hoodie' || outfit === 'ninja') ? 'T' : 'S';
    fillR(g, 2, 24, 1, 2, hSkin);   // left wrist  at coat edge x=2
    fillR(g, 13,24, 1, 2, hSkin);   // right wrist at coat edge x=13
  }

  // ── LEGS ─────────────────────────────────────────────────────────────────
  if (outfit !== 'princess') {
    fillR(g, 4, 27, 4, 2, 'L');    // left  leg x=4-7
    fillR(g, 8, 27, 4, 2, 'L');    // right leg x=8-11
    fillR(g, 4, 28, 4, 1, 'Q');    // knee shadow
    fillR(g, 8, 28, 4, 1, 'Q');
  }

  // ── BOOTS ─────────────────────────────────────────────────────────────────
  fillR(g, 3, 29, 5, 3, 'O');     // left  boot  x=3-7
  fillR(g, 8, 29, 5, 3, 'O');     // right boot  x=8-12
  fillR(g, 3, 31, 5, 1, 'V');     // left  toe shadow
  fillR(g, 8, 31, 5, 1, 'V');     // right toe shadow

  // ── HOODIE hood (behind head) ─────────────────────────────────────────────
  if (outfit === 'hoodie') {
    fillR(g, 3, 4, 10, 1, 'T');
    for (let y = 5; y <= 9; y++) { put(g, 2, y, 'T'); put(g, 13, y, 'T'); }
  }

  // ── FACE DETAILS ──────────────────────────────────────────────────────────
  // Eyebrows y=6
  put(g, 5, 6, 'H'); put(g, 6, 6, 'H');
  put(g, 9, 6, 'H'); put(g, 10,6, 'H');

  // Left eye  x=5-7   sclera y=7, iris y=8
  put(g, 5, 7, 'W'); put(g, 6, 7, 'W'); put(g, 7, 7, 'W');
  put(g, 5, 8, 'I'); put(g, 6, 8, 'U'); put(g, 7, 8, 'W');  // W=shine

  // Right eye x=9-11
  put(g, 9, 7, 'W'); put(g, 10,7, 'W'); put(g, 11,7, 'W');
  put(g, 9, 8, 'I'); put(g, 10,8, 'U'); put(g, 11,8, 'W');

  // Feminine lashes
  if (fem) {
    put(g, 5, 6, 'h'); put(g, 6, 6, 'h'); put(g, 7, 6, 'h');
    put(g, 9, 6, 'h'); put(g, 10,6, 'h'); put(g, 11,6, 'h');
  }

  // Sleep: closed eyes override
  if (emote === 'sleep') {
    for (let x = 5; x <= 7; x++) { put(g, x, 7, 'D'); put(g, x, 8, 'S'); }
    for (let x = 9; x <= 11; x++) { put(g, x, 7, 'D'); put(g, x, 8, 'S'); }
  }

  // Cheek highlights (y=9) — iconic Stardew Valley cream patches below eyes
  put(g, 4, 9, 'f'); put(g, 5, 9, 'f');
  put(g, 10,9, 'f'); put(g, 11,9, 'f');

  // Nose y=10
  put(g, 7, 10, 'N'); put(g, 8, 10, 'N');

  // Mouth y=11
  if (outfit === 'ninja') {
    // masked — skip
  } else if (emote === 'grimace') {
    for (let x = 5; x <= 9; x++) put(g, x, 11, 'X');
    put(g, 5, 10, 'X'); put(g, 9, 10, 'X');
  } else if (emote === 'victory') {
    put(g, 5, 10, 'X'); put(g, 9, 10, 'X');
    for (let x = 5; x <= 9; x++) put(g, x, 11, 'X');
    put(g, 6, 12, 'W'); put(g, 7, 12, 'W'); put(g, 8, 12, 'W');
  } else if (emote === 'coin') {
    put(g, 6, 11, 'X'); put(g, 7, 11, 'X'); put(g, 8, 11, 'X');
    put(g, 6, 12, 'X'); put(g, 8, 12, 'X');
  } else if (emote === 'sleep') {
    put(g, 6, 11, 'X'); put(g, 7, 11, 'X'); put(g, 8, 11, 'X');
  } else {
    // idle smile
    put(g, 5, 11, 'X'); put(g, 6, 11, 'X'); put(g, 7, 11, 'X');
    put(g, 8, 11, 'X'); put(g, 9, 11, 'X');
    if (fem) { put(g, 6, 11, 'f'); put(g, 7, 11, 'f'); put(g, 8, 11, 'f'); }
  }

  // ── RACE FEATURES ─────────────────────────────────────────────────────────
  if (appearance.race === 'orc') {
    put(g, 5, 14, 'S'); put(g, 6, 14, 'S');
    put(g, 9, 14, 'S'); put(g, 10,14, 'S');
    put(g, 5, 15, 'S'); put(g, 9, 15, 'S');
  }
  if (appearance.race === 'undead') {
    put(g, 7, 4, 'D'); put(g, 7, 5, 'D'); put(g, 7, 6, 'D'); put(g, 8, 6, 'D');
  }

  // ── BEARD ─────────────────────────────────────────────────────────────────
  if (beard > 0 && outfit !== 'ninja') {
    const bh = [2, 4, 7, 12][beard - 1] ?? 2;
    const bx = beard >= 3 ? 3 : 4;
    const bw = beard >= 3 ? 10 : 8;
    fillR(g, bx, 12, bw, Math.min(bh, GH - 12), 'G');
  }

  // ── HAIR (placed last so it overlaps top of head) ─────────────────────────
  // Hair style coords stored at y=0..n; shift +1 here to leave y=0 for outline
  for (const [hx, hy, tok] of HAIR[hStyle]) {
    put(g, hx, hy + 1, tok);
  }

  // Muscular — extra wide arms
  if (muscular) {
    for (let y = 18; y <= 23; y++) {
      put(g, 0, y, 'T'); put(g, 15, y, 'T');
    }
  }

  // Ninja mask over face
  if (outfit === 'ninja') {
    fillR(g, 3, 5, 10, 2, 'T');     // headband
    fillR(g, 4, 10, 8, 4, 'T');     // face mask
  }

  // ── OUTLINE ───────────────────────────────────────────────────────────────
  applyOutline(g);

  // ── RENDER ────────────────────────────────────────────────────────────────
  const rects: React.JSX.Element[] = [];
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const tok = g[y][x];
      if (tok !== '.') {
        rects.push(
          <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={C[tok] ?? '#ff00ff'} />,
        );
      }
    }
  }

  return (
    <svg
      width={size}
      height={Math.round(size * (GH / GW))}
      viewBox={`0 0 ${GW} ${GH}`}
      style={{ display: 'block', imageRendering: 'pixelated' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="8" cy="32.4" rx="5" ry="0.5" fill="#000" opacity="0.15" />
      {rects}
      {emote === 'sleep' && (
        <>
          <text x="14"  y="6"   fontSize="2"   fill="#a0c4ff" fontFamily="monospace" fontWeight="bold">z</text>
          <text x="14.5" y="3.5" fontSize="2.8" fill="#a0c4ff" fontFamily="monospace" fontWeight="bold">Z</text>
        </>
      )}
    </svg>
  );
}
