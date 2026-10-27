/**
 * RentRoll - Low-Poly 3D Models & WebGL Visualizer
 * Built using Three.js with custom low-poly procedural geometries, flat-shading,
 * interactive orbital controls, Day/Sunset/Night lighting cycles, and model switching.
 */

// Helper to create flat-shaded materials in RentRoll palette
const PALETTE = {
  creamBase: 0xf5efe6,
  creamSurface: 0xf8f3ec,
  creamInset: 0xebe4da,
  indigo: 0x4338ca,
  indigoLight: 0x6366f1,
  terracotta: 0xc25e36,
  amber: 0xd97706,
  grassGreen: 0x48bb78,
  grassGreenDark: 0x2f855a,
  stonePave: 0xdcd0c2,
  driveway: 0x94a3b8,
  modernDark: 0x27272a,
  woodCedar: 0xb45309,
  woodLight: 0xd97706,
  glassWindow: 0x93c5fd,
  windowGlowDay: 0xffedd5,
  windowGlowNight: 0xfde047,
  treeTrunk: 0x78350f,
  carWhite: 0xf8fafc,
  carIndigo: 0x4338ca,
  carTire: 0x1e293b,
  water: 0x38bdf8
};

function createMat(color, options = {}) {
  return new THREE.MeshLambertMaterial({
    color: color,
    flatShading: true,
    ...options
  });
}

// =============================================================================
// 1. HERO 3D MODEL: The Aura Multi-Unit Luxury Residence
// =============================================================================

