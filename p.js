import { ref, onMounted, onBeforeUnmount } from "vue";

const MUTE_KEY = "bgm-muted";
const VOLUME_KEY = "bgm-volume";

export function useBackgroundMusic(url, { volume: defaultVolume = 0.35 } = {}) {
  const audio = new Audio(url);
  audio.loop = true;
  audio.preload = "auto";

  const isMuted = ref(localStorage.getItem(MUTE_KEY) === "true");

  const storedVolume = localStorage.getItem(VOLUME_KEY);
  const volume = ref(storedVolume !== null ? Number(storedVolume) : defaultVolume);

  audio.muted = isMuted.value;
  audio.volume = volume.value;

  function tryPlay() {
    audio.play().catch(() => {});
  }

  function unlockOnFirstInteraction() {
    tryPlay();
    window.removeEventListener("pointerdown", unlockOnFirstInteraction);
    window.removeEventListener("keydown", unlockOnFirstInteraction);
  }

  function toggleMute() {
    isMuted.value = !isMuted.value;
    audio.muted = isMuted.value;
    localStorage.setItem(MUTE_KEY, String(isMuted.value));
    if (!isMuted.value) tryPlay();
  }

  // BARU
  function setVolume(v) {
    const clamped = Math.min(1, Math.max(0, v));
    volume.value = clamped;
    audio.volume = clamped;
    localStorage.setItem(VOLUME_KEY, String(clamped));

    // kalau volume dinaikin dari slider sementara lagi ke-mute, otomatis unmute
    // -- lebih intuitif daripada user geser slider tapi kok gak kedengeran sama sekali
    if (clamped > 0 && isMuted.value) {
      isMuted.value = false;
      audio.muted = false;
      localStorage.setItem(MUTE_KEY, "false");
    }
  }

  onMounted(() => {
    tryPlay();
    window.addEventListener("pointerdown", unlockOnFirstInteraction);
    window.addEventListener("keydown", unlockOnFirstInteraction);
  });

  onBeforeUnmount(() => {
    audio.pause();
    window.removeEventListener("pointerdown", unlockOnFirstInteraction);
    window.removeEventListener("keydown", unlockOnFirstInteraction);
  });

  return { isMuted, toggleMute, volume, setVolume }; // volume & setVolume baru
}