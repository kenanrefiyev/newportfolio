import * as THREE from 'three';

/*
 * A silver all-in-one desktop computer, modelled procedurally so the screen is a real
 * surface that can carry each website's capture as a texture.
 *
 * Units are arbitrary (≈ 1 unit = 10 cm). Proportions follow a 24-inch all-in-one:
 * a 16:10 display behind a black glass front with narrow bezels, an aluminium chin,
 * an 11.5 mm body with fully rounded edges, and a bent aluminium stand whose foot runs
 * forward under the display.
 */

export const DIM = (() => {
  const W = 5.47; // body width
  const bezel = 0.1;
  const screenW = W - 2 * bezel - 0.06;
  const screenH = screenW / 1.6;
  const glassH = screenH + 2 * bezel;
  const chin = 0.66;
  const bodyH = glassH + chin;
  const D = 0.115; // body depth
  const lift = 0.98; // floor to the bottom edge of the body
  const standW = 1.5;
  return { W, bezel, screenW, screenH, glassH, chin, bodyH, D, lift, standW, totalH: lift + bodyH };
})();

type Corners = { tl: number; tr: number; br: number; bl: number };

function roundedRect(w: number, h: number, r: number | Corners) {
  const c = typeof r === 'number' ? { tl: r, tr: r, br: r, bl: r } : r;
  const x = -w / 2;
  const y = -h / 2;
  const s = new THREE.Shape();
  s.moveTo(x + c.bl, y);
  s.lineTo(x + w - c.br, y);
  if (c.br) s.quadraticCurveTo(x + w, y, x + w, y + c.br);
  s.lineTo(x + w, y + h - c.tr);
  if (c.tr) s.quadraticCurveTo(x + w, y + h, x + w - c.tr, y + h);
  s.lineTo(x + c.tl, y + h);
  if (c.tl) s.quadraticCurveTo(x, y + h, x, y + h - c.tl);
  s.lineTo(x, y + c.bl);
  if (c.bl) s.quadraticCurveTo(x, y, x + c.bl, y);
  return s;
}

/** ShapeGeometry whose UVs span 0..1 across the shape's bounds (ShapeGeometry uses raw coordinates). */
function normalisedShapeGeometry(shape: THREE.Shape, w: number, h: number, segments = 10) {
  const g = new THREE.ShapeGeometry(shape, segments);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  }
  uv.needsUpdate = true;
  return g;
}

function standGeometry() {
  const { D, lift, bodyH, standW } = DIM;
  const t = 0.05; // plate thickness (the bevel adds the rest)
  // Centre line of the bent plate in side view: (depth z, height y)
  const attachY = lift + bodyH * 0.5;
  const pts: THREE.Vector2[] = [];
  const A = new THREE.Vector2(-D / 2 + 0.03, attachY);
  const B = new THREE.Vector2(-0.94, 0.34);
  const C = new THREE.Vector2(-1.07, 0.034);
  const E = new THREE.Vector2(-0.7, 0.034);
  const F = new THREE.Vector2(0.78, 0.034);
  for (let i = 0; i <= 8; i++) pts.push(A.clone().lerp(B, i / 8));
  const curve = new THREE.QuadraticBezierCurve(B, C, E);
  curve.getPoints(18).slice(1).forEach((p) => pts.push(p));
  for (let i = 1; i <= 8; i++) pts.push(E.clone().lerp(F, i / 8));

  const left: THREE.Vector2[] = [];
  const right: THREE.Vector2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dir = next.clone().sub(prev).normalize();
    const n = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(t / 2);
    left.push(pts[i].clone().add(n));
    right.push(pts[i].clone().sub(n));
  }
  const outline = [...left, ...right.reverse()];
  // Shape x = -depth so that after rotateY(π/2) the depth lands on +z.
  const shape = new THREE.Shape(outline.map((p) => new THREE.Vector2(-p.x, p.y)));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: standW - 0.04,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.012,
    bevelSegments: 3,
    curveSegments: 4,
  });
  g.translate(0, 0, -(standW - 0.04) / 2);
  g.rotateY(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft radial contact shadow. */
function shadowTexture() {
  return canvasTexture(256, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(22,20,17,0.6)');
    g.addColorStop(0.4, 'rgba(22,20,17,0.24)');
    g.addColorStop(1, 'rgba(22,20,17,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

/**
 * The studio's reflection in the front glass: a broad, soft diagonal band.
 * Drawn on black and blended additively, so black adds nothing.
 */
function glassReflectionTexture() {
  return canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, s, s);
    const g = ctx.createLinearGradient(0, 0, s, s * 0.9);
    g.addColorStop(0, 'rgba(255,255,255,0.0)');
    g.addColorStop(0.18, 'rgba(255,255,255,0.10)');
    g.addColorStop(0.34, 'rgba(255,255,255,0.03)');
    g.addColorStop(0.52, 'rgba(255,255,255,0.0)');
    g.addColorStop(0.78, 'rgba(255,255,255,0.025)');
    g.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

/**
 * Environment the metal reflects: a neutral grey photo studio with a large overhead
 * softbox, two tall strip lights and a low front fill. Prefiltered with PMREM.
 */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(40, 20, 40),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#6a6965'), side: THREE.BackSide }),
  );
  room.position.y = 6;
  env.add(room);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color('#c9c6bf') }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.9;
  env.add(floor);

  const panel = (w: number, h: number, intensity: number, pos: [number, number, number], look: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(...look);
    env.add(m);
  };
  panel(16, 10, 5, [0, 15.5, 2], [0, 0, 2]); // overhead softbox
  panel(3, 14, 4, [-17, 6, 4], [0, 6, 4]); // left strip
  panel(3, 14, 3.2, [17, 6, -2], [0, 6, -2]); // right strip
  panel(18, 4, 1.6, [0, 3, 19], [0, 3, 0]); // front fill, behind the camera
  panel(10, 6, 1.1, [0, 8, -19], [0, 8, 0]); // back wall bounce

  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.02).texture;
  pmrem.dispose();
  env.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      (o as THREE.Mesh).geometry.dispose();
      ((o as THREE.Mesh).material as THREE.Material).dispose();
    }
  });
  return tex;
}

