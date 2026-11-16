import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { Camera, Eye, EyeOff, Layers, RotateCcw, ScanLine, Wind } from 'lucide-react';

export interface DishInspectionInfo {
  key: 'sadza' | 'stew' | 'covo';
  title: string;
  shonaLabel: string;
  portion: string;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  fibrePer100: number;
  vitamins: string;
}

const REFERENCE_PLATE_PHOTO = '/assets/aistudio/IMG_9207_f517fc44.jpeg';

const DISH_DATA: Record<DishInspectionInfo['key'], DishInspectionInfo> = {
  sadza: {
    key: 'sadza',
    title: 'Sadza (white maize)',
    shonaLabel: 'Sadza jena · 260g mound',
    portion: '260g',
    kcalPer100: 110,
    proteinPer100: 2.5,
    carbsPer100: 24,
    fatPer100: 0.5,
    fibrePer100: 1.5,
    vitamins: 'B1, B3, B6',
  },
  stew: {
    key: 'stew',
    title: 'Braised beef stew',
    shonaLabel: 'Nyama yemombe · 210g portion',
    portion: '210g',
    kcalPer100: 180,
    proteinPer100: 20,
    carbsPer100: 5,
    fatPer100: 9,
    fibrePer100: 1,
    vitamins: 'B3, B12, Zinc',
  },
  covo: {
    key: 'covo',
    title: 'Sautéed covo greens',
    shonaLabel: 'Muriwo wecovo · 150g portion',
    portion: '150g',
    kcalPer100: 68,
    proteinPer100: 3.6,
    carbsPer100: 6.2,
    fatPer100: 3.8,
    fibrePer100: 3.4,
    vitamins: 'A, C, K',
  },
};

type CameraPreset = 'studio' | 'top' | 'macro';

const _rayMouse = new THREE.Vector2();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _normal = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _color = new THREE.Color();

function createSeededRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSlateTableTextures(maxAniso: number): {
  albedo: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
} {
  const rng = createSeededRng(1042);
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = 512;
  albedoCanvas.height = 512;
  const ctx = albedoCanvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 360);
  grad.addColorStop(0, '#2c3138');
  grad.addColorStop(0.65, '#1d2228');
  grad.addColorStop(1, '#12161a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 8000; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const w = 2 + rng() * 6;
    const h = 1 + rng() * 3;
    const v = 24 + Math.floor(rng() * 32);
    ctx.fillStyle = `rgba(${v}, ${v + 4}, ${v + 8}, 0.5)`;
    ctx.fillRect(x, y, w, h);

    const bv = 90 + Math.floor(rng() * 80);
    bCtx.fillStyle = `rgba(${bv}, ${bv}, ${bv}, 0.35)`;
    bCtx.fillRect(x, y, w, h);
  }

  const albedo = new THREE.CanvasTexture(albedoCanvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.anisotropy = maxAniso;
  albedo.wrapS = THREE.RepeatWrapping;
  albedo.wrapT = THREE.RepeatWrapping;
  albedo.repeat.set(3, 3);

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.colorSpace = THREE.NoColorSpace;
  bump.anisotropy = maxAniso;
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(3, 3);

  return { albedo, bump };
}

function createStonewarePlateTextures(maxAniso: number): {
  albedo: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
} {
  const rng = createSeededRng(2099);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#20242a';
  ctx.fillRect(0, 0, 512, 512);

  const bCanvas = document.createElement('canvas');
  bCanvas.width = 512;
  bCanvas.height = 512;
  const bCtx = bCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 512, 512);

  // Wheel-turned subtle ceramic bands
  for (let y = 0; y < 512; y += 3) {
    const band = Math.floor(rng() * 8);
    ctx.fillStyle = `rgba(${34 + band}, ${38 + band}, ${44 + band}, 0.25)`;
    ctx.fillRect(0, y, 512, 2);
  }

  for (let i = 0; i < 4200; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const v = 22 + Math.floor(rng() * 34);
    ctx.fillStyle = `rgba(${v}, ${v + 3}, ${v + 6}, 0.4)`;
    ctx.fillRect(x, y, 2, 2);

    const bv = 100 + Math.floor(rng() * 60);
    bCtx.fillStyle = `rgba(${bv}, ${bv}, ${bv}, 0.3)`;
    bCtx.fillRect(x, y, 2, 2);
  }

  const albedo = new THREE.CanvasTexture(canvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.anisotropy = maxAniso;

  const bump = new THREE.CanvasTexture(bCanvas);
  bump.colorSpace = THREE.NoColorSpace;
  bump.anisotropy = maxAniso;

  return { albedo, bump };
}

