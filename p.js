import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createBookMesh, disposeBookMesh } from "./bookFactory";
import { SHELF_CONFIG, createShelfMesh, createTrashMesh } from "./shelfFactory";

export function useLibraryScene({ onMoveBook, onDeleteBook, onEditBook }) {
  let renderer, scene, camera, controls, raycaster, pointer;
  let animationId = null;
  let container = null;

  const bookMeshes = new Map(); // bookId -> mesh
  const shelfGroups = [];
  let trashGroup = null;

  let draggingMesh = null;
  let dragPlane = null;
  let pointerDownPos = { x: 0, y: 0 };
  const shards = []; // partikel pecahan aktif

  function init(el) {
    container = el;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef0f3);

    camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 3.2, 7);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // OrbitControls = kamera bisa diputer 360 derajat pakai mouse (drag klik-kanan/kiri + scroll zoom)
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.8, 0);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.05; // biar gak nembus lantai

    // pencahayaan
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(4, 6, 4);
    scene.add(dirLight);

    // lantai
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0xd8d3c8 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // rak-rak
    SHELF_CONFIG.forEach((cfg) => {
      const shelf = createShelfMesh(cfg);
      scene.add(shelf);
      shelfGroups.push(shelf);
    });

    // tempat sampah
    trashGroup = createTrashMesh();
    scene.add(trashGroup);

    // bidang datar tak-kasat-mata buat proyeksi drag (tinggi = tinggi buku berdiri)
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

  function onPointerDown(event) {
    updatePointer(event);
    pointerDownPos = { x: event.clientX, y: event.clientY };
    const hit = getIntersectedBook();
    if (hit) {
      draggingMesh = hit;
      controls.enabled = false; // matiin orbit sementara biar gak rebutan sama drag
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
        draggingMesh.position.y = 0.5 + 0.05; // sedikit terangkat pas diseret
      }
      return;
    }

    // hover: cuma buat kursor jadi pointer, biar kerasa "bisa diklik"
    const hit = getIntersectedBook();
    renderer.domElement.style.cursor = hit ? "pointer" : "grab";
  }

  function onPointerUp(event) {
    controls.enabled = true;
    if (!draggingMesh) return;

    const movedDistance = Math.hypot(
      event.clientX - pointerDownPos.x,
      event.clientY - pointerDownPos.y
    );
    const mesh = draggingMesh;
    draggingMesh = null;

    // gerakan kecil (< 6px) dianggap KLIK, bukan drag -> buka modal edit
    if (movedDistance < 6) {
      onEditBook(mesh.userData.bookId);
      snapBookBack(mesh);
      return;
    }

    // deket tempat sampah? -> hapus + animasi hancur
    const distToTrash = mesh.position.distanceTo(trashGroup.position);
    if (distToTrash < 1) {
      shatterBook(mesh);
      onDeleteBook(mesh.userData.bookId);
      return;
    }

    // deket rak mana? -> ganti status
    const targetShelf = shelfGroups.find(
      (s) => Math.abs(mesh.position.x - s.position.x) < 1.3
    );
    if (targetShelf && targetShelf.userData.status !== mesh.userData.status) {
      onMoveBook(mesh.userData.bookId, targetShelf.userData.status);
      // posisi final beneran diatur ulang pas data ke-refresh (layoutBooks)
    } else {
      snapBookBack(mesh);
    }
  }

  function snapBookBack(mesh) {
    // biarin layoutBooks() yang rapiin ulang posisi pas data disinkronkan
    layoutBooks([...bookMeshes.values()].map((m) => m.userData));
  }

  // ---------- animasi hancur: pecahan kubus kecil terbang + jatuh ----------
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
      shard.userData.life = 0.9; // detik
      scene.add(shard);
      shards.push(shard);
    }

    disposeBookMesh(mesh);
  }

  function updateShards(delta) {
    for (let i = shards.length - 1; i >= 0; i--) {
      const s = shards[i];
      s.userData.velocity.y -= 4 * delta; // gravitasi sederhana
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

  // ---------- sinkronisasi data buku (dipanggil tiap `books` berubah) ----------
  function layoutBooks(books) {
    // hapus mesh buku yang udah gak ada di data
    for (const [id, mesh] of bookMeshes) {
      if (!books.find((b) => b.id === id)) {
        scene.remove(mesh);
        disposeBookMesh(mesh);
        bookMeshes.delete(id);
      }
    }

    SHELF_CONFIG.forEach((cfg) => {
      const shelfBooks = books.filter((b) => b.status === cfg.status);
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

  const clock = new THREE.Clock();
  function animate() {
    animationId = requestAnimationFrame(animate);
    const delta = clock.getDelta();
    updateShards(delta);
    controls.update();
    renderer.render(scene, camera);
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