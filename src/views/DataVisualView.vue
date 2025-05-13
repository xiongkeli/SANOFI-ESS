<script setup>
import { defineProps, defineEmits, computed } from 'vue'
import SheetSelector from '../components/SheetSelector.vue'
import ColumnMapper from '../components/ColumnMapper.vue'
import FilterPanel from '../components/FilterPanel.vue'
import EssParticipationChart from '../components/EssParticipationChart.vue'
import BrandQuotaChart from '../components/BrandQuotaChart.vue'
import RegionMeetingsChart from '../components/RegionMeetingsChart.vue'

const props = defineProps({
  fileName: String,
  excelData: Object,
  filters: Object,
  isColumnMappingComplete: Boolean,
  filteredData: Array,
  regionStats: Object,
  essParticipationStats: Object,
  monthlyEssStats: Object,
  cancellationStats: Object,
  eventTypeStats: Object,
  manualColumnSelection: Object,
  months: Array,
  years: Array,
})

const emit = defineEmits([
  'new-file',
  'sheet-changed',
  'update-columns',
  'reset-columns',
  'filter-changed',
])

// 检查当前是否在正确的工作表
const isCorrectSheet = computed(() => {
  if (!props.excelData || !props.excelData.activeSheet) return false
  
  // 宽松匹配"会议信息统计表【Monthly】"工作表
  return props.excelData.activeSheet.includes('会议信息统计表') && 
         props.excelData.activeSheet.includes('Monthly')
})

const handleNewFile = () => {
  emit('new-file')
}

const handleSheetChanged = (sheetName) => {
  emit('sheet-changed', sheetName)
}

const handleUpdateColumns = (columns) => {
  emit('update-columns', columns)
}

const handleResetColumns = () => {
  emit('reset-columns')
}

const handleFilterChanged = (event) => {
  emit('filter-changed', event)
}
</script>

