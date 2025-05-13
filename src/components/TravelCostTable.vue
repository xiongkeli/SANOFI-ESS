<script setup>
import { defineProps, computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  filteredData: {
    type: Array,
    default: () => [],
  },
  brandIndex: {
    type: Number,
    default: -1,
  },
  monthIndex: {
    type: Number,
    default: -1,
  },
  travelCostIndex: {
    type: Number,
    default: -1,
  },
  essParticipationIndex: {
    type: Number,
    default: -1,
  },
  isColumnMappingComplete: {
    type: Boolean,
    default: false,
  },
  selectedBrand: {
    type: String,
    default: '',
  },
  selectedMonth: {
    type: String,
    default: '',
  },
})

// 表格数据的缓存处理
const cachedTableData = ref(null)
const tableDataCacheKey = ref('')
const isComponentVisible = ref(false)

// 优化的表格渲染 - 使用虚拟化渲染
const startIndex = ref(0)
const itemsPerPage = ref(20)
const totalPages = ref(1)
const currentPage = ref(1)

// 表格数据计算 - 使用缓存提高性能
const tableData = computed(() => {
  // 快速验证 - 如果基本条件不满足，直接返回空结果
  if (!props.isColumnMappingComplete || 
      props.monthIndex === -1 || 
      props.brandIndex === -1 || 
      props.travelCostIndex === -1 || 
      props.essParticipationIndex === -1 || 
      !props.filteredData || 
      props.filteredData.length === 0) {
    return { rows: [] }
  }

  // 生成缓存键 - 使用最少必要的信息
  const newCacheKey = JSON.stringify({
    monthIdx: props.monthIndex,
    brandIdx: props.brandIndex,
    costIdx: props.travelCostIndex,
    essIdx: props.essParticipationIndex,
    selectedBrand: props.selectedBrand,
    selectedMonth: props.selectedMonth,
    dataLength: props.filteredData.length,
    // 使用较轻量的数据指纹
    dataFingerprint: generateDataFingerprint()
  })
  
  // 如果缓存有效，直接返回缓存结果
  if (newCacheKey === tableDataCacheKey.value && cachedTableData.value) {
    return cachedTableData.value
  }
  
  // 执行实际计算 - 使用更高效的实现
  const result = calculateSummaryData()
  
  // 更新缓存
  cachedTableData.value = result
  tableDataCacheKey.value = newCacheKey
  
  // 更新分页信息
  totalPages.value = Math.ceil(result.rows.length / itemsPerPage.value) || 1
  currentPage.value = 1
  startIndex.value = 0
  
  return result
})

// 使用轻量级的数据指纹函数替代完整哈希
const generateDataFingerprint = () => {
  if (!props.filteredData || props.filteredData.length === 0) return '0'
  
  // 使用数据量和首尾数据的简单组合生成指纹
  const length = props.filteredData.length
  const first = props.filteredData[0]
  const last = props.filteredData[length - 1]
  
  // 提取关键列的值作为指纹
  const firstMonthVal = first[props.monthIndex]
  const firstBrandVal = first[props.brandIndex]
  const lastMonthVal = last[props.monthIndex]
  const lastBrandVal = last[props.brandIndex]
  
  return `${length}-${firstMonthVal}-${firstBrandVal}-${lastMonthVal}-${lastBrandVal}`
}

