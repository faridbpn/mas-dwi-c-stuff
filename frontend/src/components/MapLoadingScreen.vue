<template>
  <Transition name="fade">
    <div v-if="isVisible" class="loading-overlay">
      <!-- Water Blob Background Decorative Shapes -->
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>

      <!-- Main Animation Container -->
      <div class="loading-container">
        <!-- SEAL & LOGO CONTAINER -->
        <div class="seal-container">
          <!-- SVG Animated Sea Lion Mascot -->
          <div class="seal-animation">
            <svg viewBox="0 0 400 350" class="seal-svg" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <!-- Seal Body Gradient -->
                <linearGradient id="sealBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#94A3B8" />
                  <stop offset="50%" stop-color="#78889E" />
                  <stop offset="100%" stop-color="#5B687A" />
                </linearGradient>

                <!-- Belly Soft Highlight Gradient -->
                <linearGradient id="bellyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#E2E8F0" />
                  <stop offset="100%" stop-color="#CBD5E1" />
                </linearGradient>

                <linearGradient id="hatBandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#38BDF8" />
                  <stop offset="100%" stop-color="#0284C7" />
                </linearGradient>
              </defs>

              <!-- Seal Shadow -->
              <ellipse cx="200" cy="315" rx="110" ry="18" fill="#1E293B" opacity="0.12" class="shadow-pulse" />

              <!-- Seal Tail (Flipper) -->
              <g class="tail-animation">
                <path d="M 95 245 C 60 250 40 220 30 230 C 25 235 35 260 55 265 C 75 270 95 258 95 245 Z"
                  fill="#64748B" stroke="#334155" stroke-width="7" stroke-linejoin="round" />
              </g>

              <!-- Main Seal Body -->
              <path d="M 90 245 C 70 190 120 125 210 135 C 290 145 320 200 310 250 C 300 290 220 305 150 295 C 110 290 95 270 90 245 Z"
                fill="url(#sealBodyGrad)" stroke="#2C3E50" stroke-width="8" stroke-linejoin="round" />

              <!-- Soft Belly Patch -->
              <path d="M 120 255 C 110 220 150 175 210 180 C 265 185 285 220 275 255 C 260 285 190 292 140 285 C 125 280 120 268 120 255 Z"
                fill="url(#bellyGrad)" opacity="0.85" />

              <!-- Side Flipper (Fin) -->
              <path d="M 175 245 C 150 265 140 285 165 285 C 190 285 205 260 200 245 Z"
                fill="#526071" stroke="#2C3E50" stroke-width="7" stroke-linejoin="round" />

              <!-- Cute Cheeks Pink -->
              <ellipse cx="230" cy="245" rx="12" ry="8" fill="#F43F5E" opacity="0.25" />

              <!-- Glasses Frame -->
              <g id="glasses" stroke="#1E293B" stroke-width="7" fill="none" stroke-linecap="round">
                <!-- Left Lens -->
                <circle cx="258" cy="236" r="16" fill="#FFFFFF" fill-opacity="0.2" />
                <!-- Right Lens -->
                <circle cx="288" cy="236" r="16" fill="#FFFFFF" fill-opacity="0.2" />
                <!-- Bridge -->
                <path d="M 274 234 Q 278 230 282 234" />
                <!-- Side arm -->
                <path d="M 242 234 Q 235 230 230 232" />
              </g>

              <!-- Eyes inside glasses -->
              <circle cx="260" cy="236" r="4" fill="#0F172A" />
              <circle cx="286" cy="236" r="4" fill="#0F172A" />
              <!-- Eye shine -->
              <circle cx="258" cy="234" r="1.5" fill="#FFFFFF" />
              <circle cx="284" cy="234" r="1.5" fill="#FFFFFF" />

              <!-- Cute Mouth & Snout -->
              <path d="M 285 248 C 280 255 275 255 270 248 C 265 255 260 255 255 248"
                stroke="#1E293B" stroke-width="5" fill="none" stroke-linecap="round" />
              <!-- Cute Oval Nose -->
              <ellipse cx="270" cy="245" rx="5" ry="3.5" fill="#1E293B" />

              <!-- Top Hat (Gentleman Hat from Logo) -->
              <g class="hat-animation">
                <!-- Hat Base/Brim -->
                <path d="M 205 152 Q 240 142 275 152 Q 240 160 205 152 Z" fill="#1E293B" stroke="#0F172A" stroke-width="4" />
                <!-- Hat Crown -->
                <path d="M 218 150 L 224 105 Q 240 102 256 105 L 262 150 Z" fill="#334155" stroke="#0F172A" stroke-width="5" stroke-linejoin="round" />
                <!-- Hat Blue Ribbon Band -->
                <path d="M 219 143 L 221 130 Q 240 127 259 130 L 261 143 Z" fill="url(#hatBandGrad)" />
              </g>

              <!-- Floating Water Bubbles -->
              <circle cx="310" cy="140" r="6" fill="#38BDF8" opacity="0.6" class="bubble-1" />
              <circle cx="110" cy="160" r="4" fill="#0284C7" opacity="0.4" class="bubble-2" />
            </svg>
          </div>

          <!-- Animated Water Waves Under Seal -->
          <div class="wave-container">
            <svg class="wave-1" viewBox="0 0 200 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 10 Q 25 0, 50 10 T 100 10 T 150 10 T 200 10 V 20 H 0 Z" fill="#38BDF8" />
            </svg>
          </div>
        </div>

        <!-- LOGO TEXT: "BUKS!" -->
        <div class="buks-text">
          <span class="buks-letter letter-b">B</span>
          <span class="buks-letter letter-u">U</span>
          <span class="buks-letter letter-k">K</span>
          <span class="buks-letter letter-s">S</span>
          <span class="buks-letter letter-exclaim">!</span>
        </div>

        <p id="loading-status" class="loading-status">
          {{ statusText }}
        </p>

        <!-- PROGRESS BAR CONTAINER -->
        <div class="progress-container">
          <!-- Progress Bar Fill -->
          <div id="progress-bar" class="progress-bar" :style="{ width: progress + '%' }"></div>
        </div>

        <!-- Percentage Counter -->
        <div id="progress-text" class="progress-text">
          {{ Math.floor(progress) }}%
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";

