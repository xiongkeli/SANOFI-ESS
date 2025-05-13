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
  console.log('ThirdPartyBudgetChart 组件已挂载')
  console.log('当前筛选数据条目数:', props.filteredData.length)
  console.log('当前 eventTypeIndex:', props.eventTypeIndex)
  console.log('当前 budgetIndex:', props.budgetIndex)
  console.log('当前 regionIndex:', props.regionIndex)
  
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

// 处理三方会议预算数据
const thirdPartyBudgetData = computed(() => {
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
    under50k: { count: 0, amount: 0 },
    above50k: { count: 0, amount: 0 }
  };
  
  // 三方纯权益会关键词（只匹配Third Party Congress or Convention）
  const thirdPartyKeyword = 'Third Party Congress or Convention';
  
  // 处理数据
  props.filteredData.forEach((row) => {
    // 获取会议类型
    const eventType = row[props.eventTypeIndex];
    if (!eventType) return;
    
    const eventTypeStr = eventType.toString();
    
    // 检查是否是三方纯权益会议 - 更灵活的匹配条件
    const isThirdParty = 
      eventTypeStr.includes(thirdPartyKeyword) || 
      (eventTypeStr.toLowerCase().includes('third party') && 
       (eventTypeStr.toLowerCase().includes('congress') || 
        eventTypeStr.toLowerCase().includes('convention'))) ||
      eventTypeStr.toLowerCase().includes('纯权益');
    
    if (!isThirdParty) return;
    
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
    
    // 创建或更新Region数据
    if (!result.regions[region]) {
      result.regions[region] = {
        under50k: { count: 0, amount: 0 },
        above50k: { count: 0, amount: 0 },
        total: { count: 0, amount: 0 }
      };
    }
    
    // 更新统计数据
    result.total++;
    
    // 按预算金额分类
    if (budget < 50000) {
      result.under50k.count++;
      result.under50k.amount += budget;
      result.regions[region].under50k.count++;
      result.regions[region].under50k.amount += budget;
    } else {
      result.above50k.count++;
      result.above50k.amount += budget;
      result.regions[region].above50k.count++;
      result.regions[region].above50k.amount += budget;
    }
    
    // 更新总计
    result.regions[region].total.count++;
    result.regions[region].total.amount += budget;
  });
  
  console.log('三方纯权益会预算统计结果:', result);
  return result;
})

