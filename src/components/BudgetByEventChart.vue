<script setup>
import { defineProps, computed, onMounted } from 'vue'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Pie, Bar } from 'vue-chartjs'

// 注册 Chart.js 组件
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps({
  filteredData: {
    type: Array,
    default: () => [],
    required: true
  },
  isColumnMappingComplete: {
    type: Boolean,
    default: false
  },
  eventTypeIndex: {
    type: Number,
    default: -1
  },
  budgetIndex: {
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
  hideTitle: {
    type: Boolean,
    default: false
  },
  budgetUnit: {
    type: String,
    default: '元'
  }
})

onMounted(() => {
  console.log('BudgetByEventChart 组件已挂载')
  console.log('当前筛选数据条目数:', props.filteredData.length)
  console.log('当前 eventTypeIndex:', props.eventTypeIndex)
  console.log('当前 budgetIndex:', props.budgetIndex)
})

// 处理预算数据
const budgetData = computed(() => {
  if (!props.isColumnMappingComplete || 
      props.eventTypeIndex === -1 || 
      props.budgetIndex === -1 || 
      !props.filteredData || 
      props.filteredData.length === 0) {
    return {};
  }
  
  // 计算每种会议类型的预算总和
  const budgetByType = {};
  let totalBudget = 0;
  
  // 处理数据
  props.filteredData.forEach((row) => {
    // 获取会议类型
    const eventType = row[props.eventTypeIndex] || '未知';
    
    // 获取原始预算值
    const originalBudget = row[props.budgetIndex];
    let budget = 0;
    
    // 与BudgetDistributionView.vue保持完全一致的处理逻辑
    if (originalBudget !== undefined && originalBudget !== null) {
      if (typeof originalBudget === 'number') {
        budget = originalBudget;
      } else if (typeof originalBudget === 'string') {
        // 移除所有非数字字符，保留小数点
        const cleanValue = originalBudget.replace(/[^\d.-]/g, '');
        budget = parseFloat(cleanValue) || 0;
      }
    }
    
    // 统计总计
    totalBudget += budget;
    
    // 创建或更新类型统计
    if (!budgetByType[eventType]) {
      budgetByType[eventType] = 0;
    }
    
    // 累加预算总额
    budgetByType[eventType] += budget;
  });
  
  // 打印汇总数据，用于与表格数据比对
  console.log(`图表计算总金额: ${totalBudget}`);
  
  return budgetByType;
})

// 图表数据
const chartData = computed(() => {
  const data = budgetData.value;
  const eventTypes = Object.keys(data);
  
  if (eventTypes.length === 0) {
    return {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [],
          hoverBackgroundColor: []
        }
      ]
    };
  }
  
  // 生成柱状图颜色
  const colors = [
    '#8E44AD', // 紫色（赛诺菲品牌色）
    '#3498DB', // 蓝色
    '#1ABC9C', // 绿松石色
    '#F1C40F', // 黄色
    '#E67E22', // 橙色
    '#E74C3C', // 红色
    '#34495E', // 深灰蓝色
    '#9B59B6', // 淡紫色
    '#2ECC71', // 绿色
    '#16A085', // 深绿松石色
    '#F39C12', // 橙黄色
    '#D35400', // 深橙色
    '#C0392B', // 深红色
    '#7F8C8D', // 灰色
  ];
  
  // 排序数据，按预算金额从大到小
  const sortedTypes = eventTypes.sort((a, b) => data[b] - data[a]);
  const values = sortedTypes.map(type => data[type]);
  const backgroundColors = sortedTypes.map((_, index) => colors[index % colors.length]);
  
  return {
    labels: sortedTypes,
    datasets: [
      {
        label: '会议申请金额',
        data: values,
        backgroundColor: backgroundColors,
        borderWidth: 0
      }
    ]
  };
})

// 图表选项
const chartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: !props.hideTitle,
        text: '会议申请金额by会议类型',
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
        position: 'right',
        labels: {
          font: {
            size: 12
          },
          boxWidth: 12,
          padding: 15
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
            
            // 如果单位是万元，转换显示值
            if (props.budgetUnit === '万元') {
              value = value / 10000;
            }
            
            return `${context.label}: ${new Intl.NumberFormat('zh-CN', {
              style: 'currency',
              currency: 'CNY',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }).format(value)}${props.budgetUnit === '万元' ? '万' : ''}`;
          }
        }
      },
    },
  };
})

// 是否显示图表
const showChart = computed(() => {
  return props.isColumnMappingComplete && 
         props.eventTypeIndex !== -1 && 
         props.budgetIndex !== -1 && 
         props.filteredData && 
         props.filteredData.length > 0 && 
         Object.keys(budgetData.value).length > 0;
})
</script>

<template>
  <div class="budget-by-event-chart">
    <div v-if="showChart" class="chart-container">
      <Pie :data="chartData" :options="chartOptions" />
    </div>
    <div v-else class="chart-placeholder">
      <div class="error-message">
        <div class="icon">📊</div>
        <p v-if="!isColumnMappingComplete">请先完成列映射以查看预算分布图</p>
        <p v-else-if="eventTypeIndex === -1">未找到会议类型列</p>
        <p v-else-if="budgetIndex === -1">未找到会议申请金额列</p>
        <p v-else>暂无符合条件的会议预算数据</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.budget-by-event-chart {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.chart-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-message {
  text-align: center;
  color: #6c757d;
}

.error-message .icon {
  font-size: 48px;
  margin-bottom: 16px;
}
</style> 