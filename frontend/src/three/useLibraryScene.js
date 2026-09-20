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
import {
  createTerrain,
  createSky,
  createMountains,
  setupOutdoorLighting,
} from "./enviroment"; // <- FIX: cek ini sesuai nama file asli lo

export function useLibraryScene({
  onMoveBook,
  onRequestDelete,
  onEditBook,
  onShelfLabelsUpdate,
  onBoardAnchorUpdate, // <- FIX: ditambahin, sebelumnya ketinggalan
}) {
  let renderer, scene, camera, controls, raycaster, pointer;
  let animationId = null;
  let container = null;
  let dashboardBoard = null;

  const bookMeshes = new Map();
  const shelfGroups = [];
  let trashGroup = null;
  const shelfCounts = {};

  let draggingMesh = null;
  let lastInteractionAt = performance.now();
  const IDLE_THRESHOLD_MS = 15000; // <- balikin ke 15 detik (atau sesuai selera lo)
  let dragPlane = null;
  let pointerDownPos = { x: 0, y: 0 };
  const shards = [];
  let frameCount = 0;
  const clock = new THREE.Clock(); // <- FIX: cukup 1 kali, ditaruh di sini biar rapi

  function init(el) {
    container = el;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef0f3);

    camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      500
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

    scene.add(createSky());
    scene.fog = new THREE.Fog(0xbcdcff, 30, 140);
    setupOutdoorLighting(scene, renderer);
    scene.add(createTerrain());
    scene.add(createMountains());

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
    dashboardBoard.userData.baseY = dashboardBoard.position.y;

    loadDecorModel({
      url: "/models/bronze_shark_statue_1k.gltf",
      targetHeight: 1.6,
      position: [5.6, 0, 5.4],
      rotationY: -Math.PI / 2,
    })
      .then((model) => scene.add(model))
      .catch((err) => console.warn("Model dekorasi gagal dimuat:", err));

    dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    renderer.domElement.addEventListener("wheel", () => {
      lastInteractionAt = performance.now();
    });
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

  function clearDragFeedback() {
    shelfGroups.forEach((s) => (s.userData.highlightMesh.visible = false));
    trashGroup.scale.setScalar(1);
    trashGroup.userData.body.material.color.set(trashGroup.userData.baseColor);
  }

  // FIX: cuma SATU versi projectToScreen, yang ada `inFront`-nya
  function projectToScreen(object3D, yOffset = 1.6) {
    const worldPos = new THREE.Vector3(0, yOffset, 0).applyMatrix4(
      object3D.matrixWorld
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

  // FIX: cuma SATU versi animate, gabungan idle motion + auto-orbit + label update
  function animate() {
    animationId = requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    updateShards(delta);
    updateIdleMotion(elapsed);

    const idleFor = performance.now() - lastInteractionAt;
    controls.autoRotate = idleFor > IDLE_THRESHOLD_MS && !draggingMesh;
    controls.autoRotateSpeed = 0.4;
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

  function updateIdleMotion(elapsed) {
    bookMeshes.forEach((mesh) => {
      if (mesh === draggingMesh) return;
      const { idleSeed, idleSpeed } = mesh.userData;
      mesh.rotation.z = Math.sin(elapsed * idleSpeed + idleSeed) * 0.025;
      mesh.position.y =
        0.5 + Math.sin(elapsed * idleSpeed * 0.7 + idleSeed) * 0.01;
    });

    if (dashboardBoard) {
      dashboardBoard.position.y =
        dashboardBoard.userData.baseY + Math.sin(elapsed * 0.5) * 0.03;
    }

    if (trashGroup) {
      trashGroup.rotation.y = Math.sin(elapsed * 0.4) * 0.05;
    }
  }

  function onPointerDown(event) {
    lastInteractionAt = performance.now();
    updatePointer(event);
    pointerDownPos = { x: event.clientX, y: event.clientY };
    const hit = getIntersectedBook();
    if (hit) {
      draggingMesh = hit;
      controls.enabled = false;
    }
  }

  function onPointerMove(event) {
    lastInteractionAt = performance.now();
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

      shelfGroups.forEach((s) => {
        const isNear =
          Math.abs(draggingMesh.position.x - s.position.x) < 1.3 &&
          s.userData.status !== draggingMesh.userData.status;
        s.userData.highlightMesh.visible = isNear;
      });

      const distToTrash = draggingMesh.position.distanceTo(trashGroup.position);
      const isNearTrash = distToTrash < 1.4;
      const targetScale = isNearTrash ? 1.35 : 1;
      trashGroup.scale.setScalar(
        THREE.MathUtils.lerp(trashGroup.scale.x, targetScale, 0.25)
      );
      trashGroup.userData.body.material.color.set(
        isNearTrash
          ? trashGroup.userData.hoverColor
          : trashGroup.userData.baseColor
      );
      return;
    }

    const hit = getIntersectedBook();
    renderer.domElement.style.cursor = hit ? "pointer" : "grab";
  }

  function onPointerUp(event) {
    controls.enabled = true;
    if (!draggingMesh) return;

    clearDragFeedback();

    const movedDistance = Math.hypot(
      event.clientX - pointerDownPos.x,
      event.clientY - pointerDownPos.y
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
      shatterBook(mesh);
      onRequestDelete(mesh.userData.bookId);
      return;
    }

    const targetShelf = shelfGroups.find(
      (s) => Math.abs(mesh.position.x - s.position.x) < 1.3
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
        new THREE.MeshStandardMaterial({ color: 0xcfcfd4 })
      );
      shard.position.copy(origin);
      shard.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 2 + 1,
        (Math.random() - 0.5) * 3
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
      shelfCounts[cfg.status] = shelfBooks.length;

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

  function onResize() {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
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