<template>
  <div class="data-visual-view">
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
        v-if="excelData.sheetNames && excelData.sheetNames.length > 1"
      >
        <h2 class="sidebar-title">工作表</h2>
        <SheetSelector
          :sheet-names="excelData.sheetNames"
          :active-sheet="excelData.activeSheet"
          @sheet-changed="handleSheetChanged"
        />
      </div>

      <div class="sidebar-divider"></div>

      <!-- 侧边栏筛选组件 -->
      <FilterPanel
        :months="months"
        :selected-month="filters.selectedMonth"
        :years="years"
        :selected-year="filters.selectedYear"
        :region-stats="regionStats"
        :total-meetings="filteredData.length"
        :brands="excelData.brands || []"
        :selected-brand="filters.selectedBrand || 'all'"
        :cancellation-stats="cancellationStats"
        :selected-cancellation-status="filters.selectedCancellationStatus || 'all'"
        @filter-changed="handleFilterChanged"
      />
    </aside>

    <!-- 右侧主内容区 -->
    <main class="main-content">
      <!-- 提示选择正确的工作表 -->
      <div v-if="!isCorrectSheet" class="sheet-warning">
        <div class="warning-icon">⚠️</div>
        <h3>请选择正确的工作表</h3>
        <p>数据可视化功能需要解析"会议信息统计表【Monthly】"工作表，请确保已选择该工作表。</p>
      </div>

      <div v-else class="dashboard-wrapper">
        <!-- 顶部KPI指标卡片 -->
        <div class="kpi-cards-container">
          <!-- 总会议数量卡片 -->
          <div class="kpi-card">
            <div class="kpi-label">总会议数量</div>
            <div class="kpi-value">{{ regionStats.total }}</div>
          </div>
          
          <!-- ESS参与率卡片 -->
          <div class="kpi-card">
            <div class="kpi-label">ESS参与率</div>
            <div class="kpi-value">{{ essParticipationStats.yesPercentage }}%</div>
          </div>
          
          <!-- 会议完成率卡片 -->
          <div class="kpi-card">
            <div class="kpi-label">会议完成率</div>
            <div class="kpi-value">{{ 100 - cancellationStats.cancelledPercentage }}%</div>
          </div>
          
          <!-- 已取消会议数量卡片 -->
          <div class="kpi-card">
            <div class="kpi-label">已取消会议数量</div>
            <div class="kpi-value">{{ cancellationStats.cancelled }}</div>
          </div>
        </div>
        
        <!-- Brand/Team配额进度表 -->
        <h2 class="main-title">Brand/Team配额进度表</h2>
        <div class="chart-box single-chart">
          <div class="chart-box-inner">
            <BrandQuotaChart
              :ess-participation-stats="essParticipationStats"
              :brands="excelData.brands || []"
              :filtered-data="filteredData"
              :excel-data="excelData"
            />
          </div>
        </div>
        
        <!-- 区域会议统计 -->
        <h2 class="main-title">区域会议统计分析</h2>
        <div class="chart-box single-chart">
          <div class="chart-box-inner">
            <RegionMeetingsChart
              :filtered-data="filteredData"
              :excel-data="excelData"
            />
          </div>
        </div>
        
        <!-- 主标题 -->
        <h2 class="main-title">ESS线下参会分析</h2>
        
        <!-- 图表和表格区域 -->
        <div class="chart-grid">
          <!-- ESS参会情况图表 -->
          <div class="chart-box">
            <div class="chart-box-inner chart-container">
              <EssParticipationChart
                :ess-participation-stats="essParticipationStats"
                :monthly-ess-stats="monthlyEssStats"
                :selected-month="filters.selectedMonth"
                :is-column-mapping-complete="isColumnMappingComplete"
                :ess-participation-index="excelData.essParticipationIndex"
                :selected-region="filters.selectedRegion || 'all'"
              />
            </div>
          </div>
          
          <!-- ESS参会数据表格 -->
          <div class="chart-box">
            <div class="chart-box-inner data-table-container">
              <div class="ess-data-table">
                <table>
                  <thead>
                    <tr>
                      <th>类别</th>
                      <th>数量</th>
                      <th>占比</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span class="status-dot yes-dot"></span> 需要参会 (Y)</td>
                      <td>{{ essParticipationStats.yes }}</td>
                      <td>{{ essParticipationStats.yesPercentage }}%</td>
                    </tr>
                    <tr>
                      <td><span class="status-dot no-dot"></span> 不需要参会 (N)</td>
                      <td>{{ essParticipationStats.no }}</td>
                      <td>{{ essParticipationStats.noPercentage }}%</td>
                    </tr>
                    <tr v-if="essParticipationStats.unknown > 0">
                      <td><span class="status-dot unknown-dot"></span> 未确定</td>
                      <td>{{ essParticipationStats.unknown }}</td>
                      <td>{{ essParticipationStats.unknownPercentage }}%</td>
                    </tr>
                    <tr class="total-row">
                      <td>总计</td>
                      <td>{{ essParticipationStats.total }}</td>
                      <td>100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div class="ess-data-table" v-if="monthlyEssStats && monthlyEssStats.length > 0">
                <table class="monthly-stats-table">
                  <thead>
                    <tr>
                      <th>月份</th>
                      <th>需要参会 (Y)</th>
                      <th>不需要参会 (N)</th>
                      <th v-if="hasUnknownValues">未确定</th>
                      <th>总计</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="stat in sortedMonthlyStats" :key="stat.month">
                      <td>{{ stat.month }}</td>
                      <td>{{ stat.yes }} ({{ getPercentage(stat.yes, stat.total) }}%)</td>
                      <td>{{ stat.no }} ({{ getPercentage(stat.no, stat.total) }}%)</td>
                      <td v-if="hasUnknownValues">{{ stat.unknown }} ({{ getPercentage(stat.unknown, stat.total) }}%)</td>
                      <td>{{ stat.total }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="no-data-message">
                没有可用的月度统计数据
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 列映射组件(仅在需要时显示，模态框) -->
    <div class="modal-container" v-if="!isColumnMappingComplete">
      <div class="modal-backdrop"></div>
      <div class="modal-content card">
        <h2 class="modal-title">列映射配置</h2>
        <ColumnMapper
          :headers="excelData.headers"
          :month-index="excelData.monthIndex"
          :region-index="excelData.regionIndex"
          :brand-index="excelData.brandIndex"
          :ess-participation-index="excelData.essParticipationIndex"
          :is-manually-set="manualColumnSelection.isManuallySet"
          @update-columns="handleUpdateColumns"
          @reset-columns="handleResetColumns"
        />
      </div>
    </div>
  </div>
</template>

<script>
// 计算辅助函数
export default {
  computed: {
    sortedMonthlyStats() {
      if (!this.monthlyEssStats || !Array.isArray(this.monthlyEssStats)) {
        return [];
      }
      
      // 定义月份顺序: May -> Apr
      const monthOrder = {
        'May': 1, 
        'Jun': 2, 
        'Jul': 3, 
        'Aug': 4, 
        'Sep': 5, 
        'Oct': 6, 
        'Nov': 7, 
        'Dec': 8, 
        'Jan': 9, 
        'Feb': 10, 
        'Mar': 11, 
        'Apr': 12
      };
      
      // 按自定义月份顺序排序
      return [...this.monthlyEssStats].sort((a, b) => {
        const monthA = a.month.trim();
        const monthB = b.month.trim();
        
        // 提取月份名称（如果有数字，去除数字部分）
        const monthNameA = monthA.replace(/\d+/g, '').trim();
        const monthNameB = monthB.replace(/\d+/g, '').trim();
        
        // 获取月份的顺序值
        const orderA = monthOrder[monthNameA] || 0;
        const orderB = monthOrder[monthNameB] || 0;
        
        // 如果能在预定义的月份顺序中找到，按照预定义顺序排序
        if (orderA && orderB) {
          return orderA - orderB;
        }
        
        // 如果找不到预定义顺序，尝试数字排序
        const numA = parseInt(monthA);
        const numB = parseInt(monthB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        
        // 最后使用字符串比较
        return monthA.localeCompare(monthB);
      });
    },
    
    hasUnknownValues() {
      if (!this.monthlyEssStats || !Array.isArray(this.monthlyEssStats)) {
        return false;
      }
      return this.monthlyEssStats.some(stat => stat.unknown > 0);
    }
  },
  
  methods: {
    getPercentage(value, total) {
      if (!total) return 0;
      return Math.round((value / total) * 100);
    }
  }
}
</script>

<style scoped>
.data-visual-view {
  display: flex;
  width: 100%;
  height: calc(100vh - 60px); /* 减去标签导航的高度 */
  overflow: hidden;
  background-color: #f8f9fa;
}

/* 侧边栏样式 */
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

.sidebar-divider {
  height: 1px;
  background-color: #eaeaea;
  margin: 8px 0;
}

.sheet-selector-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 主内容区域样式 */
.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background-color: #f8f9fa;
}

/* 仪表盘包装器 */
.dashboard-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: auto;
  min-height: 100%;
}

