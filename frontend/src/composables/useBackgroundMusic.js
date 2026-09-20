import { ref, onMounted, onBeforeUnmount } from "vue";

const STORAGE_KEY = "bgm-muted";

export function useBackgroundMusic(url, { volume = 0.35 } = {}) {
  const audio = new Audio(url);
  audio.loop = true; // ini kuncinya -> otomatis muter ulang dari awal begitu abis
  audio.volume = volume;
  audio.preload = "auto";

  const isMuted = ref(localStorage.getItem(STORAGE_KEY) === "true");
  audio.muted = isMuted.value;

  function tryPlay() {
    audio.play().catch(() => {
      // ke-block browser -> gapapa, nanti kepancing sama interaksi pertama di bawah
    });
  }

  function unlockOnFirstInteraction() {
    tryPlay();
    window.removeEventListener("pointerdown", unlockOnFirstInteraction);
    window.removeEventListener("keydown", unlockOnFirstInteraction);
  }

  function toggleMute() {
    isMuted.value = !isMuted.value;
    audio.muted = isMuted.value;
    localStorage.setItem(STORAGE_KEY, String(isMuted.value));
    if (!isMuted.value) tryPlay();
  }

  onMounted(() => {
    tryPlay(); // langsung coba (kadang browser ngizinin kalau situs udah sering dikunjungi)
    window.addEventListener("pointerdown", unlockOnFirstInteraction);
    window.addEventListener("keydown", unlockOnFirstInteraction);
  });

  onBeforeUnmount(() => {
    audio.pause();
    window.removeEventListener("pointerdown", unlockOnFirstInteraction);
    window.removeEventListener("keydown", unlockOnFirstInteraction);
  });

  return { isMuted, toggleMute };
}