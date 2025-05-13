<script setup>
import { defineProps, defineEmits, computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import FilterPanel from '../components/FilterPanel.vue'
import TravelCostChart from '../components/TravelCostChart.vue'
import TravelCostTable from '../components/TravelCostTable.vue'
import RegionTravelCostChart from '../components/RegionTravelCostChart.vue'
import RegionTravelCostTable from '../components/RegionTravelCostTable.vue'
import SheetSelector from '../components/SheetSelector.vue'

const props = defineProps({
  fileName: String,
  excelData: Object,
  filters: Object,
  isColumnMappingComplete: Boolean,
  filteredData: Array,
  months: Array,
  years: Array,
})

const emit = defineEmits(['filter-changed', 'new-file', 'sheet-changed'])

// 数据缓存
const cachedComputations = ref({
  isCorrectSheet: null,
  lastExcelData: null,
  lastFilters: null,
  lastFilteredData: null
})

// 组件可见性状态
const isComponentVisible = ref(true)
const chartVisible = ref(false)
const tableVisible = ref(false)
const regionChartVisible = ref(false)
const regionTableVisible = ref(false)

// 检查当前是否在正确的工作表，使用缓存优化
const isCorrectSheet = computed(() => {
  // 如果Excel数据没有变化，使用缓存结果
  if (
    cachedComputations.value.lastExcelData === props.excelData && 
    cachedComputations.value.isCorrectSheet !== null
  ) {
    return cachedComputations.value.isCorrectSheet
  }
  
  if (!props.excelData || !props.excelData.activeSheet) {
    cachedComputations.value.isCorrectSheet = false
    return false;
  }
  
  // 优化检查逻辑，避免多次转换和检查
  const sheetName = props.excelData.activeSheet.toLowerCase();
  const result = sheetName.includes('差旅') || 
                          sheetName.includes('travel') || 
                          sheetName.includes('cost');
  
  // 更新缓存
  cachedComputations.value.lastExcelData = props.excelData
  cachedComputations.value.isCorrectSheet = result
  
  return result;
})

// 处理用户操作事件，这些通常不需要缓存
const handleNewFile = () => {
  emit('new-file')
}

const handleSheetChanged = (sheetName) => {
  // 清除缓存，因为工作表变化会导致数据变化
  cachedComputations.value.isCorrectSheet = null
  cachedComputations.value.lastExcelData = null
  
  emit('sheet-changed', sheetName)
}

const handleFilterChanged = (event) => {
  emit('filter-changed', event)
}

// 使用 IntersectionObserver 监听组件可见性
const setupIntersectionObserver = () => {
  if (!window.IntersectionObserver) {
    // 如果浏览器不支持，默认显示所有内容
    chartVisible.value = true
    tableVisible.value = true
    regionChartVisible.value = true
    regionTableVisible.value = true
    return () => {}
  }
  
  // 创建图表观察器
  const chartObserver = new IntersectionObserver((entries) => {
    chartVisible.value = entries.some(entry => entry.isIntersecting)
  }, { threshold: 0.1, rootMargin: '100px' }) // 增加rootMargin提前加载
  
  // 创建表格观察器
  const tableObserver = new IntersectionObserver((entries) => {
    tableVisible.value = entries.some(entry => entry.isIntersecting)
  }, { threshold: 0.1, rootMargin: '100px' })
  
  // 创建区域图表观察器
  const regionChartObserver = new IntersectionObserver((entries) => {
    regionChartVisible.value = entries.some(entry => entry.isIntersecting)
  }, { threshold: 0.1, rootMargin: '100px' })
  
  // 创建区域表格观察器
  const regionTableObserver = new IntersectionObserver((entries) => {
    regionTableVisible.value = entries.some(entry => entry.isIntersecting)
  }, { threshold: 0.1, rootMargin: '100px' })
  
  // 延迟观察，确保DOM已渲染
  setTimeout(() => {
    const chartContainer = document.querySelector('.chart-container')
    const tableContainer = document.querySelector('.table-container')
    const regionChartContainer = document.querySelector('.region-chart-container')
    const regionTableContainer = document.querySelector('.region-table-container')
    
    if (chartContainer) chartObserver.observe(chartContainer)
    if (tableContainer) tableObserver.observe(tableContainer)
    if (regionChartContainer) regionChartObserver.observe(regionChartContainer)
    if (regionTableContainer) regionTableObserver.observe(regionTableContainer)
  }, 100)
  
  // 返回清理函数
  return () => {
    chartObserver.disconnect()
    tableObserver.disconnect()
    regionChartObserver.disconnect()
    regionTableObserver.disconnect()
  }
}

// 监听页面可见性变化
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    // 当页面变为可见时，重新评估组件可见性
    const viewElement = document.querySelector('.travel-cost-view')
    if (viewElement && viewElement.offsetParent !== null) {
      isComponentVisible.value = true
    }
  } else {
    // 页面不可见时暂停渲染重负载组件
    isComponentVisible.value = false
  }
}