export interface ComputerResources {
  geometries: Record<'body' | 'glass' | 'screen' | 'stand' | 'shadowWide' | 'shadowFoot', THREE.BufferGeometry>;
  materials: {
    aluminium: THREE.MeshPhysicalMaterial;
    glass: THREE.MeshPhysicalMaterial;
    reflection: THREE.MeshBasicMaterial;
    shadowWide: THREE.MeshBasicMaterial;
    shadowFoot: THREE.MeshBasicMaterial;
  };
  dispose(): void;
}

export function createResources(): ComputerResources {
  const { W, D, bodyH, glassH, screenW, screenH, standW } = DIM;
  const bevel = 0.04;

  const bodyShape = roundedRect(W - bevel * 2, bodyH - bevel * 2, 0.15);
  const body = new THREE.ExtrudeGeometry(bodyShape, {
    depth: D - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 8, // fully rounded edge, like machined aluminium
    curveSegments: 24,
  });
  body.translate(0, 0, -(D - bevel * 2) / 2);
  body.computeVertexNormals();

  const glassW = W - bevel * 2 - 0.01;
  const glass = normalisedShapeGeometry(roundedRect(glassW, glassH, { tl: 0.13, tr: 0.13, br: 0, bl: 0 }), glassW, glassH, 14);
  const screen = normalisedShapeGeometry(roundedRect(screenW, screenH, 0.025), screenW, screenH, 6);

  const shadowWide = new THREE.PlaneGeometry(W * 1.25, 3.4);
  shadowWide.rotateX(-Math.PI / 2);
  const shadowFoot = new THREE.PlaneGeometry(standW * 1.45, 2.0);
  shadowFoot.rotateX(-Math.PI / 2);

  const stex = shadowTexture();
  const rtex = glassReflectionTexture();

  const materials = {
    aluminium: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#eceef0'),
      metalness: 1,
      roughness: 0.22,
      anisotropy: 0.7, // bead-blasted / brushed: highlights stretch along the grain
      anisotropyRotation: Math.PI / 2,
      clearcoat: 0.12,
      clearcoatRoughness: 0.35,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#060607'),
      metalness: 0,
      roughness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      specularIntensity: 1,
    }),
    reflection: new THREE.MeshBasicMaterial({
      map: rtex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
    shadowWide: new THREE.MeshBasicMaterial({ map: stex, transparent: true, depthWrite: false, opacity: 0.38 }),
    shadowFoot: new THREE.MeshBasicMaterial({ map: stex, transparent: true, depthWrite: false, opacity: 0.7 }),
  };

  const geometries = { body, glass, screen, stand: standGeometry(), shadowWide, shadowFoot };

  return {
    geometries,
    materials,
    dispose() {
      Object.values(geometries).forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
      stex.dispose();
      rtex.dispose();
    },
  };
}

export interface ComputerInstance {
  group: THREE.Group;
  /** Rotating part. */
  object: THREE.Group;
  screen: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  screenMaterial: THREE.MeshBasicMaterial;
}

export function createComputer(res: ComputerResources): ComputerInstance {
  const { D, lift, bodyH, glassH } = DIM;
  const group = new THREE.Group();
  const object = new THREE.Group();
  group.add(object);

  const body = new THREE.Mesh(res.geometries.body, res.materials.aluminium);
  body.position.y = lift + bodyH / 2;
  body.castShadow = true;
  object.add(body);

  const glassCenterY = lift + bodyH - 0.035 - glassH / 2;
  const front = D / 2;
  const glass = new THREE.Mesh(res.geometries.glass, res.materials.glass);
  glass.position.set(0, glassCenterY, front + 0.001);
  object.add(glass);

  const screenMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color('#121214'), toneMapped: false });
  const screen = new THREE.Mesh(res.geometries.screen, screenMaterial);
  screen.position.set(0, glassCenterY, front + 0.003);
  object.add(screen);

  const reflection = new THREE.Mesh(res.geometries.glass, res.materials.reflection);
  reflection.position.set(0, glassCenterY, front + 0.005);
  reflection.renderOrder = 2;
  object.add(reflection);

  const stand = new THREE.Mesh(res.geometries.stand, res.materials.aluminium);
  stand.castShadow = true;
  object.add(stand);

  const s1 = new THREE.Mesh(res.geometries.shadowWide, res.materials.shadowWide);
  s1.position.set(0, 0.002, -0.25);
  s1.renderOrder = -1;
  const s2 = new THREE.Mesh(res.geometries.shadowFoot, res.materials.shadowFoot);
  s2.position.set(0, 0.003, -0.05);
  s2.renderOrder = -1;
  object.add(s1, s2);

  return { group, object, screen, screenMaterial };
}
