<script setup>
import { defineProps, computed, onMounted, watch, ref, onBeforeUnmount, shallowRef } from 'vue'
import { Chart, registerables } from 'chart.js'

// 注册Chart.js组件
Chart.register(...registerables)

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
  selectedMonth: {
    type: String,
    default: 'all',
  },
  selectedBrand: {
    type: String,
    default: 'all',
  },
})

// 使用shallowRef替代普通ref来储存Chart实例
const chartRef = ref(null)
const chart = shallowRef(null)
const isVisible = ref(true)
const cacheKey = ref('')
const cachedChartData = ref(null)

// 图表颜色配置
const colorSet = [
  'rgba(142, 68, 173, 0.7)',   // 主题紫色
  'rgba(41, 128, 185, 0.7)',   // 蓝色
  'rgba(39, 174, 96, 0.7)',    // 绿色
  'rgba(230, 126, 34, 0.7)',   // 橙色
  'rgba(231, 76, 60, 0.7)',    // 红色
  'rgba(243, 156, 18, 0.7)',   // 黄色
  'rgba(155, 89, 182, 0.7)',   // 紫色
  'rgba(52, 152, 219, 0.7)',   // 天蓝
  'rgba(46, 204, 113, 0.7)',   // 翠绿
  'rgba(241, 196, 15, 0.7)',   // 明黄
]

// 计算缓存键
const calculateCacheKey = () => {
  return JSON.stringify({
    isComplete: props.isColumnMappingComplete,
    mIdx: props.monthIndex,
    bIdx: props.brandIndex,
    tIdx: props.travelCostIndex,
    eIdx: props.essParticipationIndex,
    sMonth: props.selectedMonth,
    sBrand: props.selectedBrand,
    dataLen: props.filteredData?.length || 0
  })
}

// 计算每个月份下每个Brand的差旅成本总和 - 使用缓存优化
const travelCostData = computed(() => {
  // 基本验证 - 快速返回
  if (!props.isColumnMappingComplete || 
      props.monthIndex === -1 || 
      props.brandIndex === -1 || 
      props.travelCostIndex === -1 || 
      props.essParticipationIndex === -1 || 
      !props.filteredData || 
      props.filteredData.length === 0) {
    return { months: [], datasets: [] }
  }

  // 检查缓存是否有效
  const newKey = calculateCacheKey()
  if (newKey === cacheKey.value && cachedChartData.value) {
    return cachedChartData.value
  }

  // 按月份分组整理数据
  const monthlyData = {}
  const brandSet = new Set()

  // 使用 for 循环代替 forEach 以提高性能
  const dataLength = props.filteredData.length
  for (let i = 0; i < dataLength; i++) {
    const row = props.filteredData[i]
    // 只统计ESS线下参会的会议
    const essValue = row[props.essParticipationIndex]
    if (!essValue || !['Y', 'YES', '是', 'TRUE', '1'].includes(String(essValue).trim().toUpperCase())) {
      continue
    }
    
    // 获取月份、品牌和差旅成本
    const month = row[props.monthIndex]?.toString() || '未知'
    const brand = row[props.brandIndex]?.toString() || '未知'
    let cost = row[props.travelCostIndex]

    // 确保成本是数值
    if (typeof cost === 'string') {
      // 移除可能的货币符号、逗号等，并转换为数值
      cost = parseFloat(cost.replace(/[^\d.-]/g, '')) || 0
    } else if (typeof cost !== 'number') {
      cost = 0
    }

    // 将品牌添加到集合
    brandSet.add(brand)

    // 按月份分组
    if (!monthlyData[month]) {
      monthlyData[month] = {}
    }
    
    // 累加相同品牌的成本
    if (!monthlyData[month][brand]) {
      monthlyData[month][brand] = 0
    }
    monthlyData[month][brand] += cost
  }

  // 将分组数据转换为Chart.js需要的格式
  const months = Object.keys(monthlyData)
  const brands = Array.from(brandSet)
  
  // 为每个品牌创建一个数据集
  const datasets = brands.map((brand, index) => {
    const colorIndex = index % colorSet.length
    
    return {
      label: brand,
      data: months.map(month => monthlyData[month][brand] || 0),
      backgroundColor: colorSet[colorIndex],
      borderColor: colorSet[colorIndex].replace('0.7', '1'),
      borderWidth: 1
    }
  })

  // 保存到缓存
  const result = { months, datasets }
  cachedChartData.value = result
  cacheKey.value = newKey

  return result
})

