<script setup>
import { defineProps, computed, ref } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

// 注册 Chart.js 组件
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps({
  filteredData: {
    type: Array,
    default: () => [],
  },
  excelData: {
    type: Object,
    required: true
  }
})

// 计算每个区域的线下会议数量
const regionOfflineMeetings = computed(() => {
  const result = {}
  
  // 统计线下会议数量
  if (props.filteredData && props.filteredData.length && props.excelData.regionIndex !== -1 && props.excelData.essParticipationIndex !== -1) {
    props.filteredData.forEach(row => {
      // 获取区域名称
      const region = row[props.excelData.regionIndex]?.toString() || '未知'
      // 获取是否需要ESS线下参会的值
      const essParticipation = row[props.excelData.essParticipationIndex]?.toString() || ''
      
      // 初始化区域计数
      if (!result[region]) {
        result[region] = 0
      }
      
      // 如果该会议需要ESS参会，认为是线下会议
      if (essParticipation.toUpperCase() === 'Y' || essParticipation.toUpperCase() === 'YES' || essParticipation === '是') {
        result[region]++
      }
    })
  }
  
  return result
})

// 计算每个区域的会议总数
const regionTotalMeetings = computed(() => {
  const result = {}
  
  if (props.filteredData && props.filteredData.length && props.excelData.regionIndex !== -1) {
    props.filteredData.forEach(row => {
      // 获取区域名称
      const region = row[props.excelData.regionIndex]?.toString() || '未知'
      
      // 初始化或递增计数
      if (!result[region]) {
        result[region] = 0
      }
      result[region]++
    })
  }
  
  return result
})

// 计算每个区域的线上会议数量 (总数 - 线下)
const regionOnlineMeetings = computed(() => {
  const result = {}
  
  // 遍历所有区域
  Object.keys(regionTotalMeetings.value).forEach(region => {
    const total = regionTotalMeetings.value[region] || 0
    const offline = regionOfflineMeetings.value[region] || 0
    result[region] = total - offline
  })
  
  return result
})

// 图表数据
const chartData = computed(() => {
  const regions = Object.keys(regionTotalMeetings.value).sort()
  
  if (regions.length === 0) {
    return {
      labels: [],
      datasets: []
    }
  }
  
  return {
    labels: regions,
    datasets: [
      {
        label: '线上会议',
        data: regions.map(region => regionOnlineMeetings.value[region] || 0),
        backgroundColor: '#4287f5',
      },
      {
        label: '线下会议',
        data: regions.map(region => regionOfflineMeetings.value[region] || 0),
        backgroundColor: '#8E44AD',
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
      text: '各区域线上/线下会议场次数',
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
      stacked: true,
      title: {
        display: true,
        text: '区域',
      },
    },
    y: {
      stacked: true,
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
  const regions = Object.keys(regionTotalMeetings.value).sort()
  return regions.map(region => {
    const onlineMeetings = regionOnlineMeetings.value[region] || 0
    const offlineMeetings = regionOfflineMeetings.value[region] || 0
    const totalMeetings = regionTotalMeetings.value[region] || 0
    
    return {
      region,
      onlineMeetings,
      offlineMeetings,
      totalMeetings,
      onlinePercentage: totalMeetings ? Math.round((onlineMeetings / totalMeetings) * 100) : 0,
      offlinePercentage: totalMeetings ? Math.round((offlineMeetings / totalMeetings) * 100) : 0,
    }
  })
})
</script>

<template>
  <div class="region-meetings-chart">
    <div class="chart-container">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>区域</th>
            <th>线上会议</th>
            <th>线上占比</th>
            <th>线下会议</th>
            <th>线下占比</th>
            <th>总计</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in tableData" :key="row.region">
            <td>{{ row.region }}</td>
            <td>{{ row.onlineMeetings }}</td>
            <td>
              <div class="progress-bar-container">
                <div class="progress-bar" :style="`width: ${row.onlinePercentage}%`"></div>
                <span>{{ row.onlinePercentage }}%</span>
              </div>
            </td>
            <td>{{ row.offlineMeetings }}</td>
            <td>
              <div class="progress-bar-container">
                <div class="progress-bar offline-bar" :style="`width: ${row.offlinePercentage}%`"></div>
                <span>{{ row.offlinePercentage }}%</span>
              </div>
            </td>
            <td>{{ row.totalMeetings }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.region-meetings-chart {
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
</style> 