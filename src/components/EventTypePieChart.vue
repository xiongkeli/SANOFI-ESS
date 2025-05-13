<script setup>
import { defineProps, computed } from 'vue'
import PieChart from './PieChart.vue'

const props = defineProps({
  eventTypeStats: {
    type: Object,
    default: () => ({ types: {}, total: 0 }),
  },
  selectedMonth: {
    type: String,
    default: 'all',
  },
  selectedRegion: {
    type: String,
    default: 'all',
  },
  isColumnMappingComplete: {
    type: Boolean,
    default: false,
  },
  eventTypeIndex: {
    type: Number,
    default: -1,
  },
  hideTitle: {
    type: Boolean,
    default: false,
  },
})

// 为饼图准备数据
const chartData = computed(() => {
  if (
    !props.eventTypeStats ||
    !props.eventTypeStats.types ||
    Object.keys(props.eventTypeStats.types).length === 0
  ) {
    console.log('Event Type分布：无数据可显示', props.eventTypeStats);
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

  const types = Object.keys(props.eventTypeStats.types)
  console.log('Event Type分布：找到类型', types);

  // 生成随机颜色
  const generateColors = (count) => {
    const colors = []
    for (let i = 0; i < count; i++) {
      // 使用Sanofi主题紫色色系
      const sanofiColors = [
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

      if (i < sanofiColors.length) {
        colors.push(sanofiColors[i])
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

  const backgroundColors = generateColors(types.length)

  return {
    labels: types,
    datasets: [
      {
        data: types.map((type) => props.eventTypeStats.types[type].count),
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
        text: 'Event Type (Campaign/One Time/Sub Event)',
        font: {
          size: 16,
          weight: 'bold',
        },
        padding: {
          top: 5,
          bottom: 15,
        },
      },
      legend: {
        position: 'right',
        align: 'center',
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 11,
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
        padding: 10,
        titleFont: {
          size: 12,
        },
        bodyFont: {
          size: 12,
        },
      },
    },
  }
})
</script>

<template>
  <div class="event-type-pie-chart" :class="{ 'simple-mode': hideTitle }">
    <div class="chart-header" v-if="!hideTitle">
      <h2 class="chart-title">
        {{ selectedMonth === 'all' ? '全部' : selectedMonth + '月' }}
        {{ selectedRegion === 'all' ? '' : selectedRegion + '区域' }}
        活动类型分布
      </h2>
      <div class="chart-status" v-if="selectedMonth !== 'all' || selectedRegion !== 'all'">
        <span v-if="selectedMonth !== 'all'" class="selected-month">{{ selectedMonth }} 月</span>
        <span v-if="selectedMonth !== 'all' && selectedRegion !== 'all'" class="filter-separator">|</span>
        <span v-if="selectedRegion !== 'all'" class="selected-region">{{ selectedRegion }}</span>
      </div>
    </div>

    <template v-if="eventTypeStats.total > 0">
      <!-- 简洁模式下只显示图表 -->
      <div class="chart-container">
        <PieChart :chart-data="chartData" :chart-options="chartOptions" />
      </div>

      <!-- 额外的统计信息只在非简洁模式下显示 -->
      <div class="info-container" v-if="!hideTitle">
        <div class="chart-title-clarification">
          Event Type (Campaign/One Time/Sub Event)
        </div>
        <div class="chart-stats">
          <div 
            class="stats-item" 
            v-for="(data, type) in eventTypeStats.types" 
            :key="type"
          >
            <div class="stats-type">{{ type }}</div>
            <div class="stats-count">{{ data.count }} 会议 ({{ data.percentage }}%)</div>
          </div>
        </div>

        <div class="chart-description">
          <p>
            此饼图显示了{{ selectedMonth === 'all' ? '所有月份' : selectedMonth + ' 月' }}
            各活动类型(Campaign/One Time/Sub Event)的分布情况。每个扇区代表一种活动类型，大小表示该类型的活动数量。
          </p>
        </div>
      </div>
    </template>

    <div v-else-if="!isColumnMappingComplete" class="mapping-message">
      <div class="message-icon">📊</div>
      <h3>请完成列映射</h3>
      <p>为了生成图表，请确保正确映射月份和区域列。</p>
    </div>

    <div v-else-if="eventTypeIndex === -1" class="mapping-message">
      <div class="message-icon">📋</div>
      <h3>未找到活动类型数据</h3>
      <p>未找到"Event Type (Campaign/One Time/Sub Event)"列。请确认Excel文件中包含此列数据。</p>
    </div>

    <div v-else class="no-data-message">
      <div class="message-icon">📈</div>
      <h3>暂无数据</h3>
      <p>当前筛选条件下没有活动类型数据可供分析，请尝试调整筛选条件。</p>
    </div>
  </div>
</template>

<style scoped>
.event-type-pie-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 15px;
  overflow-y: auto;
}

/* 简洁模式样式 */
.simple-mode {
  padding: 0;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.chart-title {
  font-size: 1.2rem;
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
  flex: 1;
  position: relative;
  height: 100%;
  min-height: 250px;
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

.stats-type {
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
  padding: 20px;
  height: 100%;
  color: #888;
}

.message-icon {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.mapping-message h3,
.no-data-message h3 {
  font-size: 1.2rem;
  margin-bottom: 8px;
  color: #666;
}

.mapping-message p,
.no-data-message p {
  font-size: 0.9rem;
  max-width: 300px;
  line-height: 1.4;
}

.chart-title-clarification {
  text-align: center;
  font-weight: 600;
  color: #8E44AD;
  background-color: #f3f4fd;
  padding: 8px;
  border-radius: 6px;
  margin-bottom: 10px;
  font-size: 0.95rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

/* 移除内容布局，让图表占满容器 */
.content-layout {
  display: flex;
  flex-direction: column;
  flex: 1;
}
</style> 