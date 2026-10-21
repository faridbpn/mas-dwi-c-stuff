import * as THREE from "three";

const SIZE = 512;
let woodTextures = null;

function makeCanvas() {
    const c = document.createElement("canvas");
    c.width = SIZE;
    c.height = SIZE;
    return c;
}

function gray(v) {
    const n = Math.round(THREE.MathUtils.clamp(v, 0, 255));
    return  `rgb(${n},${n},${n})`;
}

function toTexture(canvas, srgb) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function getWoodTextures() {
    if (woodTextures) return woodTextures;

    const colorCanvas = makeCanvas();
    const roughCanvas = makeCanvas();
    const bumpCanvas = makeCanvas();
    const cc = colorCanvas.getContext("2d");
    const rc = roughCanvas.getContext("2d");   
    const bc = bumpCanvas.getContext("2d");
    const base = { r: 138, g: 90, b: 59 };
    
    for (let y = 0; y < SIZE; y++) {
        const ring  = 0.5 + 0.5 * Math.sin(y * 0.11 + Math.sin(y * 0.021) * 5);
        const t = THREE.MathUtils.clamp(ring * 0.7 + Math.random() * 0.2, 0, 1);
        const k = 0.78 + t * 0.4;
        cc.fillStyle = `rgb(${Math.round(base.r * k)}, ${Math.round(base.g * k)}, ${Math.round(base.b * k)})`;
        cc.fillRect(0, y, SIZE, 1);
        rc.fillStyle = gray(235 - t * 70);
        rc.fillRect(0, y, SIZE, 1);
        bc.fillStyle = gray(120 + t * 110);
        bc.fillRect(0, y, SIZE, 1);
    }

    // goresan serat pendek
    for (let i = 0; i < 280; i++) {
        const x = Math.random() * SIZE;
        const y = Math.random() * SIZE;
        const w = 40 + Math.random() * 200;
        const h = 1 + Math.random() * 1.5;
        const a = 0.04 + Math.random() * 0.08;
        cc.fillStyle = `rgba(55,32,18,${a})`;
        cc.fillRect(x, y, w, h);
        bc.fillStyle = `rgba(0,0,0,${a * 2})`;
        bc.fillRect(x, y, w, h);
    }

    woodTextures = {
        map: toTexture(colorCanvas, true),
        roughnessMap: toTexture(roughCanvas, false),
        bumpMap: toTexture(bumpCanvas, false),
    };
    return woodTextures;
}

export function createWoodMaterial() {
    const t = getWoodTextures();
    return new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: t.map,
        roughnessMap: t.roughnessMap,
        roughness: 1,
        bumpMap: t.bumpMap,
        bumpScale: 0.8,
        metalness: 0,
    });
} 

export function createMetalMaterial(color = 0x3a3a3c) {
    return new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.35 });
}