// 生命周期钩子
let observerCleanup = null

onMounted(() => {
  // 设置交叉观察器
  observerCleanup = setupIntersectionObserver()
  
  // 添加页面可见性监听
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  // 清理资源
  if (observerCleanup) observerCleanup()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  
  // 清除缓存
  cachedComputations.value = {
    isCorrectSheet: null,
    lastExcelData: null,
    lastFilters: null,
    lastFilteredData: null
  }
})
</script>

<template>
  <div class="travel-cost-view">
    <!-- 左侧侧边栏 -->
    <aside class="sidebar">
      <!-- 文件信息区域 -->
      <div class="file-info">
        <h2 class="sidebar-title">文件信息</h2>
        <div class="file-name-container">
          <span class="file-name-label">当前文件:</span>
          <span class="file-name">{{ fileName }}</span>
        </div>
        <button class="action-button" @click="handleNewFile">
          <i class="icon">📄</i> 选择新文件
        </button>
      </div>

      <!-- 工作表选择区域 -->
      <div
        class="sheet-selector-container"
        v-if="excelData && excelData.sheetNames && excelData.sheetNames.length > 1"
      >
        <h2 class="sidebar-title">工作表</h2>
        <SheetSelector
          :sheet-names="excelData.sheetNames"
          :active-sheet="excelData.activeSheet"
          @sheet-changed="handleSheetChanged"
        />
      </div>

      <div class="sidebar-divider"></div>

      <!-- 筛选组件 -->
      <FilterPanel
        :months="months || []"
        :selected-month="filters && filters.selectedMonth ? filters.selectedMonth : 'all'"
        :brands="excelData && excelData.brands ? excelData.brands : []"
        :selected-brand="filters && filters.selectedBrand ? filters.selectedBrand : 'all'"
        :cancellation-stats="{}"
        :selected-cancellation-status="filters && filters.selectedCancellationStatus ? filters.selectedCancellationStatus : 'all'"
        :years="years || []"
        :selected-year="filters && filters.selectedYear ? filters.selectedYear : 'all'"
        @filter-changed="handleFilterChanged"
      />
    </aside>

    <!-- 右侧主内容区 -->
    <main class="main-content">
      <!-- 提示选择正确的工作表 -->
      <div v-if="!isCorrectSheet" class="sheet-warning">
        <div class="warning-icon">⚠️</div>
        <h3>请选择正确的工作表</h3>
        <p>差旅成本分析功能需要解析"会议差旅【Monthly】"工作表，请确保已选择该工作表。</p>
      </div>

      <div v-else class="travel-cost-container">
        <div class="section-header">
          <h2>差旅成本分析</h2>
          <p class="subtitle">分析和可视化会议相关差旅支出</p>
        </div>

        <div class="cost-analysis-content">
          <!-- 左侧按Brand分析的图表 -->
          <div class="chart-container">
            <TravelCostChart
              v-if="chartVisible && isComponentVisible"
              :filtered-data="filteredData"
              :brand-index="excelData.brandIndex"
              :month-index="excelData.monthIndex"
              :travel-cost-index="excelData.travelCostIndex"
              :ess-participation-index="excelData.essParticipationIndex"
              :is-column-mapping-complete="isColumnMappingComplete"
              :selected-month="filters.selectedMonth"
              :selected-brand="filters.selectedBrand"
            />
            <div v-else class="placeholder-content">
              <div class="loading-indicator">加载中...</div>
            </div>
          </div>
          
          <!-- 右侧表格 -->
          <div class="table-container">
            <TravelCostTable
              v-if="tableVisible && isComponentVisible"
              :filtered-data="filteredData"
              :brand-index="excelData.brandIndex"
              :month-index="excelData.monthIndex"
              :travel-cost-index="excelData.travelCostIndex"
              :ess-participation-index="excelData.essParticipationIndex"
              :is-column-mapping-complete="isColumnMappingComplete"
              :selected-month="filters.selectedMonth"
              :selected-brand="filters.selectedBrand"
            />
            <div v-else class="placeholder-content">
              <div class="loading-indicator">加载中...</div>
            </div>
          </div>
          
          <!-- 区域分析部分 -->
          <div class="region-analysis-container">
            <h3 class="region-section-title">按区域统计的差旅成本分析</h3>
            
            <!-- 按Region分析的图表 -->
            <div class="region-chart-container">
              <RegionTravelCostChart
                v-if="regionChartVisible && isComponentVisible"
                :filtered-data="filteredData"
                :region-index="excelData.regionIndex"
                :month-index="excelData.monthIndex"
                :travel-cost-index="excelData.travelCostIndex"
                :ess-participation-index="excelData.essParticipationIndex"
                :is-column-mapping-complete="isColumnMappingComplete"
                :selected-month="filters.selectedMonth"
                :selected-region="filters.selectedRegion"
              />
              <div v-else class="placeholder-content">
                <div class="loading-indicator">加载中...</div>
              </div>
            </div>
            
            <!-- 区域分析表格 -->
            <div class="region-table-container">
              <RegionTravelCostTable
                v-if="regionTableVisible && isComponentVisible"
                :filtered-data="filteredData"
                :region-index="excelData.regionIndex"
                :month-index="excelData.monthIndex"
                :travel-cost-index="excelData.travelCostIndex"
                :ess-participation-index="excelData.essParticipationIndex"
                :is-column-mapping-complete="isColumnMappingComplete"
                :selected-month="filters.selectedMonth"
                :selected-region="filters.selectedRegion"
              />
              <div v-else class="placeholder-content">
                <div class="loading-indicator">加载中...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.travel-cost-view {
  display: flex;
  width: 100%;
  height: calc(100vh - 60px); /* 减去标签导航的高度 */
  overflow: hidden;
  background-color: #f8f9fa;
  contain: content; /* 提高渲染效率 */
}

