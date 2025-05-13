<script setup>
import { defineProps, computed, ref } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

// 注册 Chart.js 组件
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps({
  essParticipationStats: Object,
  brands: {
    type: Array,
    default: () => [],
  },
  filteredData: {
    type: Array,
    default: () => [],
  },
  excelData: {
    type: Object,
    required: true
  }
})

// 品牌配额数据（改为响应式数据）
const brandQuotaData = ref({
  '全国': { 线上配额: 1000, 线下配额: 200 },
  'Derm-E': { 线上配额: 182, 线下配额: 41 },
  'Derm-N': { 线上配额: 238, 线下配额: 54 },
  'Derm-S': { 线上配额: 210, 线下配额: 48 },
  'Derm-W': { 线上配额: 155, 线下配额: 35 },
  'Resp': { 线上配额: 215, 线下配额: 22 }
})

// 更新配额的方法
const updateQuota = (brand, type, value) => {
  const numValue = parseInt(value) || 0
  brandQuotaData.value[brand][type] = numValue
}

// 计算每个品牌的线下会议数量
const brandOfflineMeetings = computed(() => {
  const result = {}
  
  // 初始化所有品牌的值为0
  Object.keys(brandQuotaData.value).forEach(brand => {
    result[brand] = 0
  })
  
  // 统计线下会议数量
  if (props.filteredData && props.filteredData.length && props.excelData.brandIndex !== -1 && props.excelData.essParticipationIndex !== -1) {
    props.filteredData.forEach(row => {
      // 通过索引获取品牌/团队名称
      const brand = row[props.excelData.brandIndex]?.toString() || '未知'
      // 通过索引获取是否需要ESS线下参会的值
      const essParticipation = row[props.excelData.essParticipationIndex]?.toString() || ''
      
      // 如果该会议需要ESS参会，认为是线下会议
      if (essParticipation.toUpperCase() === 'Y' || essParticipation.toUpperCase() === 'YES' || essParticipation === '是') {
        if (result[brand] !== undefined) {
          result[brand]++
        }
      }
    })
  }
  
  // 计算全国的线下会议总数（所有其他品牌的总和）
  result['全国'] = 0
  Object.keys(result).forEach(brand => {
    if (brand !== '全国') {
      result['全国'] += result[brand]
    }
  })
  
  return result
})

// 计算每个品牌的线上会议数量 (总数 - 线下)
const brandOnlineMeetings = computed(() => {
  const result = {}
  const brandMeetingCounts = {}
  
  // 初始化所有品牌的值
  Object.keys(brandQuotaData.value).forEach(brand => {
    result[brand] = 0
    brandMeetingCounts[brand] = 0
  })
  
  // 统计每个品牌的会议总数
  if (props.filteredData && props.filteredData.length && props.excelData.brandIndex !== -1) {
    props.filteredData.forEach(row => {
      // 通过索引获取品牌/团队名称
      const brand = row[props.excelData.brandIndex]?.toString() || '未知'
      if (brandMeetingCounts[brand] !== undefined) {
        brandMeetingCounts[brand]++
      }
    })
  }
  
  // 计算线上会议数量 (总数 - 线下)
  Object.keys(brandQuotaData.value).filter(brand => brand !== '全国').forEach(brand => {
    result[brand] = brandMeetingCounts[brand] - (brandOfflineMeetings.value[brand] || 0)
  })
  
  // 计算全国的线上会议总数（所有其他品牌的总和）
  result['全国'] = 0
  Object.keys(result).forEach(brand => {
    if (brand !== '全国') {
      result['全国'] += result[brand]
    }
  })
  
  return result
})

// 图表数据
const chartData = computed(() => {
  const brands = Object.keys(brandQuotaData.value).filter(brand => brand !== '全国')
  
  return {
    labels: brands,
    datasets: [
      {
        label: '线上已使用',
        data: brands.map(brand => brandOnlineMeetings.value[brand] || 0),
        backgroundColor: '#4287f5',
      },
      {
        label: '线上配额',
        data: brands.map(brand => brandQuotaData.value[brand].线上配额),
        backgroundColor: '#a8c8ff',
        type: 'bar',
      },
      {
        label: '线下已使用',
        data: brands.map(brand => brandOfflineMeetings.value[brand] || 0),
        backgroundColor: '#8E44AD',
      },
      {
        label: '线下配额',
        data: brands.map(brand => brandQuotaData.value[brand].线下配额),
        backgroundColor: '#D2B4DE',
        type: 'bar',
      }
    ]
  }
})

