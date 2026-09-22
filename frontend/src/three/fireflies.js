import * as THREE from "three";

const VERTEX_SHADER = `
    attribute float aPhase;
    attribute float aSize;
    uniform float uTime;
    varying float vPhase;
    void main() {
        vPhase = sin(uTime * 1.6 + aPhase) * 0.5 + 0.5; // 0..1, kedip per-titik
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (120.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const FRAGMENT_SHADER = `
    varying float vPhase;
    void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float dist = length(uv);
        if (dist > 0.5) discard; // bikin titik jadi bulat, bukan kotak
        float glow = smoothstep(0.5, 0.0, dist);
        vec3 color = mix(vec3(0.6, 1.0, 0.4), vec3(1.0, 0.95, 0.5), vPhase); // hijau <-> kuning
        gl_FragColor = vec4(color, glow * (0.35 + vPhase * 0.65));
    }
`;

export function createFireflies(count = 45) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);
    const anchors = [];

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 3 + Math.random() * 16;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 0.4 + Math.random() * 1.8;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        phases[i] = Math.random() * Math.PI * 2;
        sizes[i] = 0.12 + Math.random() * 0.1;
        anchors.push({ x, y, z, seed: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.5 });
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending, // efek menyala
    });

    const points = new THREE.Points(geometry, material);
    points.visible = false;

    function update(elapsed) {
        material.uniforms.uTime.value = elapsed;

        const posAttr = geometry.attributes.position;
        for (let i = 0; i < count; i++) {
            const a = anchors[i];
            posAttr.setXYZ(
                i,
                a.x + Math.sin(elapsed * a.speed + a.seed) * 0.6,
                a.y + Math.sin(elapsed * a.speed * 1.3 + a.seed) * 0.3,
                a.z + Math.cos(elapsed * a.speed + a.seed) * 0.6
            );
        }
        posAttr.needsUpdate = true;
    }

    return { points, update };
}