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

// 注册 Chart.js 组件
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

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
  console.log('EssNameAnalysisChart 组件已挂载')
  console.log('当前 ESS人员统计数据条目数:', props.essNameStats.length)
  console.log('当前 isColumnMappingComplete:', props.isColumnMappingComplete)
  console.log('当前 essNameIndex:', props.essNameIndex)
  console.log('当前 essParticipationIndex:', props.essParticipationIndex)
  console.log('当前 essOnlineParticipationIndex:', props.essOnlineParticipationIndex)
})

// 处理统计数据，只取前20名
const processedStats = computed(() => {
  // 为每条数据添加线上会议场次（总会议数 - 线下会议数）
  const statsWithOnline = props.essNameStats.map(stat => ({
    ...stat,
    onlineCount: stat.total - (stat.offlineYes || 0)
  }));
  
  // 按照总会议数降序排序后取前20名
  return [...statsWithOnline]
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);
})

// 柱状图数据
const barChartData = computed(() => {
  if (processedStats.value.length === 0) {
    return {
      labels: [],
      datasets: [
        {
          label: '线下会议场次',
          data: [],
          backgroundColor: '#8E44AD', // Sanofi紫色主题
        },
        {
          label: '线上会议场次',
          data: [],
          backgroundColor: '#3498DB', // 蓝色
        }
      ]
    }
  }

  return {
    // 使用ESS人员名称作为标签
    labels: processedStats.value.map(stat => stat.name),
    datasets: [
      {
        label: '线下会议场次',
        data: processedStats.value.map(stat => stat.offlineYes || 0),
        backgroundColor: '#8E44AD', // Sanofi紫色主题
      },
      {
        label: '线上会议场次',
        data: processedStats.value.map(stat => stat.onlineCount || 0),
        backgroundColor: '#3498DB', // 蓝色
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
        text: 'ESS人员参会情况统计',
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
            let datasetLabel = context.dataset.label || '';
            let value = context.raw || 0;
            return `${datasetLabel}: ${value}`;
          }
        }
      },
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: '会议场次',
          font: {
            size: 13
          }
        },
        beginAtZero: true,
        ticks: {
          font: {
            size: 12
          }
        }
      },
      y: {
        stacked: true,
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

// 是否显示ESS人员参会数据
const showEssNameData = computed(() => {
  return props.essNameIndex !== -1 && 
         (props.essParticipationIndex !== -1 || props.essOnlineParticipationIndex !== -1) && 
         props.isColumnMappingComplete
})
</script>

<template>
  <div class="ess-name-analysis-chart">
    <div class="chart-header" v-if="!hideTitle">
      <h2 class="chart-title">ESS人员参会情况分析</h2>
      <div class="chart-status" v-if="selectedMonth !== 'all' || selectedBrand !== 'all'">
        <span v-if="selectedMonth !== 'all'" class="selected-month">{{ selectedMonth }} 月</span>
        <span v-if="selectedMonth !== 'all' && selectedBrand !== 'all'" class="filter-separator">|</span>
        <span v-if="selectedBrand !== 'all'" class="selected-brand">{{ selectedBrand }}</span>
      </div>
    </div>

    <template v-if="showEssNameData && essNameStats.length > 0">
      <div class="content-layout">
        <div class="chart-wrapper">
          <div class="chart-container">
            <Bar :data="barChartData" :options="barChartOptions" />
          </div>
        </div>

        <div class="table-wrapper" v-if="showTable">
          <div class="stats-table">
            <h3>详细统计数据</h3>
            <table>
              <thead>
                <tr>
                  <th>ESS人员</th>
                  <th>线下会议</th>
                  <th>线上会议</th>
                  <th>总会议数</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stat in processedStats" :key="stat.name">
                  <td>{{ stat.name }}</td>
                  <td>{{ stat.offlineYes }}</td>
                  <td>{{ stat.onlineCount }}</td>
                  <td>{{ stat.total }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="chart-description">
            <p>
              此图表显示了各ESS人员的参会情况统计。柱状图展示了ESS人员参与的线下会议和线上会议的数量。
              线下会议是指"是否需要ESS线下参会"列填写为"Y"的会议，线上会议是指"是否需要ESS线上参会"列填写为"N"的会议。
              数据按照会议总数降序排序，仅显示前20名人员。
            </p>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="!isColumnMappingComplete" class="mapping-message">
      <div class="message-icon">📊</div>
      <h3>请完成列映射</h3>
      <p>为了生成ESS人员参会分析图表，请确保正确映射月份和区域列。</p>
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
      <p>当前筛选条件下没有ESS人员参会数据可供分析，请尝试调整筛选条件。</p>
    </div>
  </div>
</template>

<style scoped>
.ess-name-analysis-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow-y: auto;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.chart-status {
  background-color: #f3f4fd;
  padding: 6px 12px;
  border-radius: 16px;
  color: #8E44AD;
  font-weight: 500;
  font-size: 0.85rem;
  box-shadow: 0 2px 5px rgba(142, 68, 173, 0.1);
}

.filter-separator {
  margin: 0 6px;
  color: #a9a9a9;
}

.selected-month, .selected-brand {
  font-weight: 500;
  color: #8E44AD;
}

.content-layout {
  display: flex;
  flex: 1;
  gap: 20px;
  overflow: hidden;
}

.chart-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.chart-container {
  flex: 1;
  min-height: 300px;
  position: relative;
}

.table-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.stats-table {
  background-color: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
}

.stats-table h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #333;
}

.stats-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.stats-table th,
.stats-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
  white-space: nowrap;
}

.stats-table th {
  background-color: #f9f5fc;
  font-weight: 600;
  color: #333;
  position: sticky;
  top: 0;
  z-index: 1;
}

.stats-table tbody tr:hover {
  background-color: #f5f5f5;
}

.chart-description {
  font-size: 0.8rem;
  color: #666;
  line-height: 1.5;
  margin-top: 10px;
  padding: 0 10px;
}

.chart-description p {
  margin: 0;
}

.mapping-message,
.no-data-message {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 30px;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-top: 20px;
}

.message-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  color: #8E44AD;
}

.mapping-message h3,
.no-data-message h3 {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 10px;
  color: #333;
}

.mapping-message p,
.no-data-message p {
  color: #666;
  font-size: 0.9rem;
  max-width: 400px;
  line-height: 1.5;
}

@media (max-width: 992px) {
  .content-layout {
    flex-direction: column;
    overflow-y: auto;
  }
  .chart-wrapper,
  .table-wrapper {
    flex: none;
    width: 100%;
  }
  .table-wrapper {
    max-height: 400px;
  }
}

@media (max-width: 576px) {
  .ess-name-analysis-chart {
    padding: 15px;
  }
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .chart-title {
    font-size: 1.1rem;
  }
  .stats-table th,
  .stats-table td {
    padding: 6px 8px;
  }
}
</style> 