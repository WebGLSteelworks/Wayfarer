import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/controls/OrbitControls.js/+esm';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/loaders/GLTFLoader.js/+esm';
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/loaders/RGBELoader.js/+esm';

// ─────────────────────────────────────────────
// SCENE
// ─────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // fondo blanco

// ─────────────────────────────────────────────
// CAMERA
// ─────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.01,
  1000
);

// ─────────────────────────────────────────────
// RENDERER
// ─────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.physicallyCorrectLights = true;
document.body.appendChild(renderer.domElement);

// ─────────────────────────────────────────────
// CONTROLS
// ─────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ─────────────────────────────────────────────
// LIGHTING
// ─────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 1.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// ─────────────────────────────────────────────
// ENVIRONMENT
// ─────────────────────────────────────────────
const pmrem = new THREE.PMREMGenerator(renderer);

new RGBELoader().load('./studio.hdr', (hdr) => {
  const envMap = pmrem.fromEquirectangular(hdr).texture;
  scene.environment = envMap;
  scene.environmentIntensity = 2.0;
  hdr.dispose();
});

// ─────────────────────────────────────────────
// LOAD MODEL
// ─────────────────────────────────────────────
const loader = new GLTFLoader();

loader.load('./model.glb', (gltf) => {

  // ───── Ajuste de materiales (cristal)
  gltf.scene.traverse((obj) => {
    if (!obj.isMesh) return;

    const m = obj.material;
    if (!m) return;

    // Filtra por nombre de material
    if (!m.name || !m.name.toLowerCase().includes('glass')) return;

    m.transparent = true;
    m.transmission = 1.0;
    m.thickness = 0.6;
    m.roughness = 0.1;
    m.ior = 1.45;

    // Tinte verde botella (ajusta a tu gusto)
    m.color.setRGB(1, 1, 1);

    // Volumetric tint
    m.attenuationColor = new THREE.Color(0.1, 0.25, 0.1); // verde botella
    m.attenuationDistance = 1.2; // controla intensidad del color

    m.depthWrite = false;
    m.side = THREE.DoubleSide;
    m.needsUpdate = true;
  });

  scene.add(gltf.scene);

  // ───── AUTOMATIC FRAMING
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // Centrar modelo en el origen
  gltf.scene.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  cameraZ *= 1.4; // margen

  camera.position.set(0, maxDim * 0.4, cameraZ);
  camera.lookAt(0, 0, 0);

  controls.target.set(0, 0, 0);
  controls.update();

  camera.near = cameraZ / 100;
  camera.far = cameraZ * 100;
  camera.updateProjectionMatrix();
});

// ─────────────────────────────────────────────
// RESIZE
// ─────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─────────────────────────────────────────────
// LOOP
// ─────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();




