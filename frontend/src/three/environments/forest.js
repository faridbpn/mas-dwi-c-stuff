import * as THREE from "three";
import { createSky, createTerrain, createMountains, setupOutdoorLighting } from "../environment";
import { createDayNightCycle } from "../dayNight";
import { createFireflies } from "../fireflies";
import { createBirdFlock } from "../birds";
import { createFallingLeaves } from "../leaves";
import { createGrass } from "../grass";

export const forestEnvironment = {
  id: "forest",
  label: "Hutan",
  create(scene, renderer) {
    const sky = createSky();
    scene.add(sky);
    scene.fog = new THREE.FogExp2(0xbcdcff, 0.018);
    scene.background = new THREE.Color(0xbcdcff);

    const { hemi, sun } = setupOutdoorLighting(scene, renderer);
    const terrain = createTerrain();
    scene.add(terrain);
    const mountains = createMountains();
    scene.add(mountains);

    const dayNightCycle = createDayNightCycle({ scene, sky, sun, hemi, cycleDurationSeconds: 180 });

    const fireflies = createFireflies(45);
    scene.add(fireflies.points);

    const birds = createBirdFlock(6);
    scene.add(birds.group);

    const grass = createGrass(2500);
    scene.add(grass.mesh);

    const leaves = createFallingLeaves(40);
    scene.add(leaves.mesh); // <- SESUAIKAN: kalau leaves.js kamu abis fix kemarin returnnya
                              //    jadi `.meshes` (array), ganti baris ini jadi:
                              //    leaves.meshes.forEach((m) => scene.add(m));

    return {
      update(elapsed, delta) {
        const { isNight } = dayNightCycle.update(elapsed);
        fireflies.update(elapsed);
        birds.update(elapsed);
        fireflies.points.visible = isNight;
        birds.group.visible = !isNight;
        grass.update(elapsed);
        leaves.update(elapsed, delta);
      },
      dispose() {
        scene.remove(sky, terrain, mountains, hemi, sun, fireflies.points, birds.group, grass.mesh, leaves.mesh);
        scene.fog = null;
      },
    };
  },
};