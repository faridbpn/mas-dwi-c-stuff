import * as THREE from "three";

const STATUS_COLOR = {
  mau_dibaca: 0x5b8def,
  sedang_dibaca: 0xf0a544,
  sudah_dibaca: 0x4caf6e,
};

function createSpineTexture(title, author) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f7f3ea";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // teks diputar 90 derajat biar kayak tulisan di punggung buku asli
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#1d1d1f";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText(title.slice(0, 26), 0, -8);
  ctx.font = "22px sans-serif";
  ctx.fillStyle = "#6e6e73";
  ctx.fillText(author.slice(0, 30), 0, 26);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// urutan material BoxGeometry: [+x, -x, +y, -y, +z, -z]
// +z kita jadiin sisi depan (spine yang keliatan dari kamera)
export function createBookMesh(book) {
  const width = 0.18;
  const height = 1;
  const depth = 0.7;

  const color = STATUS_COLOR[book.status] ?? 0x999999;
  const sideMaterial = new THREE.MeshStandardMaterial({ color });
  const spineMaterial = new THREE.MeshStandardMaterial({
    map: createSpineTexture(book.title, book.author),
  });

  const materials = [
    sideMaterial, // +x
    sideMaterial, // -x
    sideMaterial, // +y (atas)
    sideMaterial, // -y (bawah)
    spineMaterial, // +z (depan, keliatan tulisan judul)
    sideMaterial, // -z
  ];

  const geometry = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.userData.bookId = book.id;
  mesh.userData.status = book.status;
  mesh.castShadow = true;
  return mesh;
}

export function disposeBookMesh(mesh) {
  mesh.geometry.dispose();
  mesh.material.forEach((m) => {
    m.map?.dispose();
    m.dispose();
  });
}