import * as THREE from "three";
import { createDayNightCycle } from "../dayNight";
import { createFireflies } from "../fireflies";
import { createBirdFlock } from "../birds";
import { createFallingLeaves } from "../leaves";
import { createGrass } from "../grass";
import { createSkyLighting } from "../skyLighting";
import { createCampfires } from "../campfire";
import { createRiver } from "../river";
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

    const river = createRiver({ heightSampler: heightAtWorld });
    scene.add(river.mesh);

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

    const campfires = createCampfires({
      count: 4,
      heightSampler: heightAtWorld,
      isValidSpot: (x, z, dist) =>
        dist > 13 &&
        dist < 42 &&
        slopeAtWorld(x, z) < 0.22 && // tanah rata
        heightAtWorld(x, z) > -0.3 && // bukan lembah sungai
        riverDistanceWorld(x, z) > 6,
    });
    scene.add(campfires.group);

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
        riverDistanceWorld(x, z) > 7 &&
        campfires.spots.every((s) => Math.hypot(s.x - x, s.z - z) > 3.5), // hindari api unggun
    });
    scene.add(trees.group);

    return {
      update(elapsed, delta) {
        const { isNight, elevationDeg } = dayNightCycle.update(elapsed);
        const night = 1 - THREE.MathUtils.smoothstep(elevationDeg, -8, 20);
        skyLight.update(elapsed);
        fireflies.update(elapsed);
        birds.update(elapsed);
        fireflies.points.visible = isNight;
        birds.group.visible = !isNight;
        grass.update(elapsed);
        leaves.update(elapsed, delta);
        campfires.update(elapsed, delta, night);
        river.update(elapsed, { sun, sky, daylight: 1 - night });
      },
      getGroundHeight: heightAtWorld,
      isWalkable: isWalkableWorld,
      dispose() {
        skyLight.dispose();
        terrain.geometry.dispose();
        terrain.material.dispose();
        farGround.geometry.dispose();
        farGround.material.dispose();
        trees.dispose();
        campfires.dispose();
        river.dispose();
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
          trees.group,
          campfires.group,
          river.mesh,
        );
        scene.fog = null;
      },
    };
  },
};