// 创建或更新图表 - 使用更高效的方式
const createOrUpdateChart = () => {
  // 如果组件不可见或没有DOM元素，不更新图表
  if (!isVisible.value || !chartRef.value) return

  const ctx = chartRef.value?.getContext('2d')
  if (!ctx) return

  const { months, datasets } = travelCostData.value

  // 如果没有数据，不创建图表
  if (!months.length || !datasets.length) return

  if (chart.value) {
    // 更新现有图表而不是销毁重建
    chart.value.data.labels = months
    chart.value.data.datasets = datasets
    chart.value.update('none') // 使用最轻量级的更新模式
    return
  }

  // 只在必要时创建新图表
  chart.value = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: isVisible.value ? 800 : 0 // 仅在可见时启用动画
      },
      plugins: {
        title: {
          display: true,
          text: '按月份和Brand/Team统计的ESS线下参会差旅成本',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            top: 10,
            bottom: 20
          }
        },
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 15,
            padding: 15
          }
        },
        tooltip: {
          mode: 'index',
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('zh-CN', { 
                  style: 'currency', 
                  currency: 'CNY',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: '月份',
            font: {
              weight: 'bold'
            }
          }
        },
        y: {
          stacked: true,
          title: {
            display: true,
            text: '差旅总成本（元）',
            font: {
              weight: 'bold'
            }
          },
          ticks: {
            callback: function(value) {
              return new Intl.NumberFormat('zh-CN', { 
                style: 'currency', 
                currency: 'CNY',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(value);
            }
          }
        }
      }
    }
  })
}

// 优化的防抖更新 - 使用requestAnimationFrame
let updateTimeout = null
let animFrameId = null
const debouncedUpdate = () => {
  if (updateTimeout) clearTimeout(updateTimeout)
  if (animFrameId) cancelAnimationFrame(animFrameId)
  
  updateTimeout = setTimeout(() => {
    // 只在组件可见且有数据变化时更新
    if (isVisible.value) {
      animFrameId = requestAnimationFrame(() => {
        createOrUpdateChart()
      })
    }
  }, 100) // 100ms防抖延迟
}

// 检测组件可见性
const observeVisibility = () => {
  if (!window.IntersectionObserver) return () => {}
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isVisible.value = entry.isIntersecting
      // 仅当变为可见时更新图表
      if (entry.isIntersecting) {
        debouncedUpdate()
      }
    })
  }, { threshold: 0.1 })
  
  if (chartRef.value) {
    observer.observe(chartRef.value)
  }
  
  return () => observer.disconnect()
}

// 监听数据变化 - 只在可见时更新
watch(() => [
  props.isColumnMappingComplete,
    props.filteredData, 
    props.selectedMonth, 
    props.selectedBrand, 
  travelCostData.value
], () => {
  // 仅当组件可见时响应数据变化
  if (isVisible.value) {
    debouncedUpdate()
  }
}, { deep: true })

// 监听可见性变化
watch(isVisible, (newValue) => {
  if (newValue) {
    debouncedUpdate()
  }
})

let visibilityCleanup = null

onMounted(() => {
  // 设置可见性观察器
  visibilityCleanup = observeVisibility()
  
  // 添加页面可见性变化处理
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  // 初始创建图表
  debouncedUpdate()
})

onBeforeUnmount(() => {
  // 清理资源
  if (updateTimeout) clearTimeout(updateTimeout)
  if (animFrameId) cancelAnimationFrame(animFrameId)
  if (chart.value) chart.value.destroy()
  if (visibilityCleanup) visibilityCleanup()
  
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

// 处理页面可见性变化
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible' && isVisible.value) {
    debouncedUpdate()
  }
}
</script>

<template>
  <div class="travel-cost-chart">
    <div v-if="!isColumnMappingComplete || 
                monthIndex === -1 || 
                brandIndex === -1 || 
                travelCostIndex === -1 || 
                essParticipationIndex === -1" 
        class="chart-placeholder">
      <div class="error-message">
        <div class="icon">📊</div>
        <p>请先完成列映射以查看差旅成本数据</p>
      </div>
    </div>
    <div v-else-if="filteredData && filteredData.length > 0" class="chart-container">
      <canvas ref="chartRef" class="travel-cost-canvas"></canvas>
    </div>
    <div v-else class="chart-placeholder">
      <div class="error-message">
        <div class="icon">📈</div>
        <p>暂无符合条件的差旅成本数据</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.travel-cost-chart {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.travel-cost-canvas {
  width: 100% !important;
  height: 100% !important;
}

.chart-placeholder {
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
</style> 