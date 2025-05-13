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
import { Pie } from 'vue-chartjs'

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
  regionIndex: {
    type: Number,
    default: -1
  },
  speakerContractIndex: {
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
  console.log('SatelliteSymposiumBudgetChart 组件已挂载')
  console.log('当前筛选数据条目数:', props.filteredData.length)
  console.log('当前 eventTypeIndex:', props.eventTypeIndex)
  console.log('当前 budgetIndex:', props.budgetIndex)
  console.log('当前 regionIndex:', props.regionIndex)
  console.log('当前 speakerContractIndex:', props.speakerContractIndex)
  
  // 添加会议类型值的调试信息
  if (props.filteredData && props.filteredData.length > 0 && props.eventTypeIndex !== -1) {
    console.log('======== 所有会议类型值 ========')
    const eventTypes = new Set()
    props.filteredData.forEach(row => {
      const eventType = row[props.eventTypeIndex]
      if (eventType) {
        eventTypes.add(eventType.toString())
      }
    })
    console.log('会议类型列表:', Array.from(eventTypes))
  }
})

// 处理三方卫星会议预算数据
const satelliteSymposiumData = computed(() => {
  if (!props.isColumnMappingComplete || 
      props.eventTypeIndex === -1 || 
      props.budgetIndex === -1 || 
      props.regionIndex === -1 || 
      !props.filteredData || 
      props.filteredData.length === 0) {
    return { regions: {}, total: 0 };
  }
  
  // 初始化结果对象
  const result = {
    regions: {},
    total: 0,
    totalBudget: 0,
    totalSpeakers: 0
  };
  
  // 三方卫星会关键词
  const satelliteKeyword = 'Third Party Event(including satelite symposlum)';
  
  // 处理数据
  props.filteredData.forEach((row) => {
    // 获取会议类型
    const eventType = row[props.eventTypeIndex];
    if (!eventType) return;
    
    const eventTypeStr = eventType.toString();
    
    // 检查是否是三方卫星会议 - 更灵活的匹配条件
    const isSatelliteSymposium = 
      eventTypeStr.includes(satelliteKeyword) || 
      (eventTypeStr.toLowerCase().includes('third party') && 
       (eventTypeStr.toLowerCase().includes('satellite') || 
        eventTypeStr.toLowerCase().includes('satelite') || 
        eventTypeStr.toLowerCase().includes('symposlum') || 
        eventTypeStr.toLowerCase().includes('symposium'))) ||
      eventTypeStr.toLowerCase().includes('卫星会');
    
    if (!isSatelliteSymposium) return;
    
    // 获取地区
    const region = row[props.regionIndex]?.toString() || '未知区域';
    
    // 获取原始预算值
    const originalBudget = row[props.budgetIndex];
    let budget = 0;
    
    // 处理预算值
    if (originalBudget !== undefined && originalBudget !== null) {
      if (typeof originalBudget === 'number') {
        budget = originalBudget;
      } else if (typeof originalBudget === 'string') {
        // 移除所有非数字字符，保留小数点
        const cleanValue = originalBudget.replace(/[^\d.-]/g, '');
        budget = parseFloat(cleanValue) || 0;
      }
    }
    
    // 获取贡献者人数
    let speakerCount = 0;
    if (props.speakerContractIndex !== -1) {
      const originalSpeakerCount = row[props.speakerContractIndex];
      if (originalSpeakerCount !== undefined && originalSpeakerCount !== null) {
        if (typeof originalSpeakerCount === 'number') {
          speakerCount = originalSpeakerCount;
        } else if (typeof originalSpeakerCount === 'string') {
          const cleanValue = originalSpeakerCount.replace(/[^\d.-]/g, '');
          speakerCount = parseInt(cleanValue) || 0;
        }
      }
    }
    
    // 创建或更新Region数据
    if (!result.regions[region]) {
      result.regions[region] = {
        count: 0,
        amount: 0,
        speakers: 0
      };
    }
    
    // 更新统计数据
    result.total++;
    result.totalBudget += budget;
    result.totalSpeakers += speakerCount;
    
    // 更新地区统计
    result.regions[region].count++;
    result.regions[region].amount += budget;
    result.regions[region].speakers += speakerCount;
  });
  
  console.log('三方卫星会预算统计结果:', result);
  return result;
})