function createSadzaTextures(maxAniso: number): {
  albedo: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
} {
  const rng = createSeededRng(3311);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#F3EDE0';
  ctx.fillRect(0, 0, 512, 512);

  const bCanvas = document.createElement('canvas');
  bCanvas.width = 512;
  bCanvas.height = 512;
  const bCtx = bCanvas.getContext('2d')!;
  bCtx.fillStyle = '#7A7A7A';
  bCtx.fillRect(0, 0, 512, 512);

  // Porous white maize-meal grain clusters
  for (let i = 0; i < 11000; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const r = 1 + rng() * 2.8;
    const bright = rng() > 0.42;
    if (bright) {
      const s = 236 + Math.floor(rng() * 19);
      ctx.fillStyle = `rgba(${s}, ${s - 4}, ${s - 12}, 0.85)`;
      bCtx.fillStyle = `rgba(${180 + Math.floor(rng() * 75)}, ${180 + Math.floor(rng() * 75)}, ${180 + Math.floor(rng() * 75)}, 0.7)`;
    } else {
      const s = 208 + Math.floor(rng() * 22);
      ctx.fillStyle = `rgba(${s}, ${s - 7}, ${s - 18}, 0.7)`;
      bCtx.fillStyle = `rgba(${55 + Math.floor(rng() * 50)}, ${55 + Math.floor(rng() * 50)}, ${55 + Math.floor(rng() * 50)}, 0.7)`;
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    bCtx.beginPath();
    bCtx.arc(x, y, r, 0, Math.PI * 2);
    bCtx.fill();
  }

  const albedo = new THREE.CanvasTexture(canvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.anisotropy = maxAniso;
  albedo.wrapS = THREE.RepeatWrapping;
  albedo.wrapT = THREE.RepeatWrapping;
  albedo.repeat.set(2, 2);

  const bump = new THREE.CanvasTexture(bCanvas);
  bump.colorSpace = THREE.NoColorSpace;
  bump.anisotropy = maxAniso;
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(2, 2);

  return { albedo, bump };
}

function createCovoBedTextures(maxAniso: number): {
  albedo: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
} {
  const rng = createSeededRng(4492);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#15361E';
  ctx.fillRect(0, 0, 512, 512);

  const bCanvas = document.createElement('canvas');
  bCanvas.width = 512;
  bCanvas.height = 512;
  const bCtx = bCanvas.getContext('2d')!;
  bCtx.fillStyle = '#707070';
  bCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 6500; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const len = 5 + rng() * 14;
    const wid = 2 + rng() * 4;
    const ang = rng() * Math.PI * 2;
    const roll = rng();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    if (roll < 0.14) {
      // Bright chopped covo stem fleck
      ctx.fillStyle = '#89BA52';
    } else if (roll < 0.45) {
      ctx.fillStyle = '#2B6232';
    } else if (roll < 0.78) {
      ctx.fillStyle = '#1B4926';
    } else {
      ctx.fillStyle = '#0E2815';
    }
    ctx.fillRect(-len * 0.5, -wid * 0.5, len, wid);
    ctx.restore();

    bCtx.save();
    bCtx.translate(x, y);
    bCtx.rotate(ang);
    const bv = roll < 0.14 ? 225 : 80 + Math.floor(rng() * 120);
    bCtx.fillStyle = `rgb(${bv}, ${bv}, ${bv})`;
    bCtx.fillRect(-len * 0.5, -wid * 0.5, len, wid);
    bCtx.restore();
  }

  const albedo = new THREE.CanvasTexture(canvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.anisotropy = maxAniso;

  const bump = new THREE.CanvasTexture(bCanvas);
  bump.colorSpace = THREE.NoColorSpace;
  bump.anisotropy = maxAniso;

  return { albedo, bump };
}

function createBeefStewTextures(maxAniso: number): {
  albedo: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
  gravyAlbedo: THREE.CanvasTexture;
  gravyBump: THREE.CanvasTexture;
} {
  const rng = createSeededRng(5821);

  // Braised beef chunk texture
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#6A2510';
  ctx.fillRect(0, 0, 512, 512);

  const bCanvas = document.createElement('canvas');
  bCanvas.width = 512;
  bCanvas.height = 512;
  const bCtx = bCanvas.getContext('2d')!;
  bCtx.fillStyle = '#7C7C7C';
  bCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4500; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const len = 8 + rng() * 20;
    const wid = 2 + rng() * 5;
    const ang = (rng() - 0.5) * 0.6;
    const roll = rng();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    if (roll < 0.2) {
      ctx.fillStyle = 'rgba(182, 82, 28, 0.72)'; // Glazed tomato highlight
    } else if (roll < 0.55) {
      ctx.fillStyle = 'rgba(122, 43, 18, 0.8)'; // Braised lean meat
    } else if (roll < 0.85) {
      ctx.fillStyle = 'rgba(66, 22, 10, 0.85)'; // Caramelized sear
    } else {
      ctx.fillStyle = 'rgba(210, 128, 56, 0.5)'; // Tender marbling sheen
    }
    ctx.fillRect(-len * 0.5, -wid * 0.5, len, wid);
    ctx.restore();

    bCtx.save();
    bCtx.translate(x, y);
    bCtx.rotate(ang);
    const bv = 70 + Math.floor(rng() * 155);
    bCtx.fillStyle = `rgba(${bv}, ${bv}, ${bv}, 0.6)`;
    bCtx.fillRect(-len * 0.5, -wid * 0.5, len, wid);
    bCtx.restore();
  }

  // Glossy tomato-onion gravy texture
  const gCanvas = document.createElement('canvas');
  gCanvas.width = 512;
  gCanvas.height = 512;
  const gCtx = gCanvas.getContext('2d')!;
  const gGrad = gCtx.createRadialGradient(256, 256, 20, 256, 256, 260);
  gGrad.addColorStop(0, '#78260E');
  gGrad.addColorStop(0.6, '#8F3212');
  gGrad.addColorStop(1, '#581B09');
  gCtx.fillStyle = gGrad;
  gCtx.fillRect(0, 0, 512, 512);

  const gbCanvas = document.createElement('canvas');
  gbCanvas.width = 512;
  gbCanvas.height = 512;
  const gbCtx = gbCanvas.getContext('2d')!;
  gbCtx.fillStyle = '#808080';
  gbCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 2200; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const r = 1 + rng() * 3.5;
    const roll = rng();
    if (roll < 0.12) {
      gCtx.fillStyle = 'rgba(28, 18, 12, 0.85)'; // Cracked pepper / charred spice
    } else if (roll < 0.35) {
      gCtx.fillStyle = 'rgba(205, 112, 42, 0.65)'; // Caramelized onion / oil droplet
    } else {
      gCtx.fillStyle = 'rgba(130, 42, 16, 0.45)';
    }
    gCtx.beginPath();
    gCtx.arc(x, y, r, 0, Math.PI * 2);
    gCtx.fill();

    const bv = roll < 0.35 ? 165 : 105;
    gbCtx.fillStyle = `rgba(${bv}, ${bv}, ${bv}, 0.45)`;
    gbCtx.beginPath();
    gbCtx.arc(x, y, r, 0, Math.PI * 2);
    gbCtx.fill();
  }

  const albedo = new THREE.CanvasTexture(canvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.anisotropy = maxAniso;

  const bump = new THREE.CanvasTexture(bCanvas);
  bump.colorSpace = THREE.NoColorSpace;
  bump.anisotropy = maxAniso;

  const gravyAlbedo = new THREE.CanvasTexture(gCanvas);
  gravyAlbedo.colorSpace = THREE.SRGBColorSpace;
  gravyAlbedo.anisotropy = maxAniso;

  const gravyBump = new THREE.CanvasTexture(gbCanvas);
  gravyBump.colorSpace = THREE.NoColorSpace;
  gravyBump.anisotropy = maxAniso;

  return { albedo, bump, gravyAlbedo, gravyBump };
}

function createSteamWispTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  const puffs = [
    { x: 128, y: 128, r: 96, a: 0.42 },
    { x: 102, y: 112, r: 64, a: 0.28 },
    { x: 152, y: 142, r: 58, a: 0.25 },
  ];
  for (const p of puffs) {
    const g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, p.r);
    g.addColorStop(0, `rgba(255, 248, 236, ${p.a})`);
    g.addColorStop(0.5, `rgba(255, 246, 230, ${p.a * 0.4})`);
    g.addColorStop(1, 'rgba(255, 246, 230, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCalibrationDialTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 1024, 1024);

  const cx = 512;
  const cy = 512;
  ctx.strokeStyle = 'rgba(229, 184, 75, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 466, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(30, 122, 76, 0.38)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 444, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 72; i++) {
    const angle = (i / 72) * Math.PI * 2;
    const isMajor = i % 6 === 0;
    const r1 = isMajor ? 432 : 446;
    const r2 = 466;
    ctx.strokeStyle = isMajor ? 'rgba(229, 184, 75, 0.58)' : 'rgba(237, 244, 239, 0.22)';
    ctx.lineWidth = isMajor ? 2.5 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 124);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.62, 'rgba(0, 0, 0, 0.26)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildSculptedSadzaGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.68, 72, 54);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Flatten bottom gently to rest seamlessly inside plate curvature
    y *= 0.66;
    if (y < -0.08) {
      y = -0.08 + (y + 0.08) * 0.28;
    }

    // Slight organic oval silhouette
    x *= 1.07;
    z *= 0.92;

    // Multi-octave organic sadza scoop ridges + aerated crumb irregularity
    const macroLobe =
      Math.sin(x * 4.4 + 0.7) * Math.cos(z * 4.1 - 0.3) * 0.032 +
      Math.sin((x + z) * 6.5) * 0.016;
    const fineGrit =
      Math.sin(x * 23.0 + z * 19.0) * Math.cos(y * 21.0 + x * 13.0) * 0.012 +
      Math.cos(z * 31.0 - y * 27.0) * 0.008;

    const scaleBoost = 1 + (macroLobe + fineGrit) * (y > -0.05 ? 1 : 0.25);
    pos.setXYZ(i, x * scaleBoost, y * scaleBoost, z * scaleBoost);
  }

  geo.computeVertexNormals();
  return geo;
}

function buildSculptedCovoBedGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.66, 60, 44);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Flatten lower underside onto plate and elongate along Z to form crescent greens mound
    y *= 0.42;
    if (y < -0.06) y = -0.06 + (y + 0.06) * 0.22;

    z *= 1.48;
    x *= 0.78;
    // Curve slightly inward along the left edge of the round plate
    x += (z * z) * 0.22;

    const leafCluster =
      Math.sin(x * 11.0 + z * 9.0) * 0.022 +
      Math.cos(z * 17.0 - x * 14.0) * 0.014;
    pos.setXYZ(i, x + leafCluster * 0.6, y + Math.abs(leafCluster) * 0.85, z + leafCluster * 0.5);
  }

  geo.computeVertexNormals();
  return geo;
}

function buildBraisedBeefChunkGeometry(seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(0.17, 2);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const n =
      Math.sin(x * 14.0 + seed * 3.1) * Math.cos(z * 13.0 - seed * 2.3) * 0.22 +
      Math.cos((y + x) * 18.0 + seed * 1.7) * 0.14;
    const f = 1 + n;
    pos.setXYZ(i, x * f * 1.16, y * f * 0.76, z * f * 0.96);
  }

  geo.computeVertexNormals();
  return geo;
}

interface HeroPlate3DProps {
  onSelectDish?: (dish: DishInspectionInfo) => void;
  className?: string;
}

