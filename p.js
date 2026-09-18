import { loadDecorModel } from "./decorFactory";

// ...di dalam init(), setelah `scene.add(dashboardBoard);`

loadDecorModel({
  url: "/models/dekorasi.glb",   // <- ganti sesuai nama file lo
  targetHeight: 1.6,             // tinggi target dalam unit scene (rak lo tingginya 1.4, jadi ini kira-kira segitu)
  position: [5.6, 0, 5.4],       // lebih jauh lagi di ujung "lorong" belokan, past papan
  rotationY: Math.PI / 4,        // muter dikit biar gak ngadep lurus2 amat, keliatan lebih natural
})
  .then((model) => scene.add(model))
  .catch((err) => console.warn("Model dekorasi gagal dimuat:", err));