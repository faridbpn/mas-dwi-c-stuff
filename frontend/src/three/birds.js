import * as THREE from "three";

function createBirdMesh() {
  const group = new THREE.Group();
  group.scale.set(2, 2, 2); // scale up 2x biar lebih visible
  const material = new THREE.MeshBasicMaterial({
    color: 0x3a3a3c,
    side: THREE.DoubleSide,
  });

  function makeWing(sign) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(sign * 0.35, 0.05);
    shape.lineTo(sign * 0.32, -0.02);
    shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
    const pivot = new THREE.Group();
    pivot.add(mesh);
    return pivot;
  }

  const leftWing = makeWing(-1);
  const rightWing = makeWing(1);
  group.add(leftWing, rightWing);
  group.userData.wings = [leftWing, rightWing];
  return group;
}

export function createBirdFlock(count = 12) {
  const group = new THREE.Group();
  const birds = [];

  for (let i = 0; i < count; i++) {
    const mesh = createBirdMesh();
    group.add(mesh);

    const radius = 45 + Math.random() * 25;
    const height = 20 + Math.random() * 12;
    const loops = 6;
    const points = [];
    for (let p = 0; p <= loops; p++) {
      const angle = (p / loops) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * radius + (Math.random() - 0.5) * 8,
          height + Math.sin(angle * 2) * 3,
          Math.sin(angle) * radius + (Math.random() - 0.5) * 8,
        ),
      );
    }
    const curve = new THREE.CatmullRomCurve3(points, true);

    birds.push({
      mesh,
      curve,
      speed: 0.015 + Math.random() * 0.01,
      offset: Math.random(),
      flapSeed: Math.random() * Math.PI * 2,
    });
  }

  group.visible = true; // set visible langsung, jangan false

  function update(elapsed) {
    birds.forEach((b) => {
      const t = (elapsed * b.speed + b.offset) % 1;
      const pos = b.curve.getPointAt(t);
      const tangent = b.curve.getTangentAt(t);

      b.mesh.position.copy(pos);
      b.mesh.lookAt(pos.clone().add(tangent));

      const flap = Math.sin(elapsed * 12 + b.flapSeed) * 0.6;
      b.mesh.userData.wings[0].rotation.z = flap;
      b.mesh.userData.wings[1].rotation.z = -flap;
    });
  }

  return { group, update };
}
