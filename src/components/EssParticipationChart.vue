<script setup>
import { defineProps, computed, onMounted, watch } from 'vue'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js'
import { Pie, Bar } from 'vue-chartjs'

// 注册 Chart.js 组件
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title)

const props = defineProps({
  essParticipationStats: {
    type: Object,
    default: () => ({
      yes: 0,
      no: 0,
      unknown: 0,
      total: 0,
      yesPercentage: 0,
      noPercentage: 0,
      unknownPercentage: 0,
    }),
  },
  monthlyEssStats: {
    type: Array,
    default: () => [],
  },
  selectedMonth: {
    type: String,
    default: 'all',
  },
  isColumnMappingComplete: {
    type: Boolean,
    default: false,
  },
  essParticipationIndex: {
    type: Number,
    default: -1,
  },
  selectedRegion: {
    type: String,
    default: 'all',
  },
})

// 监控属性变化，输出调试信息
watch(
  () => props.essParticipationStats,
  (newStats) => {
    console.log('EssParticipationChart - essParticipationStats 更新:', newStats)
  },
  { deep: true, immediate: true }
)

watch(
  () => props.monthlyEssStats,
  (newStats) => {
    console.log('EssParticipationChart - monthlyEssStats 更新, 条目数:', newStats.length)
  },
  { immediate: true }
)

watch(
  () => props.essParticipationIndex,
  (newIndex) => {
    console.log('EssParticipationChart - essParticipationIndex 更新:', newIndex)
  },
  { immediate: true }
)

onMounted(() => {
  console.log('EssParticipationChart 组件已挂载')
  console.log('当前 essParticipationStats:', props.essParticipationStats)
  console.log('当前 monthlyEssStats 条目数:', props.monthlyEssStats.length)
  console.log('当前 essParticipationIndex:', props.essParticipationIndex)
  console.log('当前 isColumnMappingComplete:', props.isColumnMappingComplete)
  console.log('当前 selectedMonth:', props.selectedMonth)
})

// ESS参会饼图数据
const pieChartData = computed(() => {
  console.log('重新计算 pieChartData, 总数:', props.essParticipationStats.total)

  if (props.essParticipationStats.total === 0) {
    return {
      labels: ['需要参会 (Y)', '不需要参会 (N)', '未确定'],
      datasets: [
        {
          data: [0, 0, 0],
          backgroundColor: ['#8E44AD', '#A569BD', '#D2B4DE'],
        },
      ],
    }
  }

  const chartData = {
    labels: ['需要参会 (Y)', '不需要参会 (N)'],
    datasets: [
      {
        data: [props.essParticipationStats.yes, props.essParticipationStats.no],
        backgroundColor: ['#8E44AD', '#A569BD'],
        hoverBackgroundColor: ['#7D3C98', '#9B59B6'],
      },
    ],
  }

  // 如果有未知值，添加到图表中
  if (props.essParticipationStats.unknown > 0) {
    chartData.labels.push('未确定')
    chartData.datasets[0].data.push(props.essParticipationStats.unknown)
    chartData.datasets[0].backgroundColor.push('#D2B4DE')
    chartData.datasets[0].hoverBackgroundColor = ['#7D3C98', '#9B59B6', '#BB8FCE']
  }

  return chartData
})

// 饼图选项
const pieChartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: props.selectedMonth === 'all'
            ? 'ESS线下参会统计'
            : `${props.selectedMonth}月ESS线下参会统计`,
        font: {
          size: 16,
          weight: 'bold',
        },
        padding: {
          top: 10,
          bottom: 15,
        },
        align: 'start',
      },
      legend: {
        position: 'right',
        align: 'center',
        labels: {
          padding: 10,
          font: {
            size: 12,
          },
          boxWidth: 15,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || ''
            const value = context.raw || 0
            const total = context.dataset.data.reduce((a, b) => a + b, 0)
            const percentage = Math.round((value / total) * 100)
            return `${label}: ${value} (${percentage}%)`
          },
        },
        padding: 8,
        titleFont: {
          size: 12,
        },
        bodyFont: {
          size: 12,
        },
      },
    },
    layout: {
      padding: {
        top: 10,
        bottom: 10,
        left: 15,
        right: 15
      }
    },
    cutout: '40%',
  }
})

