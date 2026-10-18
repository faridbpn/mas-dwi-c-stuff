<template>
  <Transition name="settings" appear>
    <div v-if="show" class="settings-backdrop" @click.self="$emit('close')">
      <aside class="settings-panel">
        <div class="paper-texture"></div>

        <div class="settings-header">
          <div class="header-title">
            <span class="header-icon">🏕️</span>
            <h2>Buku Camp</h2>
          </div>
          <button class="close-btn" @click="$emit('close')" title="Tutup">✕</button>
        </div>

        <section class="settings-section">
          <label class="settings-label">
            <span>{{ volume > 0 ? "🔥" : "💤" }} Suara Api Unggun</span>
            <span class="volume-value">{{ Math.round(volume * 100) }}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            :value="Math.round(volume * 100)"
            @input="$emit('update:volume', Number($event.target.value) / 100)"
            class="volume-slider"
          />
        </section>

        <div class="divider">
          <span>• • •</span>
        </div>

        <section class="settings-section">
          <label class="settings-label map-section-label">
            <span>🗺️ Pilih Perkemahan</span>
          </label>

          <div class="map-grid">
            <button
              v-for="map in maps"
              :key="map.id"
              class="map-card"
              :class="{ active: map.id === activeMapId }"
              @click="$emit('select-map', map.id)"
            >
              <span v-if="map.id === activeMapId" class="pin-badge">📍 Di sini</span>

              <div class="preview-window">
                <!-- Forest scene -->
                <div v-if="map.id === 'forest'" class="scene scene-forest">
                  <div class="sky"></div>
                  <div class="sun sun-forest"></div>
                  <div class="hill hill-back"></div>
                  <div class="hill hill-front"></div>
                  <span class="deco tree tree-1">🌲</span>
                  <span class="deco tree tree-2">🌳</span>
                  <span class="deco tent">⛺</span>
                </div>

                <!-- Beach scene -->
                <div v-else-if="map.id === 'beach'" class="scene scene-beach">
                  <div class="sky sky-beach"></div>
                  <div class="sun sun-beach"></div>
                  <div class="sea"></div>
                  <div class="sand"></div>
                  <span class="deco palm palm-1">🌴</span>
                  <span class="deco palm palm-2">🌴</span>
                  <span class="deco crab">🦀</span>
                </div>

                <!-- Fallback generik buat map lain -->
                <div v-else class="scene scene-generic">
                  <span class="deco-generic">{{ map.icon }}</span>
                </div>
              </div>

              <div class="map-info">
                <span class="map-label">{{ map.label }}</span>
                <span class="map-check" v-if="map.id === activeMapId">✓</span>
              </div>
            </button>
          </div>
        </section>
      </aside>
    </div>
  </Transition>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  show: { type: Boolean, default: false },
  volume: { type: Number, default: 0.35 },
  maps: { type: Array, default: () => [] },
  activeMapId: { type: String, default: "" },
});
const emit = defineEmits(["close", "update:volume", "select-map"]);

// Tekan Esc untuk menutup panel
function onKeydown(e) {
  if (e.key === "Escape" && props.show) emit("close");
}
onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Quicksand:wght@500;600&display=swap");

/* ---------- Backdrop ---------- */
.settings-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(46, 33, 22, 0.25);
  z-index: 40;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 16px;
  font-family: "Quicksand", sans-serif;
}

/* ---------- Panel (kartu kecil di pojok kanan atas) ---------- */
.settings-panel {
  position: relative;
  width: 300px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  background: linear-gradient(180deg, #fbf3e3 0%, #f6e9d2 100%);
  border: 4px solid #8a5a3b;
  border-radius: 22px;
  box-shadow: 0 16px 40px rgba(60, 40, 20, 0.3);
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: #4a372a;
  overflow-y: auto;
  overflow-x: hidden;
  transform-origin: top right; /* animasi tumbuh dari pojok kanan atas */
}

/* tekstur kertas: titik-titik halus acak, murni CSS gradient */
.paper-texture {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.5;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(140, 100, 60, 0.05) 1px, transparent 1px),
    radial-gradient(circle at 70% 60%, rgba(140, 100, 60, 0.05) 1px, transparent 1px),
    radial-gradient(circle at 40% 85%, rgba(140, 100, 60, 0.05) 1px, transparent 1px);
  background-size: 18px 18px, 24px 24px, 20px 20px;
}

/* ---------- Animasi buka / tutup ---------- */
/* Backdrop: fade */
.settings-enter-active,
.settings-leave-active {
  transition: opacity 0.25s ease;
}
.settings-enter-from,
.settings-leave-to {
  opacity: 0;
}

/* Panel: pop dari pojok kanan atas (muncul) */
.settings-enter-active .settings-panel {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 0.25s ease;
}
/* Panel: menciut ke pojok (close) */
.settings-leave-active .settings-panel {
  transition: transform 0.2s cubic-bezier(0.4, 0, 1, 1),
              opacity 0.18s ease;
}
.settings-enter-from .settings-panel,
.settings-leave-to .settings-panel {
  transform: translateY(-12px) scale(0.85);
  opacity: 0;
}

/* Isi panel muncul berurutan (stagger) */
.settings-enter-active .settings-section,
.settings-enter-active .divider {
  animation: item-rise 0.4s ease both;
}
.settings-enter-active .settings-section:nth-of-type(1) { animation-delay: 0.08s; }
.settings-enter-active .settings-section:nth-of-type(2) { animation-delay: 0.16s; }

