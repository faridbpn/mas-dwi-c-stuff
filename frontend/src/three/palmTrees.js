import * as THREE from "three";

const TRUNK_COLOR = 0x6b4a33;
const FROND_COLOR = 0x2f7a4f;

function createPalmMesh(height) {
  const group = new THREE.Group();
  const segments = 5;
  const trunkMat = new THREE.MeshStandardMaterial({ color: TRUNK_COLOR });
  let bendX = 0;
  let y = 0;
  const segHeight = (height * 0.8) / segments;

  for (let i = 0; i < segments; i++) {
    const radiusTop = 0.09 - i * 0.012;
    const radiusBottom = 0.11 - i * 0.012;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, segHeight, 6),
      trunkMat,
    );
    bendX += 0.035;
    seg.position.set(bendX, y + segHeight / 2, 0);
    seg.rotation.z = -bendX * 0.6;
    group.add(seg);
    y += segHeight;
  }

  const frondMat = new THREE.MeshStandardMaterial({
    color: FROND_COLOR,
    side: THREE.DoubleSide,
  });
  const frondCount = 7;
  const crownPos = new THREE.Vector3(bendX, y, 0);
  for (let i = 0; i < frondCount; i++) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(height * 0.25, 0.08, height * 0.5, 0);
    shape.quadraticCurveTo(height * 0.25, -0.08, 0, 0);
    const frond = new THREE.Mesh(new THREE.ShapeGeometry(shape), frondMat);
    const angle = (i / frondCount) * Math.PI * 2;
    frond.position.copy(crownPos);
    frond.rotation.y = angle;
    frond.rotation.z = -0.35 - Math.random() * 0.2;
    group.add(frond);
  }

  group.userData.swaySeed = Math.random() * Math.PI * 2;
  return group;
}

export function createPalmGrove(
  count,
  { heightSampler, isValidSpot, area = 44 },
) {
  const group = new THREE.Group();
  const trees = [];

  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < count * 25) {
    attempts++;
    const x = (Math.random() - 0.5) * area;
    const z = (Math.random() - 0.5) * area;
    const dist = Math.sqrt(x * x + z * z);
    if (!isValidSpot(x, z, dist)) continue;

    const height = 2.2 + Math.random() * 1.4;
    const tree = createPalmMesh(height);
    tree.position.set(x, heightSampler(x, z), z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    group.add(tree);
    trees.push(tree);
    placed++;
  }

  function update(elapsed) {
    trees.forEach((t) => {
      t.rotation.z = Math.sin(elapsed * 0.6 + t.userData.swaySeed) * 0.03;
    });
  }

  function dispose() {
    trees.forEach((t) => {
      t.traverse((child) => {
        child.geometry?.dispose();
        child.geometry?.dispose();
      });
    });
  }

  return { group, update, dispose };
}
