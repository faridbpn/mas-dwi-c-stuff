import * as THREE from "three";

export const SHELF_CONFIG = [
  { status: "mau_dibaca", label: "Mau Dibaca", x: -3.4 },
  { status: "sedang_dibaca", label: "Sedang Dibaca", x: 0 },
  { status: "sudah_dibaca", label: "Sudah Dibaca", x: 3.4 },
];

const SHELF_WIDTH = 2.8;
const SHELF_DEPTH = 0.9;
const SHELF_HEIGHT = 1.4;
const WOOD_COLOR = 0x8a5a3b;

export function createShelfMesh(config) {
  const group = new THREE.Group();
  const woodMaterial = new THREE.MeshStandardMaterial({ color: WOOD_COLOR });

  const back = new THREE.Mesh(
    new THREE.BoxGeometry(SHELF_WIDTH, SHELF_HEIGHT, 0.05),
    woodMaterial,
  );
  back.position.set(0, SHELF_HEIGHT / 2, -SHELF_DEPTH / 2);

  const bottom = new THREE.Mesh(
    new THREE.BoxGeometry(SHELF_WIDTH, 0.06, SHELF_DEPTH),
    woodMaterial,
  );

  const left = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, SHELF_HEIGHT, SHELF_DEPTH),
    woodMaterial,
  );
  left.position.set(-SHELF_WIDTH / 2, SHELF_HEIGHT / 2, 0);

  const right = left.clone();
  right.position.x = SHELF_WIDTH / 2;

  // ---- BARU: plat lampu penanda drop-target, defaultnya nyala ----
  const highlight = new THREE.Mesh(
    new THREE.BoxGeometry(SHELF_WIDTH + 0.15, 0.04, SHELF_DEPTH + 0.15),
    new THREE.MeshBasicMaterial({
      color: 0x0a84ff,
      transparent: true,
      opacity: 0.4,
    }),
  );
  highlight.position.set(0, 0.03, 0);
  highlight.visible = false; // cuma nyala pas ada buku diseret ke arahnya

  group.add(back, bottom, left, right, highlight);
  group.position.set(config.x, 0, 0);
  group.userData.status = config.status;
  group.userData.label = config.label;
  group.userData.highlightMesh = highlight;

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

export function createTrashMesh() {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3a3c });
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.28, 0.6, 16),
    bodyMaterial,
  );
  body.position.y = 0.3;
  group.add(body);
  group.position.set(5.4, 0, 0.3);
  group.userData.isTrash = true;

  // ---- BARU: simpan referensi buat animasi hover ----
  group.userData.body = body;
  group.userData.baseColor = 0x3a3a3c;
  group.userData.hoverColor = 0xff3b30;
  return group;
}

export function createDashboardBoardMesh() {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.6, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x6b4a33 }),
  );
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.4, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xdccdb0 }),
  );
  board.position.z = 0.02;

  group.add(frame, board);
  // diposisikan di dinding SEBERANG rak (rak ada di z=0), jadi user perlu
  // muter kamera (OrbitControls 360) buat liat papan ini -- "menghadap arah lain"
  group.position.set(5.6, 1.3, 2.8);
  group.rotation.y = Math.PI / 2;

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  
  return group;
}
