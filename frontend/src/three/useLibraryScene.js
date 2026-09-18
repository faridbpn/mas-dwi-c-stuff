import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createBookMesh, disposeBookMesh } from "./bookFactory";
import {
  SHELF_CONFIG,
  createDashboardBoardMesh,
  createShelfMesh,
  createTrashMesh,
} from "./shelfFactory";
import { loadDecorModel } from "./decorFactory";

export function useLibraryScene({
  onMoveBook,
  onRequestDelete, // <- ganti nama dari onDeleteBook: sekarang cuma "minta" hapus, bukan hapus langsung
  onEditBook,
  onShelfLabelsUpdate, // <- BARU: dipanggil tiap beberapa frame, buat label "rak kosong"
}) {
  let renderer, scene, camera, controls, raycaster, pointer;
  let animationId = null;
  let container = null;
  let dashboardBoard = null;

  const bookMeshes = new Map();
  const shelfGroups = [];
  let trashGroup = null;
  const shelfCounts = {}; // status -> jumlah buku, dipakai buat tau rak kosong atau enggak

  let draggingMesh = null;
  let dragPlane = null;
  let pointerDownPos = { x: 0, y: 0 };
  const shards = [];
  let frameCount = 0;

  function init(el) {
    container = el;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef0f3);

    camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 3.2, 7);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.8, 0);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.05;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(4, 6, 4);
    scene.add(dirLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0xd8d3c8 }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    SHELF_CONFIG.forEach((cfg) => {
      const shelf = createShelfMesh(cfg);
      scene.add(shelf);
      shelfGroups.push(shelf);
      shelfCounts[cfg.status] = 0;
    });

    trashGroup = createTrashMesh();
    scene.add(trashGroup);

    dashboardBoard = createDashboardBoardMesh();
    scene.add(dashboardBoard);

    loadDecorModel({
      url: "/models/bronze_shark_statue_1k.gltf", // <- tambah extension .gltf
      targetHeight: 1.6, // tinggi target dalam unit scene (rak lo tingginya 1.4, jadi ini kira-kira segitu)
      position: [5.6, 0, 5.4], // lebih jauh lagi di ujung "lorong" belokan, past papan
      rotationY: -Math.PI / 2, // muter dikit biar gak ngadep lurus2 amat, keliatan lebih natural
    })
      .then((model) => scene.add(model))
      .catch((err) => console.warn("Model dekorasi gagal dimuat:", err));

    dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    window.addEventListener("resize", onResize);

    animate();
  }

  function updatePointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function getIntersectedBook() {
    raycaster.setFromCamera(pointer, camera);
    const meshes = [...bookMeshes.values()];
    const hits = raycaster.intersectObjects(meshes);
    return hits.length ? hits[0].object : null;
  }

  // ---- BARU: matiin semua highlight rak + balikin tempat sampah ke normal ----
  function clearDragFeedback() {
    shelfGroups.forEach((s) => (s.userData.highlightMesh.visible = false));
    trashGroup.scale.setScalar(1);
    trashGroup.userData.body.material.color.set(trashGroup.userData.baseColor);
  }

  function projectToScreen(object3D, yOffset = 1.6) {
    const worldPos = new THREE.Vector3(0, yOffset, 0).applyMatrix4(
      object3D.matrixWorld,
    );
    const viewPos = worldPos.clone().applyMatrix4(camera.matrixWorldInverse);
    const inFront = viewPos.z < 0;

    const projected = worldPos.clone().project(camera);
    const halfW = container.clientWidth / 2;
    const halfH = container.clientHeight / 2;
    return {
      x: projected.x * halfW + halfW,
      y: -projected.y * halfH + halfH,
      inFront,
    };
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    const delta = clock.getDelta();
    updateShards(delta);
    controls.update();
    renderer.render(scene, camera);

    frameCount++;
    if (frameCount % 3 === 0) {
      if (onShelfLabelsUpdate) {
        const positions = shelfGroups.map((s) => {
          const screen = projectToScreen(s);
          return {
            status: s.userData.status,
            label: s.userData.label,
            count: shelfCounts[s.userData.status] ?? 0,
            ...screen,
          };
        });
        onShelfLabelsUpdate(positions);
      }
      if (onBoardAnchorUpdate) {
        onBoardAnchorUpdate(projectToScreen(dashboardBoard, 0));
      }
    }
  }

  function onPointerDown(event) {
    updatePointer(event);
    pointerDownPos = { x: event.clientX, y: event.clientY };
    const hit = getIntersectedBook();
    if (hit) {
      draggingMesh = hit;
      controls.enabled = false;
    }
  }

  function onPointerMove(event) {
    updatePointer(event);

    if (draggingMesh) {
      raycaster.setFromCamera(pointer, camera);
      const point = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane, point);
      if (point) {
        draggingMesh.position.x = point.x;
        draggingMesh.position.z = point.z;
        draggingMesh.position.y = 0.55;
      }

      // ---- BARU: nyalain highlight rak yang lagi jadi target ----
      shelfGroups.forEach((s) => {
        const isNear =
          Math.abs(draggingMesh.position.x - s.position.x) < 1.3 &&
          s.userData.status !== draggingMesh.userData.status;
        s.userData.highlightMesh.visible = isNear;
      });

      // ---- BARU: tempat sampah membesar & memerah pas didekatin ----
      const distToTrash = draggingMesh.position.distanceTo(trashGroup.position);
      const isNearTrash = distToTrash < 1.4;
      const targetScale = isNearTrash ? 1.35 : 1;
      trashGroup.scale.setScalar(
        THREE.MathUtils.lerp(trashGroup.scale.x, targetScale, 0.25),
      );
      trashGroup.userData.body.material.color.set(
        isNearTrash
          ? trashGroup.userData.hoverColor
          : trashGroup.userData.baseColor,
      );
      return;
    }

    const hit = getIntersectedBook();
    renderer.domElement.style.cursor = hit ? "pointer" : "grab";
  }

  function onPointerUp(event) {
    controls.enabled = true;
    if (!draggingMesh) return;

    clearDragFeedback(); // matiin semua highlight begitu drop terjadi

    const movedDistance = Math.hypot(
      event.clientX - pointerDownPos.x,
      event.clientY - pointerDownPos.y,
    );
    const mesh = draggingMesh;
    draggingMesh = null;

    if (movedDistance < 6) {
      onEditBook(mesh.userData.bookId);
      layoutBooks([...bookMeshes.values()].map((m) => m.userData));
      return;
    }

    const distToTrash = mesh.position.distanceTo(trashGroup.position);
    if (distToTrash < 1) {
      // ---- Ubahan penting: shatter dulu, TAPI hapus beneran diserahin ke luar (App.vue)
      // biar ada jeda buat toast Undo, bukan langsung DELETE ke server
      shatterBook(mesh);
      onRequestDelete(mesh.userData.bookId);
      return;
    }

    const targetShelf = shelfGroups.find(
      (s) => Math.abs(mesh.position.x - s.position.x) < 1.3,
    );
    if (targetShelf && targetShelf.userData.status !== mesh.userData.status) {
      onMoveBook(mesh.userData.bookId, targetShelf.userData.status);
    } else {
      layoutBooks([...bookMeshes.values()].map((m) => m.userData));
    }
  }

  function shatterBook(mesh) {
    const origin = mesh.position.clone();
    scene.remove(mesh);
    bookMeshes.delete(mesh.userData.bookId);

    for (let i = 0; i < 10; i++) {
      const shard = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xcfcfd4 }),
      );
      shard.position.copy(origin);
      shard.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 2 + 1,
        (Math.random() - 0.5) * 3,
      );
      shard.userData.life = 0.9;
      scene.add(shard);
      shards.push(shard);
    }
    disposeBookMesh(mesh);
  }

  function updateShards(delta) {
    for (let i = shards.length - 1; i >= 0; i--) {
      const s = shards[i];
      s.userData.velocity.y -= 4 * delta;
      s.position.addScaledVector(s.userData.velocity, delta);
      s.rotation.x += delta * 4;
      s.rotation.y += delta * 4;
      s.userData.life -= delta;
      if (s.userData.life <= 0) {
        scene.remove(s);
        s.geometry.dispose();
        s.material.dispose();
        shards.splice(i, 1);
      }
    }
  }

  function layoutBooks(books) {
    for (const [id, mesh] of bookMeshes) {
      if (!books.find((b) => b.id === id)) {
        scene.remove(mesh);
        disposeBookMesh(mesh);
        bookMeshes.delete(id);
      }
    }

    SHELF_CONFIG.forEach((cfg) => {
      const shelfBooks = books.filter((b) => b.status === cfg.status);
      shelfCounts[cfg.status] = shelfBooks.length; // dipakai buat cek rak kosong

      const spacing = 0.24;
      const startX = cfg.x - ((shelfBooks.length - 1) * spacing) / 2;

      shelfBooks.forEach((book, index) => {
        let mesh = bookMeshes.get(book.id);
        if (!mesh) {
          mesh = createBookMesh(book);
          scene.add(mesh);
          bookMeshes.set(book.id, mesh);
        }
        mesh.userData.status = book.status;
        mesh.position.set(startX + index * spacing, 0.5, 0);
      });
    });
  }

  // ---- BARU: hitung posisi layar (px) tiap rak, buat nempelin label HTML "rak kosong" ----
  function projectToScreen(object3D, yOffset = 1.6) {
    const vector = new THREE.Vector3(0, yOffset, 0);
    vector.applyMatrix4(object3D.matrixWorld);
    vector.project(camera);
    const halfW = container.clientWidth / 2;
    const halfH = container.clientHeight / 2;
    return { x: vector.x * halfW + halfW, y: -vector.y * halfH + halfH };
  }

  function onResize() {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  const clock = new THREE.Clock();
  function animate() {
    animationId = requestAnimationFrame(animate);
    const delta = clock.getDelta();
    updateShards(delta);
    controls.update();
    renderer.render(scene, camera);

    // throttle: update posisi label tiap 3 frame aja (~20x/detik), gak perlu tiap frame
    frameCount++;
    if (frameCount % 3 === 0 && onShelfLabelsUpdate) {
      const positions = shelfGroups.map((s) => {
        const screen = projectToScreen(s);
        return {
          status: s.userData.status,
          label: s.userData.label,
          count: shelfCounts[s.userData.status] ?? 0,
          x: screen.x,
          y: screen.y,
        };
      });
      onShelfLabelsUpdate(positions);
    }
  }

  function destroy() {
    cancelAnimationFrame(animationId);
    window.removeEventListener("resize", onResize);
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointermove", onPointerMove);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    bookMeshes.forEach(disposeBookMesh);
    renderer.dispose();
    container?.removeChild(renderer.domElement);
  }

  return { init, layoutBooks, destroy };
}