export function initHero3D() {
  const container = document.getElementById('hero-3d-canvas-container');
  if (!container || typeof THREE === 'undefined') return;

  // Clear previous content if any
  container.innerHTML = '';

  const width = container.clientWidth || 540;
  const height = container.clientHeight || 420;

  // Scene with transparent background (no box around model)
  const scene = new THREE.Scene();
  scene.background = null;
  scene.fog = null;

  // Camera
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
  camera.position.set(12, 10, 14);
  camera.lookAt(0, 1.5, 0);

  // Renderer with transparent clear color
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xfff7ed, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfffaed, 1.1);
  dirLight.position.set(10, 16, 8);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 35;
  dirLight.shadow.camera.left = -9;
  dirLight.shadow.camera.right = 9;
  dirLight.shadow.camera.top = 9;
  dirLight.shadow.camera.bottom = -9;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  // Night/Evening accent point lights (windows & garden)
  const gardenLight = new THREE.PointLight(0xffedd5, 0, 8);
  gardenLight.position.set(3.5, 1.2, 3);
  scene.add(gardenLight);

  const windowInteriorLight = new THREE.PointLight(0xfef08a, 0.2, 10);
  windowInteriorLight.position.set(0, 2.8, 0);
  scene.add(windowInteriorLight);

  // Root Pivot for smooth rotation
  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  // --- Ground & Base ---
  const groundGeo = new THREE.CylinderGeometry(6.6, 7.2, 0.65, 32);
  const groundMat = createMat(PALETTE.stonePave);
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.position.y = -0.32;
  groundMesh.receiveShadow = true;
  rootGroup.add(groundMesh);

  // Lush Green Lawn Slab
  const lawnGeo = new THREE.CylinderGeometry(6.3, 6.45, 0.15, 32);
  const lawnMat = createMat(PALETTE.grassGreen);
  const lawnMesh = new THREE.Mesh(lawnGeo, lawnMat);
  lawnMesh.position.y = 0.05;
  lawnMesh.receiveShadow = true;
  rootGroup.add(lawnMesh);

  // Stone Walkway Path
  const pathGeo = new THREE.BoxGeometry(1.6, 0.04, 3.8);
  const pathMat = createMat(PALETTE.creamInset);
  const pathMesh = new THREE.Mesh(pathGeo, pathMat);
  pathMesh.position.set(0.6, 0.14, 3.2);
  pathMesh.rotation.y = 0.15;
  pathMesh.receiveShadow = true;
  rootGroup.add(pathMesh);

  // Driveway Slab
  const driveGeo = new THREE.BoxGeometry(2.4, 0.04, 3.2);
  const driveMat = createMat(PALETTE.driveway);
  const driveMesh = new THREE.Mesh(driveGeo, driveMat);
  driveMesh.position.set(-3.2, 0.13, 2.5);
  driveMesh.receiveShadow = true;
  rootGroup.add(driveMesh);

  // --- Main Building Structure ---
  const buildingGroup = new THREE.Group();
  rootGroup.add(buildingGroup);

  // Ground Floor / Base Unit
  const floor1Geo = new THREE.BoxGeometry(4.4, 1.8, 3.6);
  const floor1Mat = createMat(PALETTE.creamSurface);
  const floor1 = new THREE.Mesh(floor1Geo, floor1Mat);
  floor1.position.set(0, 1.05, 0);
  floor1.castShadow = true;
  floor1.receiveShadow = true;
  buildingGroup.add(floor1);

  // Wood Paneling Accent Wall (Left facade)
  const woodWallGeo = new THREE.BoxGeometry(0.08, 1.8, 2.2);
  const woodWallMat = createMat(PALETTE.woodCedar);
  const woodWall = new THREE.Mesh(woodWallGeo, woodWallMat);
  woodWall.position.set(-2.24, 1.05, 0.4);
  buildingGroup.add(woodWall);

  // Second Floor (Slight Cantilever Offset)
  const floor2Geo = new THREE.BoxGeometry(4.2, 1.7, 3.4);
  const floor2Mat = createMat(0xfaf6f0);
  const floor2 = new THREE.Mesh(floor2Geo, floor2Mat);
  floor2.position.set(0.2, 2.75, 0.1);
  floor2.castShadow = true;
  floor2.receiveShadow = true;
  buildingGroup.add(floor2);

  // Third Floor Penthouse / Duplex Upper Suite
  const floor3Geo = new THREE.BoxGeometry(3.0, 1.5, 2.6);
  const floor3Mat = createMat(PALETTE.creamSurface);
  const floor3 = new THREE.Mesh(floor3Geo, floor3Mat);
  floor3.position.set(-0.3, 4.3, -0.2);
  floor3.castShadow = true;
  floor3.receiveShadow = true;
  buildingGroup.add(floor3);

  // Architectural Dark Fascia & Overhang Roofs
  const roofDarkMat = createMat(PALETTE.modernDark);

  const roof1Geo = new THREE.BoxGeometry(4.6, 0.16, 3.8);
  const roof1 = new THREE.Mesh(roof1Geo, roofDarkMat);
  roof1.position.set(0.1, 1.95, 0.05);
  roof1.castShadow = true;
  buildingGroup.add(roof1);

  const roof2Geo = new THREE.BoxGeometry(4.5, 0.16, 3.6);
  const roof2 = new THREE.Mesh(roof2Geo, roofDarkMat);
  roof2.position.set(0.2, 3.62, 0.1);
  roof2.castShadow = true;
  buildingGroup.add(roof2);

  const roof3Geo = new THREE.BoxGeometry(3.3, 0.18, 2.9);
  const roof3 = new THREE.Mesh(roof3Geo, roofDarkMat);
  roof3.position.set(-0.3, 5.08, -0.2);
  roof3.castShadow = true;
  buildingGroup.add(roof3);

  // Balconies
  const balcGeo = new THREE.BoxGeometry(1.8, 0.12, 1.0);
  const balcFloor = new THREE.Mesh(balcGeo, roofDarkMat);
  balcFloor.position.set(1.4, 2.0, 2.2);
  buildingGroup.add(balcFloor);

  // Glass Railing on Balcony
  const railGeo = new THREE.BoxGeometry(1.8, 0.6, 0.06);
  const railMat = new THREE.MeshLambertMaterial({
    color: PALETTE.glassWindow,
    transparent: true,
    opacity: 0.6,
    flatShading: true
  });
  const railMesh = new THREE.Mesh(railGeo, railMat);
  railMesh.position.set(1.4, 2.36, 2.68);
  buildingGroup.add(railMesh);

  // Penthouse Rooftop Deck Railing
  const roofRailGeo = new THREE.BoxGeometry(1.4, 0.5, 0.05);
  const roofRail = new THREE.Mesh(roofRailGeo, railMat);
  roofRail.position.set(1.4, 3.9, 1.4);
  buildingGroup.add(roofRail);

  // Windows with Emissive Glow
  const windowMat = new THREE.MeshStandardMaterial({
    color: PALETTE.glassWindow,
    emissive: 0xffedd5,
    emissiveIntensity: 0.35,
    roughness: 0.2,
    metalness: 0.1,
    flatShading: true
  });

  // Windows Array to control emissive intensity in day/sunset/night
  const windowMeshes = [];

  function addWindow(w, h, x, y, z, rotY = 0) {
    const geo = new THREE.BoxGeometry(w, h, 0.08);
    const mesh = new THREE.Mesh(geo, windowMat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    buildingGroup.add(mesh);
    windowMeshes.push(mesh);
    return mesh;
  }

  // Front Facade Windows (Level 1, 2, 3)
  addWindow(1.2, 1.2, 0.5, 1.05, 1.83);
  addWindow(0.8, 1.2, -1.2, 1.05, 1.83);
  addWindow(1.4, 1.1, 1.2, 2.8, 1.83);
  addWindow(1.0, 1.1, -0.6, 2.8, 1.83);
  addWindow(1.2, 0.9, -0.4, 4.3, 1.13);

  // Side Windows
  addWindow(1.2, 1.1, 2.22, 1.1, -0.2, Math.PI / 2);
  addWindow(1.4, 1.0, 2.32, 2.8, 0.1, Math.PI / 2);
  addWindow(1.0, 0.8, 1.23, 4.3, -0.2, Math.PI / 2);

  // Front Entrance Door
  const doorGeo = new THREE.BoxGeometry(0.7, 1.4, 0.08);
  const doorMat = createMat(PALETTE.terracotta);
  const doorMesh = new THREE.Mesh(doorGeo, doorMat);
  doorMesh.position.set(1.6, 0.85, 1.82);
  buildingGroup.add(doorMesh);

  // Entrance Canopy
  const canopyGeo = new THREE.BoxGeometry(1.0, 0.08, 0.6);
  const canopyMesh = new THREE.Mesh(canopyGeo, roofDarkMat);
  canopyMesh.position.set(1.6, 1.62, 2.05);
  buildingGroup.add(canopyMesh);

  // --- Low-Poly Landscaping & Trees ---
  function createLowPolyTree(x, z, scale = 1, isPine = false) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0.1, z);
    treeGroup.scale.set(scale, scale, scale);

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.9, 6);
    const trunkMat = createMat(PALETTE.treeTrunk);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.45;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    if (isPine) {
      // 3 Stacked Cone Layers
      const c1Geo = new THREE.ConeGeometry(0.85, 0.9, 6);
      const c2Geo = new THREE.ConeGeometry(0.7, 0.8, 6);
      const c3Geo = new THREE.ConeGeometry(0.5, 0.7, 6);
      const pineMat = createMat(PALETTE.grassGreenDark);

      const c1 = new THREE.Mesh(c1Geo, pineMat);
      c1.position.y = 1.0;
      c1.castShadow = true;
      const c2 = new THREE.Mesh(c2Geo, pineMat);
      c2.position.y = 1.5;
      c2.castShadow = true;
      const c3 = new THREE.Mesh(c3Geo, pineMat);
      c3.position.y = 2.0;
      c3.castShadow = true;

      treeGroup.add(c1, c2, c3);
    } else {
      // Deciduous Low-Poly Foliage (Icosahedron)
      const folGeo = new THREE.IcosahedronGeometry(0.75, 1);
      const folMat = createMat(PALETTE.grassGreen);
      const fol = new THREE.Mesh(folGeo, folMat);
      fol.position.y = 1.35;
      fol.castShadow = true;
      treeGroup.add(fol);
    }

    rootGroup.add(treeGroup);
    return treeGroup;
  }

  // Place Trees
  createLowPolyTree(-4.2, -1.8, 1.25, false);
  createLowPolyTree(-4.6, 0.5, 0.9, true);
  createLowPolyTree(3.8, -2.6, 1.3, false);
  createLowPolyTree(4.2, 0.2, 1.0, true);
  createLowPolyTree(3.6, 2.8, 0.75, false);

  // Planter Bushes around Entrance
  function createBush(x, z, r = 0.3) {
    const bGeo = new THREE.DodecahedronGeometry(r, 0);
    const bMat = createMat(PALETTE.grassGreenDark);
    const bush = new THREE.Mesh(bGeo, bMat);
    bush.position.set(x, 0.25, z);
    bush.castShadow = true;
    rootGroup.add(bush);
  }
  createBush(0.5, 2.1, 0.28);
  createBush(2.3, 2.0, 0.32);
  createBush(-1.8, 2.0, 0.25);
  createBush(-2.2, 2.1, 0.3);

  // --- Low-Poly Electric Car on Driveway ---
  const carGroup = new THREE.Group();
  carGroup.position.set(-3.2, 0.16, 2.4);
  carGroup.rotation.y = -0.15;

  // Car Body
  const carBodyGeo = new THREE.BoxGeometry(1.2, 0.45, 2.3);
  const carBodyMat = createMat(PALETTE.carIndigo);
  const carBody = new THREE.Mesh(carBodyGeo, carBodyMat);
  carBody.position.y = 0.35;
  carBody.castShadow = true;
  carGroup.add(carBody);

  // Car Cabin / Windshield
  const carCabinGeo = new THREE.BoxGeometry(1.0, 0.38, 1.2);
  const carCabinMat = createMat(PALETTE.modernDark);
  const carCabin = new THREE.Mesh(carCabinGeo, carCabinMat);
  carCabin.position.set(0, 0.72, -0.1);
  carCabin.castShadow = true;
  carGroup.add(carCabin);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.18, 8);
  const wheelMat = createMat(PALETTE.carTire);
  wheelGeo.rotateZ(Math.PI / 2);

  const wPositions = [
    [-0.6, 0.2, 0.65],
    [0.6, 0.2, 0.65],
    [-0.6, 0.2, -0.65],
    [0.6, 0.2, -0.65]
  ];
  wPositions.forEach(pos => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(...pos);
    carGroup.add(w);
  });
  rootGroup.add(carGroup);

  // --- Street Light / Garden Bollard ---
  const lampPoleGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.4, 6);
  const lampPoleMat = createMat(PALETTE.modernDark);
  const lampPole = new THREE.Mesh(lampPoleGeo, lampPoleMat);
  lampPole.position.set(2.8, 0.8, 2.6);
  rootGroup.add(lampPole);

  const lampHeadGeo = new THREE.BoxGeometry(0.24, 0.15, 0.24);
  const lampHeadMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xfef08a,
    emissiveIntensity: 0.6,
    flatShading: true
  });
  const lampHead = new THREE.Mesh(lampHeadGeo, lampHeadMat);
  lampHead.position.set(2.8, 1.5, 2.6);
  rootGroup.add(lampHead);

  // --- Interaction Controls (Mouse Drag & Touch Orbit) ---
  let isDragging = false;
  let prevMouseX = 0;
  let prevMouseY = 0;
  let rotSpeed = 0.007;
  let targetRotationY = 0.45;
  let targetRotationX = 0.15;
  let autoRotate = true;
  let zoomDist = 18;

  const dom = renderer.domElement;

  dom.addEventListener('mousedown', (e) => {
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
    autoRotate = false;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - prevMouseX;
    const deltaY = e.clientY - prevMouseY;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;

    targetRotationY += deltaX * rotSpeed;
    targetRotationX = Math.max(-0.1, Math.min(0.5, targetRotationX + deltaY * (rotSpeed * 0.5)));
  });

  // Touch Support for mobile
  dom.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;
      autoRotate = false;
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    isDragging = false;
  });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - prevMouseX;
    const deltaY = e.touches[0].clientY - prevMouseY;
    prevMouseX = e.touches[0].clientX;
    prevMouseY = e.touches[0].clientY;

    targetRotationY += deltaX * rotSpeed * 1.2;
    targetRotationX = Math.max(-0.1, Math.min(0.5, targetRotationX + deltaY * (rotSpeed * 0.7)));
  }, { passive: true });

  // Zoom via wheel
  dom.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomDist = Math.max(12, Math.min(26, zoomDist + e.deltaY * 0.015));
  }, { passive: false });

  // Wire UI Buttons (Day/Sunset/Night + Reset + Auto-Rotate)
  const btnDay = document.getElementById('hero-3d-btn-day');
  const btnSunset = document.getElementById('hero-3d-btn-sunset');
  const btnNight = document.getElementById('hero-3d-btn-night');
  const btnReset = document.getElementById('hero-3d-btn-reset');
  const btnAutoRotate = document.getElementById('hero-3d-btn-autorotate');

  function setLightingMode(mode) {
    if (mode === 'day') {
      ambientLight.color.set(0xfff7ed);
      ambientLight.intensity = 0.75;
      dirLight.color.set(0xfffaed);
      dirLight.intensity = 1.15;
      dirLight.position.set(10, 16, 8);
      gardenLight.intensity = 0.1;
      windowInteriorLight.intensity = 0.2;
      windowMat.emissiveIntensity = 0.35;
      windowMat.emissive.set(0xffedd5);
    } else if (mode === 'sunset') {
      ambientLight.color.set(0xfdba74);
      ambientLight.intensity = 0.65;
      dirLight.color.set(0xf97316);
      dirLight.intensity = 1.35;
      dirLight.position.set(14, 7, 6);
      gardenLight.intensity = 0.8;
      gardenLight.color.set(0xfb923c);
      windowInteriorLight.intensity = 0.6;
      windowInteriorLight.color.set(0xfde047);
      windowMat.emissiveIntensity = 0.7;
      windowMat.emissive.set(0xfde047);
    } else if (mode === 'night') {
      ambientLight.color.set(0x312e81);
      ambientLight.intensity = 0.45;
      dirLight.color.set(0x4338ca);
      dirLight.intensity = 0.45;
      dirLight.position.set(-6, 12, -6);
      gardenLight.intensity = 1.6;
      gardenLight.color.set(0xfef08a);
      windowInteriorLight.intensity = 1.5;
      windowInteriorLight.color.set(0xfde047);
      windowMat.emissiveIntensity = 1.2;
      windowMat.emissive.set(0xfde047);
    }
  }

  if (btnDay) {
    btnDay.addEventListener('click', () => {
      setLightingMode('day');
      updateActiveBtn(btnDay);
    });
  }
  if (btnSunset) {
    btnSunset.addEventListener('click', () => {
      setLightingMode('sunset');
      updateActiveBtn(btnSunset);
    });
  }
  if (btnNight) {
    btnNight.addEventListener('click', () => {
      setLightingMode('night');
      updateActiveBtn(btnNight);
    });
  }
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      targetRotationY = 0.45;
      targetRotationX = 0.15;
      zoomDist = 18;
      autoRotate = true;
      if (btnAutoRotate) btnAutoRotate.classList.add('is-active');
    });
  }
  if (btnAutoRotate) {
    btnAutoRotate.addEventListener('click', () => {
      autoRotate = !autoRotate;
      btnAutoRotate.classList.toggle('is-active', autoRotate);
    });
  }

  function updateActiveBtn(activeBtn) {
    [btnDay, btnSunset, btnNight].forEach(b => {
      if (b) b.classList.toggle('is-active', b === activeBtn);
    });
  }

  // Animation Loop with smooth damping
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    if (autoRotate && !isDragging) {
      targetRotationY += 0.22 * delta;
    }

    // Smooth inertia
    rootGroup.rotation.y += (targetRotationY - rootGroup.rotation.y) * 0.08;
    rootGroup.rotation.x += (targetRotationX - rootGroup.rotation.x) * 0.08;

    // Subtle gentle floating breathing motion
    rootGroup.position.y = Math.sin(time * 1.5) * 0.08;

    // Camera zoom interpolation
    const currDist = camera.position.length();
    if (Math.abs(currDist - zoomDist) > 0.05) {
      const factor = (zoomDist / currDist);
      camera.position.lerp(camera.position.clone().multiplyScalar(factor), 0.1);
    }

    renderer.render(scene, camera);
  }

  animate();

  // Responsive Resize
  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w && h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
  });
  resizeObserver.observe(container);
}

