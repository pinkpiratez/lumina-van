/**
 * Lumina — Isometric 4-way roads + GLB fleet vans
 * Zoom disabled so page scroll passes through the section.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* ═══════════════════════════════════════════════════════════
   ISOMETRIC CAMERA
   Azimuth 45°, elevation arctan(1/√2) ≈ 35.264°
   OrthographicCamera → strict isometric (no perspective).
   ═══════════════════════════════════════════════════════════ */
const ISO_AZIMUTH = Math.PI / 4;
const ISO_ELEVATION = Math.atan(1 / Math.SQRT2);
const CAMERA_DISTANCE = 48;
const FRUSTUM_SIZE = 30;
const ROAD_HALF = 3.2;
const ROAD_LEN = 26;
/** Target van length in world units after auto-fit */
const VAN_TARGET_LENGTH = 5.2;

const FLEET = [
  {
    id: "a",
    model: "./models/2003_chevrolet_express_gmc_savana_2500_cargo_van.glb",
    speed: 0.08,
    phase: 0,
    route: "สาย A — นิคมบางปะอิน",
    shift: "เช้า 05:30 – 06:15",
    driver: "สมชาย พิทักษ์",
    seats: "6 / 14",
    plate: "กข 4521",
    status: "กำลังวิ่ง",
    path: [
      new THREE.Vector3(-ROAD_LEN, 0, -1.35),
      new THREE.Vector3(ROAD_LEN, 0, -1.35),
    ],
  },
  {
    id: "b",
    model: "./models/european_delivery_van.glb",
    speed: 0.068,
    phase: 0.32,
    route: "สาย B — อยุธยา โรงงาน 2",
    shift: "เช้า 05:45 – 06:30",
    driver: "วิไล ใจดี",
    seats: "3 / 14",
    plate: "ขน 8890",
    status: "กำลังวิ่ง",
    path: [
      new THREE.Vector3(ROAD_LEN, 0, 1.35),
      new THREE.Vector3(-ROAD_LEN, 0, 1.35),
    ],
  },
  {
    id: "c",
    model: "./models/plumber_van_from_the_super_mario_bros_movie.glb",
    speed: 0.075,
    phase: 0.58,
    route: "สาย C — คลองหลวง",
    shift: "บ่าย 13:00 – 13:45",
    driver: "อนุชา ศรีสุข",
    seats: "9 / 14",
    plate: "บก 2204",
    status: "กำลังวิ่ง",
    path: [
      new THREE.Vector3(1.35, 0, -ROAD_LEN),
      new THREE.Vector3(1.35, 0, ROAD_LEN),
    ],
  },
  {
    id: "d",
    model: "./models/raf_taxi_van_low-poly.glb",
    speed: 0.088,
    phase: 0.15,
    route: "สาย D — วังน้อย Express",
    shift: "ดึก 21:30 – 22:15",
    driver: "มานพ รุ่งเรือง",
    seats: "1 / 12",
    plate: "กท 6712",
    status: "ใกล้เต็ม",
    path: [
      new THREE.Vector3(-1.35, 0, ROAD_LEN),
      new THREE.Vector3(-1.35, 0, -ROAD_LEN),
    ],
  },
];

const section = document.getElementById("fleet-3d");
const canvas = document.getElementById("iso-canvas");
const loaderEl = document.getElementById("loader");
const vanCard = document.getElementById("van-card");
const cardClose = document.getElementById("card-close");
const btnBook = document.getElementById("btn-book");

if (!canvas || !section) {
  console.warn("3D section missing — skip scene boot");
} else {
  boot();
}

