/**
 * Lumina Fleet — Isometric Three.js scene
 * Orthographic isometric camera + factory drop-off + interactive van
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* ═══════════════════════════════════════════════════════════
   ISOMETRIC CAMERA MATH
   ─────────────────────────────────────────────────────────
   True isometric (equal foreshortening on X/Y/Z):
     • Azimuth (Y)  = 45°  = π/4
     • Elevation (X)= arctan(1/√2) ≈ 35.264°

   From a camera looking down -Z, we rotate:
     1) pitch around X by ISO_ELEVATION
     2) yaw around Y by ISO_AZIMUTH
   Or equivalently place the eye at:
     x = d · sin(azimuth) · cos(elevation)
     y = d · sin(elevation)
     z = d · cos(azimuth) · cos(elevation)
   then lookAt(target). OrthographicCamera removes perspective
   foreshortening so the view stays strictly isometric.
   ═══════════════════════════════════════════════════════════ */
const ISO_AZIMUTH = Math.PI / 4; // 45°
const ISO_ELEVATION = Math.atan(1 / Math.SQRT2); // ≈ 35.264°
const CAMERA_DISTANCE = 42;
const FRUSTUM_SIZE = 28; // world units visible vertically at zoom=1

/** Optional external van model. Leave empty to use procedural mesh. */
const VAN_GLTF_URL = ""; // e.g. "./models/commuter-van.gltf"

const VAN_DATA = {
  route: "สาย A — นิคมบางปะอิน",
  shift: "เช้า 05:30 – 06:15",
  driver: "สมชาย พิทักษ์ · ป้ายเหลือง",
  seats: "6 / 14",
  plate: "กข 4521",
  status: "พร้อมวิ่ง",
};

/* ── DOM ── */
const canvas = document.getElementById("iso-canvas");
const loaderEl = document.getElementById("loader");
const vanCard = document.getElementById("van-card");
const cardClose = document.getElementById("card-close");
const btnFocusVan = document.getElementById("btn-focus-van");
const btnBook = document.getElementById("btn-book");

/* ── Renderer ── */
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2834);
scene.fog = new THREE.Fog(0x1a2834, 55, 110);

/* ── Orthographic isometric camera ── */
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
updateOrthoFrustum();
placeIsometricCamera(camera, new THREE.Vector3(0, 1.2, 0), CAMERA_DISTANCE);
camera.up.set(0, 1, 0);

/**
 * Place camera at classic isometric angles relative to a look-at target.
 */
function placeIsometricCamera(cam, target, distance) {
  const x = distance * Math.sin(ISO_AZIMUTH) * Math.cos(ISO_ELEVATION);
  const y = distance * Math.sin(ISO_ELEVATION);
  const z = distance * Math.cos(ISO_AZIMUTH) * Math.cos(ISO_ELEVATION);
  cam.position.set(target.x + x, target.y + y, target.z + z);
  cam.lookAt(target);
}

/**
 * Keep orthographic frustum aspect-correct on resize / zoom.
 * left/right scale with aspect so objects do not stretch.
 */
function updateOrthoFrustum() {
  const aspect = window.innerWidth / window.innerHeight;
  const halfH = FRUSTUM_SIZE / 2;
  const halfW = halfH * aspect;
  camera.left = -halfW;
  camera.right = halfW;
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.updateProjectionMatrix();
}

