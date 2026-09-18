import * as THREE from "three";

// Konfigurasi 3 rak: mau_dibaca (kiri), sedang_dibaca (tengah), sudah_dibaca (kanan)
export const SHELF_CONFIG = [
  { status: "mau_dibaca",    x: -3,  label: "Mau Dibaca" },
  { status: "sedang_dibaca", x:  0,  label: "Sedang Dibaca" },
  { status: "sudah_dibaca",  x:  3,  label: "Sudah Dibaca" },
];

const SHELF_W = 2.6;   // lebar rak
const SHELF_D = 0.8;   // kedalaman rak
const PLANK_H = 0.06;  // tebal papan
const SIDE_T  = 0.06;  // tebal sisi kiri/kanan
const SHELF_Y = 0.0;   // posisi lantai rak

const WOOD_COLOR  = 0x8b6f47;  // coklat kayu
const WOOD_DARK   = 0x6b5237;

/**
 * Buat satu unit rak (Group) yang terdiri dari:
 * - papan atas dan bawah
 * - dua sisi kiri & kanan
 * - papan belakang
 * - label teks 2D di atas rak
 */
export function createShelfMesh(cfg) {
  const group = new THREE.Group();
  group.position.set(cfg.x, SHELF_Y, 0);
  group.userData.status = cfg.status;

  const matLight = new THREE.MeshStandardMaterial({ color: WOOD_COLOR });
  const matDark  = new THREE.MeshStandardMaterial({ color: WOOD_DARK });

  // papan bawah (lantai rak)
  const bottomPlank = new THREE.Mesh(
    new THREE.BoxGeometry(SHELF_W, PLANK_H, SHELF_D),
    matLight
  );
  bottomPlank.position.set(0, PLANK_H / 2, 0);
  group.add(bottomPlank);

  // papan atas
  const topPlank = new THREE.Mesh(
    new THREE.BoxGeometry(SHELF_W, PLANK_H, SHELF_D),
    matLight
  );
  topPlank.position.set(0, 1.2, 0);
  group.add(topPlank);

  // sisi kiri
  const leftSide = new THREE.Mesh(
    new THREE.BoxGeometry(SIDE_T, 1.2, SHELF_D),
    matDark
  );
  leftSide.position.set(-(SHELF_W / 2) + SIDE_T / 2, 0.6, 0);
  group.add(leftSide);

  // sisi kanan
  const rightSide = new THREE.Mesh(
    new THREE.BoxGeometry(SIDE_T, 1.2, SHELF_D),
    matDark
  );
  rightSide.position.set((SHELF_W / 2) - SIDE_T / 2, 0.6, 0);
  group.add(rightSide);

  // papan belakang (tipis)
  const backPanel = new THREE.Mesh(
    new THREE.BoxGeometry(SHELF_W, 1.2, 0.04),
    matDark
  );
  backPanel.position.set(0, 0.6, -(SHELF_D / 2) + 0.02);
  group.add(backPanel);

  // label teks di atas rak (pakai canvas texture)
  const labelMesh = createLabelMesh(cfg.label);
  labelMesh.position.set(0, 1.45, 0);
  group.add(labelMesh);

  return group;
}

/** Buat sprite teks 2D (canvas texture) sebagai label rak */
function createLabelMesh(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1d1d1f";
  ctx.font = "bold 52px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const geo = new THREE.PlaneGeometry(2.4, 0.35);
  return new THREE.Mesh(geo, mat);
}

/**
 * Buat grup tempat sampah sederhana (silinder + tutup)
 * yang diletakkan di pojok kanan depan.
 */
export function createTrashMesh() {
  const group = new THREE.Group();
  group.position.set(5.5, 0, 1.5);

  const matBin = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const matLid = new THREE.MeshStandardMaterial({ color: 0x333333 });

  // badan tempat sampah (silinder terbuka atas)
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.28, 0.8, 16, 1, true),
    matBin
  );
  body.position.y = 0.4;
  group.add(body);

  // alas bawah
  const bottom = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 16),
    matBin
  );
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = 0.01;
  group.add(bottom);

  // tutup/lid
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.37, 0.37, 0.06, 16),
    matLid
  );
  lid.position.y = 0.83;
  group.add(lid);

  // ikon teks "🗑" di depan (opsional, pakai label)
  const label = createLabelMesh("🗑 Hapus");
  label.position.set(0, 1.2, 0);
  label.scale.set(0.6, 0.6, 0.6);
  group.add(label);

  return group;
}
