<template>
  <Transition name="fade">
    <div v-if="isVisible" class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      <!-- Water Blob Background Decorative Shapes -->
      <div class="absolute w-96 h-96 bg-sky-100 rounded-full blur-3xl opacity-70 -z-10 animate-pulse"></div>
      <div class="absolute w-80 h-80 bg-blue-50 rounded-full blur-2xl opacity-60 -z-10 -translate-y-12 translate-x-12"></div>

      <!-- Main Animation Container -->
      <div class="relative flex flex-col items-center justify-center px-4 max-w-lg w-full text-center">
        
        <!-- SEAL & LOGO CONTAINER -->
        <div class="relative mb-6 select-none">
          
          <!-- SVG Animated Sea Lion Mascot -->
          <div class="animate-seal relative z-10 w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
            <svg viewBox="0 0 400 350" class="w-full h-full drop-shadow-xl" xmlns="http://www.w3.org/2000/svg">
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
              <g class="animate-tail">
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

              <!-- Glasses Frame (Rounded dark glasses like the logo) -->
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
              <g class="animate-hat">
                <!-- Hat Base/Brim -->
                <path d="M 205 152 Q 240 142 275 152 Q 240 160 205 152 Z" fill="#1E293B" stroke="#0F172A" stroke-width="4" />
                <!-- Hat Crown -->
                <path d="M 218 150 L 224 105 Q 240 102 256 105 L 262 150 Z" fill="#334155" stroke="#0F172A" stroke-width="5" stroke-linejoin="round" />
                <!-- Hat Blue Ribbon Band -->
                <path d="M 219 143 L 221 130 Q 240 127 259 130 L 261 143 Z" fill="url(#hatBandGrad)" />
              </g>

              <!-- Floating Water Bubbles -->
              <circle cx="310" cy="140" r="6" fill="#38BDF8" opacity="0.6" class="animate-bounce" style="animation-duration: 2.2s;" />
              <circle cx="110" cy="160" r="4" fill="#0284C7" opacity="0.4" class="animate-bounce" style="animation-duration: 3.1s;" />
            </svg>
          </div>

          <!-- Animated Water Waves Under Seal -->
          <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-48 h-6 overflow-hidden pointer-events-none opacity-40">
            <svg class="animate-wave-1 w-64 h-full" viewBox="0 0 200 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 10 Q 25 0, 50 10 T 100 10 T 150 10 T 200 10 V 20 H 0 Z" fill="#38BDF8"/>
            </svg>
          </div>
        </div>

        <!-- LOGO TEXT: "BUKS!" -->
        <div class="text-buks flex items-center justify-center space-x-1 sm:space-x-2 my-2 cursor-default select-none">
          <span class="buks-letter text-6xl sm:text-7xl font-black text-sky-600 -rotate-6 transform hover:rotate-0">B</span>
          <span class="buks-letter text-6xl sm:text-7xl font-black text-blue-500 rotate-3 transform translate-y-1">U</span>
          <span class="buks-letter text-6xl sm:text-7xl font-black text-slate-700 -rotate-3 transform -translate-y-1">K</span>
          <span class="buks-letter text-6xl sm:text-7xl font-black text-sky-500 rotate-6 transform">S</span>
          <span class="buks-letter text-6xl sm:text-7xl font-black text-blue-600 -rotate-12 transform scale-110">!</span>
        </div>

        <p id="loading-status" class="text-sm sm:text-base font-semibold text-slate-500 tracking-wide mt-1 mb-6 h-6">
          {{ loadingStatus }}
        </p>

        <!-- PROGRESS BAR CONTAINER -->
        <div class="w-full max-w-xs bg-slate-200/80 rounded-full h-3.5 p-0.5 shadow-inner relative overflow-hidden mb-3">
          <!-- Progress Bar Fill -->
          <div class="bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out w-0 shadow-sm"
               :style="{ width: progress + '%' }">
          </div>
        </div>

        <!-- Percentage Counter -->
        <div class="text-xs font-bold text-slate-400 tracking-wider">
          {{ Math.floor(progress) }}%
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue';

defineProps({
  show: Boolean,
});

const progress = ref(0);
const loadingStatus = ref('Menyiapkan hal-hal seru...');
const isVisible = ref(false);

const loadingPhrases = [
  'Menyiapkan topi & kacamata...',
  'Memanggil Sea Lion BUKS!...',
  'Mengisi air kolam...',
  'Memuat halaman web...',
  'Hampir selesai!'
];

let animationInterval = null;

function updateLoadingState() {
  if (progress.value < 25) {
    loadingStatus.value = loadingPhrases[0];
  } else if (progress.value < 50) {
    loadingStatus.value = loadingPhrases[1];
  } else if (progress.value < 75) {
    loadingStatus.value = loadingPhrases[2];
  } else if (progress.value < 95) {
    loadingStatus.value = loadingPhrases[3];
  } else {
    loadingStatus.value = loadingPhrases[4];
  }

  if (progress.value >= 100) {
    if (animationInterval) clearInterval(animationInterval);
    setTimeout(() => {
      isVisible.value = false;
    }, 400);
  }
}

function startLoading() {
  progress.value = 0;
  isVisible.value = true;

  if (animationInterval) clearInterval(animationInterval);

  animationInterval = setInterval(() => {
    const increment = Math.random() * 12 + 3;
    progress.value += increment;

    if (progress.value > 100) progress.value = 100;
    updateLoadingState();
  }, 180);
}

watch(() => isVisible.value, (newVal) => {
  if (newVal) {
    startLoading();
  }
});

defineExpose({
  show: () => startLoading(),
  hide: () => {
    isVisible.value = false;
    if (animationInterval) clearInterval(animationInterval);
  }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap');

:root {
  --font-fredoka: 'Fredoka', cursive, sans-serif;
  --font-jakarta: 'Plus Jakarta Sans', sans-serif;
}

body {
  font-family: var(--font-jakarta);
}

.text-buks {
  font-family: var(--font-fredoka);
  text-transform: uppercase;
  letter-spacing: -1px;
}

/* SVG & Mascot Custom Keyframe Animations */
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
  0%, 100% { transform: rotate(0deg) translateY(0); }
  30% { transform: rotate(-8deg) translateY(-2px); }
  60% { transform: rotate(6deg) translateY(-1px); }
}

@keyframes tailWag {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(18deg); }
}

@keyframes waveFloat {
  0% { transform: translateX(0); }
  50% { transform: translateX(-25px); }
  100% { transform: translateX(0); }
}

@keyframes pulseGlow {
  0%, 100% { opacity: 0.3; transform: scale(0.95); }
  50% { opacity: 0.6; transform: scale(1.05); }
}

/* Animated Classes */
.animate-seal {
  animation: floatSeal 2.8s ease-in-out infinite;
  transform-origin: center bottom;
}

.animate-hat {
  animation: hatWiggle 2.8s ease-in-out infinite;
  transform-origin: bottom center;
}

.animate-tail {
  animation: tailWag 1.2s ease-in-out infinite;
  transform-origin: right center;
}

.animate-wave-1 {
  animation: waveFloat 4s ease-in-out infinite;
}

.animate-wave-2 {
  animation: waveFloat 6s ease-in-out infinite reverse;
}

.shadow-pulse {
  animation: pulseGlow 2.8s ease-in-out infinite;
}

/* Custom Playful Letters styling for BUKS! */
.buks-letter {
  display: inline-block;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  filter: drop-shadow(3px 5px 0px rgba(30, 58, 138, 0.15));
}

.buks-letter:hover {
  transform: scale(1.2) rotate(-6deg);
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.7s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
