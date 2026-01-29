import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/controls/OrbitControls.js/+esm';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/loaders/GLTFLoader.js/+esm';
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/loaders/RGBELoader.js/+esm';

// ─────────────────────────────────────────────
// VAR
// ─────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f2f2); // fondo blanco

const logoTexture = new THREE.TextureLoader().load('./Coperni_alpha.jpg');
logoTexture.colorSpace = THREE.SRGBColorSpace;
logoTexture.flipY = false; // importante para glTF

const cameras = {};


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
// ACTIVE CAMERA + TRANSITION STATE
// ─────────────────────────────────────────────
let activeCamera = camera;

let transition = {
  active: false,
  startTime: 0,
  duration: 0.8,
  fromPos: new THREE.Vector3(),
  toPos: new THREE.Vector3(),
  fromQuat: new THREE.Quaternion(),
  toQuat: new THREE.Quaternion()
};



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

function smoothSwitchCamera(name) {
  const target = cameras[name];
  if (!target) {
    console.warn('Camera not found:', name);
    return;
  }

  // Guardar estado inicial
  transition.fromPos.copy(activeCamera.position);
  transition.fromQuat.copy(activeCamera.quaternion);

  // Copiar estado DESTINO desde la cámara del GLB
  transition.toPos.copy(target.getWorldPosition(new THREE.Vector3()));
  transition.toQuat.copy(target.getWorldQuaternion(new THREE.Quaternion()));

  transition.startTime = performance.now();
  transition.active = true;

  // 👉 SOLO Cam_Free permite interacción
  if (name === 'Cam_Free') {
    controls.enabled = true;
  } else {
    controls.enabled = false;
  }
}





// ─────────────────────────────────────────────
// LOAD MODEL
// ─────────────────────────────────────────────
const loader = new GLTFLoader();

loader.load('./model.glb', (gltf) => {
	
	// ───── RECOGER CAMARAS EXPORTADAS DESDE C4D
	gltf.scene.traverse((obj) => {
	  if (obj.isCamera) {
		cameras[obj.name] = obj;
	  }
	});


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

	// 👉 LOGO BLANCO SERIGRAFIADO (AQUÍ SÍ)
	sunglassLensMaterial.emissiveMap = logoTexture;
	sunglassLensMaterial.emissive = new THREE.Color(1, 1, 1);
	sunglassLensMaterial.emissiveIntensity = 0.6;

	// Mantener maps originales si existen
	sunglassLensMaterial.normalMap = m.normalMap || null;
	sunglassLensMaterial.map = m.map || null;


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
  
  // ───── USAR CAMARA POR DEFECTO
	if (cameras.Cam_Front) {
	  activeCamera = cameras.Cam_Front;
	  activeCamera.aspect = window.innerWidth / window.innerHeight;
	  activeCamera.updateProjectionMatrix();

	  controls.object = activeCamera;
	  controls.update();
	}


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

	function switchCamera(name) {
	  const cam = cameras[name];
	  if (!cam) {
		console.warn(`Camera not found: ${name}`);
		return;
	  }

	  activeCamera = cam;
	  activeCamera.aspect = window.innerWidth / window.innerHeight;
	  activeCamera.updateProjectionMatrix();

	  controls.object = activeCamera;
	  controls.update();
	}



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
function animate(time) {
  requestAnimationFrame(animate);

  if (transition.active) {
    const elapsed = (time - transition.startTime) / 1000;
    const t = Math.min(elapsed / transition.duration, 1);

    // Ease in-out suave
    const ease = t * t * (3 - 2 * t);

    // Interpolar posición
    activeCamera.position.lerpVectors(
      transition.fromPos,
      transition.toPos,
      ease
    );

    // Interpolar rotación (FORMA CORRECTA r176)
    activeCamera.quaternion
      .copy(transition.fromQuat)
      .slerp(transition.toQuat, ease);

    if (t >= 1) {
      transition.active = false;
    }
  }

  controls.update();
  renderer.render(scene, activeCamera);
}
animate();




// ─────────────────────────────────────────────
// CAMERA BUTTONS UI
// ─────────────────────────────────────────────
const ui = document.createElement('div');
ui.style.position = 'fixed';
ui.style.bottom = '20px';
ui.style.left = '50%';
ui.style.transform = 'translateX(-50%)';
ui.style.display = 'flex';
ui.style.gap = '10px';
ui.style.zIndex = '10';

document.body.appendChild(ui);

const cameraButtons = [
  { label: 'Front', name: 'Cam_Front' },
  { label: 'Side', name: 'Cam_Side' },
  { label: 'Camera', name: 'Cam_Camera' },
  { label: 'Capture', name: 'Cam_Capture' },
  { label: 'Power', name: 'Cam_Power' },
  { label: 'Lenses', name: 'Cam_Lenses' },
  { label: 'Free', name: 'Cam_Free' }
];

cameraButtons.forEach(({ label, name }) => {
  const btn = document.createElement('button');
  btn.textContent = label;

  btn.style.padding = '8px 14px';
  btn.style.border = 'none';
  btn.style.borderRadius = '6px';
  btn.style.cursor = 'pointer';
  btn.style.background = '#111';
  btn.style.color = '#fff';
  btn.style.fontSize = '13px';

  btn.addEventListener('click', () => smoothSwitchCamera(name));
  ui.appendChild(btn);
});



animate();




















