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
    
    // Create color attribute untuk instance
    const colors = [];
    for (let i = 0; i < count; i++) {
        const color = new THREE.Color(LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)]);
        colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
    
    const material = new THREE.MeshStandardMaterial({ 
        side: THREE.DoubleSide,
        vertexColors: true,
        roughness: 0.8,
        metalness: 0
    });
    const mesh = new THREE.Mesh(geometry, material);

    // Ganti InstancedMesh dengan multiple meshes atau gunakan Mesh tunggal dengan geometry yang sudah punya color
    // Tapi untuk falling leaves, lebih baik pakai multiple individual meshes atau Points
    // Sementara ini, mari coba ganti ke simpler approach: pakai Points atau individual meshes
    
    const dummy = new THREE.Object3D();
    const particles = [];
    const leafMeshes = [];

    for (let i = 0; i < count; i++) {
        const spawnHeight = 4 + Math.random() * 12;
        const color = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)];
        
        // Buat individual leaf mesh untuk setiap daun
        const leafGeo = createLeafGeometry();
        const leafMat = new THREE.MeshStandardMaterial({ 
            color: color,
            side: THREE.DoubleSide,
            roughness: 0.8,
            metalness: 0
        });
        const leafMesh = new THREE.Mesh(leafGeo, leafMat);
        leafMeshes.push(leafMesh);
        
        particles.push({
            mesh: leafMesh,
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
    }

    function update(elapsed, delta) {
        particles.forEach((p, i) => {
            p.y -= p.fallSpeed * delta;
            if (p.y < -0.5) p.y = p.spawnHeight;

            const swayX = Math.sin(elapsed * p.swaySpeed + p.swaySeed) * p.swayAmount;
            const swayY = Math.cos(elapsed * p.swaySpeed * 0.7 + p.swaySeed) * p.swayAmount;

            p.mesh.position.set(p.baseX + swayX, p.y + swayY, p.baseZ);
            p.mesh.rotation.set(
                elapsed * 0.5 + p.rotSeed,
                elapsed * 0.3 + p.rotSeed,
                elapsed * 0.8 + p.rotSeed
            );
        });
    }

    return { meshes: leafMeshes, update };
}