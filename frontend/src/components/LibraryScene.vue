<template>
  <div ref="containerRef" class="scene-container">
    <div
      v-for="label in emptyShelfLabels"
      :key="label.status"
      class="shelf-empty-label"
      :style="{ left: label.x + 'px', top: label.y + 'px' }"
    >
      <span class="bounce-arrow">👇</span>
      <p>Rak "{{ label.label }}" masih kosong,<br />yuk drag buku ke sini 👋</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useLibraryScene } from "../three/useLibraryScene";

const props = defineProps({
  books: { type: Array, required: true },
  matchedIds: { type: Set, default: () => new Set() },
  hasActiveFilter: { type: Boolean, default: false },
  environmentId: { type: String, default: "forest" },
  walkMode: { type: Boolean, default: false },
  inputLocked: { type: Boolean, default: false },
});
const emit = defineEmits(["edit-book", "move-book", "request-delete"]);

const containerRef = ref(null);
const shelfLabels = ref([]);
let scene;

const emptyShelfLabels = computed(() =>
  shelfLabels.value.filter((l) => l.count === 0 && l.inFront),
);

onMounted(() => {
  scene = useLibraryScene({
    onEditBook: (id) => emit("edit-book", id),
    onMoveBook: (id, status) => emit("move-book", { id, status }),
    onRequestDelete: (id) => emit("request-delete", id),
    onShelfLabelsUpdate: (positions) => {
      shelfLabels.value = positions;
    },
    onBoardAnchorUpdate: null,
    environmentId: props.environmentId,
  });
  scene.init(containerRef.value);
  scene.layoutBooks(props.books);
  scene.updateHighlight(props.matchedIds, props.hasActiveFilter);
  scene.setInputLocked(props.inputLocked);
  scene.setWalkMode(props.walkMode);
});

watch(
  () => props.books,
  (b) => scene?.layoutBooks(b),
  { deep: true },
);
watch(
  [() => props.matchedIds, () => props.hasActiveFilter],
  ([ids, active]) => {
    scene?.updateHighlight(ids, active);
  },
  watch(
    () => props.walkMode,
    (on) => scene?.setWalkMode(on),
  ),
  watch(
    () => props.inputLocked,
    (v) => scene?.setInputLocked(v),
  ),
);

onBeforeUnmount(() => scene?.destroy());
defineExpose({
  switchEnvironment: (id) => scene?.switchEnvironment(id),
});
</script>

<style scoped>
.scene-container {
  position: relative;
  width: 100%;
  height: 100vh;
}

.shelf-empty-label {
  position: absolute;
  transform: translate(-50%, -100%);
  text-align: center;
  pointer-events: none;
  color: #6e6e73;
  font-size: 0.8rem;
  line-height: 1.4;
}

.bounce-arrow {
  display: inline-block;
  font-size: 1.4rem;
  animation: bounce 1.2s ease-in-out infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(6px);
  }
}
</style>
