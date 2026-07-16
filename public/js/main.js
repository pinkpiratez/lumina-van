/**
 * Lumina — Isometric 4-way intersection embedded in landing scroll
 * OrthographicCamera + animated fleet vans on crossroads routes
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ═══════════════════════════════════════════════════════════
   ISOMETRIC CAMERA MATH
   True isometric: azimuth 45°, elevation arctan(1/√2) ≈ 35.264°
   OrthographicCamera removes perspective foreshortening.
   ═══════════════════════════════════════════════════════════ */
const ISO_AZIMUTH = Math.PI / 4;
const ISO_ELEVATION = Math.atan(1 / Math.SQRT2);
const CAMERA_DISTANCE = 48;
const FRUSTUM_SIZE = 32;
const ROAD_HALF = 3.2;
const ROAD_LEN = 28;

const FLEET = [
  {
    id: "a",
    color: 0xe8a317,
    speed: 0.085,
    phase: 0,
    route: "สาย A — นิคมบางปะอิน",
    shift: "เช้า 05:30 – 06:15",
    driver: "สมชาย พิทักษ์",
    seats: "6 / 14",
    plate: "กข 4521",
    status: "กำลังวิ่ง",
    // Eastbound along +X (lane south of centerline)
    path: [
      new THREE.Vector3(-ROAD_LEN, 0, -1.35),
      new THREE.Vector3(ROAD_LEN, 0, -1.35),
    ],
  },
  {
    id: "b",
    color: 0xc4c6ce,
    speed: 0.07,
    phase: 0.35,
    route: "สาย B — อยุธยา โรงงาน 2",
    shift: "เช้า 05:45 – 06:30",
    driver: "วิไล ใจดี",
    seats: "3 / 14",
    plate: "ขน 8890",
    status: "กำลังวิ่ง",
    // Westbound along -X
    path: [
      new THREE.Vector3(ROAD_LEN, 0, 1.35),
      new THREE.Vector3(-ROAD_LEN, 0, 1.35),
    ],
  },
  {
    id: "c",
    color: 0x6ecf9b,
    speed: 0.078,
    phase: 0.62,
    route: "สาย C — คลองหลวง",
    shift: "บ่าย 13:00 – 13:45",
    driver: "อนุชา ศรีสุข",
    seats: "9 / 14",
    plate: "บก 2204",
    status: "กำลังวิ่ง",
    // Northbound along +Z
    path: [
      new THREE.Vector3(1.35, 0, -ROAD_LEN),
      new THREE.Vector3(1.35, 0, ROAD_LEN),
    ],
  },
  {
    id: "d",
    color: 0x7a92b8,
    speed: 0.09,
    phase: 0.18,
    route: "สาย D — วังน้อย Express",
    shift: "ดึก 21:30 – 22:15",
    driver: "มานพ รุ่งเรือง",
    seats: "1 / 12",
    plate: "กท 6712",
    status: "ใกล้เต็ม",
    // Southbound along -Z
    path: [
      new THREE.Vector3(-1.35, 0, ROAD_LEN),
      new THREE.Vector3(-1.35, 0, -ROAD_LEN),
    ],
  },
];

/* ── DOM ── */
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

