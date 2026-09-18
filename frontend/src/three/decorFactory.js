import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const loader = new GLTFLoader();

/**
 * Load model GLTF/GLB, otomatis:
 * - di-skalain proporsional ke `targetHeight` (soalnya model dari internet
 *   skalanya beda-beda banget, ada yang raksasa ada yang semut)
 * - ditempelin ke lantai (y=0), gak ngambang/kepotong
 */
export function loadDecorModel({ url, targetHeight = 1.4, position = [0, 0, 0], rotationY = 0 }) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const currentHeight = size.y || 1;

        const scale = targetHeight / currentHeight;
        model.scale.setScalar(scale);

        // hitung ulang box SETELAH di-scale, buat nempelin alasnya ke y=0
        const scaledBox = new THREE.Box3().setFromObject(model);
        model.position.y -= scaledBox.min.y;

        model.position.x += position[0];
        model.position.z += position[2];
        model.rotation.y = rotationY;

        model.traverse((child) => {
          if (child.isMesh) child.castShadow = true;
        });

        resolve(model);
      },
      undefined, // progress callback, gak dipake sekarang
      (error) => reject(error)
    );
  });
}