/* ── Lights ── */
const ambient = new THREE.AmbientLight(0xb8c8d8, 0.45);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0xd8e6f2, 0x3a4a3a, 0.35);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2dd, 1.35);
sun.position.set(18, 28, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 80;
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.03;
scene.add(sun);

const fill = new THREE.DirectionalLight(0x8eb4d8, 0.35);
fill.position.set(-12, 10, -8);
scene.add(fill);

/* ── Materials ── */
const matAsphalt = new THREE.MeshStandardMaterial({
  color: 0x3a4450,
  roughness: 0.92,
  metalness: 0.05,
});
const matConcrete = new THREE.MeshStandardMaterial({
  color: 0x7a8694,
  roughness: 0.88,
  metalness: 0.08,
});
const matMarking = new THREE.MeshStandardMaterial({
  color: 0xe8d48a,
  roughness: 0.7,
  metalness: 0.05,
  emissive: 0x3a3010,
  emissiveIntensity: 0.15,
});
const matGrass = new THREE.MeshStandardMaterial({
  color: 0x3d5a45,
  roughness: 1,
  metalness: 0,
});
const matBuilding = new THREE.MeshStandardMaterial({
  color: 0x5c6b7a,
  roughness: 0.75,
  metalness: 0.15,
});
const matAccent = new THREE.MeshStandardMaterial({
  color: 0xc4860f,
  roughness: 0.55,
  metalness: 0.2,
});
const matGlassTint = new THREE.MeshStandardMaterial({
  color: 0x1a3040,
  roughness: 0.25,
  metalness: 0.4,
  transparent: true,
  opacity: 0.75,
});

/* ── Environment: parking / drop-off zone ── */
const environment = new THREE.Group();
environment.name = "Environment";
scene.add(environment);

function addBox(parent, w, h, d, mat, x, y, z, cast = true, receive = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

// Ground pad
const ground = new THREE.Mesh(new THREE.BoxGeometry(48, 0.4, 36), matAsphalt);
ground.position.set(0, -0.2, 0);
ground.receiveShadow = true;
environment.add(ground);

// Grass strips
addBox(environment, 48, 0.15, 4, matGrass, 0, 0.05, -16, false, true);
addBox(environment, 48, 0.15, 3, matGrass, 0, 0.05, 16.5, false, true);

// Concrete walkway / curb
addBox(environment, 40, 0.25, 3.2, matConcrete, 0, 0.15, -6, true, true);

// Parking bay lines (stylized)
for (let i = -2; i <= 2; i++) {
  addBox(environment, 0.12, 0.04, 5.5, matMarking, i * 4.2, 0.03, 2, false, true);
}
addBox(environment, 18, 0.04, 0.14, matMarking, 0, 0.03, -0.6, false, true);
addBox(environment, 18, 0.04, 0.14, matMarking, 0, 0.03, 4.8, false, true);

// Factory building (simplified massing)
const factory = new THREE.Group();
factory.position.set(-14, 0, -8);
environment.add(factory);
addBox(factory, 14, 8, 10, matBuilding, 0, 4, 0);
addBox(factory, 14.2, 0.4, 10.2, matAccent, 0, 8.2, 0);
addBox(factory, 4, 3.5, 0.3, matGlassTint, -3, 3.5, 5.15, false, true);
addBox(factory, 4, 3.5, 0.3, matGlassTint, 3, 3.5, 5.15, false, true);
addBox(factory, 3, 4, 2, matBuilding, 8.5, 2, 2);

// Loading canopy
const canopy = new THREE.Group();
canopy.position.set(6, 0, -7);
environment.add(canopy);
addBox(canopy, 0.35, 4.5, 0.35, matConcrete, -5, 2.25, -2);
addBox(canopy, 0.35, 4.5, 0.35, matConcrete, 5, 2.25, -2);
addBox(canopy, 0.35, 4.5, 0.35, matConcrete, -5, 2.25, 2);
addBox(canopy, 0.35, 4.5, 0.35, matConcrete, 5, 2.25, 2);
addBox(canopy, 11, 0.25, 5, matAccent, 0, 4.6, 0);

// Bollards / posts
for (let i = 0; i < 5; i++) {
  addBox(environment, 0.25, 1.1, 0.25, matAccent, -6 + i * 1.4, 0.55, -4.2);
}

// Subtle road beyond lot
addBox(environment, 60, 0.12, 8, matAsphalt, 0, -0.05, 12, false, true);

/* ── Commuter van (procedural) ── */
const vanGroup = new THREE.Group();
vanGroup.name = "CommuterVan";
vanGroup.position.set(2.5, 0, 1.8);
vanGroup.rotation.y = -Math.PI / 2.4;
scene.add(vanGroup);

const vanMats = {
  body: new THREE.MeshStandardMaterial({
    color: 0xe8a317,
    roughness: 0.42,
    metalness: 0.25,
    emissive: new THREE.Color(0xe8a317),
    emissiveIntensity: 0,
  }),
  bodyDark: new THREE.MeshStandardMaterial({
    color: 0x2a323c,
    roughness: 0.5,
    metalness: 0.3,
  }),
  window: new THREE.MeshStandardMaterial({
    color: 0x152530,
    roughness: 0.2,
    metalness: 0.55,
    transparent: true,
    opacity: 0.85,
  }),
  tire: new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.95,
    metalness: 0.05,
  }),
  rim: new THREE.MeshStandardMaterial({
    color: 0xc8d0d8,
    roughness: 0.35,
    metalness: 0.7,
  }),
  highlight: new THREE.MeshStandardMaterial({
    color: 0xffc94a,
    roughness: 0.35,
    metalness: 0.2,
    emissive: 0xe8a317,
    emissiveIntensity: 0.35,
  }),
};

