<script setup>
import { defineProps, computed } from 'vue'
import PieChart from './PieChart.vue'

const props = defineProps({
  regionStats: {
    type: Object,
    default: () => ({ regions: {}, total: 0 }),
  },
  selectedMonth: {
    type: String,
    default: 'all',
  },
  isColumnMappingComplete: {
    type: Boolean,
    default: false,
  },
  selectedRegion: {
    type: String,
    default: 'all',
  },
})

// 为饼图准备数据
const chartData = computed(() => {
  if (
    !props.regionStats ||
    !props.regionStats.regions ||
    Object.keys(props.regionStats.regions).length === 0
  ) {
    console.log('区域会议数量分布：无数据可显示', props.regionStats);
    return {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [],
        },
      ],
    }
  }

  const regions = Object.keys(props.regionStats.regions)
  console.log('区域会议数量分布：找到区域', regions);

  // 生成随机颜色
  const generateColors = (count) => {
    const colors = []
    for (let i = 0; i < count; i++) {
      // 使用Sanofi主题紫色色系
      const sanofiPurpleColors = [
        '#8E44AD', // 深紫色
        '#9B59B6', // 紫色
        '#A569BD', // 较浅紫色  
        '#BB8FCE', // 淡紫色
        '#D2B4DE', // 非常淡的紫色
        '#7D3C98', // 更深的紫色
        '#6C3483', // 暗紫色
        '#5B2C6F', // 非常暗的紫色
        '#4A235A', // 极暗的紫色
        '#663399', // 丽贝卡紫
        '#8B008B', // 深洋红色
        '#9370DB', // 中等紫色
        '#BA55D3', // 中等兰花紫
        '#C71585', // 中等紫红色
      ]

      if (i < sanofiPurpleColors.length) {
        colors.push(sanofiPurpleColors[i])
      } else {
        // 如果超过了预定义颜色的数量，生成紫色系随机颜色
        const r = Math.floor(Math.random() * 100) + 100
        const g = Math.floor(Math.random() * 70) + 20
        const b = Math.floor(Math.random() * 100) + 150
        colors.push(`rgb(${r}, ${g}, ${b})`)
      }
    }
    return colors
  }

  const backgroundColors = generateColors(regions.length)

  return {
    labels: regions,
    datasets: [
      {
        data: regions.map((region) => props.regionStats.regions[region].count),
        backgroundColor: backgroundColors,
        hoverBackgroundColor: backgroundColors,
      },
    ],
  }
})

// 图表选项
const chartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text:
          props.selectedMonth === 'all'
            ? '所有月份各区域会议数量'
            : `${props.selectedMonth} 月各区域会议数量`,
        font: {
          size: 18,
          weight: 'bold',
        },
        padding: {
          top: 10,
          bottom: 30,
        },
      },
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 14,
          },
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
        padding: 12,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 14,
        },
      },
    },
  }
})
</script>

<template>
  <div class="chart-display">
    <div class="chart-header">
      <h2 class="chart-title">
        {{ selectedMonth === 'all' ? '全部' : selectedMonth + '月' }}
        {{ selectedRegion === 'all' ? '' : selectedRegion + '区域' }}
        会议数量分布
      </h2>
      <div class="chart-status" v-if="selectedMonth !== 'all' || selectedRegion !== 'all'">
        <span v-if="selectedMonth !== 'all'" class="selected-month">{{ selectedMonth }} 月</span>
        <span v-if="selectedMonth !== 'all' && selectedRegion !== 'all'" class="filter-separator">|</span>
        <span v-if="selectedRegion !== 'all'" class="selected-region">{{ selectedRegion }}</span>
      </div>
    </div>

    <template v-if="regionStats.total > 0">
      <div class="chart-container">
        <PieChart :chart-data="chartData" :chart-options="chartOptions" />
      </div>

      <div class="chart-stats">
        <div class="stats-item" v-for="(data, region) in regionStats.regions" :key="region">
          <div class="stats-region">{{ region }}</div>
          <div class="stats-count">{{ data.count }} 会议 ({{ data.percentage }}%)</div>
        </div>
      </div>

      <div class="chart-description">
        <p>
          此饼图显示了{{ selectedMonth === 'all' ? '所有月份' : selectedMonth + ' 月' }}
          各区域的会议数量分布。每个扇区代表一个区域，大小表示该区域的会议数量。
        </p>
      </div>
    </template>

    <div v-else-if="!isColumnMappingComplete" class="mapping-message">
      <div class="message-icon">📊</div>
      <h3>请完成列映射</h3>
      <p>为了生成图表，请确保正确映射月份和区域列。</p>
    </div>

    <div v-else class="no-data-message">
      <div class="message-icon">📈</div>
      <h3>暂无数据</h3>
      <p>当前筛选条件下没有数据可供分析，请尝试调整筛选条件。</p>
      <div class="tips-section">
        <p class="filter-tip">
          <strong>提示：</strong> 当前条件组合可能没有符合的数据，尤其是在选择特定月份和会议取消状态时。
          请尝试：
        </p>
        <ul class="filter-suggestions">
          <li>切换至"全部月份"查看</li>
          <li>选择"所有会议"取消状态</li>
          <li>更换其他筛选条件组合</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-display {
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

.chart-container {
  height: 450px;
  margin-bottom: 30px;
  position: relative;
}

.chart-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-top: 30px;
  margin-bottom: 30px;
}

.stats-item {
  padding: 16px;
  border-left: 3px solid #8E44AD;
  background-color: #f8f9fa;
  border-radius: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.stats-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
  background-color: #fff;
}

.stats-region {
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.stats-count {
  font-size: 0.9rem;
  color: #666;
}

.chart-description {
  background-color: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-top: 20px;
  font-size: 0.95rem;
  color: #666;
  line-height: 1.5;
  border-left: 3px solid #8E44AD;
}

.mapping-message,
.no-data-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
  height: 100%;
  color: #888;
  opacity: 0.8;
}

.message-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.6;
}

.mapping-message h3,
.no-data-message h3 {
  font-size: 1.4rem;
  margin-bottom: 10px;
  color: #666;
}

.mapping-message p,
.no-data-message p {
  font-size: 1rem;
  max-width: 350px;
  line-height: 1.5;
}

.tips-section {
  margin-top: 20px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.filter-tip {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.filter-suggestions {
  list-style: none;
  padding: 0;
  margin: 0;
}

.filter-suggestions li {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 5px;
}
</style>