// 柱状图数据
const barChartData = computed(() => {
  console.log('重新计算 barChartData, 月份数:', props.monthlyEssStats.length)

  if (props.monthlyEssStats.length === 0) {
    return {
      labels: [],
      datasets: [
        {
          label: '需要参会 (Y)',
          data: [],
          backgroundColor: '#8E44AD',
        },
        {
          label: '不需要参会 (N)',
          data: [],
          backgroundColor: '#A569BD',
        },
      ],
    }
  }

  // 按月份排序
  const sortedStats = [...props.monthlyEssStats].sort((a, b) => {
    // 尝试将月份转换为数字进行比较，如果转换失败则按字符串比较
    const monthA = parseInt(a.month)
    const monthB = parseInt(b.month)
    if (!isNaN(monthA) && !isNaN(monthB)) {
      return monthA - monthB
    }
    return a.month.localeCompare(b.month)
  })

  const chartData = {
    labels: sortedStats.map((stat) => stat.month),
    datasets: [
      {
        label: '需要参会 (Y)',
        data: sortedStats.map((stat) => stat.yes),
        backgroundColor: '#8E44AD',
      },
      {
        label: '不需要参会 (N)',
        data: sortedStats.map((stat) => stat.no),
        backgroundColor: '#A569BD',
      },
    ],
  }

  // 如果有未知值，添加到图表中
  if (sortedStats.some((stat) => stat.unknown > 0)) {
    chartData.datasets.push({
      label: '未确定',
      data: sortedStats.map((stat) => stat.unknown),
      backgroundColor: '#D2B4DE',
    })
  }

  return chartData
})

// 柱状图选项
const barChartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: '各月份ESS线下参会统计',
        font: {
          size: 18,
          weight: 'bold',
        },
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      legend: {
        position: 'top',
      },
      tooltip: {
        padding: 12,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 14,
        },
      },
    },
    scales: {
      x: {
        stacked: false,
        title: {
          display: true,
          text: '月份',
        },
      },
      y: {
        stacked: false,
        beginAtZero: true,
        title: {
          display: true,
          text: '数量',
        },
      },
    },
  }
})

// 调试输出当前状态
console.log('EssParticipationChart 初始状态:', {
  hasData: props.essParticipationStats.total > 0,
  total: props.essParticipationStats.total,
  statsBreakdown: `Y=${props.essParticipationStats.yes}, N=${props.essParticipationStats.no}, Unknown=${props.essParticipationStats.unknown}`,
  monthlyDataCount: props.monthlyEssStats.length,
})

// 是否显示ESS参会数据
const showEssData = computed(() => {
  const shouldShow = props.essParticipationIndex !== -1 && props.isColumnMappingComplete
  console.log(
    'showEssData 计算结果:',
    shouldShow,
    '(essParticipationIndex:',
    props.essParticipationIndex,
    'isColumnMappingComplete:',
    props.isColumnMappingComplete,
    ')'
  )
  return shouldShow
})
</script>

