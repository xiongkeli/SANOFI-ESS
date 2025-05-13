<script setup>
import { defineProps, computed, onMounted } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import { usePerformanceCalculation } from '../composables/usePerformanceCalculation'

// 注册 Chart.js 组件
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// 导入绩效计算函数
const { calculateTeamPerformance } = usePerformanceCalculation()

const props = defineProps({
  essNameStats: {
    type: Array,
    default: () => [],
    required: true
  },
  isColumnMappingComplete: {
    type: Boolean,
    default: false
  },
  essNameIndex: {
    type: Number,
    default: -1
  },
  essParticipationIndex: {
    type: Number,
    default: -1
  },
  essOnlineParticipationIndex: {
    type: Number,
    default: -1
  },
  selectedMonth: {
    type: String,
    default: 'all'
  },
  selectedBrand: {
    type: String,
    default: 'all'
  },
  showTable: {
    type: Boolean,
    default: true
  },
  hideTitle: {
    type: Boolean,
    default: false
  }
})

onMounted(() => {
  console.log('EssPerformanceChart 组件已挂载')
  console.log('当前 ESS人员统计数据条目数:', props.essNameStats.length)
})

// 处理绩效数据
const performanceData = computed(() => {
  // 如果没有ESS人员数据，返回空数组
  if (!props.essNameStats || props.essNameStats.length === 0) {
    return []
  }

  // 将ESS人员数据转换为绩效计算所需格式
  const essData = props.essNameStats.map(stat => ({
    name: stat.name,
    offlineMeetings: stat.offlineYes || 0,
    onlineMeetings: stat.onlineNo || 0,
    total: stat.total || 0
  }))

  // 计算绩效
  return calculateTeamPerformance(essData)
})

// 处理统计数据，只取前20名
const processedStats = computed(() => {
  // 取前20名，避免图表过于拥挤
  return performanceData.value.slice(0, 20)
})

// 柱状图数据
const barChartData = computed(() => {
  if (processedStats.value.length === 0) {
    return {
      labels: [],
      datasets: [
        {
          label: '绩效百分比',
          data: [],
          backgroundColor: '#8E44AD', // Sanofi紫色主题
        }
      ]
    }
  }

  return {
    // 使用ESS人员名称作为标签
    labels: processedStats.value.map(stat => stat.name),
    datasets: [
      {
        label: '绩效百分比',
        data: processedStats.value.map(stat => stat.performancePercentage * 100), // 转为百分比显示
        backgroundColor: '#8E44AD', // Sanofi紫色主题
      }
    ]
  }
})

// 柱状图选项
const barChartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y', // 使用水平柱状图，方便显示较多的ESS人员名称
    plugins: {
      title: {
        display: !props.hideTitle,
        text: 'ESS人员绩效分析',
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
        labels: {
          font: {
            size: 13
          },
          boxWidth: 12,
          padding: 10
        }
      },
      tooltip: {
        padding: 10,
        titleFont: {
          size: 13,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: function(context) {
            let value = context.raw;
            return `绩效百分比: ${value.toFixed(1)}%`;
          }
        }
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: '绩效百分比',
          font: {
            size: 13
          }
        },
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return value + '%';
          },
          font: {
            size: 12
          }
        }
      },
      y: {
        title: {
          display: true,
          text: 'ESS人员',
          font: {
            size: 13
          }
        },
        ticks: {
          font: {
            size: 12
          }
        }
      }
    },
  }
})

// 是否显示ESS人员绩效数据
const showEssPerformanceData = computed(() => {
  return props.essNameIndex !== -1 && 
         (props.essParticipationIndex !== -1 || props.essOnlineParticipationIndex !== -1) && 
         props.isColumnMappingComplete
})
</script>