// 为饼图准备数据 - 按区域分布的<50000元三方会议
const under50kChartData = computed(() => {
  const data = thirdPartyBudgetData.value;
  
  if (!data || !data.regions || Object.keys(data.regions).length === 0 || data.under50k.count === 0) {
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
  
  // 提取区域名称和<50000元会议数量
  const regions = Object.keys(data.regions).filter(region => 
    data.regions[region].under50k.count > 0
  );
  
  // 生成颜色
  const colors = [
    '#8E44AD', // 紫色（赛诺菲品牌色）
    '#3498DB', // 蓝色
    '#1ABC9C', // 绿松石色
    '#F1C40F', // 黄色
    '#E67E22', // 橙色
    '#E74C3C', // 红色
  ];
  
  return {
    labels: regions,
    datasets: [
      {
        data: regions.map(region => data.regions[region].under50k.amount),
        backgroundColor: regions.map((_, index) => colors[index % colors.length]),
      }
    ]
  };
})

// 为饼图准备数据 - 按区域分布的>=50000元三方会议
const above50kChartData = computed(() => {
  const data = thirdPartyBudgetData.value;
  
  if (!data || !data.regions || Object.keys(data.regions).length === 0 || data.above50k.count === 0) {
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
  
  // 提取区域名称和>=50000元会议数量
  const regions = Object.keys(data.regions).filter(region => 
    data.regions[region].above50k.count > 0
  );
  
  // 生成颜色
  const colors = [
    '#16A085', // 深绿松石色
    '#2ECC71', // 绿色
    '#F39C12', // 橙黄色
    '#9B59B6', // 淡紫色
    '#34495E', // 深灰蓝色
    '#D35400', // 深橙色
  ];
  
  return {
    labels: regions,
    datasets: [
      {
        data: regions.map(region => data.regions[region].above50k.amount),
        backgroundColor: regions.map((_, index) => colors[index % colors.length]),
      }
    ]
  };
})

// 图表选项 - <50000元
const under50kChartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: '三方纯权益会预算 < 50,000元',
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

// 图表选项 - >=50000元
const above50kChartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: '三方纯权益会预算 >= 50,000元',
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
         thirdPartyBudgetData.value.total > 0;
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
  <div class="third-party-budget-chart">
    <div v-if="showChart" class="charts-and-table">
      <!-- 标题 -->
      <div class="section-title">
        <h2>三方纯权益会预算分布</h2>
        <p class="subtitle">按区域统计不同预算规模的三方纯权益会分布情况</p>
      </div>
      
      <!-- 饼图区域 -->
      <div class="charts-container">
        <div class="chart-container" v-if="thirdPartyBudgetData.under50k.count > 0">
          <Pie :data="under50kChartData" :options="under50kChartOptions" />
        </div>
        <div class="chart-container" v-if="thirdPartyBudgetData.above50k.count > 0">
          <Pie :data="above50kChartData" :options="above50kChartOptions" />
        </div>
      </div>
      
      <!-- 表格区域 -->
      <div class="table-container">
        <h3>三方纯权益会预算分布表</h3>
        <table>
          <thead>
            <tr>
              <th>区域 (Region)</th>
              <th>线下会议数<br>&lt; 50,000 {{ budgetUnit }}</th>
              <th>金额 ({{ budgetUnit }})</th>
              <th>场均 ({{ budgetUnit }})</th>
              <th>线下会议数<br>≥ 50,000 {{ budgetUnit }}</th>
              <th>金额 ({{ budgetUnit }})</th>
              <th>场均 ({{ budgetUnit }})</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="region in Object.keys(thirdPartyBudgetData.regions)" :key="region">
              <td>{{ region }}</td>
              <td class="text-center">{{ thirdPartyBudgetData.regions[region].under50k.count }}</td>
              <td class="text-right">{{ formatCurrency(thirdPartyBudgetData.regions[region].under50k.amount) }}</td>
              <td class="text-right">{{ formatCurrency(thirdPartyBudgetData.regions[region].under50k.count > 0 ? thirdPartyBudgetData.regions[region].under50k.amount / thirdPartyBudgetData.regions[region].under50k.count : 0) }}</td>
              <td class="text-center">{{ thirdPartyBudgetData.regions[region].above50k.count }}</td>
              <td class="text-right">{{ formatCurrency(thirdPartyBudgetData.regions[region].above50k.amount) }}</td>
              <td class="text-right">{{ formatCurrency(thirdPartyBudgetData.regions[region].above50k.count > 0 ? thirdPartyBudgetData.regions[region].above50k.amount / thirdPartyBudgetData.regions[region].above50k.count : 0) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td>总计</td>
              <td class="text-center">{{ thirdPartyBudgetData.under50k.count }}</td>
              <td class="text-right">{{ formatCurrency(thirdPartyBudgetData.under50k.amount) }}</td>
              <td class="text-right">{{ formatCurrency(thirdPartyBudgetData.under50k.count > 0 ? thirdPartyBudgetData.under50k.amount / thirdPartyBudgetData.under50k.count : 0) }}</td>
              <td class="text-center">{{ thirdPartyBudgetData.above50k.count }}</td>
              <td class="text-right">{{ formatCurrency(thirdPartyBudgetData.above50k.amount) }}</td>
              <td class="text-right">{{ formatCurrency(thirdPartyBudgetData.above50k.count > 0 ? thirdPartyBudgetData.above50k.amount / thirdPartyBudgetData.above50k.count : 0) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    
    <div v-else class="chart-placeholder">
      <div class="error-message">
        <div class="icon">📊</div>
        <p v-if="!isColumnMappingComplete">请先完成列映射以查看三方纯权益会预算分布</p>
        <p v-else-if="eventTypeIndex === -1">未找到会议类型列</p>
        <p v-else-if="budgetIndex === -1">未找到会议申请金额列</p>
        <p v-else-if="regionIndex === -1">未找到区域列</p>
        <p v-else>暂无符合条件的三方纯权益会预算数据</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.third-party-budget-chart {
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

.charts-container {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  height: 300px;
}

.chart-container {
  flex: 1;
  min-width: 0;
  position: relative;
}

.table-container {
  margin-top: 20px;
}

.table-container h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th, td {
  padding: 10px;
  border-bottom: 1px solid #eee;
}

th {
  font-weight: 600;
  background-color: #f5f5f5;
  text-align: left;
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

/* 响应式布局调整 */
@media (max-width: 992px) {
  .charts-container {
    flex-direction: column;
    height: auto;
  }
  
  .chart-container {
    height: 250px;
  }
}
</style> 