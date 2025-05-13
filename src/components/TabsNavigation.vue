<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  activeTab: {
    type: String,
    default: 'data-visual',
  },
})

const emit = defineEmits(['tab-changed'])

const handleTabChange = (tab) => {
  emit('tab-changed', tab)
}
</script>

<template>
  <div class="tabs-navigation">
    <div class="tabs-container">
      <div
        class="tab"
        :class="{ active: activeTab === 'data-visual' }"
        @click="handleTabChange('data-visual')"
      >
        <div class="tab-icon">📊</div>
        <div class="tab-label">数据可视化</div>
      </div>
      
      <div
        class="tab"
        :class="{ active: activeTab === 'budget-distribution' }"
        @click="handleTabChange('budget-distribution')"
      >
        <div class="tab-icon">💰</div>
        <div class="tab-label">会议预算分布</div>
      </div>
      
      <div
        class="tab"
        :class="{ active: activeTab === 'travel-cost' }"
        @click="handleTabChange('travel-cost')"
      >
        <div class="tab-icon">✈️</div>
        <div class="tab-label">差旅成本分析</div>
      </div>
      
      <div
        class="tab"
        :class="{ active: activeTab === 'performance' }"
        @click="handleTabChange('performance')"
      >
        <div class="tab-icon">📈</div>
        <div class="tab-label">绩效分析</div>
      </div>
      
      <div
        class="tab"
        :class="{ active: activeTab === 'custom-chart' }"
        @click="handleTabChange('custom-chart')"
      >
        <div class="tab-icon">🔍</div>
        <div class="tab-label">自定义图表</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabs-navigation {
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  padding: 0 20px;
  height: 60px;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.tabs-container {
  display: flex;
  gap: 15px;
  width: 100%;
}

.tab {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 8px;
  user-select: none;
  color: #555;
  font-weight: 500;
}

.tab:hover {
  background-color: #f7f7fc;
  color: #8E44AD;
}

.tab.active {
  background-color: #f0ebfa;
  color: #8E44AD;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(142, 68, 173, 0.1);
}

.tab-icon {
  font-size: 1.1rem;
}

.tab-label {
  font-size: 0.95rem;
}

@media (max-width: 576px) {
  .tabs-navigation {
    padding: 0 10px;
  }
  
  .tab {
    padding: 8px 12px;
  }
  
  .tab-label {
    font-size: 0.85rem;
  }
}
</style> 