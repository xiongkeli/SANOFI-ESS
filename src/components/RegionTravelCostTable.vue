<script setup>
import { defineProps, computed, ref } from 'vue'

const props = defineProps({
  filteredData: {
    type: Array,
    default: () => [],
  },
  regionIndex: {
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
  selectedMonth: {
    type: String,
    default: 'all',
  },
  selectedRegion: {
    type: String,
    default: 'all',
  },
})

// 缓存优化
const cacheKey = ref('')
const cachedData = ref(null)

// 计算缓存键
const calculateCacheKey = () => {
  return JSON.stringify({
    isComplete: props.isColumnMappingComplete,
    mIdx: props.monthIndex,
    rIdx: props.regionIndex,
    tIdx: props.travelCostIndex,
    eIdx: props.essParticipationIndex,
    sMonth: props.selectedMonth,
    sRegion: props.selectedRegion,
    dataLen: props.filteredData?.length || 0
  })
}

// 计算区域差旅成本数据
const regionTravelData = computed(() => {
  // 基本验证
  if (!props.isColumnMappingComplete || 
      props.regionIndex === -1 ||
      props.travelCostIndex === -1 ||
      props.essParticipationIndex === -1 ||
      !props.filteredData || 
      props.filteredData.length === 0) {
    return []
  }

  // 检查缓存是否有效
  const newKey = calculateCacheKey()
  if (newKey === cacheKey.value && cachedData.value) {
    return cachedData.value
  }

  // 按区域分组数据
  const regionData = {}

  // 使用 for 循环提高性能
  const dataLength = props.filteredData.length
  for (let i = 0; i < dataLength; i++) {
    const row = props.filteredData[i]
    
    // 只统计ESS线下参会的会议
    const essValue = row[props.essParticipationIndex]
    if (!essValue || !['Y', 'YES', '是', 'TRUE', '1'].includes(String(essValue).trim().toUpperCase())) {
      continue
    }
    
    // 获取区域和差旅成本
    const region = row[props.regionIndex]?.toString() || '未知'
    let cost = row[props.travelCostIndex]

    // 确保成本是数值
    if (typeof cost === 'string') {
      cost = parseFloat(cost.replace(/[^\d.-]/g, '')) || 0
    } else if (typeof cost !== 'number') {
      cost = 0
    }

    // 初始化区域数据
    if (!regionData[region]) {
      regionData[region] = {
        region: region,
        meetingCount: 0,
        totalCost: 0
      }
    }
    
    // 统计会议数量和成本
    regionData[region].meetingCount++
    regionData[region].totalCost += cost
  }

  // 转换为数组并计算场均成本
  const result = Object.values(regionData).map(item => ({
    ...item,
    averageCost: item.meetingCount > 0 ? Math.round(item.totalCost / item.meetingCount) : 0
  }))

  // 按会议数量降序排序
  result.sort((a, b) => b.meetingCount - a.meetingCount)

  // 更新缓存
  cachedData.value = result
  cacheKey.value = newKey

  return result
})

// 合计行数据
const totalRow = computed(() => {
  if (!regionTravelData.value || regionTravelData.value.length === 0) {
    return {
      region: '总计',
      meetingCount: 0,
      totalCost: 0,
      averageCost: 0
    }
  }

  const total = regionTravelData.value.reduce(
    (acc, curr) => {
      acc.meetingCount += curr.meetingCount
      acc.totalCost += curr.totalCost
      return acc
    },
    { region: '总计', meetingCount: 0, totalCost: 0 }
  )

  // 计算总体场均成本
  total.averageCost = total.meetingCount > 0 ? Math.round(total.totalCost / total.meetingCount) : 0

  return total
})

// 格式化货币显示
const formatCurrency = (value) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}
</script>

<template>
  <div class="region-travel-cost-table">
    <div v-if="!isColumnMappingComplete || 
                regionIndex === -1 || 
                travelCostIndex === -1 || 
                essParticipationIndex === -1" 
        class="table-placeholder">
      <div class="error-message">
        <div class="icon">📊</div>
        <p>请先完成列映射以查看区域差旅成本数据</p>
      </div>
    </div>
    <div v-else-if="regionTravelData && regionTravelData.length > 0" class="table-wrapper">
      <div class="table-title">
        <h3>区域线下会议差旅成本分析</h3>
      </div>
      <div class="table-scroll-container">
        <table>
          <thead>
            <tr>
              <th>区域</th>
              <th>线下会议场次</th>
              <th>差旅总成本</th>
              <th>场均成本</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in regionTravelData" :key="item.region">
              <td>{{ item.region }}</td>
              <td>{{ item.meetingCount }}</td>
              <td>{{ formatCurrency(item.totalCost) }}</td>
              <td>{{ formatCurrency(item.averageCost) }}</td>
            </tr>
            <tr class="total-row">
              <td>{{ totalRow.region }}</td>
              <td>{{ totalRow.meetingCount }}</td>
              <td>{{ formatCurrency(totalRow.totalCost) }}</td>
              <td>{{ formatCurrency(totalRow.averageCost) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <p>注：仅统计ESS线下参会的会议数据</p>
      </div>
    </div>
    <div v-else class="table-placeholder">
      <div class="error-message">
        <div class="icon">📈</div>
        <p>暂无符合条件的区域差旅成本数据</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.region-travel-cost-table {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.table-title {
  padding: 15px;
  text-align: center;
  border-bottom: 1px solid #eaeaea;
}

.table-title h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.table-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.table-scroll-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: 0 15px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

th, td {
  padding: 12px 15px;
  text-align: center;
  border-bottom: 1px solid #eaeaea;
}

th {
  font-weight: 600;
  background-color: #f9f9f9;
  color: #333;
  position: sticky;
  top: 0;
  z-index: 1;
}

tbody tr:hover {
  background-color: #f7f0fc;
}

.total-row {
  font-weight: 600;
  background-color: #f0f0f0;
}

.total-row td {
  border-top: 2px solid #ddd;
}

.table-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9f9f9;
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

.table-footer {
  padding: 10px 15px;
  border-top: 1px solid #eaeaea;
  font-size: 0.8rem;
  color: #666;
  text-align: center;
}
</style> 