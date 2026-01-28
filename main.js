import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.176/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.176/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.176/examples/jsm/loaders/RGBELoader.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.01,
  100
);
camera.position.set(0, 1, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.physicallyCorrectLights = true;
document.body.appendChild(renderer.domElement);

// 🎥 Controles
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 🌍 Environment (MUY IMPORTANTE)
const pmrem = new THREE.PMREMGenerator(renderer);

new RGBELoader().load('./studio.hdr', (hdr) => {
  const envMap = pmrem.fromEquirectangular(hdr).texture;
  scene.environment = envMap;
  hdr.dispose();
});

// 💡 Luz de apoyo (opcional)
scene.add(new THREE.AmbientLight(0xffffff, 0.3));

// 📦 GLB
const loader = new GLTFLoader();
loader.load('./model.glb', (gltf) => {

  gltf.scene.traverse((obj) => {
    if (!obj.isMesh) return;

    const m = obj.material;
    if (!m) return;

    // 👉 Filtra por nombre del material
    if (!m.name.toLowerCase().includes('glass')) return;

    // 🔮 CRISTAL REAL
    m.transparent = true;
    m.transmission = 1.0;
    m.thickness = 0.6;
    m.roughness = 0.1;
    m.ior = 1.45;

    // 🎨 TINTE (verde botella)
    m.color.setRGB(0.1, 0.25, 0.1);

    m.depthWrite = false;
    m.side = THREE.DoubleSide;
    m.needsUpdate = true;
  });

  scene.add(gltf.scene);
});

// 🔁 Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 🔄 Loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