/* 侧边栏样式 - 与主视图保持一致 */
.sidebar {
  width: 280px;
  height: 100%;
  background-color: #fff;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.05);
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  z-index: 10;
  will-change: transform; /* 优化滚动性能 */
}

.sidebar-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eaeaea;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-name-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name-label {
  font-size: 0.85rem;
  color: #666;
}

.file-name {
  font-weight: 500;
  color: #333;
  word-break: break-all;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 10px;
  font-size: 0.95rem;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover {
  background-color: #f9f9f9;
  border-color: #bbb;
}

.action-button .icon {
  font-size: 1.1rem;
}

.sidebar-divider {
  height: 1px;
  background-color: #eaeaea;
  margin: 0;
}

.sheet-selector-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 主内容区样式 */
.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  contain: content; /* 优化渲染性能 */
  will-change: transform; /* 优化滚动性能 */
}

.travel-cost-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-header {
  margin-bottom: 8px;
}

.section-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.section-header .subtitle {
  margin-top: 8px;
  font-size: 1rem;
  color: #666;
}

.cost-analysis-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 24px;
  contain: layout; /* 优化渲染性能 */
}

.chart-container, .table-container, .region-chart-container, .region-table-container {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  height: 450px;
  contain: layout; /* 提高渲染效率 */
}

.region-analysis-container {
  grid-column: 1 / -1; /* 跨越所有列 */
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding-top: 20px;
  border-top: 1px solid #eaeaea;
}

.region-section-title {
  grid-column: 1 / -1;
  text-align: center;
  margin: 0 0 10px 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
  padding-bottom: 10px;
  border-bottom: 2px solid #8E44AD;
}

.placeholder-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9f9f9;
}

.loading-indicator {
  font-size: 1rem;
  color: #666;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

/* 警告样式 */
.sheet-warning {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin-top: 24px;
}

.warning-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.sheet-warning h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: #FFA500;
}

.sheet-warning p {
  color: #666;
  font-size: 1.1rem;
  line-height: 1.5;
  max-width: 500px;
}

@media (max-width: 1200px) {
  .cost-analysis-content {
    grid-template-columns: 1fr;
  }
  
  .region-analysis-container {
    grid-column: auto;
    grid-template-columns: 1fr;
  }
}
</style> 