// 计算汇总统计数据 (品牌、总成本、会议数量、场均成本)
const calculateSummaryData = () => {
  // 使用Map存储每个品牌的统计数据
  const brandSummary = new Map()
  let grandTotal = 0
  let totalMeetings = 0
  
  // 遍历数据
  const dataLength = props.filteredData.length
  for (let i = 0; i < dataLength; i++) {
    const row = props.filteredData[i]
    
    // 只统计ESS线下参会的会议
    const essValue = row[props.essParticipationIndex]
    if (!essValue || !['Y', 'YES', '是', 'TRUE', '1'].includes(String(essValue).trim().toUpperCase())) {
      continue
    }
    
    // 提取品牌和成本
    const brand = row[props.brandIndex]?.toString() || '未知'
    
    // 处理成本
    let cost = 0
    const rawCost = row[props.travelCostIndex]
    if (typeof rawCost === 'number') {
      cost = rawCost
    } else if (typeof rawCost === 'string') {
      cost = parseFloat(rawCost.replace(/[^\d.-]/g, '')) || 0
    }
    
    // 累计到对应品牌
    if (!brandSummary.has(brand)) {
      brandSummary.set(brand, {
        brand,
        totalCost: 0,
        meetingCount: 0
      })
    }
    
    const brandData = brandSummary.get(brand)
    brandData.totalCost += cost
    brandData.meetingCount += 1
    
    // 累计总计
    grandTotal += cost
    totalMeetings += 1
  }
  
  // 计算场均成本并转换为数组
  const rows = Array.from(brandSummary.values()).map(item => {
    return {
      brand: item.brand,
      totalCost: item.totalCost,
      meetingCount: item.meetingCount,
      averageCost: item.meetingCount > 0 ? item.totalCost / item.meetingCount : 0
    }
  })
  
  // 按总成本降序排序
  rows.sort((a, b) => b.totalCost - a.totalCost)
  
  // 添加总计行
  const totalRow = {
    brand: '总计',
    totalCost: grandTotal,
    meetingCount: totalMeetings,
    averageCost: totalMeetings > 0 ? grandTotal / totalMeetings : 0,
    isTotal: true
  }
  
  // 将总计行添加到结果中
  rows.push(totalRow)
  
  return { rows }
}

// 当前页的表格行
const visibleRows = computed(() => {
  const { rows } = tableData.value
  if (!rows || rows.length === 0) return []
  
  const start = startIndex.value
  const end = Math.min(start + itemsPerPage.value, rows.length)
  
  // 始终包含总计行
  const result = rows.slice(start, end)
  
  // 如果当前页不包含总计行，且存在总计行，添加它
  const totalRow = rows.find(row => row.isTotal)
  if (totalRow && !result.some(row => row.isTotal)) {
    result.push(totalRow)
  }
  
  return result
})

// 分页导航
const goToPage = (page) => {
  if (page < 1 || page > totalPages.value) return
  
  currentPage.value = page
  startIndex.value = (page - 1) * itemsPerPage.value
}

// 上一页
const prevPage = () => {
  if (currentPage.value > 1) {
    goToPage(currentPage.value - 1)
  }
}

// 下一页
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    goToPage(currentPage.value + 1)
  }
}

// 货币格式化函数 - 可被重用多次的单例
const formatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})

// 格式化货币值
const formatCurrency = (value) => {
  return formatter.format(value)
}

// 设置组件可见性监测 - 优化实现
const setupVisibilityObserver = () => {
  // 如果浏览器不支持 IntersectionObserver，设置为始终可见
  if (!window.IntersectionObserver) {
    isComponentVisible.value = true
    return () => {}
  }
  
  // 创建观察器
  const observer = new IntersectionObserver((entries) => {
    const isVisible = entries.some(entry => entry.isIntersecting)
    isComponentVisible.value = isVisible
  }, {
    threshold: 0.05 // 当5%可见时触发
  })
  
  // 获取目标元素
  const container = document.querySelector('.travel-cost-table-container')
  if (container) {
    observer.observe(container)
    
    // 返回清理函数
    return () => {
      observer.unobserve(container)
      observer.disconnect()
    }
  }
  
  return () => {}
}

// 生命周期钩子
let cleanup = null

onMounted(() => {
  // 设置可见性观察器
  cleanup = setupVisibilityObserver()
  
  // 添加页面可见性变化监听
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  // 清理资源
  if (cleanup) cleanup()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

// 处理页面可见性变化
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    // 页面变为可见时刷新缓存键，但只有当组件可见时才更新数据
    if (isComponentVisible.value) {
      tableDataCacheKey.value = ''
    }
  }
}
</script>