// =============================================================================
// 2. EXPLORER 3D MODEL: Multi-Model Showcase (Duplex, Brownstone, Quadplex)
// =============================================================================

export function initExplorer3D() {
  const container = document.getElementById('explorer-3d-canvas-container');
  if (!container || typeof THREE === 'undefined') return;

  container.innerHTML = '';

  const width = container.clientWidth || 560;
  const height = container.clientHeight || 440;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5efe6);
  scene.fog = new THREE.FogExp2(0xf5efe6, 0.024);

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(13, 11, 15);
  camera.lookAt(0, 1.2, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xfff7ed, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
  dirLight.position.set(12, 18, 9);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  // Base Ground Platform
  const groundGeo = new THREE.CylinderGeometry(7.0, 7.5, 0.6, 32);
  const groundMesh = new THREE.Mesh(groundGeo, createMat(PALETTE.stonePave));
  groundMesh.position.y = -0.3;
  groundMesh.receiveShadow = true;
  rootGroup.add(groundMesh);

  const lawnGeo = new THREE.CylinderGeometry(6.7, 6.9, 0.14, 32);
  const lawnMesh = new THREE.Mesh(lawnGeo, createMat(PALETTE.grassGreen));
  lawnMesh.position.y = 0.05;
  lawnMesh.receiveShadow = true;
  rootGroup.add(lawnMesh);

  // Container for dynamic property model
  const modelHolder = new THREE.Group();
  rootGroup.add(modelHolder);

  // --- MODEL 1: MODERN DUPLEX (2 Units 42A & 42B) ---
  function buildDuplexModel() {
    const grp = new THREE.Group();

    // Unit A (Left)
    const unitAGeo = new THREE.BoxGeometry(2.4, 2.8, 3.4);
    const unitAMat = createMat(PALETTE.creamSurface);
    const unitA = new THREE.Mesh(unitAGeo, unitAMat);
    unitA.position.set(-1.4, 1.45, 0);
    unitA.castShadow = true;
    unitA.receiveShadow = true;
    grp.add(unitA);

    // Cedar Accent Panel on Unit A
    const cedarAGeo = new THREE.BoxGeometry(2.2, 1.3, 0.08);
    const cedarAMat = createMat(PALETTE.woodCedar);
    const cedarA = new THREE.Mesh(cedarAGeo, cedarAMat);
    cedarA.position.set(-1.4, 2.1, 1.74);
    grp.add(cedarA);

    // Unit B (Right - slightly staggered)
    const unitBGeo = new THREE.BoxGeometry(2.4, 2.6, 3.2);
    const unitB = new THREE.Mesh(unitBGeo, createMat(0xfaf6f0));
    unitB.position.set(1.4, 1.35, -0.1);
    unitB.castShadow = true;
    unitB.receiveShadow = true;
    grp.add(unitB);

    // Dark Modern Fascia Roofs
    const roofGeo = new THREE.BoxGeometry(2.6, 0.18, 3.6);
    const darkMat = createMat(PALETTE.modernDark);

    const roofA = new THREE.Mesh(roofGeo, darkMat);
    roofA.position.set(-1.4, 2.9, 0);
    roofA.castShadow = true;
    grp.add(roofA);

    const roofB = new THREE.Mesh(roofGeo, darkMat);
    roofB.position.set(1.4, 2.7, -0.1);
    roofB.castShadow = true;
    grp.add(roofB);

    // Balconies
    const balcGeo = new THREE.BoxGeometry(2.0, 0.1, 0.9);
    const balcA = new THREE.Mesh(balcGeo, darkMat);
    balcA.position.set(-1.4, 1.5, 2.1);
    grp.add(balcA);

    const balcB = new THREE.Mesh(balcGeo, darkMat);
    balcB.position.set(1.4, 1.4, 1.95);
    grp.add(balcB);

    // Large Glass Picture Windows
    const winMat = new THREE.MeshStandardMaterial({
      color: PALETTE.glassWindow,
      emissive: 0xffedd5,
      emissiveIntensity: 0.4,
      flatShading: true
    });
    const winGeo = new THREE.BoxGeometry(1.6, 1.0, 0.08);

    const winA1 = new THREE.Mesh(winGeo, winMat);
    winA1.position.set(-1.4, 0.8, 1.74);
    const winA2 = new THREE.Mesh(winGeo, winMat);
    winA2.position.set(-1.4, 2.2, 1.75);

    const winB1 = new THREE.Mesh(winGeo, winMat);
    winB1.position.set(1.4, 0.7, 1.54);
    const winB2 = new THREE.Mesh(winGeo, winMat);
    winB2.position.set(1.4, 2.05, 1.54);

    grp.add(winA1, winA2, winB1, winB2);

    // Unit Doors (42A & 42B)
    const doorMat = createMat(PALETTE.terracotta);
    const doorGeo = new THREE.BoxGeometry(0.65, 1.3, 0.08);

    const doorA = new THREE.Mesh(doorGeo, doorMat);
    doorA.position.set(-2.2, 0.7, 1.72);
    const doorB = new THREE.Mesh(doorGeo, doorMat);
    doorB.position.set(2.2, 0.7, 1.52);
    grp.add(doorA, doorB);

    // Low-Poly Landscaping
    addSimpleTree(grp, -3.8, 1.6, 1.1);
    addSimpleTree(grp, 3.8, 1.2, 1.2);
    addSimpleTree(grp, -3.4, -2.0, 0.9, true);

    return grp;
  }

  // --- MODEL 2: URBAN BROWNSTONE (3-Story Triplex) ---
  function buildBrownstoneModel() {
    const grp = new THREE.Group();

    // Red Brick Main Structure
    const brickMat = createMat(0x9a3412); // Warm Terracotta / Red Brick
    const brownstoneGeo = new THREE.BoxGeometry(3.6, 4.4, 3.2);
    const brownstone = new THREE.Mesh(brownstoneGeo, brickMat);
    brownstone.position.set(0, 2.25, 0);
    brownstone.castShadow = true;
    brownstone.receiveShadow = true;
    grp.add(brownstone);

    // Classic Stoop Steps leading to Floor 2
    for (let i = 0; i < 5; i++) {
      const stepGeo = new THREE.BoxGeometry(1.2, 0.16, 0.35);
      const stepMesh = new THREE.Mesh(stepGeo, createMat(PALETTE.stonePave));
      stepMesh.position.set(0, 0.1 + i * 0.16, 1.7 + (4 - i) * 0.28);
      stepMesh.castShadow = true;
      grp.add(stepMesh);
    }

    // Classic Double Front Doors
    const doorGeo = new THREE.BoxGeometry(0.9, 1.5, 0.08);
    const doorMat = createMat(0x451a03); // Deep Mahogany
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.65, 1.63);
    grp.add(door);

    // Classic Cornice Top
    const corniceGeo = new THREE.BoxGeometry(3.9, 0.35, 3.5);
    const cornice = new THREE.Mesh(corniceGeo, createMat(0x292524));
    cornice.position.set(0, 4.55, 0);
    cornice.castShadow = true;
    grp.add(cornice);

    // Rooftop Terrace Lounge
    const umbrellaGeo = new THREE.ConeGeometry(0.8, 0.4, 8);
    const umbrella = new THREE.Mesh(umbrellaGeo, createMat(PALETTE.amber));
    umbrella.position.set(0.8, 5.2, 0.4);
    grp.add(umbrella);

    const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6);
    const pole = new THREE.Mesh(poleGeo, createMat(PALETTE.modernDark));
    pole.position.set(0.8, 4.8, 0.4);
    grp.add(pole);

    // Wrought Iron Balconies on Windows
    const ironMat = createMat(0x1c1917);
    const winMat = new THREE.MeshStandardMaterial({
      color: PALETTE.glassWindow,
      emissive: 0xfef08a,
      emissiveIntensity: 0.5,
      flatShading: true
    });

    [-1.0, 1.0].forEach(x => {
      // 3 Tiers of Windows
      [0.8, 2.2, 3.4].forEach(y => {
        const wGeo = new THREE.BoxGeometry(0.7, 0.95, 0.06);
        const wMesh = new THREE.Mesh(wGeo, winMat);
        wMesh.position.set(x, y, 1.62);
        grp.add(wMesh);

        // Small Iron Planter Box / Balcony
        const balcGeo = new THREE.BoxGeometry(0.85, 0.2, 0.25);
        const balcMesh = new THREE.Mesh(balcGeo, ironMat);
        balcMesh.position.set(x, y - 0.42, 1.74);
        grp.add(balcMesh);
      });
    });

    // Street Lamps & Cobblestone Path
    addSimpleTree(grp, -3.2, 1.8, 1.15);
    addSimpleTree(grp, 3.4, 1.8, 1.15);

    return grp;
  }

  // --- MODEL 3: HIGHLAND QUAD COMPLEX (4 Units) ---
  function buildQuadplexModel() {
    const grp = new THREE.Group();

    // Central L-Shaped Complex (Wing A & Wing B)
    const wingAGeo = new THREE.BoxGeometry(4.8, 2.5, 2.2);
    const wingAMat = createMat(PALETTE.creamSurface);
    const wingA = new THREE.Mesh(wingAGeo, wingAMat);
    wingA.position.set(0, 1.3, -0.8);
    wingA.castShadow = true;
    wingA.receiveShadow = true;
    grp.add(wingA);

    const wingBGeo = new THREE.BoxGeometry(2.2, 2.5, 2.6);
    const wingB = new THREE.Mesh(wingBGeo, createMat(0xfaf6f0));
    wingB.position.set(-1.3, 1.3, 1.2);
    wingB.castShadow = true;
    wingB.receiveShadow = true;
    grp.add(wingB);

    // Overhanging Sloped Roofs
    const roofMat = createMat(PALETTE.modernDark);
    const rAGeo = new THREE.BoxGeometry(5.1, 0.2, 2.5);
    const rA = new THREE.Mesh(rAGeo, roofMat);
    rA.position.set(0, 2.6, -0.8);
    grp.add(rA);

    const rBGeo = new THREE.BoxGeometry(2.5, 0.2, 2.8);
    const rB = new THREE.Mesh(rBGeo, roofMat);
    rB.position.set(-1.3, 2.6, 1.2);
    grp.add(rB);

    // Central Courtyard Patio with Fountain Basin
    const basinGeo = new THREE.CylinderGeometry(0.9, 1.0, 0.25, 12);
    const basin = new THREE.Mesh(basinGeo, createMat(PALETTE.stonePave));
    basin.position.set(1.4, 0.18, 1.4);
    grp.add(basin);

    const waterGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.05, 12);
    const water = new THREE.Mesh(waterGeo, createMat(PALETTE.water));
    water.position.set(1.4, 0.28, 1.4);
    grp.add(water);

    // Courtyard Benches
    const benchGeo = new THREE.BoxGeometry(0.7, 0.15, 0.25);
    const benchMat = createMat(PALETTE.woodCedar);
    const b1 = new THREE.Mesh(benchGeo, benchMat);
    b1.position.set(1.4, 0.15, 2.6);
    const b2 = new THREE.Mesh(benchGeo, benchMat);
    b2.position.set(2.6, 0.15, 1.4);
    b2.rotation.y = Math.PI / 2;
    grp.add(b1, b2);

    // Multi-Unit Windows & Patio Balconies
    const winMat = new THREE.MeshStandardMaterial({
      color: PALETTE.glassWindow,
      emissive: 0xffedd5,
      emissiveIntensity: 0.45,
      flatShading: true
    });

    [-1.6, 0.4, 1.8].forEach(x => {
      const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.06), winMat);
      w1.position.set(x, 0.7, 0.32);
      const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.06), winMat);
      w2.position.set(x, 1.8, 0.32);
      grp.add(w1, w2);
    });

    addSimpleTree(grp, -3.6, -2.4, 1.2);
    addSimpleTree(grp, 3.6, -2.2, 1.1);
    addSimpleTree(grp, 3.8, 2.4, 0.85, true);

    return grp;
  }

  function addSimpleTree(grp, x, z, scale = 1, isPine = false) {
    const t = new THREE.Group();
    t.position.set(x, 0.1, z);
    t.scale.set(scale, scale, scale);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.8, 6), createMat(PALETTE.treeTrunk));
    trunk.position.y = 0.4;
    t.add(trunk);

    if (isPine) {
      const p = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.4, 6), createMat(PALETTE.grassGreenDark));
      p.position.y = 1.3;
      p.castShadow = true;
      t.add(p);
    } else {
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), createMat(PALETTE.grassGreen));
      f.position.y = 1.25;
      f.castShadow = true;
      t.add(f);
    }
    grp.add(t);
  }

  // Model Registry
  const models = {
    duplex: buildDuplexModel(),
    brownstone: buildBrownstoneModel(),
    quadplex: buildQuadplexModel()
  };

  // Initially mount Duplex
  let currentModelKey = 'duplex';
  modelHolder.add(models.duplex);

  // Model switching logic with smooth bounce
  window.switchExplorer3DModel = function(modelKey) {
    if (!models[modelKey] || modelKey === currentModelKey) return;

    // Scale down current
    const oldModel = models[currentModelKey];
    let s = 1.0;
    const shrinkInterval = setInterval(() => {
      s -= 0.18;
      if (s <= 0.05) {
        clearInterval(shrinkInterval);
        modelHolder.remove(oldModel);

        // Mount new model and expand
        const newModel = models[modelKey];
        newModel.scale.set(0.1, 0.1, 0.1);
        modelHolder.add(newModel);
        currentModelKey = modelKey;

        let grow = 0.1;
        const growInterval = setInterval(() => {
          grow += 0.18;
          if (grow >= 1.0) {
            newModel.scale.set(1.0, 1.0, 1.0);
            clearInterval(growInterval);
          } else {
            newModel.scale.set(grow, grow, grow);
          }
        }, 16);
      } else {
        oldModel.scale.set(s, s, s);
      }
    }, 16);
  };

  // Interaction controls
  let isDragging = false;
  let prevX = 0;
  let prevY = 0;
  let targetRotY = 0.5;
  let targetRotX = 0.18;
  let autoRot = true;

  const dom = renderer.domElement;
  dom.addEventListener('mousedown', (e) => {
    isDragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
    autoRot = false;
  });

  window.addEventListener('mouseup', () => { isDragging = false; });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    prevX = e.clientX;
    prevY = e.clientY;
    targetRotY += dx * 0.007;
    targetRotX = Math.max(-0.1, Math.min(0.5, targetRotX + dy * 0.0035));
  });

  // Touch
  dom.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
      autoRot = false;
    }
  }, { passive: true });

  window.addEventListener('touchend', () => { isDragging = false; });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - prevX;
    const dy = e.touches[0].clientY - prevY;
    prevX = e.touches[0].clientX;
    prevY = e.touches[0].clientY;
    targetRotY += dx * 0.008;
    targetRotX = Math.max(-0.1, Math.min(0.5, targetRotX + dy * 0.004));
  }, { passive: true });

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    if (autoRot && !isDragging) {
      targetRotY += 0.24 * delta;
    }

    rootGroup.rotation.y += (targetRotY - rootGroup.rotation.y) * 0.08;
    rootGroup.rotation.x += (targetRotX - rootGroup.rotation.x) * 0.08;
    rootGroup.position.y = Math.sin(time * 1.6) * 0.07;

    renderer.render(scene, camera);
  }

  animate();

  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w && h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
  });
  resizeObserver.observe(container);
}
