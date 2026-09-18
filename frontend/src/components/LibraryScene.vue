<template>
  <div ref="containerRef" class="scene-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { useLibraryScene } from "../three/useLibraryScene";

const props = defineProps({
  books: { type: Array, required: true },
});
const emit = defineEmits(["edit-book", "move-book", "delete-book"]);

const containerRef = ref(null);
let scene;

onMounted(() => {
  scene = useLibraryScene({
    onEditBook: (id) => emit("edit-book", id),
    onMoveBook: (id, status) => emit("move-book", { id, status }),
    onDeleteBook: (id) => emit("delete-book", id),
  });
  scene.init(containerRef.value);
  scene.layoutBooks(props.books);
});

watch(
  () => props.books,
  (newBooks) => scene?.layoutBooks(newBooks),
  { deep: true }
);

onBeforeUnmount(() => scene?.destroy());
</script>

<style scoped>
.scene-container {
  width: 100%;
  height: 100vh;
}
</style>