import {
  AnimationMixer,
  Box3,
  DirectionalLight,
  Euler,
  HemisphereLight,
  type Mesh,
  MathUtils,
  type Object3D,
  OrthographicCamera,
  Quaternion,
  SRGBColorSpace,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { FIGURES, type FigureSpec } from './figures';

const SIZE = 512;
const VIEW = 3.4;
const GROUND = 0.06;
const OUTLINE = 5;
const INK = '#22301f';
const BODY = /_(Arm|Body|Head|Leg|Cape|Hat|Helmet)/;

const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF>>();
const load = (url: string) => {
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url));
  return cache.get(url)!;
};

const renderer = new WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(SIZE, SIZE);
renderer.outputColorSpace = SRGBColorSpace;

// Feet sit GROUND up from the bottom edge, seen from slightly above.
const camera = new OrthographicCamera(-VIEW / 2, VIEW / 2, VIEW / 2, -VIEW / 2, 0.1, 100);
const focus = new Vector3(0, VIEW * (0.5 - GROUND), 0);
camera.position.set(0, focus.y + 10 * Math.sin(0.17), 10 * Math.cos(0.17));
camera.lookAt(focus);

const scene = new Scene();
scene.add(new HemisphereLight(0xfff4dc, 0x3a4a30, 2.4));
const sun = new DirectionalLight(0xffffff, 2.2);
sun.position.set(-3, 6, 5);
scene.add(sun);

const outlined = (source: HTMLCanvasElement): Promise<Blob> => {
  const ink = document.createElement('canvas');
  ink.width = ink.height = SIZE;
  const inkContext = ink.getContext('2d')!;
  inkContext.drawImage(source, 0, 0);
  inkContext.globalCompositeOperation = 'source-in';
  inkContext.fillStyle = INK;
  inkContext.fillRect(0, 0, SIZE, SIZE);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const context = canvas.getContext('2d')!;
  for (let step = 0; step < 16; step++) {
    const angle = (step / 16) * Math.PI * 2;
    context.drawImage(ink, Math.cos(angle) * OUTLINE, Math.sin(angle) * OUTLINE);
  }
  context.drawImage(source, 0, 0);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/webp', 0.9));
};

const render = async (figure: FigureSpec) => {
  const gltf = await load(`/Characters/gltf/${figure.character}.glb`);
  const model = clone(gltf.scene);
  model.traverse((node) => {
    if (!(node as Mesh).isMesh) return;
    node.frustumCulled = false;
    if (!BODY.test(node.name) && !figure.show.includes(node.name)) node.visible = false;
  });
  const turned: { prop: Object3D; world: [number, number, number] }[] = [];
  for (const extra of figure.extra ?? []) {
    const prop = (await load(`/Assets/gltf/${extra.asset}.gltf`)).scene.clone();
    model.getObjectByName(`handslot${extra.hand}`)!.add(prop);
    if (extra.world) turned.push({ prop, world: extra.world });
  }

  const clip = gltf.animations.find((animation) => animation.name === figure.clip);
  if (!clip) throw new Error(`${figure.character} has no ${figure.clip} animation`);
  const mixer = new AnimationMixer(model);
  mixer.clipAction(clip).play();
  mixer.setTime(clip.duration * figure.at);
  model.rotation.y = ((figure.turn ?? 40) * Math.PI) / 180;

  scene.add(model);
  model.updateMatrixWorld(true);
  for (const { prop, world } of turned) {
    const wanted = new Quaternion().setFromEuler(new Euler(...world.map((degrees) => MathUtils.degToRad(degrees))));
    prop.quaternion.copy(prop.parent!.getWorldQuaternion(new Quaternion()).invert().multiply(wanted));
  }
  model.updateMatrixWorld(true);
  renderer.render(scene, camera);
  const height = new Box3().setFromObject(model).getSize(new Vector3()).y;
  scene.remove(model);
  return { blob: await outlined(renderer.domElement), height };
};

const status = document.getElementById('status')!;
const grid = document.getElementById('grid')!;
const only = new URLSearchParams(location.search).get('only');

for (const figure of FIGURES.filter((f) => !only || f.name === only)) {
  status.textContent = `Rendering ${figure.name}…`;
  const { blob, height } = await render(figure);
  await fetch(`/save/${figure.name}.webp`, { method: 'POST', body: blob });
  const card = document.createElement('figure');
  const image = new Image();
  image.src = URL.createObjectURL(blob);
  const caption = document.createElement('figcaption');
  caption.textContent = `${figure.name} · ${(blob.size / 1024).toFixed(0)} KB · h ${height.toFixed(2)}`;
  card.append(image, caption);
  grid.append(card);
}
status.textContent = 'Done';
