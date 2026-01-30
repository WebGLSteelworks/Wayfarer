import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.176.0/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/controls/OrbitControls.js/+esm';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/loaders/GLTFLoader.js/+esm';
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/loaders/RGBELoader.js/+esm';
import { MODEL_CONFIG as SHINY } from './configs/shiny.js';
import { MODEL_CONFIG as MATTE } from './configs/matte.js';

// ─────────────────────────────────────────────
// VAR
// ─────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f2f2); // fondo blanco

const logoTexture = new THREE.TextureLoader().load('./Coperni_alpha.jpg');
logoTexture.colorSpace = THREE.SRGBColorSpace;
logoTexture.flipY = false; // importante para glTF

const cameras = {};
let activeCameraName = null;

const clock = new THREE.Clock();

let currentConfig = SHINY;
let currentModel = null;


// ─────────────────────────────
// UI FOR MODEL SELECTION
// ─────────────────────────────

const modelUI = document.createElement('div');
modelUI.style.position = 'fixed';
modelUI.style.right = '20px';
modelUI.style.top = '50%';
modelUI.style.transform = 'translateY(-50%)';
modelUI.style.display = 'flex';
modelUI.style.flexDirection = 'column';
modelUI.style.gap = '10px';
modelUI.style.zIndex = '20';

document.body.appendChild(modelUI);

function makeModelButton(label, config) {
  const btn = document.createElement('button');
  btn.textContent = label;

  btn.style.padding = '10px 16px';
  btn.style.border = 'none';
  btn.style.borderRadius = '6px';
  btn.style.cursor = 'pointer';
  btn.style.background = '#222';
  btn.style.color = '#fff';
  btn.style.fontSize = '14px';

  btn.onclick = () => {
    currentConfig = config;
    loadModel(config);
  };

  modelUI.appendChild(btn);
}


makeModelButton('Shiny', SHINY);
makeModelButton('Matte', MATTE);


// ─────────────────────────────
// LOAD GLB MODEL
// ─────────────────────────────

function loadModel(config) {

  // ───── limpiar modelo anterior
  if (currentModel) {
    scene.remove(currentModel);
    currentModel.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }

  // reset estados
  glassMaterials.length = 0;
  originalGlassColors.length = 0;
  Object.keys(cameraTargets).forEach(k => delete cameraTargets[k]);

  loader.load(config.glb, (gltf) => {

    currentModel = gltf.scene;
    scene.add(currentModel);
	
	// ───── calcular centro real del modelo
	const box = new THREE.Box3().setFromObject(currentModel);
	const modelCenter = new THREE.Vector3();
	box.getCenter(modelCenter);


    // ───── recoger cámaras
    gltf.scene.traverse(obj => {
      if (obj.isCamera) {

		  const pos = obj.getWorldPosition(new THREE.Vector3());
		  const quat = obj.getWorldQuaternion(new THREE.Quaternion());

		  const target =
			obj.name === 'Cam_Free'
			  ? modelCenter.clone()
			  : modelCenter.clone();

		  cameraTargets[obj.name] = {
			position: pos,
			quaternion: quat,
			target: target
		  };
		}

      // ───── cristal
      if (obj.isMesh && obj.material?.name?.toLowerCase().includes('glass')) {

        const mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(...config.glass.color),
          roughness: config.glass.roughness,
          metalness: config.glass.metalness,
          transparent: true,
          opacity: config.glass.opacity,
          transmission: 0.0,
          ior: 1.45,
          depthWrite: false
        });
		
		// ───── WHITE LOGO STENCIL
		mat.emissiveMap = logoTexture;
		mat.emissive = new THREE.Color(1, 1, 1);
		mat.emissiveIntensity = 0.6; // ajusta si quieres
		mat.needsUpdate = true;

        glassMaterials.push(mat);
        originalGlassColors.push(mat.color.clone());
        obj.material = mat;
      }
    });

    // arrancar en cámara inicial
    smoothSwitchCamera(config.startCamera);
  });
}


// ─────────────────────────────
// GLASS ANIMATION
// ─────────────────────────────
const glassAnim = {
  state: 'waitGreen',
  timer: 0,
  duration: 1.5 // segundos de transición
};


// ─────────────────────────────
// GLASS MAT (GLOBAL)
// ─────────────────────────────
const glassMaterials = [];
const originalGlassColors = [];



// ─────────────────────────────────────────────
// CAMERAS
// ─────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.01,
  1000
);

const cameraTargets = {};
let pendingFreeCamera = false;



// ─────────────────────────────────────────────
// ACTIVE CAMERA + TRANSITION STATE
// ─────────────────────────────────────────────

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
controls.enabled = false; 

// 🔑 CONFIGURACIÓN CORRECTA
controls.enableDamping = true;
controls.dampingFactor = 0.08;

controls.enableRotate = true;
controls.enableZoom = true;
controls.enablePan = false;

