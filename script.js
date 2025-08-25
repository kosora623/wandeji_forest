// グローバル変数
let scene, camera, renderer, controls;
let raycaster, mouse;
let groundMesh;
let trees = [];
let treeCount = 0;

// 初期化
function init() {
    // シーンの作成
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 10, 300);
    scene.background = new THREE.Color(0x87CEEB);

    // カメラの設定
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 20, 40);
    camera.lookAt(0, 0, 0);

    // レンダラーの設定
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    
    document.getElementById('scene-container').appendChild(renderer.domElement);

    // コントロールの設定
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 150;
    controls.maxPolarAngle = Math.PI / 2.1;

    // ライトの追加
    setupLights();

    // 地面の作成
    createGround();

    // 空の追加
    createSky();

    // Raycasterの初期化（クリック/タップ検出用）
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // イベントリスナー
    window.addEventListener('resize', onWindowResize);
    // マウスとタッチの両方のイベントに対応
    renderer.domElement.addEventListener('click', onInteraction);
    renderer.domElement.addEventListener('touchstart', onInteraction);

    // FPSカウンター
    startFPSCounter();
}

// ライティングの設定
function setupLights() {
    // 環境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    // 太陽光
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(100, 100, 50);
    sunLight.castShadow = true;
    
    sunLight.shadow.camera.left = -150;
    sunLight.shadow.camera.right = 150;
    sunLight.shadow.camera.top = 150;
    sunLight.shadow.camera.bottom = -150;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    
    scene.add(sunLight);

    // 半球光
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3a5f3a, 0.5);
    scene.add(hemiLight);
}

// 地面の作成
function createGround() {
    const groundGeometry = new THREE.PlaneGeometry(300, 300, 50, 50);
    
    // 地形に微妙な起伏を追加
    const vertices = groundGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        vertices[i + 2] = Math.sin(vertices[i] * 0.03) * 1 + 
                          Math.cos(vertices[i + 1] * 0.03) * 1 + 
                          Math.random() * 0.5;
    }
    groundGeometry.attributes.position.needsUpdate = true;
    groundGeometry.computeVertexNormals();

    const groundMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x3a5f3a,
        side: THREE.DoubleSide
    });

    groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);
}

// 空の作成
function createSky() {
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
        color: 0x87CEEB,
        side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);
}

// クリック/タップイベント処理
function onInteraction(event) {
    // タッチイベントで2本指以上の場合、または右クリックの場合は処理を中断
    if (event.touches && event.touches.length > 1) {
        return;
    }
    if (event.button === 2) { // 右クリック
        return;
    }

    let clientX, clientY;
    if (event.type === 'click') {
        clientX = event.clientX;
        clientY = event.clientY;
    } else if (event.type === 'touchstart') {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    }

    // マウス/タッチ座標を正規化 (-1 〜 1)
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;

    // Raycasterを使って地面との交点を計算
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(groundMesh);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        
        // 既存の木から一定距離離れているかチェック
        let canPlant = true;
        for (let tree of trees) {
            const distance = point.distanceTo(tree.position);
            if (distance < 3) { // 3メートル以内に他の木がある場合は植えない
                canPlant = false;
                break;
            }
        }

        if (canPlant) {
            plantTree(point.x, point.z);
            showClickEffect(clientX, clientY);
        }
    }
}

// 木を植える
function plantTree(x, z) {
    const tree = createRandomTree(x, z);
    scene.add(tree);
    trees.push(tree);
    treeCount++;
    document.getElementById('tree-count').textContent = treeCount;

    // 木が生えるアニメーション
    animateTreeGrowth(tree);
}

// ランダムな木を作成
function createRandomTree(x, z) {
    const tree = new THREE.Group();
    const treeType = Math.random();

    if (treeType < 0.4) {
        createPineTree(tree, x, z); // 松
    } else if (treeType < 0.7) {
        createOakTree(tree, x, z); // 広葉樹
    } else {
        createBush(tree, x, z); // 低木
    }

    return tree;
}

