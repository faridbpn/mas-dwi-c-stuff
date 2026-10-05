const palms = createPalmGrove(16, {
  heightSampler: worldHeightAt,
  isValidSpot: palmValidSpot,
});
scene.add(palms.group);

const rocks = createRockFormations(12, {
  heightSampler: worldHeightAt,
  isValidSpot: rockValidSpot,
});
scene.add(rocks.group);

 