<template>
  <div class="ess-participation-chart">
    <div class="chart-header">
      <h2 class="chart-title">
        {{ selectedMonth === 'all' ? '全部' : selectedMonth + '月' }}
        {{ selectedRegion === 'all' ? '' : selectedRegion + '区域' }}
        ESS线下参会情况
      </h2>
      <div class="chart-status" v-if="selectedMonth !== 'all' || selectedRegion !== 'all'">
        <span v-if="selectedMonth !== 'all'" class="selected-month">{{ selectedMonth }} 月</span>
        <span v-if="selectedMonth !== 'all' && selectedRegion !== 'all'" class="filter-separator">|</span>
        <span v-if="selectedRegion !== 'all'" class="selected-region">{{ selectedRegion }}</span>
      </div>
    </div>

    <template v-if="showEssData && essParticipationStats.total > 0">
      <div class="charts-container">
        <!-- 当前月份ESS参会饼图 -->
        <div class="pie-chart-container">
          <div class="chart-container">
            <Pie :data="pieChartData" :options="pieChartOptions" />
          </div>
        </div>

        <!-- 所有月份ESS参会柱状图 -->
        <div class="bar-chart-container" v-if="monthlyEssStats.length > 1">
          <div class="chart-container">
            <Bar :data="barChartData" :options="barChartOptions" />
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="!isColumnMappingComplete" class="mapping-message">
      <div class="message-icon">📊</div>
      <h3>请完成列映射</h3>
      <p>为了生成ESS参会图表，请确保正确映射月份和区域列。</p>
    </div>

    <div v-else-if="essParticipationIndex === -1" class="mapping-message">
      <div class="message-icon">👤</div>
      <h3>未找到ESS参会数据</h3>
      <p>未找到"是否需要ESS线下参会"列。请确认Excel文件中包含此列数据。</p>
    </div>

    <div v-else-if="essParticipationStats.total === 0" class="no-data-message">
      <div class="message-icon">📈</div>
      <h3>暂无数据</h3>
      <p>当前筛选条件下没有ESS参会数据。请尝试更改筛选条件。</p>
    </div>
  </div>
</template>

<style scoped>
.ess-participation-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 30px;
  overflow-y: auto;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.chart-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.chart-status {
  background-color: #f3f4fd;
  padding: 8px 16px;
  border-radius: 20px;
  color: #8E44AD;
  font-weight: 500;
  font-size: 0.95rem;
  box-shadow: 0 2px 5px rgba(142, 68, 173, 0.15);
}

.filter-separator {
  margin: 0 8px;
  color: #a9a9a9;
}

.selected-region {
  font-weight: 500;
  color: #8E44AD;
}

.charts-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  height: auto;
  margin-bottom: 20px;
}

.pie-chart-container,
.bar-chart-container {
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 15px 20px;
  height: 350px;
}

.chart-container {
  flex: 1;
  position: relative;
  height: 100%;
}

.pie-chart-container .chart-container {
  width: 100%;
  margin: 0 auto;
  height: 320px;
}

.no-data-message,
.mapping-message {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 60px 40px;
  color: #666;
  background-color: #f8f9fa;
  border-radius: 12px;
  margin: 20px 0;
}

.message-icon {
  font-size: 4rem;
  margin-bottom: 25px;
  opacity: 0.7;
}

h3 {
  margin: 0 0 15px 0;
  color: #6c7ae0;
  font-size: 1.5rem;
}

.debug-info {
  margin-top: 20px;
  text-align: left;
  background-color: #f1f1f1;
  padding: 10px;
  border-radius: 5px;
  font-size: 12px;
  overflow: auto;
  max-width: 100%;
}

@media (max-width: 1200px) {
  .charts-container {
    grid-template-columns: 1fr;
    height: auto;
  }

  .chart-container {
    height: 250px;
  }
  
  .pie-chart-container .chart-container {
    width: 70%;
    max-height: 220px;
  }
}

@media (max-width: 768px) {
  .ess-participation-chart {
    padding: 20px;
  }

  .chart-container {
    height: 200px;
  }
  
  .pie-chart-container .chart-container {
    width: 60%;
    max-height: 180px;
  }

  .message-icon {
    font-size: 3rem;
  }

  h3 {
    font-size: 1.3rem;
  }
}

.stats-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #8E44AD;
}

.stats-percentage {
  font-size: 0.85rem;
  color: #888;
  margin-top: 5px;
}

.yes-stats {
  border-top: 3px solid #8E44AD;
}

.no-stats {
  border-top: 3px solid #A569BD;
}

.unknown-stats {
  border-top: 3px solid #D2B4DE;
}
</style>