/* 主标题 */
.main-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  text-align: center;
  margin: 5px 0 10px;
  padding-bottom: 10px;
  border-bottom: 2px solid #8E44AD;
}

/* KPI指标卡片样式 */
.kpi-cards-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.kpi-card {
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.07);
  padding: 20px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
}

.kpi-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.kpi-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  margin-top: 10px;
}

.kpi-label {
  font-size: 0.95rem;
  color: #666;
}

/* 图表网格布局 */
.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  min-height: 400px;
}

.chart-box {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.07);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.3s ease;
}

.chart-box:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.chart-box-inner {
  flex: 1;
  padding: 5px;
  overflow: visible;
}

.chart-container {
  padding: 20px 10px;
  position: relative;
}

/* 数据表格样式 */
.data-table-container {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow: visible;
}

.ess-data-table {
  width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.ess-data-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.monthly-stats-table {
  margin-top: 20px;
}

.ess-data-table th, 
.ess-data-table td {
  padding: 10px 8px;
  text-align: center;
  border-bottom: 1px solid #eaeaea;
}

.ess-data-table th {
  font-weight: 600;
  background-color: #f2f2f7;
  color: #333;
  font-size: 14px;
  white-space: nowrap;
}

.ess-data-table tr:hover {
  background-color: #f8f4fc;
}

.total-row {
  font-weight: 600;
  background-color: #f4f0f7;
}

.no-data-message {
  text-align: center;
  color: #888;
  padding: 10px;
  font-size: 14px;
  font-style: italic;
}

/* 工作表警告样式 */
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

/* 按钮样式 */
.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #8E44AD;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 5px rgba(142, 68, 173, 0.2);
}

.action-button:hover {
  background-color: #7D3C98;
  box-shadow: 0 4px 8px rgba(142, 68, 173, 0.3);
  transform: translateY(-1px);
}

.icon {
  font-size: 1rem;
}

/* 模态框样式 */
.modal-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  width: 550px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  background-color: #fff;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  z-index: 2;
}

.modal-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #333;
  margin-top: 0;
  margin-bottom: 24px;
  text-align: center;
}

/* 响应式布局调整 */
@media (max-width: 1200px) {
  .chart-grid {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(2, 1fr);
  }
  
  .ess-data-table table {
    font-size: 14px;
  }
  
  .ess-data-table th, 
  .ess-data-table td {
    padding: 12px;
  }
  
  .table-title {
    font-size: 1.2rem;
  }
}

@media (max-width: 992px) {
  .kpi-cards-container {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: 240px;
  }
  
  .kpi-cards-container {
    grid-template-columns: 1fr;
  }
  
  .ess-data-table table {
    font-size: 13px;
  }
  
  .ess-data-table th, 
  .ess-data-table td {
    padding: 10px 8px;
  }
  
  .table-title {
    font-size: 1.1rem;
  }
}

/* 状态指示点 */
.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}

.yes-dot {
  background-color: #8E44AD;
}

.no-dot {
  background-color: #A569BD;
}

.unknown-dot {
  background-color: #D2B4DE;
}

/* 单图表容器 */
.single-chart {
  grid-column: span 2;
  margin-bottom: 20px;
}
</style>
