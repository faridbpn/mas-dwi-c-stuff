import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODEL_URL = '/models/kraken/scene.gltf';
const loader = new GLFTLoader();

const HIDDEN = 'hidden';
const RISING = 'rising';
const LURKING = 'lurking';
const DIVING = 'diving';

const rand = (min, max) => min + Math.random() * (max - min);
const randRange = ([min, max]) => rand(min, max);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeIncubic = (t) => t * t * t;

/**
 * Kraken yang muncul acak lalu menyelam lagi.
 * Synchronous: langsung return, model di-load di belakang layar.
 *
 * @param {Object} opts
 * @param {number} opts.waterY            Tinggi permukaan air (cek ocean.js)
 * @param {number} opts.targetSize        Ukuran terbesar kraken di world unit
 * @param {number[]} opts.center          [x, z] pusat area spawn
 * @param {number[]} opts.radiusRange     [min, max] jarak spawn dari center
 * @param {number[]} opts.angleRange      [min, max] sudut spawn (radian)
 * @param {number[]} opts.hiddenRange     Lama bersembunyi (detik)
 * @param {number[]} opts.lurkRange       Lama di permukaan (detik)
 * @param {number} opts.riseDuration
 * @param {number} opts.diveDuration
 * @param {number} opts.surfaceSubmerge   0..1, bagian tubuh yang tetap di bawah air saat muncul
 * @param {number} opts.facingOffset      Koreksi arah hadap model (radian)
 */

export function createKraken({
    waterY = 0,
    targetSize = 7,
    center = [0, 0],
    radiusRange = [25, 40],
    angleRange = [0, Math.PI * 2],
    hiddenRange = [8, 20],
    lurkRange = [4, 8],
    riseDuration = 3,
    diveDuration = 2.5,
    surfaceSubmerge = 0.45,
    facingOffset = 0,
} = {}) {
    // group  = posisi (x, z) di world, tidak pernah dianimasikan di Y
    // pivot  = yang naik-turun
    const group = new THREE.Group();
    const pivot = new THREE.Group();
    pivot.visible = false;
    group.add(pivot);

    // Riak air
    const rippleGeo = new THREE.RingGeometry(0.8, 1.0, 48);
    const rippleMat = new THREE.MeshBasicMaterial({
        color: 0xcfeaff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        deepWrite: false,
    });
    const ripple = new THREE.Mesh(rippleGeo, rippleMat);
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.y = waterY + 0.08;
    ripple.visible = false;
    group.add(ripple);

    let rippleT = 1;
    const RIPPLE_DURATION = 2.5;
    function triggerRipple() {
        rippleT = 0;
        ripple.visible = true;
    }

    // state
    let loaded = false;
    let disposed = false;
    let mixer = null;
    let modelHeight = 0;

    let state = HIDDEN;
    let stateTime = 0;
    let stateDuration = rand(3, 6); // muncul pertama lebih cepat
    let lastElapsed = null;

    const hiddenY = () => waterY - modelHeight - 0.5;
    const surfacedY = () => waterY - modelHeight * surfaceSubmerge;

    function pickNewSpot() {
        const angle = randRange(angleRange);
        const radius = randRange(radiusRange);
        const x = center[0] + Math.cos(angle) * radius;
        const z = center[1] + Math.sin(angle) * radius;
        group.position.set(x, 0, z);

        // Hadap ke pusat pulau + sedikit acak biar natural
        const toCenter = Math.atan2(center[0] - x, center[1] - z);
        group.rotation.y = toCenter + facingOffset + rand(-0.4, 0.4);
    }

    function enter(next) {
        state = next;
        stateTime = 0;

        if (next === HIDDEN) {
            pivot.visible = false;
            stateDuration = randRange(hiddenRange);
        } else if (next === RISING) {
            pickNewSpot();
            pivot.position.y = hiddenY();
            pivot.visible = true;
            stateDuration = riseDuration;
            triggerRipple();
        } else if (next === LURKING) {
            stateDuration = randRange(lurkRange);
        } else if (next === DIVING) {
            stateDuration = diveDuration;
            triggerRipple();
        }
    }

    // load model
    loader.load(
        MODEL_URL,
        (gltf) => {
            if (disposed) {
                disposeObject(gltf.scene);
                return;
            }

            const model = gltf.scene;

            // Auto scale supaya ukuran konsisten, berapapun ukuran asli modelnya
            const box = new THREE.Box3().setFromObject(model);
            const center3 = scaled.getCenter(new THREE.Vector3());
            model.position.x -= center3.x;
            model.position.z -= center3.z;
            model.position.y -= scaled.min.y;
            modelHeight = scaled.max.y - scaled.min.y;

            pivot.add(model);

            // Animasi bawaan model (kalau ada) langsung dimainkan
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                mixer.clipAction(gltf.animations[0]).play();
            }

            loaded = true;
        },
        undefined,
        (err) => console.error('Failed to load kraken model', err)
    );

    // update per frame
    function update(elapsed) {
        // Hitung delta sendiri, di-clamp supaya tab yang di-background tidak bikin lompatan
        if (lastElapsed === null) lastElapsed = elapsed;
        const delta = Math.min(elapsed - lastElapsed, 0.1);
        lastElapsed = elapsed;

        // Riak jalan terus walaupun model belum siap
        if (rippleT < 1) {
            rippleT = Math.min(rippleT + delta / RIPPLE_DURATION, 1);
            const sc = 1 + rippleT * 5;
            ripple.scale.set(sc, sc, sc);
            rippleMat.opacity = (1 - rippleT) * 0.55;
            if (rippleT >= 1) ripple.visible = false;
        }

        if (!loaded) return;

        if (mixer) mixer.update(delta);

        stateTime += delta;
        const t = Math.min(stateTime / stateDuration, 1);

        switch (state) {
            case HIDDEN:
                if (t >= 1) enter(RISING);
                break;

            case RISING:
                pivot.position.y = THREE.MathUtils.lerp(hiddenY(), surfacedY(), easeOutCubic(t));
                if (t >= 1) enter(LURKING);
                break;

            case LURKING:
                // Mengambang pelan + goyang halus
                pivot.position.y = surfacedY() + Math.sin(elapsed * 1.2) * 0.15;
                pivot.rotation.z = Math.sin(elapsed * 0.8) * 0.04;
                pivot.rotation.y = Math.sin(elapsed * 0.3) * 0.15;
                if (t >= 1) enter(DIVING);
                break;

            case DIVING:
                pivot.position.y = THREE.MathUtils.lerp(surfacedY(), hiddenY(), easeInCubic(t));
                if (t >= 1) {
                    pivot.rotation.set(0, 0, 0);
                    enter(HIDDEN);
                }
                break;
        }
    }

    function dispose() {
        disposed = true;
        disposeObject(pivot);
        mixer?.stopAllAction();
        rippleGeo.dispose();
        rippleMat.dispose();
    }

    return { group, update, dispose };
}

function disposeObject(obj) {
    obj.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m) => {
                for (const key in m) {
                    if (m[key] && m[key].isTexture) m[key].dispose();
                }
                m.dispose();
            });
        }
    });
}