function buildProceduralVan(parent) {
  // Chassis / cabin body
  const body = addBox(parent, 2.4, 1.55, 5.6, vanMats.body, 0, 1.15, 0);
  body.name = "van-body";

  // Roof
  addBox(parent, 2.2, 0.2, 5.2, vanMats.bodyDark, 0, 2.0, 0);

  // Cabin front (slightly raised)
  addBox(parent, 2.35, 1.1, 1.4, vanMats.body, 0, 1.55, 2.35);

  // Windshield
  const windshield = addBox(parent, 2.0, 0.85, 0.12, vanMats.window, 0, 1.7, 3.05, false);
  windshield.rotation.x = -0.18;

  // Side windows
  addBox(parent, 0.08, 0.7, 3.6, vanMats.window, 1.22, 1.45, -0.2, false);
  addBox(parent, 0.08, 0.7, 3.6, vanMats.window, -1.22, 1.45, -0.2, false);

  // Bumper
  addBox(parent, 2.3, 0.28, 0.35, vanMats.bodyDark, 0, 0.45, 2.95);

  // Headlights
  addBox(parent, 0.35, 0.22, 0.12, vanMats.highlight, 0.75, 0.7, 3.1, false);
  addBox(parent, 0.35, 0.22, 0.12, vanMats.highlight, -0.75, 0.7, 3.1, false);

  // Rear lights
  addBox(parent, 0.4, 0.2, 0.1, vanMats.bodyDark, 0.8, 1.0, -2.82, false);
  addBox(parent, 0.4, 0.2, 0.1, vanMats.bodyDark, -0.8, 1.0, -2.82, false);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 20);
  const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.34, 16);
  const wheelPositions = [
    [1.15, 0.42, 1.7],
    [-1.15, 0.42, 1.7],
    [1.15, 0.42, -1.7],
    [-1.15, 0.42, -1.7],
  ];
  for (const [wx, wy, wz] of wheelPositions) {
    const tire = new THREE.Mesh(wheelGeo, vanMats.tire);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(wx, wy, wz);
    tire.castShadow = true;
    parent.add(tire);

    const rim = new THREE.Mesh(rimGeo, vanMats.rim);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(wx, wy, wz);
    parent.add(rim);
  }

  // Invisible hit volume for reliable raycasting
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 2.2, 5.9),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.set(0, 1.15, 0);
  hit.name = "van-hitbox";
  parent.add(hit);

  return parent;
}

/**
 * Prefer .gltf when VAN_GLTF_URL is set; otherwise procedural placeholder.
 */
async function loadVan() {
  if (!VAN_GLTF_URL) {
    buildProceduralVan(vanGroup);
    return;
  }

  try {
    const gltf = await new GLTFLoader().loadAsync(VAN_GLTF_URL);
    const model = gltf.scene;
    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    // Normalize scale/position for this lot size
    model.scale.setScalar(1);
    model.position.set(0, 0, 0);
    vanGroup.add(model);

    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 2.2, 5.9),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.set(0, 1.15, 0);
    hit.name = "van-hitbox";
    vanGroup.add(hit);
  } catch (err) {
    console.warn("GLTF load failed — falling back to procedural van.", err);
    buildProceduralVan(vanGroup);
  }
}