<template>
  <div class="ess-performance-chart">
    <div class="chart-header" v-if="!hideTitle">
      <h2 class="chart-title">ESS人员绩效分析</h2>
      <div class="chart-status" v-if="selectedMonth !== 'all' || selectedBrand !== 'all'">
        <span v-if="selectedMonth !== 'all'" class="selected-month">{{ selectedMonth }} 月</span>
        <span v-if="selectedMonth !== 'all' && selectedBrand !== 'all'" class="filter-separator">|</span>
        <span v-if="selectedBrand !== 'all'" class="selected-brand">{{ selectedBrand }}</span>
      </div>
    </div>

    <template v-if="showEssPerformanceData && performanceData.length > 0">
      <div class="chart-container">
        <Bar :data="barChartData" :options="barChartOptions" />
      </div>

      <div class="stats-table" v-if="showTable">
        <h3>ESS人员绩效详情</h3>
        <table>
          <thead>
            <tr>
              <th>ESS人员</th>
              <th>线下会议</th>
              <th>线下分数</th>
              <th>线上会议</th>
              <th>线上分数</th>
              <th>总分数</th>
              <th>绩效百分比</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stat in processedStats" :key="stat.name">
              <td>{{ stat.name }}</td>
              <td>{{ stat.offlineMeetings }}</td>
              <td>{{ stat.offlineScore.toFixed(1) }}</td>
              <td>{{ stat.onlineMeetings }}</td>
              <td>{{ stat.onlineScore.toFixed(1) }}</td>
              <td>{{ stat.totalScore.toFixed(1) }}</td>
              <td class="performance-cell">{{ stat.formattedPercentage }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="chart-description" v-if="showTable">
        <p>
          此图表显示了各ESS人员的绩效分析。绩效计算方式：
          线下会议：指"是否需要ESS线下参会"列填写为"Y"的会议，≥8场=4分，5-8场=2分；
          线上会议：指"是否需要ESS线上参会"列填写为"N"的会议，30-40场=4分，27-29场=3分，24-26场=2.2分，21-23场=1.4分，18-20场=0.8分；
          绩效百分比=(线下分数+线上分数)×5%。
        </p>
      </div>
    </template>

    <div v-else-if="!isColumnMappingComplete" class="mapping-message">
      <div class="message-icon">📊</div>
      <h3>请完成列映射</h3>
      <p>为了生成ESS人员绩效分析图表，请确保正确映射月份和区域列。</p>
    </div>

    <div v-else-if="essNameIndex === -1" class="mapping-message">
      <div class="message-icon">👤</div>
      <h3>未找到ESS Name数据</h3>
      <p>未找到"ESS Name"列。请确认Excel文件中包含此列数据。</p>
    </div>

    <div v-else-if="essParticipationIndex === -1 && essOnlineParticipationIndex === -1" class="mapping-message">
      <div class="message-icon">📋</div>
      <h3>未找到ESS参会数据</h3>
      <p>未找到"是否需要ESS线下/线上参会"列。请确认Excel文件中包含此列数据。</p>
    </div>

    <div v-else class="no-data-message">
      <div class="message-icon">📈</div>
      <h3>暂无数据</h3>
      <p>当前筛选条件下没有ESS人员数据可供分析，请尝试调整筛选条件。</p>
    </div>
  </div>
</template>

<style scoped>
.ess-performance-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 15px;
  overflow-y: auto;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.chart-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.chart-status {
  background-color: #f3f4fd;
  padding: 6px 12px;
  border-radius: 20px;
  color: #8E44AD;
  font-weight: 500;
  font-size: 0.9rem;
  box-shadow: 0 2px 5px rgba(142, 68, 173, 0.15);
}

.filter-separator {
  margin: 0 6px;
  color: #a9a9a9;
}

.selected-month, .selected-brand {
  font-weight: 500;
  color: #8E44AD;
}

.chart-container {
  flex: 1;
  min-height: 300px;
  position: relative;
  height: v-bind('showTable ? "auto" : "100%"');
  margin-bottom: 0;
}

.stats-table {
  margin-top: 30px;
}

.stats-table h3 {
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 15px;
}

table {
  width: 100%;
  border-collapse: collapse;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

th, td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eaeaea;
}

thead {
  background-color: #8E44AD;
  color: white;
}

tbody tr:nth-child(even) {
  background-color: #f9f4fa;
}

tbody tr:hover {
  background-color: #f1e6f5;
}

.performance-cell {
  font-weight: 600;
  color: #8E44AD;
}

.chart-description {
  margin-top: 30px;
  color: #666;
  line-height: 1.6;
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #8E44AD;
}

.mapping-message, .no-data-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
  padding: 40px;
}

.message-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.mapping-message h3, .no-data-message h3 {
  font-size: 1.4rem;
  margin-bottom: 10px;
  color: #333;
}

.mapping-message p, .no-data-message p {
  color: #666;
  max-width: 500px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .ess-performance-chart {
    padding: 15px;
  }
  
  .chart-title {
    font-size: 1.2rem;
  }
  
  .chart-container {
    min-height: 300px;
  }
  
  th, td {
    padding: 8px 10px;
    font-size: 0.9rem;
  }
}
</style> 