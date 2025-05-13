<script setup>
import { defineProps, defineEmits, ref, computed } from 'vue'

const props = defineProps({
  months: {
    type: Array,
    default: () => [],
  },
  selectedMonth: {
    type: [String, Array],
    default: 'all',
  },
  regionStats: {
    type: Object,
    default: () => ({ regions: {}, total: 0 }),
  },
  totalMeetings: {
    type: Number,
    default: 0,
  },
  brands: {
    type: Array,
    default: () => [],
  },
  selectedBrand: {
    type: String,
    default: 'all',
  },
  cancellationStats: {
    type: Object,
    default: () => ({ cancelled: 0, notCancelled: 0, total: 0, cancelledPercentage: 0, notCancelledPercentage: 0 }),
  },
  selectedCancellationStatus: {
    type: String,
    default: 'all',
  },
  years: {
    type: Array,
    default: () => ["2024", "2025"],
  },
  selectedYear: {
    type: String,
    default: 'all',
  },
})

const emit = defineEmits(['filter-changed'])

// 内部保存月份选择状态
const selectedMonths = ref(props.selectedMonth === 'all' ? [] : 
  Array.isArray(props.selectedMonth) ? [...props.selectedMonth] : [props.selectedMonth])

// 计算全选状态
const allMonthsSelected = computed(() => {
  return selectedMonths.value.length === props.months.length || selectedMonths.value.length === 0
})

// 计算月份显示状态
const monthDisplayText = computed(() => {
  if (allMonthsSelected.value) return '全部月份'
  if (selectedMonths.value.length === 1) return selectedMonths.value[0]
  return `已选择${selectedMonths.value.length}个月份`
})

// Year改变
const onYearChange = (event) => {
  emit('filter-changed', { type: 'year', value: event.target.value })
}

// 月份选择改变
const onMonthChange = (month) => {
  const index = selectedMonths.value.indexOf(month)
  if (index === -1) {
    // 添加月份
    selectedMonths.value.push(month)
  } else {
    // 移除月份
    selectedMonths.value.splice(index, 1)
  }
  
  // 发送更新事件，如果没有选择任何月份，视为选择全部
  const value = selectedMonths.value.length === 0 ? 'all' : [...selectedMonths.value]
  emit('filter-changed', { type: 'month', value: value })
}

// 全选/取消全选月份
const toggleAllMonths = () => {
  if (selectedMonths.value.length === 0 || selectedMonths.value.length === props.months.length) {
    // 已全选或未选择任何月份，则反转状态
    selectedMonths.value = allMonthsSelected.value ? [...props.months] : []
  } else {
    // 部分选择，则全选
    selectedMonths.value = [...props.months]
  }
  
  // 发送更新事件
  const value = selectedMonths.value.length === 0 ? 'all' : [...selectedMonths.value]
  emit('filter-changed', { type: 'month', value: value })
}

// Brand/Team改变
const onBrandChange = (event) => {
  emit('filter-changed', { type: 'brand', value: event.target.value })
}

// 会议取消状态改变
const onCancellationChange = (event) => {
  emit('filter-changed', { type: 'cancellation', value: event.target.value })
}
</script>

