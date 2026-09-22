import * as THREE from "three";

const LEAF_COLORS = [0xd9822b, 0xc9a227, 0xb5451b, 0xe0b354];

function createLeafGeometry() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.12);
    shape.quadraticCurveTo(0.08, 0.08, 0.09, 0);
    shape.quadraticCurveTo(0.08, -0.08, 0, -0.12);
    shape.quadraticCurveTo(-0.08, -0.08, -0.09, 0);
    shape.quadraticCurveTo(-0.08, 0.08, 0, 0.12);
    return new THREE.ShapeGeometry(shape);
}

export function createFallingLeaves(count = 40) {
    const geometry = createLeafGeometry();
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, vertexColors: true });
    const mesh = new THREE.InstancedMesh(geometry, material, count);

    const dummy = new THREE.Object3D();
    const particles = [];

    for (let i = 0; i < count; i++) {
        const spawnHeight = 4 + Math.random() * 12;
        particles.push({
            baseX: (Math.random() - 0.5) * 26,
            baseZ: (Math.random() - 0.5) * 26,
            y: Math.random() * spawnHeight,
            spawnHeight,
            fallSpeed: 0.25 + Math.random() * 0.25,
            swaySeed: Math.random() * Math.PI * 2,
            swaySpeed: 0.6 + Math.random() * 0.6,
            swayAmount: 0.6 + Math.random() * 0.08,
            rotSeed: Math.random() * Math.PI * 2,
        });
        mesh.setColorAt(i, new THREE.Color(LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)]));
    }

    function update(elapsed, delta) {
        particles.forEach((p, i) => {
            p.y -= p.fallSpeed * delta;
            if (p.y < -0.5) p.y = p.spawnHeight;

            const swayX = Math.sin(elapsed * p.swaySpeed + p.swaySeed) * p.swayAmount;
            const swayY = Math.cos(elapsed * p.swaySpeed * 0.7 + p.swaySeed) * p.swayAmount;

            dummy.position.set(p.baseX + swayX, p.y + swayY, p.baseZ);
            dummy.rotation.set(
                elapsed * 0.5 + p.rotSeed,
                elapsed * 0.3 + p.rotSeed,
                elapsed * 0.8 + p.rotSeed
            );
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
    }

    return { mesh, update };
}