// 松の木
function createPineTree(tree, x, z) {
    const trunkHeight = 6 + Math.random() * 4;
    
    // 幹
    const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.6, trunkHeight, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x4A3C28 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // 葉（3層）
    const leafColors = [0x0d4f0d, 0x1a6a1a, 0x228B22];
    for (let i = 0; i < 3; i++) {
        const coneRadius = (3.5 - i * 0.8) * (0.8 + Math.random() * 0.4);
        const coneHeight = (3.5 - i * 0.6) * (0.8 + Math.random() * 0.4);
        
        const leafGeometry = new THREE.ConeGeometry(coneRadius, coneHeight, 8);
        const leafMaterial = new THREE.MeshLambertMaterial({ 
            color: leafColors[Math.floor(Math.random() * leafColors.length)]
        });
        const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
        leaves.position.y = trunkHeight + i * 2;
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        tree.add(leaves);
    }

    tree.position.set(x, 0, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    tree.scale.setScalar(0); // 最初は見えないように
    return tree;
}

// 広葉樹
function createOakTree(tree, x, z) {
    const trunkHeight = 5 + Math.random() * 3;
    
    // 幹
    const trunkGeometry = new THREE.CylinderGeometry(0.6, 0.8, trunkHeight, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // 葉（球形）
    const leafGeometry = new THREE.SphereGeometry(4 + Math.random() * 2, 8, 6);
    const leafMaterial = new THREE.MeshLambertMaterial({ color: 0x2d5016 });
    const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
    leaves.position.y = trunkHeight + 2;
    leaves.scale.y = 0.8;
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    tree.add(leaves);

    tree.position.set(x, 0, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    tree.scale.setScalar(0); // 最初は見えないように
    return tree;
}

// 低木
function createBush(tree, x, z) {
    const bushGeometry = new THREE.SphereGeometry(1 + Math.random() * 0.5, 6, 5);
    const bushMaterial = new THREE.MeshLambertMaterial({ color: 0x2d5016 });
    const bush = new THREE.Mesh(bushGeometry, bushMaterial);
    bush.position.y = 0.5;
    bush.scale.y = 0.6;
    bush.castShadow = true;
    bush.receiveShadow = true;
    tree.add(bush);

    tree.position.set(x, 0, z);
    tree.scale.setScalar(0); // 最初は見えないように
    return tree;
}

// 木が生えるアニメーション
function animateTreeGrowth(tree) {
    let scale = 0;
    const targetScale = 0.8 + Math.random() * 0.4;
    const duration = 1000; // 1秒
    const startTime = Date.now();

    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // イージング（バウンス効果）
        scale = targetScale * (progress < 0.8 ? 
            progress : 
            1 - (1 - progress) * (1 - progress));

        tree.scale.setScalar(scale);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    update();
}

// クリックエフェクト表示
function showClickEffect(x, y) {
    const effect = document.createElement('div');
    effect.className = 'click-effect';
    effect.textContent = '🌱';
    effect.style.left = `${x}px`;
    effect.style.top = `${y}px`;
    document.body.appendChild(effect);

    // アニメーション終了後に削除
    setTimeout(() => {
        if (effect.parentNode) {
            effect.parentNode.removeChild(effect);
        }
    }, 800);
}

// ウィンドウリサイズ処理
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// FPSカウンター
function startFPSCounter() {
    let frameCount = 0;
    let lastTime = performance.now();

    function updateFPS() {
        frameCount++;
        const currentTime = performance.now();
        if (currentTime >= lastTime + 1000) {
            const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
            document.getElementById('fps').textContent = fps;
            frameCount = 0;
            lastTime = currentTime;
        }
        requestAnimationFrame(updateFPS);
    }

    updateFPS();
}

// アニメーションループ
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// 実行開始
init();
animate();