export function HeroPlate3D({ onSelectDish, className = '' }: HeroPlate3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [explode, setExplode] = useState(0);
  const [preset, setPreset] = useState<CameraPreset>('studio');
  const [scanActive, setScanActive] = useState(true);
  const [steamActive, setSteamActive] = useState(true);
  const [viewMode, setViewMode] = useState<'3d' | 'photo'>('3d');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [selectedDish, setSelectedDish] = useState<DishInspectionInfo>(DISH_DATA.sadza);
  const [webglReady, setWebglReady] = useState(true);

  const explodeRef = useRef(0);
  const scanActiveRef = useRef(true);
  const steamActiveRef = useRef(true);
  const cameraPresetRef = useRef<{ preset: CameraPreset; transitionActive: boolean }>({
    preset: 'studio',
    transitionActive: false,
  });
  const selectedKeyRef = useRef<DishInspectionInfo['key']>('sadza');
  const onSelectDishRef = useRef(onSelectDish);
  onSelectDishRef.current = onSelectDish;

  useEffect(() => {
    explodeRef.current = explode;
  }, [explode]);

  useEffect(() => {
    scanActiveRef.current = scanActive;
  }, [scanActive]);

  useEffect(() => {
    steamActiveRef.current = steamActive;
  }, [steamActive]);

  useEffect(() => {
    const mount = containerRef.current;
    if (!mount) return;

    let frameId = 0;
    let disposed = false;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglReady(false);
      return;
    }

    const width = mount.clientWidth || 640;
    const height = mount.clientHeight || 520;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b110e);
    scene.fog = new THREE.FogExp2(0x0b110e, 0.055);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();
    roomEnv.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    // Angled culinary hero view mirroring IMG_9207 framing:
    // Sadza at top-right, Covo on left, Braised Beef Stew front & bottom-right
    camera.position.set(0.25, 4.3, 4.7);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.9;
    controls.maxDistance = 8.6;
    controls.minPolarAngle = 0.12;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    controls.target.set(0, 0.24, 0.04);
    controls.update();

    const onControlsStart = () => {
      cameraPresetRef.current.transitionActive = false;
    };
    controls.addEventListener('start', onControlsStart);

    // 4-Point Culinary Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xe4edf7, 0x2c2017, 0.72);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.45);
    keyLight.position.set(3.8, 7.2, 3.6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 18;
    keyLight.shadow.camera.left = -3.6;
    keyLight.shadow.camera.right = 3.6;
    keyLight.shadow.camera.top = 3.6;
    keyLight.shadow.camera.bottom = -3.6;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6bd4a5, 0.85);
    rimLight.position.set(-4.6, 3.6, -4.2);
    scene.add(rimLight);

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softbox = new THREE.RectAreaLight(0xfff5e4, 2.6, 3.8, 2.6);
      softbox.position.set(-1.6, 4.4, 2.4);
      softbox.lookAt(0, 0.25, 0);
      scene.add(softbox);
    }

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const slateTex = createSlateTableTextures(maxAniso);
    const plateTex = createStonewarePlateTextures(maxAniso);
    const sadzaTex = createSadzaTextures(maxAniso);
    const covoTex = createCovoBedTextures(maxAniso);
    const stewTex = createBeefStewTextures(maxAniso);
    const steamTex = createSteamWispTexture();
    const dialTex = createCalibrationDialTexture(maxAniso);
    const shadowTex = createContactShadowTexture();

    const disposables: Array<{ dispose: () => void }> = [
      slateTex.albedo,
      slateTex.bump,
      plateTex.albedo,
      plateTex.bump,
      sadzaTex.albedo,
      sadzaTex.bump,
      covoTex.albedo,
      covoTex.bump,
      stewTex.albedo,
      stewTex.bump,
      stewTex.gravyAlbedo,
      stewTex.gravyBump,
      steamTex,
      dialTex,
      shadowTex,
      envTex,
    ];

    // Dark Slate Studio Tabletop grounded at y = 0
    const tableGeo = new THREE.CircleGeometry(12, 64);
    const tableMat = new THREE.MeshStandardMaterial({
      map: slateTex.albedo,
      bumpMap: slateTex.bump,
      bumpScale: 0.014,
      roughness: 0.84,
      metalness: 0.06,
    });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.rotation.x = -Math.PI / 2;
    tableMesh.position.y = 0;
    tableMesh.receiveShadow = true;
    scene.add(tableMesh);
    disposables.push(tableGeo, tableMat);

    // Ground Contact Shadow beneath Plate
    const shadowGeo = new THREE.PlaneGeometry(5.2, 5.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.78,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.008;
    scene.add(shadowMesh);
    disposables.push(shadowGeo, shadowMat);

    // Calibrated Floor Measurement Dial surrounding plate
    const dialGeo = new THREE.PlaneGeometry(4.95, 4.95);
    const dialMat = new THREE.MeshBasicMaterial({
      map: dialTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const dialMesh = new THREE.Mesh(dialGeo, dialMat);
    dialMesh.rotation.x = -Math.PI / 2;
    dialMesh.position.y = 0.018;
    scene.add(dialMesh);
    disposables.push(dialGeo, dialMat);

    const plateAssembly = new THREE.Group();
    scene.add(plateAssembly);

    // 1. Matte Charcoal Stoneware Plate (LatheGeometry matching IMG_9207 lip)
    const platePoints = [
      new THREE.Vector2(0, 0.055),
      new THREE.Vector2(1.42, 0.06),
      new THREE.Vector2(1.74, 0.145),
      new THREE.Vector2(1.9, 0.245),
      new THREE.Vector2(1.94, 0.242),
      new THREE.Vector2(1.91, 0.17),
      new THREE.Vector2(1.62, 0.025),
      new THREE.Vector2(1.36, 0.004),
      new THREE.Vector2(0, 0.004),
    ];
    const plateGeo = new THREE.LatheGeometry(platePoints, 72);
    const plateMat = new THREE.MeshPhysicalMaterial({
      map: plateTex.albedo,
      bumpMap: plateTex.bump,
      bumpScale: 0.007,
      roughness: 0.44,
      metalness: 0.08,
      clearcoat: 0.28,
      clearcoatRoughness: 0.42,
    });
    const plateMesh = new THREE.Mesh(plateGeo, plateMat);
    plateMesh.receiveShadow = true;
    plateMesh.castShadow = true;
    plateAssembly.add(plateMesh);
    disposables.push(plateGeo, plateMat);

    const clickableMeshes: THREE.Object3D[] = [];

    // 2. Sculpted White Maize Sadza Mound (Top-Right Quadrant matching IMG_9207)
    const sadzaGroup = new THREE.Group();
    sadzaGroup.position.set(0.46, 0.19, -0.44);
    sadzaGroup.userData.dishKey = 'sadza';

    const sadzaGeo = buildSculptedSadzaGeometry();
    const sadzaMat = new THREE.MeshStandardMaterial({
      map: sadzaTex.albedo,
      bumpMap: sadzaTex.bump,
      bumpScale: 0.032,
      color: 0xfaf6ec,
      roughness: 0.85,
      metalness: 0.01,
    });
    const sadzaMesh = new THREE.Mesh(sadzaGeo, sadzaMat);
    sadzaMesh.castShadow = true;
    sadzaMesh.receiveShadow = true;
    sadzaMesh.rotation.y = -0.35;
    sadzaMesh.userData.dishKey = 'sadza';
    sadzaGroup.add(sadzaMesh);
    clickableMeshes.push(sadzaMesh);

    // Coarse maize crumbs clustered along shoulder for macro realism
    const crumbGeo = new THREE.DodecahedronGeometry(0.024, 0);
    const crumbMat = new THREE.MeshStandardMaterial({
      map: sadzaTex.albedo,
      color: 0xfdfaf2,
      roughness: 0.88,
    });
    const crumbCount = 65;
    const crumbInstances = new THREE.InstancedMesh(crumbGeo, crumbMat, crumbCount);
    const sadzaRng = createSeededRng(707);
    for (let i = 0; i < crumbCount; i++) {
      const theta = sadzaRng() * Math.PI * 2;
      const phi = 0.25 + sadzaRng() * 0.95;
      const r = 0.65;
      _dummy.position.set(
        Math.sin(phi) * Math.cos(theta) * r * 1.07,
        Math.cos(phi) * r * 0.64,
        Math.sin(phi) * Math.sin(theta) * r * 0.92
      );
      _dummy.rotation.set(sadzaRng() * 3, sadzaRng() * 3, sadzaRng() * 3);
      _dummy.scale.setScalar(0.55 + sadzaRng() * 0.9);
      _dummy.updateMatrix();
      crumbInstances.setMatrixAt(i, _dummy.matrix);
    }
    crumbInstances.instanceMatrix.needsUpdate = true;
    crumbInstances.computeBoundingSphere();
    crumbInstances.userData.dishKey = 'sadza';
    sadzaGroup.add(crumbInstances);

    plateAssembly.add(sadzaGroup);
    disposables.push(sadzaGeo, sadzaMat, crumbGeo, crumbMat);

    // 3. Sautéed Covo Greens Crescent + Finely Chopped Instanced Leaf Shreds (Left Half matching IMG_9207)
    const covoGroup = new THREE.Group();
    covoGroup.position.set(-0.68, 0.14, -0.05);
    covoGroup.userData.dishKey = 'covo';

    const covoBedGeo = buildSculptedCovoBedGeometry();
    const covoBedMat = new THREE.MeshPhysicalMaterial({
      map: covoTex.albedo,
      bumpMap: covoTex.bump,
      bumpScale: 0.036,
      roughness: 0.34,
      metalness: 0.02,
      clearcoat: 0.45,
      clearcoatRoughness: 0.28,
    });
    const covoBedMesh = new THREE.Mesh(covoBedGeo, covoBedMat);
    covoBedMesh.castShadow = true;
    covoBedMesh.receiveShadow = true;
    covoBedMesh.userData.dishKey = 'covo';
    covoGroup.add(covoBedMesh);
    clickableMeshes.push(covoBedMesh);

    // 260 instanced finely chopped sautéed covo leaves + bright green stem flecks
    const shredGeo = new THREE.PlaneGeometry(0.088, 0.044, 2, 1);
    const shredPos = shredGeo.attributes.position;
    for (let i = 0; i < shredPos.count; i++) {
      const px = shredPos.getX(i);
      shredPos.setZ(i, -(px * px) * 3.5);
    }
    shredGeo.computeVertexNormals();

    const shredMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.24,
      metalness: 0.02,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
      side: THREE.DoubleSide,
    });

    const shredCount = 260;
    const shredInstances = new THREE.InstancedMesh(shredGeo, shredMat, shredCount);
    const covoRng = createSeededRng(818);
    const covoPalette = [0x143a1f, 0x1d4d2a, 0x2a6234, 0x357438, 0x7cb34d];

    for (let i = 0; i < shredCount; i++) {
      const t = (covoRng() - 0.5) * 2.05; // along crescent length
      const lat = (covoRng() - 0.5) * 1.15;
      const sx = lat * 0.46 + t * t * 0.18;
      const sz = t * 0.88;
      const radialFalloff = Math.max(0, 1 - (lat * lat * 0.65 + (t * t) * 0.24));
      const sy = 0.03 + radialFalloff * (0.21 + covoRng() * 0.06);

      _dummy.position.set(sx, sy, sz);
      _normal.set(lat * 0.45, 1, t * 0.25).normalize();
      _quat.setFromUnitVectors(_up, _normal);
      _dummy.quaternion.copy(_quat);
      _dummy.rotateY(covoRng() * Math.PI * 2);
      _dummy.rotateX((covoRng() - 0.5) * 0.75);
      _dummy.scale.set(0.65 + covoRng() * 0.9, 1, 0.7 + covoRng() * 0.85);
      _dummy.updateMatrix();
      shredInstances.setMatrixAt(i, _dummy.matrix);

      const isStemFleck = covoRng() < 0.16;
      const hex = isStemFleck
        ? covoPalette[4]
        : covoPalette[Math.floor(covoRng() * 4)];
      _color.setHex(hex);
      shredInstances.setColorAt(i, _color);
    }
    shredInstances.instanceMatrix.needsUpdate = true;
    if (shredInstances.instanceColor) shredInstances.instanceColor.needsUpdate = true;
    shredInstances.computeBoundingSphere();
    shredInstances.castShadow = true;
    shredInstances.receiveShadow = true;
    shredInstances.userData.dishKey = 'covo';
    covoGroup.add(shredInstances);
    clickableMeshes.push(shredInstances);

    plateAssembly.add(covoGroup);
    disposables.push(covoBedGeo, covoBedMat, shredGeo, shredMat);

    // 4. Braised Beef Stew & Glossy Mahogany Gravy Pool (Front & Bottom-Right matching IMG_9207)
    const stewGroup = new THREE.Group();
    stewGroup.position.set(0.14, 0.072, 0.52);
    stewGroup.userData.dishKey = 'stew';

    // Organic kidney/crescent gravy pool sitting safely above plate floor
    const gravyShape = new THREE.Shape();
    gravyShape.moveTo(-0.98, 0.12);
    gravyShape.bezierCurveTo(-1.05, -0.35, -0.45, -0.68, 0.18, -0.68);
    gravyShape.bezierCurveTo(0.86, -0.68, 1.18, -0.18, 0.96, 0.22);
    gravyShape.bezierCurveTo(0.74, 0.52, 0.24, 0.42, -0.15, 0.46);
    gravyShape.bezierCurveTo(-0.56, 0.5, -0.92, 0.42, -0.98, 0.12);

    const gravyGeo = new THREE.ExtrudeGeometry(gravyShape, {
      depth: 0.032,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.025,
      bevelSegments: 3,
      curveSegments: 28,
    });
    gravyGeo.rotateX(-Math.PI / 2);

    const gravyMat = new THREE.MeshPhysicalMaterial({
      map: stewTex.gravyAlbedo,
      bumpMap: stewTex.gravyBump,
      bumpScale: 0.015,
      color: 0xffffff,
      roughness: 0.12,
      metalness: 0.04,
      clearcoat: 0.96,
      clearcoatRoughness: 0.06,
    });
    const gravyMesh = new THREE.Mesh(gravyGeo, gravyMat);
    gravyMesh.position.y = 0.008;
    gravyMesh.receiveShadow = true;
    gravyMesh.userData.dishKey = 'stew';
    stewGroup.add(gravyMesh);
    clickableMeshes.push(gravyMesh);

    // 13 Sculpted Braised Beef Chunks nested naturally in the gravy
    const beefMat = new THREE.MeshPhysicalMaterial({
      map: stewTex.albedo,
      bumpMap: stewTex.bump,
      bumpScale: 0.032,
      color: 0xffffff,
      roughness: 0.32,
      metalness: 0.03,
      clearcoat: 0.72,
      clearcoatRoughness: 0.18,
    });

    const beefPlacements: Array<[number, number, number, number, number]> = [
      [-0.24, 0.13, -0.18, 1.28, 0.4],
      [0.06, 0.16, -0.24, 1.18, 1.3],
      [0.36, 0.14, -0.12, 1.24, 2.2],
      [0.64, 0.12, -0.04, 1.08, 3.1],
      [-0.58, 0.11, 0.08, 1.16, 4.0],
      [-0.28, 0.14, 0.18, 1.22, 4.9],
      [0.04, 0.15, 0.14, 1.26, 5.8],
      [0.34, 0.13, 0.18, 1.14, 6.7],
      [0.68, 0.11, 0.16, 1.06, 7.6],
      [-0.08, 0.11, 0.36, 1.15, 8.5],
      [0.24, 0.12, 0.38, 1.08, 9.4],
      [0.52, 0.1, 0.36, 0.96, 10.3],
      [-0.44, 0.09, 0.3, 0.98, 11.2],
    ];

    for (const [bx, by, bz, bs, seed] of beefPlacements) {
      const bGeo = buildBraisedBeefChunkGeometry(seed);
      const chunk = new THREE.Mesh(bGeo, beefMat);
      chunk.position.set(bx, by, bz);
      chunk.rotation.set(seed * 0.45, seed * 0.9, seed * 0.25);
      chunk.scale.setScalar(bs);
      chunk.castShadow = true;
      chunk.receiveShadow = true;
      chunk.userData.dishKey = 'stew';
      stewGroup.add(chunk);
      clickableMeshes.push(chunk);
      disposables.push(bGeo);
    }

    // Subtle olive-green braised bay leaf accent matching bottom-right of IMG_9207
    const bayShape = new THREE.Shape();
    bayShape.moveTo(0, 0);
    bayShape.quadraticCurveTo(0.14, 0.08, 0.28, 0.02);
    bayShape.quadraticCurveTo(0.14, -0.07, 0, 0);
    const bayGeo = new THREE.ExtrudeGeometry(bayShape, {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
    });
    const bayMat = new THREE.MeshPhysicalMaterial({
      color: 0x6f772c,
      roughness: 0.28,
      clearcoat: 0.72,
    });
    const bayMesh = new THREE.Mesh(bayGeo, bayMat);
    bayMesh.position.set(0.42, 0.085, 0.42);
    bayMesh.rotation.set(-Math.PI / 2 + 0.18, 0.35, -0.25);
    bayMesh.userData.dishKey = 'stew';
    stewGroup.add(bayMesh);

    plateAssembly.add(stewGroup);
    disposables.push(gravyGeo, gravyMat, beefMat, bayGeo, bayMat);

    // 5. Warm Steam Wisps hovering softly above hot sadza & stew
    const steamGroup = new THREE.Group();
    scene.add(steamGroup);

    const steamGeo = new THREE.PlaneGeometry(0.58, 0.72);
    const steamEntries: Array<{
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      baseX: number;
      baseZ: number;
      phase: number;
      speed: number;
    }> = [];

    const steamAnchors: Array<[number, number, number, number]> = [
      [0.48, -0.4, 0.0, 0.36],
      [0.32, -0.28, 1.4, 0.42],
      [0.14, 0.44, 2.2, 0.34],
      [-0.12, 0.56, 3.5, 0.39],
      [0.42, 0.38, 4.7, 0.37],
      [-0.56, -0.04, 5.4, 0.31],
    ];

    for (const [sx, sz, phase, speed] of steamAnchors) {
      const sMat = new THREE.MeshBasicMaterial({
        map: steamTex,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const sMesh = new THREE.Mesh(steamGeo, sMat);
      sMesh.position.set(sx, 0.48, sz);
      steamGroup.add(sMesh);
      steamEntries.push({ mesh: sMesh, mat: sMat, baseX: sx, baseZ: sz, phase, speed });
      disposables.push(sMat);
    }
    disposables.push(steamGeo);

    // 6. Volumetric Orbital Macro Telemetry Rings
    const ringGroup = new THREE.Group();
    ringGroup.position.y = 0.62;
    scene.add(ringGroup);

    const ringSpecs: Array<{ radius: number; tube: number; color: number; tiltX: number; tiltZ: number }> = [
      { radius: 2.22, tube: 0.011, color: 0x1e7a4c, tiltX: 0.16, tiltZ: 0.07 },
      { radius: 2.38, tube: 0.009, color: 0xe5b84b, tiltX: -0.2, tiltZ: 0.13 },
      { radius: 2.52, tube: 0.009, color: 0x135d3b, tiltX: 0.11, tiltZ: -0.18 },
    ];
    const orbitalRings: THREE.Mesh[] = [];
    for (const spec of ringSpecs) {
      const rGeo = new THREE.TorusGeometry(spec.radius, spec.tube, 12, 96);
      const rMat = new THREE.MeshPhysicalMaterial({
        color: spec.color,
        emissive: spec.color,
        emissiveIntensity: 0.4,
        roughness: 0.22,
        metalness: 0.6,
        transparent: true,
        opacity: 0.68,
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.rotation.set(Math.PI / 2 + spec.tiltX, 0, spec.tiltZ);
      ringGroup.add(rMesh);
      orbitalRings.push(rMesh);
      disposables.push(rGeo, rMat);
    }

    // 7. Optical Laser Scan Plane
    const scanGeo = new THREE.PlaneGeometry(3.85, 0.022);
    const scanMat = new THREE.MeshBasicMaterial({
      color: 0xe5b84b,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    const scanBeam = new THREE.Mesh(scanGeo, scanMat);
    scanBeam.position.set(0, 0.52, 0);
    scanBeam.rotation.x = Math.PI / 2;
    scene.add(scanBeam);
    disposables.push(scanGeo, scanMat);

    // Raycaster Selection
    const raycaster = new THREE.Raycaster();
    let pointerDownPos = { x: 0, y: 0 };
    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 8) return;

      const rect = renderer.domElement.getBoundingClientRect();
      _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_rayMouse, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData?.dishKey) {
          obj = obj.parent;
        }
        const key = obj?.userData?.dishKey as DishInspectionInfo['key'] | undefined;
        if (key && DISH_DATA[key]) {
          selectedKeyRef.current = key;
          setSelectedDish(DISH_DATA[key]);
          onSelectDishRef.current?.(DISH_DATA[key]);
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      if (!mount || disposed) return;
      const w = mount.clientWidth || 640;
      const h = mount.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(mount);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglReady(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    let currentExplode = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      // Smooth damped exploded-view layer separation
      currentExplode = THREE.MathUtils.damp(currentExplode, explodeRef.current, 6, delta);
      sadzaGroup.position.y = 0.19 + currentExplode * 0.92;
      stewGroup.position.y = 0.072 + currentExplode * 1.38;
      covoGroup.position.y = 0.14 + currentExplode * 0.56;
      ringGroup.position.y = 0.62 + currentExplode * 0.65;

      // Subtle dish selection highlight
      const activeKey = selectedKeyRef.current;
      sadzaMat.emissive.setHex(activeKey === 'sadza' ? 0x262012 : 0x000000);
      beefMat.emissive.setHex(activeKey === 'stew' ? 0x291108 : 0x000000);
      gravyMat.emissive.setHex(activeKey === 'stew' ? 0x1c0a04 : 0x000000);
      covoBedMat.emissive.setHex(activeKey === 'covo' ? 0x0b2817 : 0x000000);

      // Orbital telemetry rotation & subtle table plate micro-float sway
      orbitalRings[0].rotation.z += delta * 0.16;
      orbitalRings[1].rotation.z -= delta * 0.12;
      orbitalRings[2].rotation.z += delta * 0.09;
      plateAssembly.rotation.y = Math.sin(elapsed * 0.22) * 0.055;

      // Gentle steam rise billboard animation (zero per-frame allocations)
      steamGroup.visible = steamActiveRef.current;
      if (steamActiveRef.current) {
        for (const s of steamEntries) {
          const cycle = ((elapsed * s.speed + s.phase) % 1 + 1) % 1;
          s.mesh.position.y = 0.42 + currentExplode * 0.65 + cycle * 1.12;
          s.mesh.position.x = s.baseX + Math.sin(elapsed * 1.1 + s.phase) * 0.09;
          s.mesh.position.z = s.baseZ + Math.cos(elapsed * 0.9 + s.phase) * 0.06;
          s.mesh.lookAt(camera.position.x, s.mesh.position.y, camera.position.z);
          const scale = 0.72 + cycle * 0.75;
          s.mesh.scale.set(scale, scale, 1);
          s.mat.opacity = Math.sin(cycle * Math.PI) * 0.2;
        }
      }

      // Optical scan laser sweep
      scanBeam.visible = scanActiveRef.current;
      if (scanActiveRef.current) {
        scanBeam.position.z = Math.sin(elapsed * 1.35) * 1.55;
        scanBeam.position.y = 0.48 + currentExplode * 0.62;
      }

      // Smooth camera preset damping
      if (cameraPresetRef.current.transitionActive) {
        const p = cameraPresetRef.current.preset;
        if (p === 'studio') {
          _targetCamPos.set(0.25, 4.3, 4.7);
          _targetLookAt.set(0, 0.24, 0.04);
        } else if (p === 'top') {
          _targetCamPos.set(0.01, 5.8, 0.35);
          _targetLookAt.set(0, 0.12, 0);
        } else {
          _targetCamPos.set(1.85, 1.85, 3.05);
          _targetLookAt.set(0.08, 0.24, 0.22);
        }
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 5, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLookAt.x, 5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLookAt.y, 5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLookAt.z, 5, delta);
        if (camera.position.distanceTo(_targetCamPos) < 0.04) {
          cameraPresetRef.current.transitionActive = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      controls.removeEventListener('start', onControlsStart);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      for (const d of disposables) d.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  const selectPreset = (next: CameraPreset) => {
    setPreset(next);
    cameraPresetRef.current = { preset: next, transitionActive: true };
  };

  return (
    <div className={`relative w-full h-[480px] lg:h-[580px] rounded-2xl border border-[#135D3B]/20 dark:border-white/10 bg-[#0B110E] overflow-hidden ${className}`}>
      {/* Dedicated isolated WebGL canvas mount */}
      <div
        ref={containerRef}
        className={`w-full h-full cursor-grab active:cursor-grabbing ${
          viewMode === 'photo' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      />

      {/* Uploaded Plate Photo View or Fallback */}
      {(!webglReady || viewMode === 'photo') && (
        <div className="absolute inset-0 bg-[#0B110E]">
          <img
            src={REFERENCE_PLATE_PHOTO}
            alt="Real sadza, braised beef stew, and sautéed covo plate on dark stoneware"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Minimal Top-Left Selected Dish Readout (100g Standardized) */}
      <div className="pointer-events-none absolute top-4 left-4 right-4 flex flex-wrap items-start justify-between gap-3">
        <div className="pointer-events-auto rounded-xl border border-[#E5B84B]/25 bg-[#121C17]/95 px-4 py-3 text-[#EDF4EF] max-w-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium text-[#E5B84B] truncate">
              {selectedDish.shonaLabel}
            </span>
            <span className="font-mono text-[11px] text-slate-400 shrink-0">per 100g</span>
          </div>
          <p className="font-display text-lg font-extrabold uppercase tracking-tight mt-0.5">
            {selectedDish.title}
          </p>
          <div className="mt-2 grid grid-cols-4 gap-2 border-t border-white/10 pt-2 font-mono text-xs tabular-nums">
            <div>
              <span className="block text-[10px] text-slate-400">Kcal</span>
              <span className="font-semibold text-white">{selectedDish.kcalPer100}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400">Prot</span>
              <span className="font-semibold text-[#5EE39D]">{selectedDish.proteinPer100}g</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400">Carb</span>
              <span className="font-semibold text-[#E5B84B]">{selectedDish.carbsPer100}g</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400">Fat</span>
              <span className="font-semibold text-[#D99B26]">{selectedDish.fatPer100}g</span>
            </div>
          </div>
        </div>

        {/* Quick dish selector buttons + Live Photo Switch */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-xl border border-[#E5B84B]/20 bg-[#121C17]/95 p-1.5">
          {(Object.keys(DISH_DATA) as Array<DishInspectionInfo['key']>).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                selectedKeyRef.current = key;
                setSelectedDish(DISH_DATA[key]);
                onSelectDish?.(DISH_DATA[key]);
              }}
              className={`min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedDish.key === key
                  ? 'bg-[#135D3B] text-[#E5B84B] border border-[#E5B84B]/40'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              {key === 'sadza' ? 'Sadza' : key === 'stew' ? 'Beef Stew' : 'Covo Greens'}
            </button>
          ))}

          {webglReady && (
            <button
              type="button"
              onClick={() => setViewMode((m) => (m === '3d' ? 'photo' : '3d'))}
              className={`min-h-[36px] inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 border ${
                viewMode === 'photo'
                  ? 'bg-[#E5B84B] text-[#112018] border-[#E5B84B]'
                  : 'border-white/10 text-slate-200 hover:bg-white/10'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              {viewMode === 'photo' ? 'View 3D' : 'Real Photo'}
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Bottom Control Dock (Zero backdrop-filter over WebGL) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(720px,calc(100%-24px))] flex flex-col items-center">
        <button
          type="button"
          onClick={() => setControlsVisible((v) => !v)}
          className="mb-1.5 inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 border-[#E5B84B]/25 bg-[#121C17]/95 px-3 py-1 text-[11px] font-medium text-[#E5B84B] hover:text-white transition-colors whitespace-nowrap"
        >
          {controlsVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {controlsVisible ? 'Hide 3D Controls' : 'Show 3D Controls'}
        </button>

        {controlsVisible && (
          <div className="w-full rounded-xl border border-[#E5B84B]/25 bg-[#121C17]/95 px-4 py-2.5 text-xs text-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <label className="flex items-center gap-2 min-w-[150px] flex-1">
              <Layers className="w-4 h-4 text-[#E5B84B] shrink-0" />
              <span className="whitespace-nowrap text-slate-300">Explode</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={explode}
                onChange={(e) => {
                  setViewMode('3d');
                  setExplode(Number(e.target.value));
                }}
                className="w-full accent-[#D99B26] cursor-pointer"
                aria-label="Explode 3D meal layers"
              />
            </label>

            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
              {(['studio', 'top', 'macro'] as CameraPreset[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setViewMode('3d');
                    selectPreset(p);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    preset === p && viewMode === '3d'
                      ? 'bg-[#E5B84B] text-[#112018]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {p === 'studio' ? '45° Hero' : p === 'top' ? 'Top Scan' : 'Macro Stew'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSteamActive((s) => !s)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  steamActive
                    ? 'bg-[#135D3B] text-[#E5B84B] border border-[#E5B84B]/40'
                    : 'bg-white/10 text-slate-300 hover:bg-white/15'
                }`}
              >
                <Wind className="w-3.5 h-3.5" />
                Steam
              </button>
              <button
                type="button"
                onClick={() => setScanActive((s) => !s)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  scanActive
                    ? 'bg-[#135D3B] text-[#E5B84B] border border-[#E5B84B]/40'
                    : 'bg-white/10 text-slate-300 hover:bg-white/15'
                }`}
              >
                <ScanLine className="w-3.5 h-3.5" />
                Beam
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('3d');
                  setExplode(0);
                  selectPreset('studio');
                }}
                className="inline-flex items-center justify-center p-1.5 rounded-lg bg-white/10 text-slate-300 hover:text-white transition-colors"
                aria-label="Reset 3D view"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
