<template>
  <div class="board-panel">
    <div class="board-header">
      <div class="avatar">📚</div>
      <div>
        <p class="board-name">Papan Baca</p>
        <p class="board-sub">{{ totalBooks }} buku tercatat</p>
      </div>
    </div>

    <div class="stat-row">
      <div v-for="s in statusStats" :key="s.status" class="stat-chip">
        <span class="stat-value">{{ s.count }}</span>
        <span class="stat-label">{{ s.label }}</span>
      </div>
    </div>

    <div class="goal-block">
      <div class="goal-header">
        <span>Target baca {{ currentYear }}</span>
        <button class="goal-edit" @click="editingGoal = !editingGoal">✏️</button>
      </div>
      <div v-if="editingGoal" class="goal-input-row">
        <input type="number" v-model.number="goalDraft" min="1" />
        <button @click="saveGoal">Simpan</button>
      </div>
      <div class="goal-bar-track">
        <div class="goal-bar-fill" :style="{ width: goalPercent + '%' }"></div>
      </div>
      <p class="goal-text">{{ finishedThisYear }} / {{ goal }} buku</p>
    </div>

    <div class="chart-block">
      <p class="chart-title">Ditambahkan / bulan</p>
      <div class="bar-chart">
        <div
          v-for="m in monthlyData"
          :key="m.label"
          class="bar"
          :style="{ height: m.percent + '%' }"
          :title="`${m.label}: ${m.count}`"
        ></div>
      </div>
    </div>

    <p v-if="favoriteGenre" class="genre-line">
      Genre favorit: <strong>{{ favoriteGenre }}</strong>
    </p>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({ books: { type: Array, required: true } });

const totalBooks = computed(() => props.books.length);
const STATUS_LABELS = { mau_dibaca: "Mau", sedang_dibaca: "Sedang", sudah_dibaca: "Selesai" };
const statusStats = computed(() =>
  Object.entries(STATUS_LABELS).map(([status, label]) => ({
    status, label, count: props.books.filter((b) => b.status === status).length,
  }))
);

const favoriteGenre = computed(() => {
  const counts = {};
  props.books.forEach((b) => { if (b.genre) counts[b.genre] = (counts[b.genre] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
});

// ---------- Target baca tahunan (disimpen di localStorage) ----------
const currentYear = new Date().getFullYear();
const GOAL_KEY = `reading-goal-${currentYear}`;
const goal = ref(Number(localStorage.getItem(GOAL_KEY)) || 12);
const editingGoal = ref(false);
const goalDraft = ref(goal.value);

function saveGoal() {
  goal.value = goalDraft.value || 1;
  localStorage.setItem(GOAL_KEY, String(goal.value));
  editingGoal.value = false;
}

const finishedThisYear = computed(() =>
  props.books.filter(
    (b) => b.status === "sudah_dibaca" && b.finished_at && new Date(b.finished_at).getFullYear() === currentYear
  ).length
);
const goalPercent = computed(() => Math.min(100, Math.round((finishedThisYear.value / goal.value) * 100)));

// ---------- Bar chart 6 bulan terakhir, berdasar created_at ----------
const monthlyData = computed(() => {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString("id-ID", { month: "short" }) };
  });
  const counts = months.map((m) =>
    props.books.filter((b) => {
      if (!b.created_at) return false;
      const bd = new Date(b.created_at);
      return bd.getFullYear() === m.year && bd.getMonth() === m.month;
    }).length
  );
  const max = Math.max(1, ...counts);
  return months.map((m, i) => ({ label: m.label, count: counts[i], percent: (counts[i] / max) * 100 }));
});
</script>

<style scoped>
.board-panel {
  width: 260px; padding: 18px; border-radius: 18px;
  background: rgba(255,255,255,0.85); backdrop-filter: blur(16px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.15); font-size: 0.8rem; color: #1d1d1f;
}
.board-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.avatar { width: 36px; height: 36px; border-radius: 50%; background: #1d1d1f; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.board-name { margin: 0; font-weight: 700; }
.board-sub { margin: 2px 0 0; color: #6e6e73; font-size: 0.72rem; }
.stat-row { display: flex; gap: 6px; margin-bottom: 14px; }
.stat-chip { flex: 1; text-align: center; background: rgba(0,0,0,0.05); border-radius: 10px; padding: 6px 2px; }
.stat-value { display: block; font-weight: 700; font-size: 1rem; }
.stat-label { font-size: 0.62rem; color: #6e6e73; }
.goal-block { margin-bottom: 14px; }
.goal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.goal-edit { background: none; border: none; cursor: pointer; }
.goal-input-row { display: flex; gap: 6px; margin-bottom: 6px; }
.goal-input-row input { width: 60px; padding: 4px 6px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); }
.goal-bar-track { height: 8px; border-radius: 100px; background: rgba(0,0,0,0.08); overflow: hidden; }
.goal-bar-fill { height: 100%; background: #4caf6e; transition: width 0.3s ease; }
.goal-text { margin: 4px 0 0; font-size: 0.7rem; color: #6e6e73; }
.chart-block { margin-bottom: 10px; }
.chart-title { margin: 0 0 6px; font-size: 0.72rem; color: #6e6e73; }
.bar-chart { display: flex; align-items: flex-end; gap: 4px; height: 50px; }
.bar { flex: 1; background: #5b8def; border-radius: 3px 3px 0 0; min-height: 2px; }
.genre-line { margin: 0; font-size: 0.75rem; color: #6e6e73; }
</style>