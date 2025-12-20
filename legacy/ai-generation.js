// ai-generation.js (final - robust with dynamic OrbitControls loader and dimension controls)
(function () {
  'use strict';

  const log = (...a) => console.log('[AI-GEN]', ...a);

  const errorBanner = (msg) => {
    const wrap = document.getElementById('viewerWrap');
    if (!wrap) return;
    let el = document.getElementById('aiGenErrorBanner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'aiGenErrorBanner';
      el.style.cssText = 'position:absolute;left:20px;top:70px;right:20px;background:#ffe5e5;color:#9a0000;padding:12px;border-radius:8px;border:1px solid #ffb3b3;z-index:2000;font-weight:600';
      wrap.appendChild(el);
    }
    el.textContent = msg;
  };

  log('script start');

  // DOM refs
  const modal = document.getElementById('progressModal');
  const progressBar = document.getElementById('progressBar');
  const progressPct = document.getElementById('progressPct');
  const progressSteps = Array.from(document.querySelectorAll('#progressSteps li'));
  const canvas = document.getElementById('threeCanvas');
  const resetViewBtn = document.getElementById('resetView');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const selectTilesBtn = document.getElementById('selectTiles');
  const crumbTileSelection = document.getElementById('crumbTileSelection');
  const pRoom = document.getElementById('pRoom');
  const pWidth = document.getElementById('pWidth');
  const pLength = document.getElementById('pLength');
  const pArea = document.getElementById('pArea');
  const pModel = document.getElementById('pModel');
  const widthSlider = document.getElementById('widthSlider');
  const lengthSlider = document.getElementById('lengthSlider');
  const heightSlider = document.getElementById('heightSlider');
  const widthValue = document.getElementById('widthValue');
  const lengthValue = document.getElementById('lengthValue');
  const heightValue = document.getElementById('heightValue');

  // tile selections coming from tile-selection.html
  let selectedFloorTile = safeParseSession('selectedFloorTile');
  let selectedWallTile = safeParseSession('selectedWallTile');
  let textureLoader;

  // inline picker refs
  const tilePickerWrap = document.getElementById('tilePickerWrap');
  const tilePickerGrid = document.getElementById('tilePickerGrid');
  const pickerFloorBtn = document.getElementById('pickerFloorBtn');
  const pickerWallBtn = document.getElementById('pickerWallBtn');

  function persistSetup() {
    try {
      sessionStorage.setItem('tileSetup', JSON.stringify(setup));
      localStorage.setItem('tileSetupBackup', JSON.stringify(setup));
    } catch (e) {
      console.warn('Failed to persist setup', e);
    }
  }

  function safeParseSession(key) {
    try {
      return JSON.parse(sessionStorage.getItem(key) || 'null');
    } catch (e) {
      return null;
    }
  }

  function disposeMaterial(mat) {
    if (!mat) return;
    if (Array.isArray(mat)) {
      mat.forEach(disposeMaterial);
      return;
    }
    if (mat.map) mat.map.dispose();
    mat.dispose();
  }

  function makeTiledMaterial(tile, fallbackColor, repeatX, repeatY, opts = {}) {
    const mat = new THREE.MeshStandardMaterial({ color: fallbackColor, roughness: opts.roughness ?? 0.95 });
    if (!tile || !tile.image) return mat;

    try {
      const tex = textureLoader.load(
        tile.image,
        () => renderer && renderer.render(scene, camera),
        undefined,
        (err) => console.warn('Failed to load tile texture', err)
      );
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(Math.max(1, repeatX), Math.max(1, repeatY));
      if (opts.rotateQuarter) {
        tex.center.set(0.5, 0.5);
        tex.rotation = Math.PI / 2;
      }
      mat.map = tex;
      mat.color.set(0xffffff);
    } catch (e) {
      console.warn('Texture creation error', e);
    }
    return mat;
  }

  function applyFloorTile(tile) {
    if (!floorMesh) return;
    const repeatX = Math.max(1, Math.round((setup.width || 10) / 3));
    const repeatY = Math.max(1, Math.round((setup.length || 12) / 3));
    const mat = makeTiledMaterial(tile, 0xdbc3a2, repeatX, repeatY, { roughness: 0.85 });
    disposeMaterial(floorMesh.material);
    floorMesh.material = mat;
  }

  function applyWallTile(tile) {
    if (!wallMeshes || !wallMeshes.length) return;
    const verticalRepeat = Math.max(1, Math.round((setup.height || 9) / 3));
    wallMeshes.forEach((wall, idx) => {
      const horizontalRepeat = idx < 2
        ? Math.max(1, Math.round((setup.width || 10) / 3))
        : Math.max(1, Math.round((setup.length || 12) / 3));
      const mat = makeTiledMaterial(tile, 0xf2efe8, horizontalRepeat, verticalRepeat, { roughness: 1 });
      disposeMaterial(wall.material);
      wall.material = mat;
    });
  }

  // inline tile picker helpers
  function setSelection(tile, type) {
    if (type === 'floor') {
      selectedFloorTile = tile;
      sessionStorage.setItem('selectedFloorTile', JSON.stringify(tile));
      applyFloorTile(tile);
    } else {
      selectedWallTile = tile;
      sessionStorage.setItem('selectedWallTile', JSON.stringify(tile));
      applyWallTile(tile);
    }
  }

  function renderTiles(type) {
    if (!tilePickerGrid) return;
    const tiles = JSON.parse(localStorage.getItem(type) || '[]');
    if (!tiles.length) {
      tilePickerGrid.innerHTML = `<div class="picker-empty">No ${type} tiles found in admin collection.</div>`;
      return;
    }
    tilePickerGrid.innerHTML = '';
    tiles.forEach((tile) => {
      const card = document.createElement('div');
      card.className = 'picker-card';
      card.innerHTML = `
        <img src="${tile.image || ''}" alt="${tile.design || 'Tile'}">
        <div class="meta">
          <div><b>Size:</b> ${tile.size || '-'}</div>
          <div><b>Design:</b> ${tile.design || '-'}</div>
          <div><b>Amount:</b> ₹${tile.amount || '-'}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        document.querySelectorAll('.picker-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        setSelection(tile, type);
      });
      const selected = type === 'floor' ? selectedFloorTile : selectedWallTile;
      if (selected && selected.image === tile.image && selected.design === tile.design) {
        card.classList.add('selected');
      }
      tilePickerGrid.appendChild(card);
    });
  }

  function loadPickerTiles(type) {
    if (pickerFloorBtn && pickerWallBtn) {
      pickerFloorBtn.classList.toggle('picker-btn-active', type === 'floor');
      pickerWallBtn.classList.toggle('picker-btn-active', type === 'wall');
    }
    renderTiles(type);
  }

  if (typeof THREE === 'undefined') {
    errorBanner('Three.js missing - check CDN.');
    console.error('Three.js not found.');
    return;
  }

  textureLoader = new THREE.TextureLoader();

  // utility: load script and return Promise
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load ' + url));
      document.head.appendChild(s);
    });
  }

  // ensure OrbitControls exists; if not, load the non-module example file
  async function ensureOrbitControls() {
    if (typeof THREE.OrbitControls !== 'undefined' || typeof window.OrbitControls !== 'undefined') {
      log('OrbitControls present');
      return;
    }
    // Use r128 to match your local three.min.js version
    const url = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
    log('OrbitControls not found — loading from', url);
    try {
      await loadScript(url);
      log('OrbitControls loaded dynamically');
    } catch (err) {
      console.error('Failed to load OrbitControls:', err);
      errorBanner('Failed to load OrbitControls. Check internet or load OrbitControls.js locally.');
      throw err;
    }
  }

  // read setup
  let setup = null;
  try {
    setup = JSON.parse(sessionStorage.getItem('tileSetup') || 'null');
  } catch (e) {
    setup = null;
  }
  if (!setup) setup = { roomType: 'Living Room', width: 15, length: 20, area: 300, model: 'Normal Room' };

  // normalize
  setup.width = Number(setup.width) || 15;
  setup.length = Number(setup.length) || 20;
  setup.height = Number(setup.height) || 9;
  setup.area = Number(setup.area) || setup.width * setup.length;

  // update panel
  if (pRoom) pRoom.textContent = setup.roomType;
  if (pWidth) pWidth.textContent = setup.width + ' ft';
  if (pLength) pLength.textContent = setup.length + ' ft';
  if (pArea) pArea.textContent = setup.area + ' sq ft';
  if (pModel) pModel.textContent = setup.model;

  // Initialize sliders if they exist
  if (widthSlider) {
    widthSlider.value = setup.width;
    if (widthValue) widthValue.textContent = setup.width + ' ft';
  }
  if (lengthSlider) {
    lengthSlider.value = setup.length;
    if (lengthValue) lengthValue.textContent = setup.length + ' ft';
  }
  if (heightSlider) {
    heightSlider.value = setup.height;
    if (heightValue) heightValue.textContent = setup.height + ' ft';
  }

  // progress sim
  const seq = [700, 900, 1200, 900, 600];
  const total = seq.reduce((a,b)=>a+b,0);
  let elapsed = 0;

  function runProgress(i=0) {
    if (!modal) return finalize();
    if (i >= seq.length) return finalize();
    const dur = seq[i];
    const start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start)/dur);
      const overall = Math.min(1, (elapsed + p * dur)/total);
      if (progressBar) progressBar.style.width = (overall*100) + '%';
      if (progressPct) progressPct.textContent = Math.round(overall*100) + '%';
      if (p < 1) requestAnimationFrame(tick);
      else {
        if (progressSteps[i]) progressSteps[i].classList.add('done');
        elapsed += dur;
        setTimeout(()=>runProgress(i+1), 160);
      }
    }
    requestAnimationFrame(tick);
  }

  async function finalize() {
    if (progressBar) progressBar.style.width = '100%';
    if (progressPct) progressPct.textContent = '100%';
    progressSteps.forEach(s => s.classList.add('done'));
    setTimeout(async () => {
      if (modal) modal.style.display = 'none';
      try {
        await ensureOrbitControls();
        initScene();
      } catch (err) {
        console.error('finalize error', err);
      }
    }, 300);
  }

  // start progress
  if (modal) modal.style.display = 'flex';
  runProgress(0);

  // ---------- build 3D ----------
  let renderer, scene, camera, controls;
  let roomGroup, floorMesh, wallMeshes = [], patchMesh, gridHelper;

  function rebuildRoom() {
    if (!roomGroup) return;
    
    const SCALE_FT = 0.12;
    const roomW = Math.max(1, setup.width) * SCALE_FT;
    const roomL = Math.max(1, setup.length) * SCALE_FT;
    const roomH = Math.max(1, setup.height) * SCALE_FT;

    // Update floor
    if (floorMesh) {
      roomGroup.remove(floorMesh);
      floorMesh.geometry.dispose();
    }
    floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(roomW, roomL),
      new THREE.MeshStandardMaterial({ color: 0xdbc3a2, roughness: 0.95 })
    );
    floorMesh.rotation.x = -Math.PI/2;
    floorMesh.receiveShadow = true;
    roomGroup.add(floorMesh);
    applyFloorTile(selectedFloorTile);
    applyFloorTile(selectedFloorTile);

    // Update walls
    wallMeshes.forEach(w => {
      roomGroup.remove(w);
      w.geometry.dispose();
    });
    wallMeshes = [];

    const wallThickness = 0.06;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 1 });

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, wallThickness), wallMat);
    backWall.position.set(0, roomH/2, -roomL/2);
    roomGroup.add(backWall);
    wallMeshes.push(backWall);

    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, wallThickness), wallMat);
    frontWall.position.set(0, roomH/2, roomL/2);
    roomGroup.add(frontWall);
    wallMeshes.push(frontWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, roomH, roomL), wallMat);
    leftWall.position.set(-roomW/2, roomH/2, 0);
    roomGroup.add(leftWall);
    wallMeshes.push(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, roomH, roomL), wallMat);
    rightWall.position.set(roomW/2, roomH/2, 0);
    roomGroup.add(rightWall);
    wallMeshes.push(rightWall);
    applyWallTile(selectedWallTile);
    applyWallTile(selectedWallTile);

    // Update patch
    if (patchMesh) {
      roomGroup.remove(patchMesh);
      patchMesh.geometry.dispose();
    }
    patchMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(roomW*0.45, roomL*0.4),
      new THREE.MeshStandardMaterial({ color: 0xa88b68, roughness: 0.95 })
    );
    patchMesh.rotation.x = -Math.PI/2;
    patchMesh.position.set(-roomW*0.12, 0.002, -roomL*0.06);
    roomGroup.add(patchMesh);

    // Update grid
    if (gridHelper) {
      scene.remove(gridHelper);
      gridHelper.geometry.dispose();
    }
    gridHelper = new THREE.GridHelper(Math.max(roomW, roomL)*1.2, 10, 0xdddddd, 0xeeeeee);
    gridHelper.position.y = 0.001;
    scene.add(gridHelper);

    // Update camera and controls
    const diag = Math.max(roomW, roomL) * 1.8;
    camera.position.set(diag, roomH * 1.2 + 0.2, diag);
    controls.target.set(0, roomH*0.45, 0);
    controls.maxDistance = Math.max(roomW, roomL) * 6;
    controls.update();

    // Update panel
    if (pArea) pArea.textContent = (setup.width * setup.length) + ' sq ft';
  }

  function initScene() {
    log('initScene');
    if (!canvas) {
      errorBanner('Canvas (#threeCanvas) not found.');
      return;
    }

    // ensure canvas CSS size (if zero)
    const parent = canvas.parentElement || document.body;
    const rect = parent.getBoundingClientRect();
    if (!canvas.clientWidth || !canvas.clientHeight) {
      const cw = rect.width || 800;
      const ch = rect.height || 520;
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';
      log('Applied fallback canvas size', cw, ch);
    }

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    // Use outputColorSpace for r128+ instead of outputEncoding
    if (renderer.outputEncoding !== undefined) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfafaf9);

    const aspect = (canvas.clientWidth || 800) / (canvas.clientHeight || 520);
    camera = new THREE.PerspectiveCamera(45, aspect, 0.05, 2000);

    const SCALE_FT = 0.12;
    const roomW = Math.max(1, setup.width) * SCALE_FT;
    const roomL = Math.max(1, setup.length) * SCALE_FT;
    const roomH = Math.max(1, setup.height) * SCALE_FT;
    const diag = Math.max(roomW, roomL) * 1.8;
    camera.position.set(diag, roomH * 1.2 + 0.2, diag);
    camera.lookAt(0, roomH * 0.45, 0);

    // lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 0.9);
    hemi.position.set(0, roomH * 3, 0);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(-roomW*1.3, roomH*2, roomL*1.3);
    scene.add(dir);

    // group
    roomGroup = new THREE.Group();
    scene.add(roomGroup);

    // floor
    floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(roomW, roomL),
      new THREE.MeshStandardMaterial({ color: 0xdbc3a2, roughness: 0.95 })
    );
    floorMesh.rotation.x = -Math.PI/2;
    floorMesh.receiveShadow = true;
    roomGroup.add(floorMesh);

    // walls
    const wallThickness = 0.06;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 1 });

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, wallThickness), wallMat);
    backWall.position.set(0, roomH/2, -roomL/2);
    roomGroup.add(backWall);
    wallMeshes.push(backWall);

    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, wallThickness), wallMat);
    frontWall.position.set(0, roomH/2, roomL/2);
    roomGroup.add(frontWall);
    wallMeshes.push(frontWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, roomH, roomL), wallMat);
    leftWall.position.set(-roomW/2, roomH/2, 0);
    roomGroup.add(leftWall);
    wallMeshes.push(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, roomH, roomL), wallMat);
    rightWall.position.set(roomW/2, roomH/2, 0);
    roomGroup.add(rightWall);
    wallMeshes.push(rightWall);

    // small rug patch
    patchMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(roomW*0.45, roomL*0.4),
      new THREE.MeshStandardMaterial({ color: 0xa88b68, roughness: 0.95 })
    );
    patchMesh.rotation.x = -Math.PI/2;
    patchMesh.position.set(-roomW*0.12, 0.002, -roomL*0.06);
    roomGroup.add(patchMesh);

    // grid helper
    gridHelper = new THREE.GridHelper(Math.max(roomW, roomL)*1.2, 10, 0xdddddd, 0xeeeeee);
    gridHelper.position.y = 0.001;
    scene.add(gridHelper);

    // OrbitControls: support THREE.OrbitControls or window.OrbitControls
    const Controls = THREE.OrbitControls || window.OrbitControls;
    if (!Controls) {
      errorBanner('OrbitControls not available after load.');
      throw new Error('OrbitControls not available');
    }

    controls = new Controls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.1;
    controls.maxDistance = Math.max(roomW, roomL) * 6;
    controls.target.set(0, roomH*0.45, 0);
    controls.update();

    // resize handling
    window.addEventListener('resize', () => {
      try {
        const w = canvas.clientWidth || canvas.parentElement.clientWidth || 800;
        const h = canvas.clientHeight || canvas.parentElement.clientHeight || 520;
        renderer.setSize(w, h, false);
        camera.aspect = w/h;
        camera.updateProjectionMatrix();
      } catch (e) {
        console.warn('resize error', e);
      }
    });

    // animation loop
    (function animate() {
      requestAnimationFrame(animate);
      if (controls) controls.update();
      renderer.render(scene, camera);
    })();

    // UI controls
    if (resetViewBtn) {
      resetViewBtn.addEventListener('click', () => {
        const SCALE_FT = 0.12;
        const roomW = Math.max(1, setup.width) * SCALE_FT;
        const roomL = Math.max(1, setup.length) * SCALE_FT;
        const roomH = Math.max(1, setup.height) * SCALE_FT;
        const diag = Math.max(roomW, roomL) * 1.8;
        camera.position.set(diag, roomH * 1.2 + 0.2, diag);
        controls.target.set(0, roomH*0.45, 0);
        controls.update();
      });
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        const el = renderer.domElement;
        if (!document.fullscreenElement) el.requestFullscreen && el.requestFullscreen();
        else document.exitFullscreen && document.exitFullscreen();
      });
    }

    if (selectTilesBtn) {
      selectTilesBtn.addEventListener('click', () => {
        persistSetup();
      if (tilePickerWrap) {
        tilePickerWrap.classList.remove('hidden');
        loadPickerTiles('floor');
      }
      });
    }
  if (crumbTileSelection) {
    crumbTileSelection.addEventListener('click', () => {
      persistSetup();
      if (tilePickerWrap) {
        tilePickerWrap.classList.remove('hidden');
        loadPickerTiles('floor');
      } else {
        window.location.href = 'tile-selection.html';
      }
    });
  }

    // Add slider event listeners
    if (widthSlider) {
      widthSlider.addEventListener('input', (e) => {
        setup.width = Number(e.target.value);
        if (widthValue) widthValue.textContent = setup.width + ' ft';
        if (pWidth) pWidth.textContent = setup.width + ' ft';
        setup.area = setup.width * setup.length;
        if (pArea) pArea.textContent = (setup.area) + ' sq ft';
        persistSetup();
        rebuildRoom();
      });
    }

    if (lengthSlider) {
      lengthSlider.addEventListener('input', (e) => {
        setup.length = Number(e.target.value);
        if (lengthValue) lengthValue.textContent = setup.length + ' ft';
        if (pLength) pLength.textContent = setup.length + ' ft';
        setup.area = setup.width * setup.length;
        if (pArea) pArea.textContent = (setup.area) + ' sq ft';
        persistSetup();
        rebuildRoom();
      });
    }

    if (heightSlider) {
      heightSlider.addEventListener('input', (e) => {
        setup.height = Number(e.target.value);
        if (heightValue) heightValue.textContent = setup.height + ' ft';
        persistSetup();
        rebuildRoom();
      });
    }

  if (pickerFloorBtn) pickerFloorBtn.addEventListener('click', () => loadPickerTiles('floor'));
  if (pickerWallBtn) pickerWallBtn.addEventListener('click', () => loadPickerTiles('wall'));

    log('3D scene ready');
  } // initScene

})(); // IIFE end