<template>
  <div class="travel-cost-table-container">
    <div v-if="!isColumnMappingComplete || 
                monthIndex === -1 || 
                brandIndex === -1 || 
                travelCostIndex === -1 || 
                essParticipationIndex === -1" 
          class="table-placeholder">
      <div class="error-message">
        <div class="icon">📊</div>
        <p>请先完成列映射以查看差旅成本数据</p>
      </div>
    </div>
    <div v-else-if="tableData.rows && tableData.rows.length > 0" class="table-wrapper">
      <div class="table-header">
        <h3>差旅成本统计表</h3>
      </div>
      
      <div class="note-text">
        * 会议数量(仅计算"是否需要ESS线下参会"标记为"Y"的会议)
      </div>
      
      <div class="table-scrollable">
      <table>
        <thead>
          <tr>
            <th>Brand/Team</th>
            <th>差旅总成本</th>
              <th>会议数量*</th>
              <th>场均成本</th>
          </tr>
        </thead>
        <tbody>
            <tr v-for="(row, index) in tableData.rows" :key="index" :class="{ 'total-row': row.isTotal }">
              <td>{{ row.brand }}</td>
              <td class="cost-cell">{{ formatCurrency(row.totalCost) }}</td>
              <td class="meeting-count">{{ row.meetingCount }}</td>
              <td class="cost-cell">{{ formatCurrency(row.averageCost) }}</td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
    <div v-else class="table-placeholder">
      <div class="error-message">
        <div class="icon">📈</div>
        <p>暂无符合条件的差旅成本数据</p>
    </div>
    </div>
  </div>
</template>

<style scoped>
.travel-cost-table-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(14px, 1vw, 16px); /* 自适应字体大小 */
}

.table-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.table-header {
  padding: 16px 20px;
  border-bottom: 1px solid #eaeaea;
}

.table-header h3 {
  margin: 0;
  font-size: clamp(16px, 1.2vw, 20px); /* 自适应标题大小 */
  font-weight: 600;
  color: #333;
}

.note-text {
  padding: 8px 20px;
  font-size: clamp(12px, 0.8vw, 14px); /* 自适应注释大小 */
  color: #666;
  font-style: italic;
  border-bottom: 1px solid #eaeaea;
}

.table-scrollable {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 10px;
  will-change: transform; /* 优化滚动性能 */
  -webkit-overflow-scrolling: touch;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: auto; /* 改为auto布局，让浏览器根据内容自动调整列宽 */
}

th, td {
  padding: clamp(8px, 0.8vw, 15px); /* 自适应内边距 */
  text-align: center;
  white-space: nowrap;
  border-bottom: 1px solid #eaeaea;
}

th {
  position: sticky;
  top: 0;
  background-color: #f8f9fa;
  z-index: 10;
  font-weight: 600;
  color: #495057;
}

th:first-child {
  text-align: left;
}

td:first-child {
  text-align: left;
  font-weight: 500;
}

.cost-cell {
  font-family: "Microsoft YaHei", "微软雅黑", sans-serif; /* 使用微软雅黑字体 */
  text-align: right;
  min-width: 120px; /* 设置金额单元格最小宽度 */
  font-weight: 500;
}

.meeting-count {
  font-family: "Microsoft YaHei", "微软雅黑", sans-serif; /* 使用微软雅黑字体 */
  font-weight: 600;
  color: #555;
}

.total-row {
  background-color: #f0f0ff;
  font-weight: 600;
}

.total-row td {
  border-top: 1px solid #d0d0e0;
  border-bottom: 1px solid #d0d0e0;
}

.total-row td:first-child {
  color: #8e44ad;
}

.table-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.error-message {
  text-align: center;
  padding: 2rem;
}

.icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #8e44ad;
}

.error-message p {
  color: #666;
  font-size: 1.1rem;
}

@media screen and (max-width: 768px) {
  .table-wrapper {
    height: auto;
  }
  
  .table-scrollable {
    overflow-x: auto;
  }
}
</style> 