/* ── OrbitControls (restricted isometric feel) ── */
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;

// Restrict polar angle near isometric elevation so the view stays "iso-ish"
const isoPolar = Math.PI / 2 - ISO_ELEVATION;
controls.minPolarAngle = isoPolar - 0.12;
controls.maxPolarAngle = isoPolar + 0.12;

// Limit yaw so you cannot spin into a side/top orthographic view
controls.minAzimuthAngle = ISO_AZIMUTH - 0.45;
controls.maxAzimuthAngle = ISO_AZIMUTH + 0.45;

controls.minZoom = 0.65;
controls.maxZoom = 1.85;
controls.zoomSpeed = 0.6;
controls.update();

/* ── Raycaster interaction ── */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = false;
let cardOpen = false;

function setPointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function pickVan() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(vanGroup, true);
  return hits.length > 0;
}

function setVanHighlight(on) {
  hovered = on;
  canvas.classList.toggle("is-hover-van", on);
  const target = on || cardOpen ? 0.55 : 0;
  vanMats.highlight.emissiveIntensity = on || cardOpen ? 0.55 : 0.35;
  vanMats.body.emissiveIntensity = THREE.MathUtils.lerp(
    vanMats.body.emissiveIntensity,
    target,
    0.35
  );
}

function populateCard() {
  document.getElementById("card-route").textContent = VAN_DATA.route;
  document.getElementById("card-shift").textContent = VAN_DATA.shift;
  document.getElementById("card-driver").textContent = VAN_DATA.driver;
  document.getElementById("card-seats").textContent = VAN_DATA.seats;
  document.getElementById("card-plate").textContent = VAN_DATA.plate;
  document.getElementById("card-status").textContent = VAN_DATA.status;
}

function openCard() {
  populateCard();
  cardOpen = true;
  vanCard.hidden = false;
  // Retrigger CSS animation
  vanCard.style.animation = "none";
  void vanCard.offsetWidth;
  vanCard.style.animation = "";
  setVanHighlight(true);
}

function closeCard() {
  cardOpen = false;
  vanCard.hidden = true;
  setVanHighlight(hovered);
}

canvas.addEventListener("pointermove", (e) => {
  setPointerFromEvent(e);
  const over = pickVan();
  if (over !== hovered) setVanHighlight(over);
});

canvas.addEventListener("pointerdown", (e) => {
  setPointerFromEvent(e);
  if (pickVan()) {
    openCard();
  }
});

cardClose.addEventListener("click", closeCard);

btnFocusVan.addEventListener("click", () => {
  openCard();
  // Ease controls target toward van
  controls.target.set(vanGroup.position.x, 1.2, vanGroup.position.z);
});

btnBook.addEventListener("click", () => {
  btnBook.textContent = "ส่งคำขอจองแล้ว ✓";
  btnBook.disabled = true;
});

/* ── Resize ── */
function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  updateOrthoFrustum();
}
window.addEventListener("resize", onResize);

/* ── Idle van bob (subtle presence motion) ── */
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Gentle hover / settle motion on the van
  vanGroup.position.y = Math.sin(t * 1.4) * 0.03;

  // Soft emissive breathe when selected
  if (cardOpen) {
    vanMats.body.emissiveIntensity = 0.25 + Math.sin(t * 2.2) * 0.12;
  } else if (hovered) {
    vanMats.body.emissiveIntensity = THREE.MathUtils.lerp(
      vanMats.body.emissiveIntensity,
      0.45,
      0.1
    );
  } else {
    vanMats.body.emissiveIntensity = THREE.MathUtils.lerp(
      vanMats.body.emissiveIntensity,
      0,
      0.08
    );
  }

  controls.update();
  renderer.render(scene, camera);
}

/* ── Boot ── */
await loadVan();
loaderEl.classList.add("is-done");
animate();
