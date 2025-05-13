<!-- src/views/CustomChartView.vue -->
<script setup>
import { ref, computed, watch } from 'vue'
import { Chart as ChartJS, ArcElement, LineElement, BarElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js'
import { Bar, Line, Pie } from 'vue-chartjs'
import FilterPanel from '../components/FilterPanel.vue'

// 注册Chart.js组件
ChartJS.register(ArcElement, LineElement, BarElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend)

const props = defineProps({
  fileName: String,
  excelData: Object,
  filters: Object,
  isColumnMappingComplete: Boolean,
  filteredData: Array,
  months: Array,
  years: Array,
})

const emit = defineEmits(['filter-changed'])

// 图表类型选择
const chartTypes = [
  { id: 'bar', name: '柱状图', icon: '📊' },
  { id: 'line', name: '折线图', icon: '📈' },
  { id: 'pie', name: '饼图', icon: '🥧' },
]
const selectedChartType = ref('bar')

// 选中的数据列
const xAxisColumn = ref(null)
const yAxisColumn = ref(null)
const aggregationType = ref('sum') // 聚合方式：sum, avg, count

// 计算可用的数据列
const availableColumns = computed(() => {
  if (!props.excelData || !props.excelData.headers) return []
  
  return props.excelData.headers.map((header, index) => ({
    id: index,
    name: header
  })).filter(col => col.name && col.name.trim() !== '')
})

// 检查当前是否在正确的工作表
const isCorrectSheet = computed(() => {
  if (!props.excelData || !props.excelData.activeSheet) return false
  return true // 对于自定义图表，允许任何工作表
})

// 是否可以生成图表
const canGenerateChart = computed(() => {
  return isCorrectSheet.value && 
         props.isColumnMappingComplete && 
         xAxisColumn.value !== null && 
         yAxisColumn.value !== null &&
         props.filteredData && 
         props.filteredData.length > 0
})

// 生成图表数据
const chartData = computed(() => {
  if (!canGenerateChart.value) return null
  
  const data = {
    labels: [],
    datasets: [{
      label: props.excelData.headers[yAxisColumn.value],
      data: [],
      backgroundColor: [
        '#8E44AD', '#3498DB', '#16A085', '#F1C40F', '#E67E22', 
        '#E74C3C', '#2ECC71', '#9B59B6', '#34495E', '#D35400'
      ]
    }]
  }
  
  // 获取X轴的唯一值
  const xValues = new Set()
  props.filteredData.forEach(row => {
    if (row[xAxisColumn.value] !== undefined && row[xAxisColumn.value] !== null) {
      xValues.add(row[xAxisColumn.value].toString())
    }
  })
  
  // 转换为数组并排序
  data.labels = [...xValues].sort()
  
  // 检查是否是ESS参会相关列
  const yColumnHeader = props.excelData.headers[yAxisColumn.value].toLowerCase()
  const isEssOffline = yColumnHeader.includes('是否需要 ess参会') && (yColumnHeader.includes('线下') || !yColumnHeader.includes('线上'))
  const isEssOnline = yColumnHeader.includes('是否需要 ess参会') && yColumnHeader.includes('线上')
  
  // 根据聚合方式计算Y轴值
  data.labels.forEach(xValue => {
    const matchingRows = props.filteredData.filter(row => 
      row[xAxisColumn.value] !== undefined && 
      row[xAxisColumn.value] !== null && 
      row[xAxisColumn.value].toString() === xValue
    )
    
    let yValue = 0
    
    // 特殊处理ESS参会数据
    if (isEssOffline || isEssOnline) {
      // 对于线下参会，统计标记为Y的数量
      if (isEssOffline) {
        // 计数方式 - 统计标记为Y的记录
        yValue = matchingRows.filter(row => {
          const val = row[yAxisColumn.value]
          if (val === undefined || val === null) return false
          const strVal = val.toString().trim().toUpperCase()
          return ['Y', 'YES', '是', 'TRUE', '1'].includes(strVal)
        }).length
        
        // 修改标签，使其更明确
        data.datasets[0].label = '需要ESS线下参会 (Y)'
        data.datasets[0].backgroundColor = '#8E44AD' // 紫色
      } 
      // 对于线上参会，统计总数减去标记为Y的数量
      else if (isEssOnline) {
        // 总记录数
        const totalCount = matchingRows.length
        
        // 标记为Y的记录数
        const yesCount = matchingRows.filter(row => {
          const val = row[yAxisColumn.value]
          if (val === undefined || val === null) return false
          const strVal = val.toString().trim().toUpperCase()
          return ['Y', 'YES', '是', 'TRUE', '1'].includes(strVal)
        }).length
        
        // 线上会议数 = 总数 - 线下会议数
        yValue = totalCount - yesCount
        
        // 修改标签，使其更明确
        data.datasets[0].label = '需要ESS线上参会'
        data.datasets[0].backgroundColor = '#3498DB' // 蓝色
      }
    } else if (aggregationType.value === 'sum') {
      // 求和
      yValue = matchingRows.reduce((sum, row) => {
        const val = row[yAxisColumn.value]
        if (typeof val === 'number') {
          return sum + val
        } else if (typeof val === 'string') {
          const num = parseFloat(val.replace(/[^\d.-]/g, ''))
          return isNaN(num) ? sum : sum + num
        }
        return sum
      }, 0)
    } else if (aggregationType.value === 'avg') {
      // 平均值
      if (matchingRows.length > 0) {
        const sum = matchingRows.reduce((sum, row) => {
          const val = row[yAxisColumn.value]
          if (typeof val === 'number') {
            return sum + val
          } else if (typeof val === 'string') {
            const num = parseFloat(val.replace(/[^\d.-]/g, ''))
            return isNaN(num) ? sum : sum + num
          }
          return sum
        }, 0)
        yValue = sum / matchingRows.length
      }
    } else if (aggregationType.value === 'count') {
      // 计数
      yValue = matchingRows.length
    }
    
    data.datasets[0].data.push(yValue)
  })
  
  return data
})

// 图表选项
const chartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: xAxisColumn.value !== null && yAxisColumn.value !== null
          ? `${props.excelData.headers[xAxisColumn.value]} vs ${props.excelData.headers[yAxisColumn.value]}`
          : '自定义图表'
      }
    }
  }
})

