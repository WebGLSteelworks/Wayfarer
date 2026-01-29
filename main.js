import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/controls/OrbitControls.js/+esm';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/loaders/GLTFLoader.js/+esm';
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/loaders/RGBELoader.js/+esm';

// ─────────────────────────────────────────────
// SCENE
// ─────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f2f2); // fondo blanco

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
scene.add(new THREE.AmbientLight(0xffffff, 3.0));
const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// ─────────────────────────────────────────────
// ENVIRONMENT
// ─────────────────────────────────────────────
const pmrem = new THREE.PMREMGenerator(renderer);

new RGBELoader().load('./studio.hdr', (hdr) => {
  const envMap = pmrem.fromEquirectangular(hdr).texture;
  scene.environment = envMap;
  scene.environmentIntensity = 0.5;
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
    if (!m.name || !m.name.toLowerCase().includes('green')) return;

    // 🔁 FORZAR MATERIAL FÍSICO REAL
    const sunglassLensMaterial = new THREE.MeshPhysicalMaterial({
		color: new THREE.Color(0.12, 0.13, 0.05), // verde oliva Ray-Ban

		roughness: 0.03,
		metalness: 0.2,

		transparent: true,
		opacity: 0.9,
		transmission: 0.0,

		ior: 1.45,
		reflectivity: 0.0,

		side: THREE.FrontSide,
		depthWrite: false
	  });


    // Mantener maps si los hubiera
    sunglassLensMaterial.normalMap = obj.material.normalMap || null;
    sunglassLensMaterial.map = obj.material.map || null;
    
    // Asignar material nuevo
    obj.material = sunglassLensMaterial;


    m.transparent = true;
    m.transmission = 1.0;
    m.thickness = 1.0;
    m.roughness = 0.1;
    m.ior = 1.45;

    // Tinte verde botella (ajusta a tu gusto)
    m.color.setRGB(1, 1, 1);

    // Volumetric tint
    m.attenuationColor = new THREE.Color(1, 0, 0); // verde botella
    m.attenuationDistance = 0.05; // controla intensidad del color

    m.depthWrite = false;
    m.side = THREE.FrontSide;
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




