async function boot() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x151b22);
  scene.fog = new THREE.Fog(0x151b22, 55, 100);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 220);
  const lookTarget = new THREE.Vector3(0, 0.6, 0);
  placeIsometricCamera(camera, lookTarget, CAMERA_DISTANCE);
  camera.up.set(0, 1, 0);

  function placeIsometricCamera(cam, target, distance) {
    const x = distance * Math.sin(ISO_AZIMUTH) * Math.cos(ISO_ELEVATION);
    const y = distance * Math.sin(ISO_ELEVATION);
    const z = distance * Math.cos(ISO_AZIMUTH) * Math.cos(ISO_ELEVATION);
    cam.position.set(target.x + x, target.y + y, target.z + z);
    cam.lookAt(target);
  }

  function getSectionSize() {
    const rect = section.getBoundingClientRect();
    return {
      width: Math.max(1, Math.floor(rect.width || window.innerWidth)),
      height: Math.max(1, Math.floor(rect.height || window.innerHeight)),
    };
  }

  function updateOrthoFrustum() {
    const { width, height } = getSectionSize();
    const aspect = width / Math.max(height, 1);
    const halfH = FRUSTUM_SIZE / 2;
    const halfW = halfH * aspect;
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
  }

  function resizeRenderer() {
    const { width, height } = getSectionSize();
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    updateOrthoFrustum();
  }

  /* Lights */
  scene.add(new THREE.AmbientLight(0xb8c8d8, 0.5));
  scene.add(new THREE.HemisphereLight(0xd8e6f2, 0x2a3238, 0.4));

  const sun = new THREE.DirectionalLight(0xfff2dd, 1.25);
  sun.position.set(18, 28, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x8eb4d8, 0.3);
  fill.position.set(-12, 10, -8);
  scene.add(fill);

  /* Materials — roads only */
  const matAsphalt = new THREE.MeshStandardMaterial({
    color: 0x3a4450,
    roughness: 0.92,
    metalness: 0.05,
  });
  const matMarking = new THREE.MeshStandardMaterial({
    color: 0xe8d48a,
    roughness: 0.7,
    metalness: 0.05,
    emissive: 0x3a3010,
    emissiveIntensity: 0.12,
  });
  const matGround = new THREE.MeshStandardMaterial({
    color: 0x1e262e,
    roughness: 1,
  });

  function addBox(parent, w, h, d, mat, x, y, z, cast = false, receive = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    parent.add(mesh);
    return mesh;
  }

  const world = new THREE.Group();
  scene.add(world);

  // Flat ground (no buildings)
  const ground = new THREE.Mesh(new THREE.BoxGeometry(56, 0.3, 56), matGround);
  ground.position.y = -0.18;
  ground.receiveShadow = true;
  world.add(ground);

  // 4-way roads only
  addBox(world, ROAD_LEN * 2, 0.16, ROAD_HALF * 2, matAsphalt, 0, 0.02, 0, false, true);
  addBox(world, ROAD_HALF * 2, 0.16, ROAD_LEN * 2, matAsphalt, 0, 0.025, 0, false, true);

  for (let i = -8; i <= 8; i++) {
    if (Math.abs(i) < 1.2) continue;
    addBox(world, 1.1, 0.04, 0.14, matMarking, i * 2.4, 0.12, 0);
    addBox(world, 0.14, 0.04, 1.1, matMarking, 0, 0.12, i * 2.4);
  }

  addBox(world, 0.18, 0.05, ROAD_HALF * 1.6, matMarking, ROAD_HALF + 0.55, 0.13, 0);
  addBox(world, 0.18, 0.05, ROAD_HALF * 1.6, matMarking, -(ROAD_HALF + 0.55), 0.13, 0);
  addBox(world, ROAD_HALF * 1.6, 0.05, 0.18, matMarking, 0, 0.13, ROAD_HALF + 0.55);
  addBox(world, ROAD_HALF * 1.6, 0.05, 0.18, matMarking, 0, 0.13, -(ROAD_HALF + 0.55));

  /* Fit GLB to consistent size, grounded on Y=0, facing +Z */
  function normalizeModel(root) {
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    root.position.sub(center); // center at origin
    // Drop so bottom sits on y=0 (after centering, remeasure)
    const box2 = new THREE.Box3().setFromObject(root);
    root.position.y -= box2.min.y;

    const longest = Math.max(size.x, size.z, 0.001);
    const scale = VAN_TARGET_LENGTH / longest;
    root.scale.setScalar(scale);

    // After scale, keep wheels on ground
    const box3 = new THREE.Box3().setFromObject(root);
    root.position.y -= box3.min.y;

    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
            m.needsUpdate = true;
          }
        }
      }
    });
  }

  function makeHitbox(parent) {
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.2, VAN_TARGET_LENGTH * 1.05),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.y = 1.1;
    hit.name = "van-hitbox";
    parent.add(hit);
  }

  const gltfLoader = new GLTFLoader();
  const vans = [];

  await Promise.all(
    FLEET.map(async (cfg) => {
      const group = new THREE.Group();
      group.name = `van-${cfg.id}`;
      group.userData.fleet = cfg;
      group.userData.t = cfg.phase;
      group.userData.emissiveMats = [];

      try {
        const gltf = await gltfLoader.loadAsync(cfg.model);
        const model = gltf.scene;
        normalizeModel(model);
        group.add(model);

        // Collect materials for hover highlight
        model.traverse((obj) => {
          if (!obj.isMesh || !obj.material) return;
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if ("emissive" in m) {
              m.userData.baseEmissiveIntensity = m.emissiveIntensity ?? 0;
              group.userData.emissiveMats.push(m);
            }
          }
        });
      } catch (err) {
        console.warn(`Failed to load ${cfg.model}`, err);
        // Tiny fallback box so fleet still runs
        const fallback = new THREE.Mesh(
          new THREE.BoxGeometry(2, 1.4, 5),
          new THREE.MeshStandardMaterial({
            color: 0xe8a317,
            emissive: 0xe8a317,
            emissiveIntensity: 0,
          })
        );
        fallback.position.y = 0.7;
        fallback.castShadow = true;
        group.add(fallback);
        group.userData.emissiveMats.push(fallback.material);
      }

      makeHitbox(group);
      scene.add(group);
      vans.push(group);
    })
  );

  function setHighlight(van, on) {
    if (!van) return;
    for (const m of van.userData.emissiveMats || []) {
      m.emissiveIntensity = on
        ? Math.max(0.35, (m.userData.baseEmissiveIntensity || 0) + 0.35)
        : m.userData.baseEmissiveIntensity || 0;
    }
  }

  function updateVanOnPath(mesh, dt) {
    const cfg = mesh.userData.fleet;
    const [a, b] = cfg.path;
    mesh.userData.t = (mesh.userData.t + dt * cfg.speed) % 1;
    mesh.position.lerpVectors(a, b, mesh.userData.t);
    mesh.position.y = 0;
    const dir = new THREE.Vector3().subVectors(b, a).normalize();
    mesh.rotation.y = Math.atan2(dir.x, dir.z);
  }

  /* Orbit: rotate only — no zoom so wheel scrolls the page */
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(lookTarget);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.enableZoom = false; // critical: page scroll must pass through
  const isoPolar = Math.PI / 2 - ISO_ELEVATION;
  controls.minPolarAngle = isoPolar - 0.08;
  controls.maxPolarAngle = isoPolar + 0.08;
  controls.minAzimuthAngle = ISO_AZIMUTH - 0.35;
  controls.maxAzimuthAngle = ISO_AZIMUTH + 0.35;
  controls.update();

  // Belt-and-suspenders: never let wheel be captured on the canvas
  canvas.addEventListener(
    "wheel",
    () => {
      /* intentionally empty — do not preventDefault; page scrolls */
    },
    { passive: true }
  );

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = null;
  let selected = null;
  let sectionVisible = false;

  function setPointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickVan() {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(vans, true);
    if (!hits.length) return null;
    let obj = hits[0].object;
    while (obj && !obj.userData.fleet) obj = obj.parent;
    return obj;
  }

  function populateCard(data) {
    document.getElementById("card-route").textContent = data.route;
    document.getElementById("card-shift").textContent = data.shift;
    document.getElementById("card-driver").textContent = data.driver;
    document.getElementById("card-seats").textContent = data.seats;
    document.getElementById("card-plate").textContent = data.plate;
    document.getElementById("card-status").textContent = data.status;
  }

  function openCard(van) {
    if (selected && selected !== van) setHighlight(selected, false);
    selected = van;
    populateCard(van.userData.fleet);
    vanCard.hidden = false;
    vanCard.style.animation = "none";
    void vanCard.offsetWidth;
    vanCard.style.animation = "";
    setHighlight(van, true);
    btnBook.disabled = false;
    btnBook.textContent = "จองที่นั่งในสายนี้";
  }

  function closeCard() {
    vanCard.hidden = true;
    if (selected) setHighlight(selected, hovered === selected);
    selected = null;
  }

  canvas.addEventListener("pointermove", (e) => {
    if (!sectionVisible) return;
    setPointerFromEvent(e);
    const van = pickVan();
    canvas.classList.toggle("is-hover-van", !!van);
    if (van !== hovered) {
      if (hovered && hovered !== selected) setHighlight(hovered, false);
      hovered = van;
      if (hovered) setHighlight(hovered, true);
    }
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (!sectionVisible) return;
    setPointerFromEvent(e);
    const van = pickVan();
    if (van) openCard(van);
  });

  cardClose?.addEventListener("click", closeCard);
  btnBook?.addEventListener("click", () => {
    btnBook.textContent = "ส่งคำขอจองแล้ว ✓";
    btnBook.disabled = true;
  });

  const ro = new ResizeObserver(() => resizeRenderer());
  ro.observe(section);
  window.addEventListener("resize", resizeRenderer);
  resizeRenderer();

  const io = new IntersectionObserver(
    ([entry]) => {
      sectionVisible = entry.isIntersecting && entry.intersectionRatio > 0.12;
    },
    { threshold: [0, 0.12, 0.4] }
  );
  io.observe(section);

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (sectionVisible) {
      for (const van of vans) updateVanOnPath(van, dt);
      if (selected) {
        const pulse = 0.35 + Math.sin(clock.elapsedTime * 2.4) * 0.12;
        for (const m of selected.userData.emissiveMats || []) {
          m.emissiveIntensity = pulse;
        }
      }
      controls.update();
      renderer.render(scene, camera);
    }
  }

  for (const van of vans) updateVanOnPath(van, 0);
  loaderEl?.classList.add("is-done");
  animate();
  renderer.render(scene, camera);
}