const isVisible = ref(false);
const progress = ref(0);
let progressInterval = null;

const statusPhrases = [
  "Menyiapkan topi & kacamata...",
  "Memanggil Sea Lion BUKS!...",
  "Mengisi air kolam...",
  "Memuat halaman peta...",
  "Hampir selesai!",
];

const statusText = computed(() => {
  if (progress.value < 25) return statusPhrases[0];
  if (progress.value < 50) return statusPhrases[1];
  if (progress.value < 75) return statusPhrases[2];
  if (progress.value < 95) return statusPhrases[3];
  return statusPhrases[4];
});

function startLoading() {
  isVisible.value = true;
  progress.value = 0;

  if (progressInterval) clearInterval(progressInterval);

  progressInterval = setInterval(() => {
    const increment = Math.random() * 12 + 3;
    progress.value += increment;

    if (progress.value > 100) progress.value = 100;
  }, 180);
}

function stopLoading() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }

  progress.value = 100;

  setTimeout(() => {
    isVisible.value = false;
    progress.value = 0;
  }, 400);
}

defineExpose({
  startLoading,
  stopLoading,
});
</script>

<style scoped>
/* Keyframe Animations */
@keyframes floatSeal {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  25% {
    transform: translateY(-12px) rotate(-3deg);
  }
  50% {
    transform: translateY(-4px) rotate(2deg);
  }
  75% {
    transform: translateY(-16px) rotate(-1deg);
  }
}

@keyframes hatWiggle {
  0%, 100% {
    transform: rotate(0deg) translateY(0);
  }
  30% {
    transform: rotate(-8deg) translateY(-2px);
  }
  60% {
    transform: rotate(6deg) translateY(-1px);
  }
}

@keyframes tailWag {
  0%, 100% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(18deg);
  }
}

@keyframes waveFloat {
  0% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(-25px);
  }
  100% {
    transform: translateX(0);
  }
}

