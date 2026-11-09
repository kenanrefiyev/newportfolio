import * as THREE from 'three';
import { DIM, createComputer, createResources, createStudioEnvironment, type ComputerInstance, type ComputerResources } from './computer-model';

/*
 * One WebGL canvas that renders the whole shelf of computers.
 *
 * Two numbers drive everything:
 *  - `intro` (0 … 1): 0 is a close three-quarter product shot of the first computer,
 *    1 is the full shelf. Scroll scrubs it on desktop; on touch screens it plays once.
 *  - `p` (0 … n-1): shelf position. The computer at index i sits at d = i - p.
 * Inputs only ever set targets; the scene eases toward them, so every input feels the same.
 */

export type GalleryMode = 'shelf' | 'swipe';

export interface SceneProject {
  id: string;
  texture: string;
  scrollTexture: { src: string; width: number; height: number } | null;
}

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  projects: SceneProject[];
  mode: GalleryMode;
  reducedMotion: boolean;
  onSelect: (index: number) => void;
  onScreenHover: (hovering: boolean) => void;
}

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Item extends ComputerInstance {
  index: number;
  texture: THREE.Texture | null;
  scrollTexture: THREE.Texture | null;
  loading: boolean;
  dim: number;
}

interface Pose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

const tmpV = new THREE.Vector3();
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class ComputerScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(26, 1, 0.1, 200);
  private res: ComputerResources;
  private items: Item[] = [];
  private loader = new THREE.TextureLoader();
  private opts: SceneOptions;
  private mode: GalleryMode;
  private key: THREE.DirectionalLight;

  private p = 0;
  private target = 0;
  private intro = 0;
  private introTarget = 0;
  private shelfPose: Pose = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  private introPose: Pose = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  private selected = -1;
  private raf = 0;
  private last = 0;
  private active = true;
  private dirty = true;
  private width = 1;
  private height = 1;

  // look-through-the-screen state
  private pointer: { x: number; y: number } | null = null;
  private look = 0;
  private lookTarget = 0;
  private lookIndex = -1;
  private hovering = false;
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private disposed = false;

  constructor(opts: SceneOptions) {
    this.opts = opts;
    this.mode = opts.mode;
    this.renderer = new THREE.WebGLRenderer({ canvas: opts.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.environment = createStudioEnvironment(this.renderer);
    this.scene.environmentIntensity = 1.0;

    // key light: soft shadow on the paper floor, a highlight along the aluminium
    this.key = new THREE.DirectionalLight(0xffffff, 1.4);
    this.key.position.set(-5, 14, 9);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.radius = 7;
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    const sc = this.key.shadow.camera;
    sc.left = -20;
    sc.right = 20;
    sc.top = 12;
    sc.bottom = -12;
    sc.near = 1;
    sc.far = 40;
    this.scene.add(this.key, this.key.target);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.ShadowMaterial({ color: 0x1a1712, opacity: 0.16 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.res = createResources();
    opts.projects.forEach((_, index) => {
      const c = createComputer(this.res);
      this.scene.add(c.group);
      this.items.push({ ...c, index, texture: null, scrollTexture: null, loading: false, dim: 1 });
    });

    // touch screens have no scroll-driven intro: it plays once on arrival
    if (this.mode === 'swipe' || opts.reducedMotion) this.intro = this.introTarget = opts.reducedMotion ? 1 : 0;
    if (this.mode === 'swipe' && !opts.reducedMotion) window.setTimeout(() => this.setIntro(1), 350);

    this.resize();
    this.layout();
    this.loadTextures();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  /* ---------------------------------------------------------------- public API */

  setMode(mode: GalleryMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode === 'swipe') this.setIntro(1);
    this.resize();
  }

  /** Ease toward shelf position p. */
  setTarget(p: number) {
    const clamped = Math.max(0, Math.min(this.items.length - 1, p));
    if (clamped !== this.target) {
      this.target = clamped;
      this.dirty = true;
    }
  }

  /** Ease toward intro progress (0 = close-up, 1 = shelf). */
  setIntro(v: number) {
    const c = Math.max(0, Math.min(1, v));
    if (c !== this.introTarget) {
      this.introTarget = c;
      this.dirty = true;
    }
  }

  getTarget() {
    return this.target;
  }

  /** Move instantly (returning from the overlay, reduced motion). */
  jump(p: number, intro?: number) {
    this.target = this.p = Math.max(0, Math.min(this.items.length - 1, p));
    if (intro !== undefined) this.intro = this.introTarget = intro;
    this.dirty = true;
    this.layout();
    this.emitSelection();
    this.render();
  }

  setActive(active: boolean) {
    if (active === this.active) return;
    this.active = active;
    if (active) {
      this.last = performance.now();
      this.dirty = true;
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  setPointer(clientX: number | null, clientY?: number) {
    this.pointer = clientX === null ? null : { x: clientX, y: clientY ?? 0 };
    this.dirty = true;
  }

  resize() {
    const rect = this.opts.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    const dprCap = this.mode === 'swipe' ? 1.75 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    this.renderer.setSize(this.width, this.height, false);
    this.fitCamera();
    this.dirty = true;
  }

  hitTest(clientX: number, clientY: number): number | null {
    this.setNdc(clientX, clientY);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects(
      this.items.filter((it) => it.group.visible).map((it) => it.object),
      true,
    );
    for (const h of hits) {
      const m = (h.object as THREE.Mesh).material;
      if (m === this.res.materials.shadowWide || m === this.res.materials.shadowFoot) continue;
      const item = this.items.find((it) => it.object === h.object.parent);
      if (item) return item.index;
    }
    return null;
  }

  /** Bounding box of a computer's screen in viewport (CSS) pixels. */
  screenRect(index: number): ScreenRect | null {
    const item = this.items[index];
    if (!item) return null;
    this.scene.updateMatrixWorld();
    const { screenW, screenH } = DIM;
    const rect = this.opts.canvas.getBoundingClientRect();
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      tmpV.set((sx * screenW) / 2, (sy * screenH) / 2, 0).applyMatrix4(item.screen.matrixWorld).project(this.camera);
      const x = rect.left + ((tmpV.x + 1) / 2) * rect.width;
      const y = rect.top + ((1 - tmpV.y) / 2) * rect.height;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.items.forEach((it) => {
      it.texture?.dispose();
      it.scrollTexture?.dispose();
      it.screenMaterial.dispose();
    });
    this.res.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }

  /* ---------------------------------------------------------------- internals */

  private tick = (now: number) => {
    if (this.disposed) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    const diff = this.target - this.p;
    if (Math.abs(diff) > 0.0004) {
      const k = this.opts.reducedMotion ? 30 : this.mode === 'swipe' ? 10 : 8.5;
      this.p += diff * (1 - Math.exp(-k * dt));
      this.dirty = true;
    } else if (diff !== 0) {
      this.p = this.target;
      this.dirty = true;
    }

    const idiff = this.introTarget - this.intro;
    if (Math.abs(idiff) > 0.0005) {
      // scroll is already smoothed by Lenis on desktop; the touch intro plays slower, like a camera move
      const k = this.opts.reducedMotion ? 40 : this.mode === 'swipe' ? 1.9 : 9;
      this.intro += idiff * (1 - Math.exp(-k * dt));
      this.dirty = true;
    } else if (idiff !== 0) {
      this.intro = this.introTarget;
      this.dirty = true;
    }

    this.updateLook(dt);

    if (this.dirty) {
      this.layout();
      this.emitSelection();
      this.render();
      this.dirty = false;
    }
    if (this.active) this.raf = requestAnimationFrame(this.tick);
  };

  private emitSelection() {
    const sel = Math.round(this.p);
    if (sel !== this.selected) {
      this.selected = sel;
      this.opts.onSelect(sel);
      this.prioritiseTextures();
    }
  }

  /** Computes the two camera poses for the current viewport. */
  private fitCamera() {
    const aspect = this.width / this.height;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const { W, totalH } = DIM;
    const wide = this.mode === 'shelf';
    const portrait = aspect < 0.8;

    // shelf: the selected computer takes a fixed share of the viewport
    const wFrac = wide ? (aspect > 2 ? 0.32 : 0.375) : portrait ? 0.86 : 0.5;
    const hFrac = wide ? 0.58 : portrait ? 0.45 : 0.52;
    const visibleH = Math.max(W / wFrac / aspect, totalH / hFrac);
    const dist = visibleH / 2 / tan;
    const centreFrac = wide ? 0.42 : portrait ? 0.37 : 0.42;
    const lookY = totalH / 2 - (0.5 - centreFrac) * visibleH;
    this.shelfPose.pos.set(0, lookY + 0.55, dist);
    this.shelfPose.look.set(0, lookY, 0);

    // intro: a close three-quarter product shot, the computer on the right, room for the name on the left
    const centre = new THREE.Vector3(0, DIM.lift + DIM.bodyH * 0.52, 0);
    const angle = portrait ? 0.38 : 0.52;
    const introDist = portrait ? dist * 0.66 : dist * 0.6;
    const pos = new THREE.Vector3(Math.sin(angle) * introDist, centre.y + (portrait ? 0.9 : 0.55), Math.cos(angle) * introDist);
    const right = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
    const halfW = tan * introDist * aspect;
    const halfH = tan * introDist;
    const look = centre.clone();
    if (portrait) look.y += halfH * 0.42; // computer sits low, the name above it
    else look.addScaledVector(right, -halfW * 0.44); // computer sits right
    this.introPose.pos.copy(pos);
    this.introPose.look.copy(look);
    this.applyCamera();
  }

  private applyCamera() {
    const t = easeInOut(this.intro);
    tmpV.copy(this.introPose.pos).lerp(this.shelfPose.pos, t);
    this.camera.position.copy(tmpV);
    tmpV.copy(this.introPose.look).lerp(this.shelfPose.look, t);
    this.camera.lookAt(tmpV);
  }

  /** Place every computer for the current shelf position and intro progress. */
  private layout() {
    this.applyCamera();
    const { W } = DIM;
    const wide = this.mode === 'shelf';
    const g1 = wide ? W * 1.16 : W * 1.06;
    const g2 = wide ? W * 0.9 : W * 0.95;
    const z1 = wide ? 1.7 : 1.2;
    const z2 = wide ? 1.25 : 1.0;
    // during the intro the neighbours wait outside the room and slide in as the camera retreats
    const spread = smooth(0.25, 1, this.intro);
    const away = (1 - spread) * W * 2.2;
    for (const it of this.items) {
      const d = it.index - this.p;
      const ad = Math.abs(d);
      const s = Math.sign(d);
      const near = Math.min(ad, 1);
      const far = Math.max(ad - 1, 0);
      it.group.position.set(s * (near * g1 + far * g2 + (ad > 0.5 ? away * Math.min(ad, 2) : 0)), 0, -(near * z1 + far * z2));
      it.object.rotation.y = -s * (near * 0.42 + Math.min(far, 1.5) * 0.08) * (0.4 + 0.6 * spread);
      it.group.visible = ad < (wide ? 4.6 : 2.6) && (spread > 0.02 || ad < 0.5);
      const dim = 1 - near * 0.18 - Math.min(far, 2) * 0.06;
      if (Math.abs(dim - it.dim) > 0.001) {
        it.dim = dim;
        if (it.texture || it.scrollTexture) it.screenMaterial.color.setScalar(dim);
      }
    }
    // keep the key light's shadow frustum centred on what is in view
    this.key.target.position.set(0, 0, -1);
    this.key.target.updateMatrixWorld();
  }

  private setNdc(clientX: number, clientY: number) {
    const rect = this.opts.canvas.getBoundingClientRect();
    this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  }

  /** Signature move: the pointer's height over the selected screen scrolls the real site inside it. */
  private updateLook(dt: number) {
    const sel = Math.round(this.p);
    const settled = Math.abs(this.p - sel) < 0.02 && Math.abs(this.target - sel) < 0.02 && this.intro > 0.98;
    let hovering = false;

    if (this.pointer && settled && this.mode === 'shelf') {
      const item = this.items[sel];
      this.setNdc(this.pointer.x, this.pointer.y);
      this.raycaster.setFromCamera(this.ndc, this.camera);
      const hit = this.raycaster.intersectObject(item.screen, false)[0];
      if (hit?.uv) {
        hovering = true;
        const v = 1 - hit.uv.y;
        this.lookTarget = Math.max(0, Math.min(1, (v - 0.12) / 0.76));
        if (this.lookIndex !== sel) this.beginLook(sel);
      }
    }
    if (!hovering) this.lookTarget = 0;
    if (hovering !== this.hovering) {
      this.hovering = hovering;
      this.opts.onScreenHover(hovering);
    }

    const item = this.lookIndex >= 0 ? this.items[this.lookIndex] : null;
    if (!item) return;
    const diff = this.lookTarget - this.look;
    if (Math.abs(diff) > 0.0005) {
      this.look += diff * (1 - Math.exp(-(this.opts.reducedMotion ? 40 : 6) * dt));
      this.applyLook(item);
      this.dirty = true;
    } else if (!hovering && this.look !== 0) {
      this.look = 0;
      this.applyLook(item);
      this.dirty = true;
    }
    if (!hovering && this.look === 0 && (this.lookIndex !== sel || !this.pointer)) this.endLook();
  }

  private beginLook(index: number) {
    this.endLook();
    this.lookIndex = index;
    this.look = 0;
    const item = this.items[index];
    const src = this.opts.projects[index].scrollTexture;
    if (!src) return;
    this.loader.load(src.src, (tex) => {
      if (this.disposed) return tex.dispose();
      this.prepare(tex);
      tex.wrapT = THREE.ClampToEdgeWrapping;
      item.scrollTexture = tex;
      if (this.lookIndex === index) this.useScrollTexture(item);
      else tex.dispose();
    });
  }

  private useScrollTexture(item: Item) {
    if (!item.scrollTexture) return;
    item.screenMaterial.map = item.scrollTexture;
    item.screenMaterial.color.setScalar(item.dim);
    item.screenMaterial.needsUpdate = true;
    this.applyLook(item);
    this.dirty = true;
  }

  private applyLook(item: Item) {
    const tex = item.screenMaterial.map;
    if (!tex || tex !== item.scrollTexture) return;
    const src = this.opts.projects[item.index].scrollTexture!;
    const visible = Math.min(1, src.width / 1.6 / src.height);
    tex.repeat.set(1, visible);
    tex.offset.set(0, (1 - visible) * (1 - this.look));
  }

  private endLook() {
    if (this.lookIndex < 0) return;
    const item = this.items[this.lookIndex];
    if (item.texture && item.screenMaterial.map !== item.texture) {
      item.screenMaterial.map = item.texture;
      item.screenMaterial.needsUpdate = true;
      this.dirty = true;
    }
    item.scrollTexture?.dispose(); // only one tall texture is ever resident
    item.scrollTexture = null;
    this.lookIndex = -1;
    this.look = 0;
  }

  private prepare(tex: THREE.Texture) {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
  }

  private queue: number[] = [];
  private inFlight = 0;

  private loadTextures() {
    this.prioritiseTextures();
  }

  /** Nearest computers first; at most three requests at a time. */
  private prioritiseTextures() {
    const centre = Math.round(this.target);
    this.queue = this.items
      .filter((it) => !it.texture && !it.loading)
      .map((it) => it.index)
      .sort((a, b) => Math.abs(a - centre) - Math.abs(b - centre));
    this.pump();
  }

  private pump() {
    while (this.inFlight < 3 && this.queue.length) {
      const index = this.queue.shift()!;
      const item = this.items[index];
      if (item.texture || item.loading) continue;
      item.loading = true;
      this.inFlight++;
      this.loader.load(
        this.opts.projects[index].texture,
        (tex) => {
          this.inFlight--;
          item.loading = false;
          if (this.disposed) return tex.dispose();
          this.prepare(tex);
          item.texture = tex;
          if (this.lookIndex !== index) {
            item.screenMaterial.map = tex;
            item.screenMaterial.color.setScalar(item.dim);
            item.screenMaterial.needsUpdate = true;
          }
          this.dirty = true;
          this.pump();
        },
        undefined,
        () => {
          this.inFlight--;
          item.loading = false;
          this.pump();
        },
      );
    }
  }
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
