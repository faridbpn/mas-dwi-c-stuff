export function createBookMesh(book) {
  const geometry = new THREE.BoxGeometry(0.18, 1, 0.7);
  const mesh = new THREE.Mesh(geometry, buildMaterials(book, null));
  mesh.userData.bookId = book.id;
  mesh.userData.status = book.status;
  mesh.castShadow = true;

  // BARU: fase & kecepatan acak, biar goyangnya gak seragam/robotik
  mesh.userData.idleSeed = Math.random() * Math.PI * 2;
  mesh.userData.idleSpeed = 0.8 + Math.random() * 0.6;

  loadCoverInto(mesh, book);
  return mesh;
}