function boot() {
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
  scene.background = new THREE.Color(0x1a222c);
  scene.fog = new THREE.Fog(0x1a222c, 60, 120);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 220);
  const lookTarget = new THREE.Vector3(0, 0.8, 0);
  placeIsometricCamera(camera, lookTarget, CAMERA_DISTANCE);
  camera.up.set(0, 1, 0);
  updateOrthoFrustum();

  function placeIsometricCamera(cam, target, distance) {
    const x = distance * Math.sin(ISO_AZIMUTH) * Math.cos(ISO_ELEVATION);
    const y = distance * Math.sin(ISO_ELEVATION);
    const z = distance * Math.cos(ISO_AZIMUTH) * Math.cos(ISO_ELEVATION);
    cam.position.set(target.x + x, target.y + y, target.z + z);
    cam.lookAt(target);
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

  function getSectionSize() {
    const rect = section.getBoundingClientRect();
    return {
      width: Math.max(1, Math.floor(rect.width || window.innerWidth)),
      height: Math.max(1, Math.floor(rect.height || window.innerHeight)),
    };
  }

  function resizeRenderer() {
    const { width, height } = getSectionSize();
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    updateOrthoFrustum();
  }

  /* Lights */
  scene.add(new THREE.AmbientLight(0xb8c8d8, 0.42));
  scene.add(new THREE.HemisphereLight(0xd8e6f2, 0x3a4a3a, 0.32));

  const sun = new THREE.DirectionalLight(0xfff2dd, 1.3);
  sun.position.set(20, 30, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 90;
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35;
  sun.shadow.camera.bottom = -35;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x8eb4d8, 0.28);
  fill.position.set(-14, 12, -10);
  scene.add(fill);

  /* Materials */
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
  const matGrass = new THREE.MeshStandardMaterial({
    color: 0x3d5a45,
    roughness: 1,
  });
  const matBuilding = new THREE.MeshStandardMaterial({
    color: 0x5c6b7a,
    roughness: 0.75,
    metalness: 0.15,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: 0x9aa3ad,
    roughness: 0.55,
    metalness: 0.2,
  });
  const matSidewalk = new THREE.MeshStandardMaterial({
    color: 0x6e7884,
    roughness: 0.88,
  });

  function addBox(parent, w, h, d, mat, x, y, z, cast = true, receive = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    parent.add(mesh);
    return mesh;
  }

  /* ── 4-way intersection environment ── */
  const world = new THREE.Group();
  scene.add(world);

  // Grass base
  const ground = new THREE.Mesh(new THREE.BoxGeometry(56, 0.35, 56), matGrass);
  ground.position.y = -0.2;
  ground.receiveShadow = true;
  world.add(ground);

  // Roads: + / cross
  addBox(world, ROAD_LEN * 2, 0.18, ROAD_HALF * 2, matAsphalt, 0, 0.02, 0, false, true);
  addBox(world, ROAD_HALF * 2, 0.18, ROAD_LEN * 2, matAsphalt, 0, 0.025, 0, false, true);

  // Center dashed markings (horizontal)
  for (let i = -8; i <= 8; i++) {
    if (Math.abs(i) < 1.2) continue;
    addBox(world, 1.1, 0.04, 0.14, matMarking, i * 2.4, 0.12, 0, false, true);
  }
  // Center dashed markings (vertical)
  for (let i = -8; i <= 8; i++) {
    if (Math.abs(i) < 1.2) continue;
    addBox(world, 0.14, 0.04, 1.1, matMarking, 0, 0.12, i * 2.4, false, true);
  }

  // Stop lines near intersection
  addBox(world, 0.18, 0.05, ROAD_HALF * 1.6, matMarking, ROAD_HALF + 0.6, 0.13, 0, false, true);
  addBox(world, 0.18, 0.05, ROAD_HALF * 1.6, matMarking, -(ROAD_HALF + 0.6), 0.13, 0, false, true);
  addBox(world, ROAD_HALF * 1.6, 0.05, 0.18, matMarking, 0, 0.13, ROAD_HALF + 0.6, false, true);
  addBox(world, ROAD_HALF * 1.6, 0.05, 0.18, matMarking, 0, 0.13, -(ROAD_HALF + 0.6), false, true);

  // Corner sidewalks / pads
  const pad = ROAD_HALF + 2.2;
  const corners = [
    [pad, pad],
    [pad, -pad],
    [-pad, pad],
    [-pad, -pad],
  ];
  for (const [cx, cz] of corners) {
    addBox(world, 5.5, 0.22, 5.5, matSidewalk, cx, 0.08, cz, true, true);
  }

  // Corner buildings (factory / dorm blocks)
  const buildings = [
    { x: 11, z: 11, w: 8, h: 6, d: 7, color: 0x5c6b7a },
    { x: -11, z: 11, w: 7, h: 5, d: 8, color: 0x4f5d6a },
    { x: 11, z: -11, w: 9, h: 7, d: 6, color: 0x667788 },
    { x: -12, z: -11, w: 8, h: 4.5, d: 7, color: 0x556676 },
  ];
  for (const b of buildings) {
    const mat = matBuilding.clone();
    mat.color = new THREE.Color(b.color);
    addBox(world, b.w, b.h, b.d, mat, b.x, b.h / 2, b.z);
    addBox(world, b.w + 0.2, 0.3, b.d + 0.2, matAccent, b.x, b.h + 0.1, b.z);
  }

  // Street lamps
  for (const [lx, lz] of [
    [5.5, 5.5],
    [5.5, -5.5],
    [-5.5, 5.5],
    [-5.5, -5.5],
  ]) {
    addBox(world, 0.18, 3.2, 0.18, matAccent, lx, 1.6, lz);
    const lamp = addBox(world, 0.5, 0.15, 0.5, matMarking, lx, 3.3, lz, false);
    lamp.material = matMarking.clone();
    lamp.material.emissiveIntensity = 0.45;
  }

  /* ── Procedural van builder ── */
  function createVan(colorHex) {
    const group = new THREE.Group();
    group.name = "CommuterVan";

    const bodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.42,
      metalness: 0.25,
      emissive: new THREE.Color(colorHex),
      emissiveIntensity: 0,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x2a323c,
      roughness: 0.5,
      metalness: 0.3,
    });
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x152530,
      roughness: 0.2,
      metalness: 0.55,
      transparent: true,
      opacity: 0.85,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.95,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xc8d0d8,
      roughness: 0.35,
      metalness: 0.7,
    });
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffc94a,
      emissive: 0xe8a317,
      emissiveIntensity: 0.4,
      roughness: 0.35,
    });

    addBox(group, 2.2, 1.45, 5.2, bodyMat, 0, 1.1, 0);
    addBox(group, 2.0, 0.18, 4.8, darkMat, 0, 1.9, 0);
    addBox(group, 2.15, 1.0, 1.3, bodyMat, 0, 1.45, 2.15);
    const windshield = addBox(group, 1.85, 0.75, 0.1, windowMat, 0, 1.6, 2.82, false);
    windshield.rotation.x = -0.18;
    addBox(group, 0.08, 0.65, 3.3, windowMat, 1.12, 1.35, -0.15, false);
    addBox(group, 0.08, 0.65, 3.3, windowMat, -1.12, 1.35, -0.15, false);
    addBox(group, 2.1, 0.25, 0.3, darkMat, 0, 0.42, 2.7);
    addBox(group, 0.32, 0.18, 0.1, lightMat, 0.7, 0.65, 2.85, false);
    addBox(group, 0.32, 0.18, 0.1, lightMat, -0.7, 0.65, 2.85, false);

    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 16);
    const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 12);
    for (const [wx, wy, wz] of [
      [1.05, 0.38, 1.55],
      [-1.05, 0.38, 1.55],
      [1.05, 0.38, -1.55],
      [-1.05, 0.38, -1.55],
    ]) {
      const tire = new THREE.Mesh(wheelGeo, tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(wx, wy, wz);
      tire.castShadow = true;
      group.add(tire);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, wy, wz);
      group.add(rim);
    }

    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.0, 5.5),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.set(0, 1.05, 0);
    hit.name = "van-hitbox";
    group.add(hit);

    group.userData.bodyMat = bodyMat;
    return group;
  }

  /* Spawn fleet on routes */
  const vans = FLEET.map((cfg) => {
    const mesh = createVan(cfg.color);
    mesh.userData.fleet = cfg;
    mesh.userData.t = cfg.phase;
    scene.add(mesh);
    return mesh;
  });

  function updateVanOnPath(mesh, dt) {
    const cfg = mesh.userData.fleet;
    const [a, b] = cfg.path;
    mesh.userData.t = (mesh.userData.t + dt * cfg.speed) % 1;
    const t = mesh.userData.t;
    mesh.position.lerpVectors(a, b, t);
    mesh.position.y = 0;

    // Face travel direction
    const dir = new THREE.Vector3().subVectors(b, a).normalize();
    const yaw = Math.atan2(dir.x, dir.z);
    mesh.rotation.y = yaw;
  }

  /* OrbitControls — keep isometric feel */
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(lookTarget);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  const isoPolar = Math.PI / 2 - ISO_ELEVATION;
  controls.minPolarAngle = isoPolar - 0.1;
  controls.maxPolarAngle = isoPolar + 0.1;
  controls.minAzimuthAngle = ISO_AZIMUTH - 0.4;
  controls.maxAzimuthAngle = ISO_AZIMUTH + 0.4;
  controls.minZoom = 0.7;
  controls.maxZoom = 1.7;
  controls.zoomSpeed = 0.55;
  controls.update();

  /* Raycaster */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = null;
  let selected = null;
  let cardOpen = false;
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

  function setHighlight(van, on) {
    if (!van?.userData.bodyMat) return;
    van.userData.bodyMat.emissiveIntensity = on ? 0.45 : 0;
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
    cardOpen = true;
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
    cardOpen = false;
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

  /* Resize */
  const ro = new ResizeObserver(() => resizeRenderer());
  ro.observe(section);
  window.addEventListener("resize", resizeRenderer);
  resizeRenderer();

  /* Only animate when section is on screen */
  const io = new IntersectionObserver(
    ([entry]) => {
      sectionVisible = entry.isIntersecting && entry.intersectionRatio > 0.15;
    },
    { threshold: [0, 0.15, 0.4] }
  );
  io.observe(section);

  const clock = new THREE.Clock();
  let raf = 0;

  function animate() {
    raf = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (sectionVisible) {
      for (const van of vans) updateVanOnPath(van, dt);
      if (selected?.userData.bodyMat) {
        selected.userData.bodyMat.emissiveIntensity =
          0.28 + Math.sin(clock.elapsedTime * 2.4) * 0.12;
      }
      controls.update();
      renderer.render(scene, camera);
    }
  }

  loaderEl?.classList.add("is-done");
  // Seed initial positions
  for (const van of vans) updateVanOnPath(van, 0);
  animate();

  // First paint once sized
  renderer.render(scene, camera);
}
