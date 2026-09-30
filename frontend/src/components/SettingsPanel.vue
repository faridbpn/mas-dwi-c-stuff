<template>
  <Transition name="settings-fade">
    <div v-if="show" class="settings-backdrop" @click.self="$emit('close')">
      <aside class="settings-panel">
        <div class="settings-header">
          <h2>Pengaturan</h2>
          <button class="close-btn" @click="$emit('close')" title="Tutup">✕</button>
        </div>

        <section class="settings-section">
          <label class="settings-label">
            <span>{{ volume > 0 ? "🔊" : "🔇" }} Volume Musik</span>
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

        <!-- section "Pilih Peta" nanti ditaruh di sini, section baru di bawah ini -->
      </aside>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  volume: { type: Number, default: 0.35 },
});
defineEmits(["close", "update:volume"]);
</script>

<style scoped>
.settings-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  z-index: 40;
  display: flex;
  justify-content: flex-end;
}

.settings-panel {
  width: 300px;
  max-width: 85vw;
  height: 100%;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.15);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: #1d1d1f;
  animation: slide-in 0.25s ease;
}

@keyframes slide-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.settings-header { display: flex; justify-content: space-between; align-items: center; }
.settings-header h2 { margin: 0; font-size: 1.1rem; }
.close-btn {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  cursor: pointer;
  font-size: 0.9rem;
}
.close-btn:active { transform: scale(0.9); }

.settings-section { display: flex; flex-direction: column; gap: 8px; }
.settings-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  font-weight: 600;
}
.volume-value { color: #6e6e73; font-weight: 400; }
.volume-slider { width: 100%; accent-color: #1d1d1f; cursor: pointer; }

.settings-fade-enter-active, .settings-fade-leave-active { transition: opacity 0.2s ease; }
.settings-fade-enter-from, .settings-fade-leave-to { opacity: 0; }
</style>