// 为饼图准备数据 - 按区域分布的三方卫星会预算
const budgetChartData = computed(() => {
  const data = satelliteSymposiumData.value;
  
  if (!data || !data.regions || Object.keys(data.regions).length === 0 || data.total === 0) {
    return {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [],
        }
      ]
    };
  }
  
  // 提取区域名称和预算金额
  const regions = Object.keys(data.regions);
  
  // 生成颜色
  const colors = [
    '#8E44AD', // 紫色（赛诺菲品牌色）
    '#3498DB', // 蓝色
    '#16A085', // 深绿松石色
    '#F1C40F', // 黄色
    '#E67E22', // 橙色
    '#E74C3C', // 红色
    '#2ECC71', // 绿色
    '#9B59B6', // 淡紫色
    '#34495E', // 深灰蓝色
  ];
  
  return {
    labels: regions,
    datasets: [
      {
        data: regions.map(region => data.regions[region].amount),
        backgroundColor: regions.map((_, index) => colors[index % colors.length]),
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
        display: true,
        text: '三方卫星会预算分布',
        font: {
          size: 16,
          weight: 'bold',
        },
        padding: {
          top: 10,
          bottom: 15,
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
         props.regionIndex !== -1 && 
         props.filteredData && 
         props.filteredData.length > 0 && 
         satelliteSymposiumData.value.total > 0;
})

// 格式化金额
const formatCurrency = (value) => {
  // 如果单位是万元，除以10000
  const displayValue = props.budgetUnit === '万元' ? value / 10000 : value
  
  return new Intl.NumberFormat('zh-CN', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(displayValue);
}
</script>

<template>
  <div class="satellite-symposium-chart">
    <div v-if="showChart" class="charts-and-table">
      <!-- 标题 -->
      <div class="section-title">
        <h2>三方卫星会预算分布</h2>
        <p class="subtitle">按区域统计三方卫星会预算分布情况</p>
      </div>
      
      <!-- 图表布局 -->
      <div class="content-layout">
        <!-- 左侧饼图 -->
        <div class="chart-container">
          <Pie :data="budgetChartData" :options="chartOptions" />
        </div>
        
        <!-- 右侧表格 -->
        <div class="table-container">
          <h3>三方卫星会预算详情表</h3>
          <table>
            <thead>
              <tr>
                <th>区域</th>
                <th>会议场次</th>
                <th>总预算({{ budgetUnit }})</th>
                <th>贡献者人数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="region in Object.keys(satelliteSymposiumData.regions)" :key="region">
                <td>{{ region }}</td>
                <td class="text-center">{{ satelliteSymposiumData.regions[region].count }}</td>
                <td class="text-right">{{ formatCurrency(satelliteSymposiumData.regions[region].amount) }}</td>
                <td class="text-center">{{ satelliteSymposiumData.regions[region].speakers }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td>总计</td>
                <td class="text-center">{{ satelliteSymposiumData.total }}</td>
                <td class="text-right">{{ formatCurrency(satelliteSymposiumData.totalBudget) }}</td>
                <td class="text-center">{{ satelliteSymposiumData.totalSpeakers }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
    
    <div v-else class="chart-placeholder">
      <div class="error-message">
        <div class="icon">📊</div>
        <p v-if="!isColumnMappingComplete">请先完成列映射以查看三方卫星会预算分布</p>
        <p v-else-if="eventTypeIndex === -1">未找到会议类型列</p>
        <p v-else-if="budgetIndex === -1">未找到会议申请金额列</p>
        <p v-else-if="regionIndex === -1">未找到区域列</p>
        <p v-else>暂无符合条件的三方卫星会预算数据</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.satellite-symposium-chart {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.charts-and-table {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.section-title {
  margin-bottom: 20px;
}

.section-title h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.section-title .subtitle {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.content-layout {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.chart-container {
  flex: 1;
  min-width: 0;
  position: relative;
  height: 300px;
}

.table-container {
  flex: 1;
  min-width: 0;
}

.table-container h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #333;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
  white-space: nowrap;
}

th {
  font-weight: 600;
  color: #495057;
  background-color: #f8f9fa;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.total-row {
  font-weight: 600;
  background-color: #f8f9fa;
}

.total-row td {
  border-top: 2px solid #dee2e6;
}

.chart-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  width: 100%;
}

.error-message {
  text-align: center;
  color: #6c757d;
}

.error-message .icon {
  font-size: 48px;
  margin-bottom: 16px;
}

@media (max-width: 992px) {
  .content-layout {
    flex-direction: column;
  }
  
  .chart-container {
    height: 300px;
  }
}
</style> 