<template>
  <div class="filter-panel">
    <h2 class="sidebar-title">数据筛选</h2>

    <!-- Year筛选 -->
    <div class="filter-group">
      <label for="year-select">选择年份:</label>
      <select
        id="year-select"
        :value="selectedYear"
        @change="onYearChange"
        class="filter-select"
      >
        <option value="all">全部年份</option>
        <option v-for="year in years" :key="year" :value="year">
          {{ year }}
        </option>
      </select>
    </div>

    <!-- 月份多选筛选 -->
    <div class="filter-group">
      <div class="filter-header">
        <label>选择月份:</label>
        <button 
          type="button" 
          class="toggle-all-button" 
          @click="toggleAllMonths"
        >
          {{ allMonthsSelected ? '全选' : '取消全选' }}
        </button>
      </div>
      
      <div class="month-dropdown">
        <div class="month-selected" tabindex="0">
          {{ monthDisplayText }}
          <span class="dropdown-arrow">▼</span>
        </div>
        
        <div class="month-options">
          <div 
            v-for="month in months" 
            :key="month" 
            class="month-option"
          >
            <label class="checkbox-container">
              <input 
                type="checkbox" 
                :value="month" 
                :checked="selectedMonths.includes(month)"
                @change="onMonthChange(month)"
              />
              <span class="checkmark"></span>
              {{ month }}
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="filter-group">
      <label for="brand-select">Brand/Team:</label>
      <select
        id="brand-select"
        :value="selectedBrand"
        @change="onBrandChange"
        class="filter-select"
      >
        <option value="all">所有Brand/Team</option>
        <option v-for="brand in brands" :key="brand" :value="brand">
          {{ brand }}
        </option>
      </select>
    </div>
    
    <div class="filter-group">
      <label for="cancellation-select">会议取消状态:</label>
      <select
        id="cancellation-select"
        :value="selectedCancellationStatus"
        @change="onCancellationChange"
        class="filter-select"
      >
        <option value="all">所有会议</option>
        <option value="已取消">已取消会议</option>
        <option value="未取消">未取消会议</option>
      </select>
    </div>

    <!-- 数据统计摘要 -->
    <div v-if="regionStats.total > 0" class="data-summary">
      <h3 class="section-title">数据统计</h3>
      <div class="summary-stats">
        <div class="stat-item">
          <span class="stat-label">总会议数:</span>
          <span class="stat-value">{{ regionStats.total }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">已取消会议数量:</span>
          <span class="stat-value">{{ cancellationStats.cancelled }} ({{ cancellationStats.cancelledPercentage }}%)</span>
        </div>
      </div>
    </div>

    <div v-else class="no-data-message">请选择有效的月份和Brand/Team以查看数据统计</div>
  </div>
</template>

<style scoped>
.filter-panel {
  height: fit-content;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.sidebar-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eaeaea;
}

.section-title {
  font-size: 1rem;
  color: #333;
  margin-top: 0;
  margin-bottom: 15px;
  font-weight: 600;
}

.filter-group {
  margin-bottom: 20px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.filter-header label {
  color: #555;
  font-weight: 500;
  font-size: 0.9rem;
}

.toggle-all-button {
  background: none;
  border: none;
  color: #8E44AD;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 2px 5px;
}

.toggle-all-button:hover {
  text-decoration: underline;
}

.filter-group label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 500;
  font-size: 0.9rem;
}

.filter-select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-select:focus {
  border-color: #8E44AD;
  outline: none;
  box-shadow: 0 0 0 2px rgba(142, 68, 173, 0.2);
}

/* 月份多选样式 */
.month-dropdown {
  position: relative;
  width: 100%;
}

.month-selected {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  background-color: #fff;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.month-selected:hover,
.month-selected:focus {
  border-color: #8E44AD;
  box-shadow: 0 0 0 2px rgba(142, 68, 173, 0.2);
}

.dropdown-arrow {
  font-size: 0.8rem;
  color: #666;
}

.month-options {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  max-height: 250px;
  overflow-y: auto;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  margin-top: 4px;
  display: none;
}

.month-dropdown:hover .month-options,
.month-selected:focus + .month-options {
  display: block;
}

.month-option {
  padding: 8px 10px;
  cursor: pointer;
}

.month-option:hover {
  background-color: #f5f0f8;
}

/* 自定义复选框样式 */
.checkbox-container {
  display: flex;
  align-items: center;
  position: relative;
  padding-left: 28px;
  cursor: pointer;
  font-size: 0.95rem;
  user-select: none;
}

.checkbox-container input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  position: absolute;
  left: 0;
  height: 18px;
  width: 18px;
  background-color: #eee;
  border-radius: 3px;
  border: 1px solid #ddd;
}

.checkbox-container:hover input ~ .checkmark {
  background-color: #ccc;
}

.checkbox-container input:checked ~ .checkmark {
  background-color: #8E44AD;
  border-color: #8E44AD;
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
}

.checkbox-container input:checked ~ .checkmark:after {
  display: block;
}

.checkbox-container .checkmark:after {
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

/* 数据统计 */
.data-summary {
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.summary-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.stat-item {
  flex: 1;
  min-width: 100px;
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease;
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08);
}

.stat-label {
  display: block;
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #8E44AD;
}

.no-data-message {
  padding: 15px;
  text-align: center;
  color: #888;
  font-style: italic;
  background-color: #f8f9fa;
  border-radius: 6px;
  margin-top: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

@media (max-width: 768px) {
  .summary-stats {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