@keyframes pulseGlow {
  0%, 100% {
    opacity: 0.3;
    transform: scale(0.95);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.05);
  }
}

@keyframes bubbleBounce1 {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes bubbleBounce2 {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* Overlay and Container */
.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 9999px;
  filter: blur(60px);
  z-index: 0;
}

.blob-1 {
  width: 24rem;
  height: 24rem;
  background: #f0f9ff;
  opacity: 0.7;
  top: -5%;
  right: -10%;
  animation: pulse 4s ease-in-out infinite;
}

.blob-2 {
  width: 20rem;
  height: 20rem;
  background: #e0f2fe;
  opacity: 0.6;
  bottom: -5%;
  left: -5%;
  animation: pulse 6s ease-in-out infinite reverse;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.loading-container {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 32rem;
  padding: 1rem;
  text-align: center;
}

/* Seal Animation */
.seal-container {
  position: relative;
  margin-bottom: 1.5rem;
  select-user: none;
}

.seal-animation {
  animation: floatSeal 2.8s ease-in-out infinite;
  transform-origin: center bottom;
  width: 16rem;
  height: 16rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.seal-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 20px 25px rgba(0, 0, 0, 0.1));
}

.shadow-pulse {
  animation: pulseGlow 2.8s ease-in-out infinite;
}

.tail-animation {
  animation: tailWag 1.2s ease-in-out infinite;
  transform-origin: right center;
}

.hat-animation {
  animation: hatWiggle 2.8s ease-in-out infinite;
  transform-origin: bottom center;
}

.bubble-1 {
  animation: bubbleBounce1 2.2s ease-in-out infinite;
}

.bubble-2 {
  animation: bubbleBounce2 3.1s ease-in-out infinite;
}

.wave-container {
  position: absolute;
  bottom: -0.5rem;
  left: 50%;
  transform: translateX(-50%);
  width: 12rem;
  height: 1.5rem;
  overflow: hidden;
  opacity: 0.4;
  pointer-events: none;
}

.wave-1 {
  animation: waveFloat 4s ease-in-out infinite;
  width: 16rem;
  height: 100%;
}

/* BUKS! Text */
.buks-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  margin: 0.5rem 0 1.5rem;
  cursor: default;
  select-user: none;
  font-family: "Fredoka", cursive, sans-serif;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -1px;
}

.buks-letter {
  display: inline-block;
  font-size: 3.5rem;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  filter: drop-shadow(3px 5px 0px rgba(30, 58, 138, 0.15));
  line-height: 1;
}

.letter-b {
  color: #0ea5e9;
  transform: rotate(-6deg);
}

.letter-u {
  color: #3b82f6;
  transform: rotate(3deg) translateY(0.25rem);
}

.letter-k {
  color: #475569;
  transform: rotate(-3deg) translateY(-0.25rem);
}

.letter-s {
  color: #06b6d4;
  transform: rotate(6deg);
}

.letter-exclaim {
  color: #2563eb;
  transform: rotate(-12deg) scale(1.1);
}

.buks-letter:hover {
  transform: scale(1.2) rotate(-6deg);
}

/* Loading Status */
.loading-status {
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.025em;
  margin: 0 0 1.5rem;
  height: 1.5rem;
  transition: opacity 0.3s ease;
}

/* Progress Bar Container */
.progress-container {
  width: 100%;
  max-width: 20rem;
  background: #e2e8f0;
  border-radius: 9999px;
  height: 0.875rem;
  padding: 0.125rem;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  position: relative;
  margin-bottom: 0.75rem;
}

.progress-bar {
  background: linear-gradient(90deg, #38bdf8, #3b82f6, #4f46e5);
  height: 100%;
  border-radius: 9999px;
  transition: width 0.3s ease-out;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
}

/* Progress Text */
.progress-text {
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.05em;
}

/* Fade Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 640px) {
  .seal-animation {
    width: 14rem;
    height: 14rem;
  }

  .buks-letter {
    font-size: 2.5rem;
  }

  .loading-status {
    font-size: 0.8rem;
  }

  .progress-text {
    font-size: 0.7rem;
  }
}
</style>
