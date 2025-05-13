<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  sheetNames: {
    type: Array,
    default: () => [],
  },
  activeSheet: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['sheet-changed'])

// 切换工作表
const switchSheet = (sheetName) => {
  if (sheetName) {
    console.log('SheetSelector: 触发工作表切换事件，选择的工作表:', sheetName);
    emit('sheet-changed', sheetName)
  }
}
</script>

<template>
  <div v-if="sheetNames.length > 1" class="sheet-selector-container">
    <h2 class="selector-title">选择工作表</h2>
    <div class="sheet-tabs">
      <button
        v-for="sheet in sheetNames"
        :key="sheet"
        @click="switchSheet(sheet)"
        :class="['sheet-tab', { active: activeSheet === sheet }]"
      >
        {{ sheet }}
      </button>
    </div>
    <div class="debug-info">
      <p>可用工作表: {{ sheetNames.length }}个</p>
      <p>当前工作表: {{ activeSheet || '未选择' }}</p>
    </div>
  </div>
</template>

<style scoped>
.sheet-selector-container {
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.07);
  padding: 20px;
  margin-bottom: 20px;
}

.selector-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid #eaeaea;
  padding-bottom: 10px;
}

.sheet-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.sheet-tab {
  padding: 10px 15px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #495057;
  font-size: 0.95rem;
  font-weight: 500;
}

.sheet-tab:hover {
  background-color: #f2f2f7;
  color: #8E44AD;
  border-color: #d8cbea;
}

.sheet-tab.active {
  background-color: #f0ebfa;
  color: #8E44AD;
  border-color: #8E44AD;
  font-weight: 600;
  box-shadow: 0 2px 5px rgba(142, 68, 173, 0.1);
}

.debug-info {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px dashed #eaeaea;
  font-size: 0.85rem;
  color: #666;
}
</style>
