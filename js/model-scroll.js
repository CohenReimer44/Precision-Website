import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

(function () {
  var section = document.getElementById("model-scroll");
  var canvas = document.getElementById("model-canvas");
  var slogan = document.getElementById("model-slogan");
  var sloganOuter = slogan
    ? slogan.querySelector(".model-slogan-ring-outer")
    : null;
  var sloganInner = slogan
    ? slogan.querySelector(".model-slogan-ring-inner")
    : null;
  if (!section || !canvas) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TILT = Math.PI / 4;
  /* Same turn count over a much longer scroll = slower spin */
  var TURNS = 2.35;

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  var scene = new THREE.Scene();
  scene.background = null;
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = buildReflectionEnv(pmrem);

  var camera = new THREE.PerspectiveCamera(40, 1, 0.005, 20);
  var cameraBase = { x: 0, y: 0, z: 0.48 };
  camera.position.set(cameraBase.x, cameraBase.y, cameraBase.z);

  /*
   * Skip EffectComposer here — bloom passes flatten alpha on a transparent
   * canvas. Filament bloom is handled with additive sprites + emissive instead.
   * Glass still uses MeshPhysicalMaterial transmission / IOR / thickness.
   */
  scene.add(new THREE.AmbientLight(0x101018, 0.18));

  var key = new THREE.DirectionalLight(0xffe2b0, 0.22);
  key.position.set(0.55, 1.1, 0.75);
  scene.add(key);

  var rim = new THREE.DirectionalLight(0x9eb6ff, 0.16);
  rim.position.set(-1.35, 0.15, -0.95);
  scene.add(rim);

  var fill = new THREE.DirectionalLight(0xffc48a, 0.1);
  fill.position.set(-0.2, -0.8, 0.9);
  scene.add(fill);

  var spinner = new THREE.Group();
  scene.add(spinner);

  var tilt = new THREE.Group();
  tilt.rotation.z = -TILT;
  spinner.add(tilt);

  var sway = new THREE.Group();
  tilt.add(sway);

  var haloTex = makeHaloTexture();
  var halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: haloTex,
      color: 0xffb24a,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
  );
  halo.scale.set(0.28, 0.28, 1);
  halo.position.set(0, 0.02, -0.04);
  halo.renderOrder = -2;
  sway.add(halo);

  var wash = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: haloTex,
      color: 0xff9a3a,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
  );
  wash.scale.set(0.55, 0.55, 1);
  wash.position.set(0, 0.02, -0.06);
  wash.renderOrder = -3;
  sway.add(wash);

  /* Tight core bloom — reads like photographic filament bloom */
  var coreBloom = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: haloTex,
      color: 0xfff1c2,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  );
  coreBloom.scale.set(0.1, 0.1, 1);
  coreBloom.position.set(0, 0.02, -0.02);
  coreBloom.renderOrder = -1;
  sway.add(coreBloom);

  var filamentCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.0045, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xfff8e4,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      toneMapped: false,
    })
  );
  filamentCore.position.set(0, 0.02, 0);
  sway.add(filamentCore);

  /* Point lights at the filament drive glass highlights + base bounce */
  var filamentLight = new THREE.PointLight(0xffc857, 8, 0.55, 2);
  filamentLight.position.set(0, 0.02, 0);
  sway.add(filamentLight);

  var spillLight = new THREE.PointLight(0xffb24a, 3.2, 2.2, 2);
  spillLight.position.set(0, 0.02, 0);
  sway.add(spillLight);

  var filamentMats = [];
  var baseMats = [];

  var pointer = { x: 0, y: 0 };
  var targetPointer = { x: 0, y: 0 };
  var displayProgress = reduced ? 0.35 : 0;
  var scrollProgress = displayProgress;

  var colorWarm = new THREE.Color(0xffc857);
  var colorEnd = new THREE.Color(0xfe1e42);
  var colorScratch = new THREE.Color();
  var colorHot = new THREE.Color(0xfff4cc);

  function buildReflectionEnv(generator) {
    /* Warm studio strips → sharp glass reflections like the reference */
    var envScene = new THREE.Scene();
    envScene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(6, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x040406, side: THREE.BackSide })
      )
    );

    function addStrip(color, w, h, x, y, z, rx, ry) {
      var mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide })
      );
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx || 0, ry || 0, 0);
      envScene.add(mesh);
    }

    addStrip(0xfff2d6, 4.5, 0.35, 0, 2.2, -2.4, 0, 0);
    addStrip(0xffd9a0, 0.45, 3.2, -2.6, 0.4, 0.2, 0, Math.PI / 2);
    addStrip(0xdce7ff, 0.35, 2.6, 2.5, 0.2, -0.4, 0, -Math.PI / 2);
    addStrip(0xffb45a, 2.2, 0.25, 0.4, -1.8, 1.6, 0.4, 0.2);
    addStrip(0xffffff, 1.1, 0.12, 1.2, 1.4, 2.0, -0.2, 0.5);

    /* Soft room bounce under the strip lights */
    envScene.add(new RoomEnvironment());
    return generator.fromScene(envScene, 0.03).texture;
  }

  function makeHaloTexture() {
    var size = 512;
    var c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    var ctx = c.getContext("2d");
    var g = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    /* Fall to zero early so the sprite rim never reads as a hard edge */
    g.addColorStop(0, "rgba(255,255,245,1)");
    g.addColorStop(0.08, "rgba(255,220,140,0.5)");
    g.addColorStop(0.2, "rgba(255,160,50,0.2)");
    g.addColorStop(0.38, "rgba(255,110,25,0.07)");
    g.addColorStop(0.55, "rgba(160,50,0,0.02)");
    g.addColorStop(0.7, "rgba(40,10,0,0.004)");
    g.addColorStop(0.82, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /* Responsive at the start so the spin begins as soon as the bulb locks center */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function smoothToward(current, target, delta, rate) {
    var k = 1 - Math.exp(-rate * delta);
    return current + (target - current) * k;
  }

  function colorAt(t) {
    var p = Math.min(1, Math.max(0, t));
    return colorScratch.copy(colorWarm).lerp(colorEnd, p);
  }

  function fitModel(root) {
    var box = new THREE.Box3().setFromObject(root);
    var size = new THREE.Vector3();
    var center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    root.position.sub(center);

    var maxDim = Math.max(size.x, size.y, size.z) || 1;
    root.scale.setScalar(0.17 / maxDim);

    box.setFromObject(root);
    box.getCenter(center);
    root.position.x -= center.x;
    root.position.y -= center.y;
    root.position.z -= center.z;
  }

  function prepMaterials(root) {
    filamentMats.length = 0;
    baseMats.length = 0;

    root.traverse(function (child) {
      if (!child.isMesh || !child.material) return;
      var mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(function (mat) {
        if (!mat) return;
        var name = ((mat.name || "") + " " + (child.name || "")).toLowerCase();

        if (/glass/.test(name) || (mat.transmission && mat.transmission > 0)) {
          /*
           * MeshPhysicalMaterial transmission + IOR + thickness =
           * screen-space refraction and env reflections (WebGL PBR path).
           */
          var glass = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0,
            roughness: 0.045,
            transmission: 1,
            thickness: 0.42,
            ior: 1.5,
            attenuationColor: new THREE.Color(0xfff1d2),
            attenuationDistance: 0.85,
            transparent: true,
            opacity: 1,
            envMapIntensity: 2.4,
            depthWrite: true,
            side: THREE.DoubleSide,
            clearcoat: 1,
            clearcoatRoughness: 0.03,
            specularIntensity: 1,
            reflectivity: 0.55,
          });

          if (mat.map) glass.map = mat.map;
          if (mat.normalMap) {
            glass.normalMap = mat.normalMap;
            glass.normalScale = mat.normalScale
              ? mat.normalScale.clone()
              : new THREE.Vector2(0.35, 0.35);
          }
          if (mat.roughnessMap) glass.roughnessMap = mat.roughnessMap;
          if (mat.metalnessMap) glass.metalnessMap = mat.metalnessMap;
          if (mat.aoMap) glass.aoMap = mat.aoMap;

          if (Array.isArray(child.material)) {
            var idx = child.material.indexOf(mat);
            if (idx >= 0) child.material[idx] = glass;
          } else {
            child.material = glass;
          }
          return;
        }

        /* Screw base — dark metal that still catches warm reflections */
        mat.color = new THREE.Color(0x2a2e33);
        mat.metalness = Math.max(mat.metalness || 0, 0.92);
        mat.roughness = Math.min(Math.max(mat.roughness || 0.4, 0.28), 0.5);
        mat.envMapIntensity = 0.85;
        if (mat.map) mat.color.setHex(0x3a4048);
        baseMats.push(mat);

        if (mat.emissiveMap || (mat.emissive && mat.emissive.getHex() !== 0)) {
          mat.emissiveIntensity = 6.5;
          mat.toneMapped = false;
          filamentMats.push({
            mat: mat,
            base: mat.emissive.clone(),
          });
        }
      });
    });
  }

  new GLTFLoader().load(
    "models/lightbulb/lightbulb.gltf",
    function (gltf) {
      var root = gltf.scene;
      fitModel(root);
      prepMaterials(root);
      sway.add(root);

      var box = new THREE.Box3().setFromObject(root);
      var size = new THREE.Vector3();
      box.getSize(size);
      var span = Math.max(size.x, size.y, size.z);
      halo.scale.set(span * 2.4, span * 2.4, 1);
      wash.scale.set(span * 4.2, span * 4.2, 1);
      coreBloom.scale.set(span * 0.85, span * 0.85, 1);
      var fy = size.y * 0.1;
      filamentLight.position.set(0, fy, 0);
      spillLight.position.set(0, fy, 0);
      filamentCore.position.set(0, fy, 0);
      halo.position.set(0, fy, -0.025);
      wash.position.set(0, fy, -0.05);
      coreBloom.position.set(0, fy, -0.015);
    },
    undefined,
    function () {}
  );

  function resize() {
    var width = canvas.clientWidth;
    var height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function getScrollProgress() {
    var rect = section.getBoundingClientRect();
    var sticky = section.querySelector(".model-scroll-canvas-sticky");
    var stickyH = sticky ? sticky.offsetHeight : window.innerHeight;
    var stickTop = sticky
      ? parseFloat(getComputedStyle(sticky).top) || 0
      : 0;
    /* 0 = bulb just locked under the header (centered stage); 1 = end of sticky travel */
    var total = section.offsetHeight - stickyH;
    if (total <= 0) return 0;
    var traveled = stickTop - rect.top;
    return Math.min(1, Math.max(0, traveled / total));
  }

  function syncSlogan(progress, spinRad, time) {
    if (!slogan) return;
    var show = !reduced && progress > 0.06 && progress < 0.92;
    slogan.classList.toggle("is-visible", show);

    var deg = (-spinRad * 180) / Math.PI;
    if (sloganOuter) {
      sloganOuter.style.transform =
        "rotate(" + (deg * 0.55 + time * 4) + "deg)";
    }
    if (sloganInner) {
      sloganInner.style.transform =
        "rotate(" + (-deg * 0.85 - time * 6) + "deg)";
    }
  }

  function onPointerMove(event) {
    var rect = canvas.getBoundingClientRect();
    var x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    var y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    targetPointer.x = Math.max(-1, Math.min(1, x));
    targetPointer.y = Math.max(-1, Math.min(1, y));
  }

  function onPointerLeave() {
    targetPointer.x = 0;
    targetPointer.y = 0;
  }

  section.addEventListener("pointermove", onPointerMove);
  section.addEventListener("pointerleave", onPointerLeave);
  window.addEventListener("resize", resize);
  resize();

  var clock = new THREE.Clock();

  function frame() {
    var delta = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;

    scrollProgress = reduced ? 0.35 : getScrollProgress();
    /* Snappier follow so spin starts the moment the bulb is centered */
    displayProgress = smoothToward(displayProgress, scrollProgress, delta, 3.2);
    var eased = easeOutCubic(displayProgress);

    pointer.x += (targetPointer.x - pointer.x) * 0.08;
    pointer.y += (targetPointer.y - pointer.y) * 0.08;

    var spin = eased * Math.PI * 2 * TURNS;
    spinner.rotation.y = spin;
    syncSlogan(displayProgress, spin, t);

    var idle = 1 - Math.min(1, Math.abs(scrollProgress - displayProgress) * 8);
    var swayAmt = reduced ? 0.004 : 0.018 * (0.35 + 0.65 * idle);
    sway.rotation.x = Math.sin(t * 0.85) * swayAmt * 0.35 + pointer.y * -0.02;
    sway.rotation.z = Math.sin(t * 0.62 + 0.5) * swayAmt * 0.45 + pointer.x * 0.02;
    sway.position.y = Math.sin(t * 0.75) * 0.002;

    var c = colorAt(eased);
    var pulse = 1 + Math.sin(t * 3.4) * 0.05;

    for (var i = 0; i < filamentMats.length; i++) {
      var entry = filamentMats[i];
      entry.mat.emissive.copy(colorHot).lerp(c, 0.35);
      entry.mat.emissiveIntensity = 7.2 * pulse;
    }

    filamentCore.material.color.copy(colorHot).lerp(c, 0.18);
    filamentLight.color.copy(c);
    filamentLight.intensity = 9.0 * pulse;
    spillLight.color.copy(c);
    spillLight.intensity = 3.4 * pulse;

    halo.material.color.copy(c);
    halo.material.opacity = 0.4 + Math.sin(t * 2.2) * 0.05;
    wash.material.color.copy(c);
    wash.material.opacity = 0.16 + Math.sin(t * 1.6) * 0.03;
    coreBloom.material.color.copy(colorHot).lerp(c, 0.15);
    coreBloom.material.opacity = 0.62 + Math.sin(t * 3.1) * 0.08;

    camera.position.x = cameraBase.x + pointer.x * 0.012;
    camera.position.y = cameraBase.y + pointer.y * -0.008;
    camera.position.z = cameraBase.z;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