// 图表选项
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: true,
      text: '2025计划场次(2025.05-2026.04)配额使用进度',
      font: {
        size: 16,
        weight: 'bold',
      },
      padding: {
        top: 10,
        bottom: 15,
      },
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const label = context.dataset.label || ''
          const value = context.raw || 0
          return `${label}: ${value}`
        }
      }
    },
  },
  scales: {
    x: {
      stacked: false,
      title: {
        display: true,
        text: 'Brand/Team',
      },
    },
    y: {
      stacked: false,
      title: {
        display: true,
        text: '会议场次',
      },
      beginAtZero: true,
    },
  },
}

// 表格数据
const tableData = computed(() => {
  const brands = Object.keys(brandQuotaData.value)
  return brands.map(brand => {
    const onlineUsed = brandOnlineMeetings.value[brand] || 0
    const offlineUsed = brandOfflineMeetings.value[brand] || 0
    const onlineQuota = brandQuotaData.value[brand].线上配额
    const offlineQuota = brandQuotaData.value[brand].线下配额
    
    return {
      brand,
      onlineQuota,
      onlineUsed,
      onlinePercentage: onlineQuota ? Math.round((onlineUsed / onlineQuota) * 100) : 0,
      offlineQuota,
      offlineUsed,
      offlinePercentage: offlineQuota ? Math.round((offlineUsed / offlineQuota) * 100) : 0,
    }
  })
})
</script>

<template>
  <div class="brand-quota-chart">
    <div class="chart-container">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Brand/Team</th>
            <th>线上配额</th>
            <th>线上已使用</th>
            <th>线上进度</th>
            <th>线下配额</th>
            <th>线下已使用</th>
            <th>线下进度</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in tableData" :key="row.brand">
            <td>{{ row.brand }}</td>
            <td class="editable-cell">
              <input 
                type="number" 
                :value="row.onlineQuota" 
                @input="updateQuota(row.brand, '线上配额', $event.target.value)" 
                min="0" 
                class="quota-input"
              />
            </td>
            <td>{{ row.onlineUsed }}</td>
            <td>
              <div class="progress-bar-container">
                <div class="progress-bar" :style="`width: ${Math.min(row.onlinePercentage, 100)}%`"></div>
                <span>{{ row.onlinePercentage }}%</span>
              </div>
            </td>
            <td class="editable-cell">
              <input 
                type="number" 
                :value="row.offlineQuota" 
                @input="updateQuota(row.brand, '线下配额', $event.target.value)" 
                min="0" 
                class="quota-input"
              />
            </td>
            <td>{{ row.offlineUsed }}</td>
            <td>
              <div class="progress-bar-container">
                <div class="progress-bar offline-bar" :style="`width: ${Math.min(row.offlinePercentage, 100)}%`"></div>
                <span>{{ row.offlinePercentage }}%</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.brand-quota-chart {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.chart-container {
  height: 300px;
  margin-bottom: 20px;
}

.table-container {
  flex: 1;
  overflow-y: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: center;
  background-color: #fff;
}

thead {
  background-color: #f5f5f5;
  position: sticky;
  top: 0;
  z-index: 1;
}

th {
  padding: 12px 15px;
  font-weight: 600;
  color: #444;
  border-bottom: 1px solid #ddd;
}

td {
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
  color: #555;
}

tbody tr:last-child td {
  border-bottom: none;
}

.progress-bar-container {
  width: 100%;
  height: 20px;
  background-color: #eee;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background-color: #4287f5;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.offline-bar {
  background-color: #8E44AD;
}

.progress-bar-container span {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
}

.editable-cell {
  position: relative;
}

.quota-input {
  width: 60px;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.quota-input:focus {
  border-color: #8E44AD;
  outline: none;
  box-shadow: 0 0 0 2px rgba(142, 68, 173, 0.2);
}

.quota-input::-webkit-inner-spin-button,
.quota-input::-webkit-outer-spin-button {
  opacity: 1;
}
</style> 