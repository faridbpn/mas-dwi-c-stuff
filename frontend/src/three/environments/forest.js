import * as THREE from "three";
import { createDayNightCycle } from "../dayNight";
import { createFireflies } from "../fireflies";
import { createBirdFlock } from "../birds";
import { createFallingLeaves } from "../leaves";
import { createGrass } from "../grass";
import { createSkyLighting } from "../skyLighting";
import {
  createSky,
  createMountains,
  setupOutdoorLighting,
} from "../environment";
import {
  createForestTerrain,
  createFarGround,
  isWalkableWorld,
} from "../forestTerrain";
import {
  heightAtWorld,
  slopeAtWorld,
  riverDistanceWorld,
} from "../forestTerrain";
import { createTreeSystem } from "../trees";

export const forestEnvironment = {
  id: "forest",
  label: "Hutan",
  create(scene, renderer) {
    const sky = createSky();
    scene.add(sky);
    scene.fog = new THREE.FogExp2(0xbcdcff, 0.008);
    scene.background = new THREE.Color(0xbcdcff);
    const farGround = createFarGround();
    scene.add(farGround);

    const { hemi, sun } = setupOutdoorLighting(scene, renderer);
    const skyLight = createSkyLighting({
      renderer,
      scene,
      sky,
      intensity: 0.45,
    });
    const terrain = createForestTerrain();
    scene.add(terrain);
    const mountains = createMountains();
    scene.add(mountains);

    const dayNightCycle = createDayNightCycle({
      scene,
      sky,
      sun,
      hemi,
      cycleDurationSeconds: 180,
    });

    const fireflies = createFireflies(45, heightAtWorld);
    scene.add(fireflies.points);

    const birds = createBirdFlock(6);
    scene.add(birds.group);

    const grass = createGrass(2500);
    scene.add(grass.mesh);

    const leaves = createFallingLeaves(40);
    scene.add(leaves.mesh); // <- SESUAIKAN: kalau leaves.js kamu abis fix kemarin returnnya
    //    jadi `.meshes` (array), ganti baris ini jadi:
    //    leaves.meshes.forEach((m) => scene.add(m));

    const trees = createTreeSystem({
      modelUrls: ["/models/tree/scene.gltf"], // GANTI sesuai path asetmu
      count: 90,
      targetHeight: 5,
      heightSampler: heightAtWorld,
      isValidSpot: (x, z, dist) =>
        dist > 13 && // jangan di plaza rak
        dist < 52 && // di dalam area terrain
        slopeAtWorld(x, z) < 0.4 && // jangan di tebing
        heightAtWorld(x, z) > -0.4 && // jangan di lembah sungai
        riverDistanceWorld(x, z) > 7,
    });
    scene.add(trees.group);
    return {
      update(elapsed, delta) {
        const { isNight } = dayNightCycle.update(elapsed);
        skyLight.update(elapsed);
        fireflies.update(elapsed);
        birds.update(elapsed);
        fireflies.points.visible = isNight;
        birds.group.visible = !isNight;
        grass.update(elapsed);
        leaves.update(elapsed, delta);
      },
      getGroundHeight: heightAtWorld,
      isWalkable: isWalkableWorld,
      dispose() {
        skyLight.dispose();
        terrain.geometry.dispose();
        terrain.material.dispose();
        farGround.geometry.dispose();
        farGround.material.dispose();
        scene.remove(
          sky,
          terrain,
          mountains,
          hemi,
          sun,
          fireflies.points,
          birds.group,
          grass.mesh,
          leaves.mesh,
        );
        scene.fog = null;
      },
    };
  },
};
