import * as THREE from "three";
import { findCoverUrl } from "../api/openLibrary";
import { genreColor } from "./genrePalette";

const STATUS_COLOR = {
  mau_dibaca: 0x5b8def,
  sedang_dibaca: 0xf0a544,
  sudah_dibaca: 0x4caf6e,
};

function drawSpineCanvas(book, coverImage) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  if (coverImage) {
    const scale = Math.max(canvas.width / coverImage.width, canvas.height / coverImage.height);
    const w = coverImage.width * scale;
    const h = coverImage.height * scale;
    ctx.drawImage(coverImage, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);

    const gradient = ctx.createLinearGradient(0, canvas.height * 0.6, 0, canvas.height);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
  } else {
    ctx.fillStyle = "#f7f3ea";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (book.genre) {
    ctx.fillStyle = genreColor(book.genre);
    ctx.fillRect(0, 0, canvas.width, 22);
  }

  const textColor = coverImage ? "#ffffff" : "#1d1d1f";
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height - 90);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText((book.title || "").slice(0, 26), 0, 0);
  ctx.font = "20px sans-serif";
  ctx.fillStyle = coverImage ? "rgba(255,255,255,0.85)" : "#6e6e73";
  ctx.fillText((book.author || "").slice(0, 30), 0, 28);
  ctx.restore();

  if (book.rating > 0) {
    ctx.font = "22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffcc00";
    ctx.fillText("★".repeat(book.rating) + "☆".repeat(5 - book.rating), canvas.width / 2, canvas.height - 20);
  }

  return canvas;
}

function buildMaterials(book, coverImage) {
  const color = STATUS_COLOR[book.status] ?? 0x999999;
  const sideMaterial = new THREE.MeshStandardMaterial({ color });
  const texture = new THREE.CanvasTexture(drawSpineCanvas(book, coverImage));
  texture.needsUpdate = true;
  const spineMaterial = new THREE.MeshStandardMaterial({ map: texture });
  return [sideMaterial, sideMaterial, sideMaterial, sideMaterial, spineMaterial, sideMaterial];
}

function disposeMaterials(materials) {
  materials.forEach((m) => { m.map?.dispose(); m.dispose(); });
}

export function createBookMesh(book) {
  const geometry = new THREE.BoxGeometry(0.18, 1, 0.7);
  const mesh = new THREE.Mesh(geometry, buildMaterials(book, null));
  mesh.userData.bookId = book.id;
  mesh.userData.status = book.status;
  mesh.castShadow = true;

   // BARU: fase & kecepatan acak, biar goyangnya gak seragam/robotik
  mesh.userData.idleSeed = Math.random() * Math.PI * 2;
  mesh.userData.idleSpeed = 0.8 + Math.random() * 0.6;

  loadCoverInto(mesh, book); // async, gak nge-block render pertama
  return mesh;
}

async function loadCoverInto(mesh, book) {
  const url = await findCoverUrl(book.title, book.author);
  if (!url || mesh.userData.disposed) return;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    if (mesh.userData.disposed) return;
    const oldMaterials = mesh.material;
    mesh.material = buildMaterials(book, img);
    disposeMaterials(oldMaterials);
  };
  // onerror sengaja dibiarin kosong -> fallback teks polos tetap kepake, gak nge-crash
  img.src = url;
}

export function disposeBookMesh(mesh) {
  mesh.userData.disposed = true; // cegah loadCoverInto yang masih pending akses mesh yang udah mati
  mesh.geometry.dispose();
  disposeMaterials(mesh.material);
}