// 处理筛选条件变更
const handleFilterChanged = (event) => {
  emit('filter-changed', event)
}

// 重置选择
const resetSelection = () => {
  xAxisColumn.value = null
  yAxisColumn.value = null
  selectedChartType.value = 'bar'
  aggregationType.value = 'sum'
}
</script>

<template>
  <div class="custom-chart-view">
    <!-- 左侧侧边栏 -->
    <aside class="sidebar">
      <FilterPanel
        :months="months"
        :selected-month="filters.selectedMonth"
        :brands="excelData.brands || []"
        :selected-brand="filters.selectedBrand || 'all'"
        :regions="excelData.regions || []"
        :selected-region="filters.selectedRegion || 'all'"
        :cancellation-stats="{}"
        :selected-cancellation-status="filters.selectedCancellationStatus || 'all'"
        :years="years"
        :selected-year="filters.selectedYear || 'all'"
        @filter-changed="handleFilterChanged"
      />
      
      <!-- 图表配置区域 -->
      <div class="chart-config">
        <h3 class="config-title">图表配置</h3>
        
        <!-- 图表类型选择 -->
        <div class="config-section">
          <h4>图表类型</h4>
          <div class="chart-type-selector">
            <button
              v-for="type in chartTypes"
              :key="type.id"
              class="chart-type-button"
              :class="{ active: selectedChartType === type.id }"
              @click="selectedChartType = type.id"
            >
              <span class="chart-type-icon">{{ type.icon }}</span>
              <span class="chart-type-name">{{ type.name }}</span>
            </button>
          </div>
        </div>
        
        <!-- 数据列选择 -->
        <div class="config-section">
          <h4>数据列选择</h4>
          <div class="column-selector">
            <div class="column-select-group">
              <label>X轴数据列</label>
              <select v-model="xAxisColumn">
                <option :value="null">请选择</option>
                <option v-for="col in availableColumns" :key="col.id" :value="col.id">
                  {{ col.name }}
                </option>
              </select>
            </div>
            <div class="column-select-group">
              <label>Y轴数据列</label>
              <select v-model="yAxisColumn">
                <option :value="null">请选择</option>
                <option v-for="col in availableColumns" :key="col.id" :value="col.id">
                  {{ col.name }}
                </option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- 聚合方式选择 -->
        <div class="config-section">
          <h4>数据聚合方式</h4>
          <div class="aggregation-selector">
            <label>
              <input type="radio" v-model="aggregationType" value="sum">
              求和
            </label>
            <label>
              <input type="radio" v-model="aggregationType" value="avg">
              平均值
            </label>
            <label>
              <input type="radio" v-model="aggregationType" value="count">
              计数
            </label>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="config-section">
          <button class="reset-button" @click="resetSelection">重置</button>
        </div>
      </div>
    </aside>

    <!-- 右侧主内容区 -->
    <main class="main-content">
      <div class="chart-container">
        <div class="section-header">
          <h2>自定义图表生成器</h2>
          <p class="subtitle">根据需求自主选择数据列生成图表</p>
        </div>

        <!-- 提示选择数据列 -->
        <div v-if="!canGenerateChart" class="config-warning">
          <div class="warning-icon">📈</div>
          <h3>配置您的图表</h3>
          <p v-if="!isColumnMappingComplete">请先完成列映射以生成图表</p>
          <p v-else-if="xAxisColumn === null || yAxisColumn === null">请在左侧面板选择X轴和Y轴数据列</p>
          <p v-else>暂无符合条件的数据</p>
        </div>
        
        <!-- Chart and Table display area -->
        <div v-else class="chart-and-table-display">
          <!-- Left: Chart Area -->
          <div class="chart-area-wrapper">
            <div class="chart-area">
              <component 
                :is="selectedChartType === 'bar' ? Bar : selectedChartType === 'line' ? Line : Pie" 
                :data="chartData" 
                :options="chartOptions"
              />
            </div>
            <div class="chart-info">
              <p>X轴: {{ props.excelData.headers[xAxisColumn] }}</p>
              <p>Y轴: {{ props.excelData.headers[yAxisColumn] }} ({{ aggregationType === 'sum' ? '求和' : aggregationType === 'avg' ? '平均值' : '计数' }})</p>
              <p>数据项数量: {{ chartData.labels.length }}</p>
            </div>
          </div>

          <!-- Right: Table Area -->
          <div class="table-area-wrapper">
            <div class="table-container">
              <h3>图表数据详情</h3>
              <table>
                <thead>
                  <tr>
                    <th>{{ props.excelData.headers[xAxisColumn] }}</th>
                    <th>{{ props.excelData.headers[yAxisColumn] }} ({{ aggregationType === 'sum' ? '求和' : aggregationType === 'avg' ? '平均值' : '计数' }})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(label, index) in chartData.labels" :key="label">
                    <td>{{ label }}</td>
                    <td class="text-right">{{ chartData.datasets[0].data[index].toLocaleString() }}</td>
                  </tr>
                </tbody>
                <!-- Optional: Add a total row if meaningful -->
                <tfoot v-if="aggregationType === 'sum' || aggregationType === 'count'">
                  <tr class="total-row">
                    <td>总计</td>
                    <td class="text-right">{{ chartData.datasets[0].data.reduce((a, b) => a + b, 0).toLocaleString() }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.custom-chart-view {
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

/* 图表配置区域 */
.chart-config {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #eaeaea;
}

.config-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.config-section {
  margin-bottom: 20px;
}

.config-section h4 {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 8px;
}

/* 图表类型选择器 */
.chart-type-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chart-type-button {
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.chart-type-button.active {
  background-color: #e9e7fd;
  border-color: #8E44AD;
  color: #8E44AD;
}

.chart-type-icon {
  font-size: 1.2rem;
}

/* 数据列选择器 */
.column-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.column-select-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.column-select-group label {
  font-size: 0.85rem;
  color: #666;
}

.column-select-group select {
  padding: 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background-color: #fff;
  font-size: 0.9rem;
}

/* 聚合方式选择器 */
.aggregation-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aggregation-selector label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}

/* 按钮样式 */
.reset-button {
  padding: 8px 16px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-button:hover {
  background-color: #e9ecef;
}

/* 主内容区样式 */
.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.section-header {
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.section-header .subtitle {
  color: #666;
  font-size: 1.1rem;
}

/* 配置提示 */
.config-warning {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 60vh;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 40px;
}

.warning-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.config-warning h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: #8E44AD;
}

.config-warning p {
  color: #666;
  font-size: 1.1rem;
  line-height: 1.5;
  max-width: 500px;
}

/* Chart and Table display area styles */
.chart-and-table-display {
  display: flex;
  gap: 24px;
  height: calc(100vh - 180px); /* Adjust height as needed */
}

.chart-area-wrapper {
  flex: 1; /* 修改 flex 属性为 1 */
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 24px;
}

.chart-area {
  flex: 1;
  position: relative;
}

.chart-info {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #eaeaea;
  display: flex;
  gap: 24px;
}

.chart-info p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}

.table-area-wrapper {
  flex: 1; /* 修改 flex 属性为 1 */
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 24px;
  overflow-y: auto; /* Add scroll for long tables */
}

.table-container h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #333;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th, td {
  padding: 10px 12px; /* Adjust padding */
  text-align: left;
  border-bottom: 1px solid #e9ecef;
  white-space: nowrap;
}

th {
  font-weight: 600;
  color: #495057;
  background-color: #f8f9fa;
  position: sticky; /* Make header sticky */
  top: 0;           /* Stick to the top */
}

.text-right {
  text-align: right;
}

.total-row {
  font-weight: 600;
  background-color: #f8f9fa;
}

.total-row td {
  border-top: 2px solid #dee2e6;
}

/* Responsive adjustments for chart and table */
@media (max-width: 1200px) { /* Adjust breakpoint if needed */
  .chart-and-table-display {
    flex-direction: column;
    height: auto; /* Allow content to determine height */
  }
  
  .chart-area-wrapper {
    height: 400px; /* Set a fixed height for chart on smaller screens */
    margin-bottom: 24px;
  }
  
  .table-area-wrapper {
    max-height: 400px; /* Limit table height */
  }
}

/* Hide old chart display styles if they conflict */
.chart-display {
  /* display: none; */ /* Comment out or remove if no longer needed */
}

/* 响应式布局调整 */
@media (max-width: 992px) {
  .custom-chart-view {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: auto;
    max-height: 300px;
  }
  
  .main-content {
    height: calc(100vh - 360px);
  }
}
</style> 