@keyframes item-rise {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Hormati pengguna yang mematikan animasi di sistemnya */
@media (prefers-reduced-motion: reduce) {
  .settings-enter-active,
  .settings-leave-active,
  .settings-enter-active .settings-panel,
  .settings-leave-active .settings-panel {
    transition-duration: 0.01s;
  }
  .settings-enter-active .settings-section,
  .settings-enter-active .divider {
    animation: none;
  }
}

/* ---------- Header ---------- */
.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
}
.header-title { display: flex; align-items: center; gap: 8px; }
.header-icon { font-size: 1.4rem; }
.settings-header h2 {
  margin: 0;
  font-family: "Fredoka", sans-serif;
  font-weight: 600;
  font-size: 1.25rem;
  color: #5c4330;
  letter-spacing: 0.3px;
}
.close-btn {
  width: 34px; height: 34px;
  border-radius: 50%;
  border: 2px solid #d9c3a3;
  background: #fffaf0;
  cursor: pointer;
  font-size: 0.9rem;
  color: #8a5a3b;
  transition: transform 0.15s ease, background 0.15s ease;
}
.close-btn:hover { background: #fff2dc; }
.close-btn:active { transform: scale(0.88) rotate(90deg); }

/* ---------- Sections ---------- */
.settings-section { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 10px; }
.settings-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: "Fredoka", sans-serif;
  font-size: 0.92rem;
  font-weight: 600;
  color: #5c4330;
}
.volume-value {
  color: #a9815a;
  font-family: "Quicksand", sans-serif;
  font-weight: 600;
  font-size: 0.8rem;
}

/* ---------- Volume slider ---------- */
.volume-slider {
  width: 100%;
  height: 8px;
  border-radius: 100px;
  appearance: none;
  background: linear-gradient(90deg, #e8a85c, #e8a85c) no-repeat,
              #e9d9bd;
  background-size: v-bind('Math.round(volume * 100) + "%"') 100%;
  cursor: pointer;
  outline: none;
}
.volume-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid #d9822b;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}
.volume-slider::-moz-range-thumb {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid #d9822b;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.divider {
  position: relative;
  z-index: 1;
  text-align: center;
  color: #c9ad87;
  font-size: 0.8rem;
  letter-spacing: 4px;
}

/* ---------- Map cards ---------- */
.map-section-label { margin-bottom: 2px; }

.map-grid {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.map-card {
  position: relative;
  border: none;
  background: #fffaf0;
  border-radius: 18px;
  padding: 8px;
  cursor: pointer;
  text-align: left;
  box-shadow: 0 3px 10px rgba(90, 60, 30, 0.1);
  border: 2px solid transparent;
  transition: transform 0.22s cubic-bezier(0.25, 1, 0.5, 1),
              box-shadow 0.22s ease,
              border-color 0.22s ease;
}
.map-card:hover {
  transform: translateY(-4px) scale(1.015);
  box-shadow: 0 10px 22px rgba(90, 60, 30, 0.22);
  border-color: #e8c08a;
}
.map-card:active { transform: translateY(-1px) scale(0.995); }
.map-card.active {
  border-color: #d9822b;
  box-shadow: 0 6px 16px rgba(217, 130, 43, 0.25);
}

.pin-badge {
  position: absolute;
  top: -8px;
  left: 14px;
  z-index: 2;
  background: #d9822b;
  color: white;
  font-family: "Fredoka", sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 100px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.preview-window {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.scene { position: absolute; inset: 0; overflow: hidden; transition: transform 0.3s ease; }
.map-card:hover .scene { transform: scale(1.06); }

/* ---------- Forest preview ---------- */
.scene-forest .sky {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, #bfe3ff 0%, #eaf6ff 70%);
}
.sun-forest {
  position: absolute; top: 10%; left: 12%;
  width: 22%; aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, #fff1b8, #ffd874 70%);
}
.hill {
  position: absolute; bottom: 0; left: -10%; width: 120%;
  border-radius: 50% 50% 0 0;
}
.hill-back { height: 55%; background: #8fae63; opacity: 0.85; bottom: -5%; }
.hill-front { height: 42%; background: #6f9650; }
.deco.tree { position: absolute; font-size: 1.4rem; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.15)); }
.tree-1 { bottom: 18%; left: 18%; }
.tree-2 { bottom: 14%; left: 68%; font-size: 1.6rem; }
.deco.tent { position: absolute; bottom: 10%; left: 42%; font-size: 1.5rem; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.15)); }

/* ---------- Beach preview ---------- */
.sky-beach {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, #8fd8ff 0%, #d4f1ff 60%);
}
.sun-beach {
  position: absolute; top: 8%; right: 14%;
  width: 20%; aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, #fff6d9, #ffcf6b 70%);
}
.sea {
  position: absolute; bottom: 24%; left: 0; width: 100%; height: 38%;
  background: linear-gradient(180deg, #56c9d9 0%, #2f93b8 100%);
}
.sand {
  position: absolute; bottom: 0; left: 0; width: 100%; height: 26%;
  background: linear-gradient(180deg, #f0d9a3 0%, #e3c184 100%);
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
}
.deco.palm { position: absolute; font-size: 1.3rem; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.15)); }
.palm-1 { bottom: 16%; left: 12%; }
.palm-2 { bottom: 20%; right: 14%; font-size: 1.5rem; }
.deco.crab { position: absolute; bottom: 4%; left: 48%; font-size: 1rem; }

/* ---------- Fallback generik ---------- */
.scene-generic {
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #e8d9b0 0%, #c9ad87 100%);
}
.deco-generic { font-size: 2.2rem; }

.map-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 6px 4px;
}
.map-label {
  font-family: "Fredoka", sans-serif;
  font-weight: 600;
  font-size: 0.92rem;
  color: #5c4330;
}
.map-check {
  color: #d9822b;
  font-weight: 700;
  font-size: 0.95rem;
}
</style>