// límites razonables
controls.minDistance = 0.2;
controls.maxDistance = 10;


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
  activeCameraName = name;

  const camData = cameraTargets[name];
  if (!camData) return;

  // ───── CAM_FREE (SIN TRANSICIÓN)
  if (name === 'Cam_Free') {

    transition.active = false;

    camera.position.copy(camData.position);
    controls.target.copy(camData.target);

    camera.lookAt(controls.target);
    camera.updateMatrixWorld();

    controls.update();
    controls.enabled = true;

    return;
  }

  // ───── CAMERA TRANSITION
  controls.enabled = false; // 🔑 CLAVE

  transition.fromPos.copy(camera.position);
  transition.fromQuat.copy(camera.quaternion);

  transition.toPos.copy(camData.position);
  transition.toQuat.copy(camData.quaternion);

  transition.startTime = performance.now();
  transition.active = true;
}








// ─────────────────────────────────────────────
// LOADER
// ─────────────────────────────────────────────
const loader = new GLTFLoader();

loader.load('./model.glb', (gltf) => {
	
	// ───── FROM C4D

	gltf.scene.traverse((obj) => {
	  if (obj.isCamera) {
		cameras[obj.name] = obj;

		const pos = obj.getWorldPosition(new THREE.Vector3());
		const quat = obj.getWorldQuaternion(new THREE.Quaternion());

		// Calcular forward vector de la cámara
		const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);

		// Punto al que mira la cámara en C4D
		const target = modelCenter.clone();

		cameraTargets[obj.name] = {
		  position: pos,
		  quaternion: quat,
		  target: target
		};


	  }
	  

	});



  // ───── Ajuste de materiales (cristal)
  gltf.scene.traverse((obj) => {
    if (!obj.isMesh) return;

    const m = obj.material;
    if (!m) return;

    // Filtra por nombre de material
    if (!m.name || !m.name.toLowerCase().includes('green')) return;

    // 🔁 GLASS MATERIAL BY CODE
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
	  
  

	// 👉 WHITE LOGO STENCIL
	sunglassLensMaterial.emissiveMap = logoTexture;
	sunglassLensMaterial.emissive = new THREE.Color(1, 1, 1);
	sunglassLensMaterial.emissiveIntensity = 0.6;

	// Mantener maps originales si existen
	sunglassLensMaterial.normalMap = m.normalMap || null;
	sunglassLensMaterial.map = m.map || null;


    // Mantener maps si los hubiera
    sunglassLensMaterial.normalMap = obj.material.normalMap || null;
    sunglassLensMaterial.map = obj.material.map || null;
	
	// Guardar color original del cristal
	//glassMaterial = sunglassLensMaterial;
	glassMaterials.push(sunglassLensMaterial);
	originalGlassColors.push(sunglassLensMaterial.color.clone());

   
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
  
	// ───── Arrancar en Cam_Front
	if (cameraTargets.Cam_Front) {
	smoothSwitchCamera('Cam_Front');
	}
  

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
// LOOP ANIMATE
// ─────────────────────────────────────────────
function animate(time) {
  requestAnimationFrame(animate);

if (glassMaterials.length > 0) {

  // ❌ NO estamos en Cam_Lenses → cristal fijo
  if (activeCameraName !== 'Cam_Lenses') {

    glassMaterials.forEach((mat, i) => {
      mat.color.copy(originalGlassColors[i]);
    });

    glassAnim.state = 'waitGreen';
    glassAnim.timer = 0;
  }

  // ✅ GLASS ANIMATION
  else {
    const delta = clock.getDelta();
    glassAnim.timer += delta;

    glassMaterials.forEach((mat, i) => {
      const originalColor = originalGlassColors[i];

      switch (glassAnim.state) {

        case 'waitGreen':
          if (glassAnim.timer > 2) {
            glassAnim.timer = 0;
            glassAnim.state = 'toClear';
          }
          break;

        case 'toClear': {
          const t = Math.min(glassAnim.timer / glassAnim.duration, 1);
          const ease = t * t * (3 - 2 * t);

          mat.color.lerpColors(
            originalColor,
            new THREE.Color(1, 1, 1),
            ease
          );

          if (t >= 1) {
            glassAnim.timer = 0;
            glassAnim.state = 'waitClear';
          }
          break;
        }

        case 'waitClear':
          if (glassAnim.timer > 2) {
            glassAnim.timer = 0;
            glassAnim.state = 'toGreen';
          }
          break;

        case 'toGreen': {
          const t = Math.min(glassAnim.timer / glassAnim.duration, 1);
          const ease = t * t * (3 - 2 * t);

          mat.color.lerpColors(
            new THREE.Color(1, 1, 1),
            originalColor,
            ease
          );

          if (t >= 1) {
            glassAnim.timer = 0;
            glassAnim.state = 'waitGreen';
          }
          break;
        }
      }
    });
  }
}


  
  
	if (transition.active) {

	  const elapsed = (time - transition.startTime) / 1000;
	  const t = Math.min(elapsed / transition.duration, 1);
	  const ease = t * t * (3 - 2 * t);

	  camera.position.lerpVectors(
		transition.fromPos,
		transition.toPos,
		ease
	  );

	  // 🔑 SOLO cámaras fijas interpolan rotación
	  if (activeCameraName !== 'Cam_Free') {
		camera.quaternion
		  .copy(transition.fromQuat)
		  .slerp(transition.toQuat, ease);
	  }

	  if (t >= 1) {
		transition.active = false;
	  }
	}




  if (controls.enabled) {
	  controls.update();
  }

  renderer.render(scene, camera);

}

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


loadModel(currentConfig);
animate();




















