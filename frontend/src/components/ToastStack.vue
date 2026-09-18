<template>
  <div class="toast-stack">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast">
        <span class="toast-message">{{ t.message }}</span>
        <button class="toast-action" @click="$emit('action', t.id)">
          {{ t.actionLabel }}
        </button>
        <div class="toast-progress" :style="{ animationDuration: t.duration + 'ms' }"></div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
defineProps({
  toasts: { type: Array, required: true }, // [{ id, message, actionLabel, duration }]
});
defineEmits(["action"]);
</script>

<style scoped>
.toast-stack {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 30;
}

.toast {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(29, 29, 31, 0.92);
  backdrop-filter: blur(10px);
  color: #fff;
  font-size: 0.88rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  min-width: 260px;
}

.toast-message { flex: 1; }

.toast-action {
  background: none;
  border: none;
  color: #5b9dff;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 6px;
}

.toast-progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 3px;
  width: 100%;
  background: #5b9dff;
  transform-origin: left;
  animation-name: shrink;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
@keyframes shrink {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}

.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(12px); }
</style>