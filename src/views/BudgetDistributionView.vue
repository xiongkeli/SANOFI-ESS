<script setup>
import { defineProps, defineEmits, computed, ref } from 'vue'
import FilterPanel from '../components/FilterPanel.vue'
import EventTypePieChart from '../components/EventTypePieChart.vue'
import BudgetByEventChart from '../components/BudgetByEventChart.vue'
import ThirdPartyBudgetChart from '../components/ThirdPartyBudgetChart.vue'
import SatelliteSymposiumBudgetChart from '../components/SatelliteSymposiumBudgetChart.vue'
import SanofiEventBudgetChart from '../components/SanofiEventBudgetChart.vue'

const props = defineProps({
  fileName: String,
  excelData: Object,
  filters: Object,
  isColumnMappingComplete: Boolean,
  filteredData: Array,
  eventTypeStats: Array,
  months: Array,
  years: Array,
})

const emit = defineEmits(['filter-changed'])

const handleFilterChanged = (event) => {
  emit('filter-changed', event)
}

// 检查当前是否在正确的工作表
const isCorrectSheet = computed(() => {
  if (!props.excelData || !props.excelData.activeSheet) return false
  
  // 宽松匹配"会议信息统计表【Monthly】"工作表
  return props.excelData.activeSheet.includes('会议信息统计表') && 
         props.excelData.activeSheet.includes('Monthly')
})

// 检查当前是否在有会议数据的工作表
const hasEventData = computed(() => {
  if (!isCorrectSheet.value) return false;
  
  return props.excelData && props.excelData.activeSheet !== undefined && 
         props.excelData.eventTypeIndex !== -1 && props.excelData.budgetIndex !== -1;
})

// 计算会议预算分布数据
const budgetDistribution = computed(() => {
  if (!hasEventData.value || !props.filteredData || props.filteredData.length === 0) {
    return [];
  }
  
  // 打印所有列名及其索引
  console.log("\n===== Excel表头列信息 =====");
  for (let i = 0; i < props.excelData.headers.length; i++) {
    console.log(`列${i}:`, props.excelData.headers[i]);
  }
  
  // 专门输出会议申请金额列信息
  console.log("\n===== 会议申请金额列信息 =====");
  console.log("预算列索引:", props.excelData.budgetIndex);
  console.log("预算列表头名称:", props.excelData.headers[props.excelData.budgetIndex]);
  
  // 输出前10条数据中的会议申请金额含税值
  console.log("\n前10行预算数据样本:");
  for(let i = 0; i < Math.min(10, props.filteredData.length); i++) {
    const budgetValue = props.filteredData[i][props.excelData.budgetIndex];
    console.log(`行${i+1}: [${typeof budgetValue}] ${budgetValue}`);
  }
  
  // 统计数据
  const distribution = {};
  let dataCount = 0;
  let budgetSum = 0;
  
  // 详细打印每条数据的预算值，便于调试
  console.log("\n======== 预算数据调试日志 ========");
  console.log(`数据总条数: ${props.filteredData.length}`);
  console.log(`预算列索引: ${props.excelData.budgetIndex}`);
  console.log(`会议类型列索引: ${props.excelData.eventTypeIndex}`);
  
  // 处理数据
  props.filteredData.forEach((row, index) => {
    // 获取会议类型
    const eventType = row[props.excelData.eventTypeIndex] || '未知';
    
    // 获取原始预算值
    const originalBudget = row[props.excelData.budgetIndex];
    let budget = 0;
    let debugInfo = "";
    
    // 根据类型处理预算值
    if (originalBudget !== undefined && originalBudget !== null) {
      if (typeof originalBudget === 'number') {
        budget = originalBudget;
        debugInfo = "数值类型";
      } else if (typeof originalBudget === 'string') {
        // 移除所有非数字字符，保留小数点
        const cleanValue = originalBudget.replace(/[^\d.-]/g, '');
        budget = parseFloat(cleanValue) || 0;
        debugInfo = "字符串类型已转换";
      } else {
        debugInfo = "未知类型";
      }
    } else {
      debugInfo = "空值";
    }
    
    // 记录个别数据的处理结果
    if (index < 20 || budget > 1000000 || (typeof originalBudget === 'string' && originalBudget.includes(','))) {
      console.log(`第${index+1}条: ${eventType} - 原始值[${typeof originalBudget}]:${originalBudget} → ${budget} (${debugInfo})`);
    }
    
    // 统计总计
    budgetSum += budget;
    dataCount++;
    
    // 创建或更新会议类型的统计数据
    if (!distribution[eventType]) {
      distribution[eventType] = {
        eventType,
        totalBudget: 0,
        meetingCount: 0,
        averageBudget: 0
      };
    }
    
    // 累加预算总额
    distribution[eventType].totalBudget += budget;
    distribution[eventType].meetingCount += 1;
  });
  
  // 计算场均预算
  Object.values(distribution).forEach(item => {
    item.averageBudget = item.meetingCount > 0 ? item.totalBudget / item.meetingCount : 0;
  });
  
  // 按总预算从高到低排序
  const sortedResult = Object.values(distribution).sort((a, b) => b.totalBudget - a.totalBudget);
  
  // 打印汇总信息
  console.log(`数据总计: ${dataCount}条, 总预算: ${budgetSum}`);
  console.log("会议类型统计:", sortedResult.map(item => ({
    类型: item.eventType,
    场次: item.meetingCount,
    总金额: item.totalBudget.toLocaleString('zh-CN'),
    场均: item.averageBudget.toLocaleString('zh-CN')
  })));
  
  // Excel数据透视表对比信息
  console.log("\n======== 请将此金额与Excel数据透视表比较 ========");
  console.log("代码计算总金额:", budgetSum);
  console.log("Excel数据透视表中的预算列应该是:", props.excelData.headers[props.excelData.budgetIndex]);
  
  return sortedResult;
})

// 添加金额单位选择
const budgetUnit = ref('元') // 默认单位为"元"

// 切换金额单位
const toggleBudgetUnit = () => {
  budgetUnit.value = budgetUnit.value === '元' ? '万元' : '元'
}

// 根据选择的单位格式化金额
const formatCurrency = (value) => {
  // 如果单位是万元，除以10000
  const displayValue = budgetUnit.value === '万元' ? value / 10000 : value
  
  return new Intl.NumberFormat('zh-CN', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(displayValue);
}
</script>

<template>
  <div class="budget-distribution-view">
    <!-- 左侧侧边栏 -->
    <aside class="sidebar">
      <FilterPanel
        :months="months"
        :selected-month="filters.selectedMonth"
        :brands="excelData.brands || []"
        :selected-brand="filters.selectedBrand || 'all'"
        :regions="excelData.regions || []"
        :selected-region="filters.selectedRegion || 'all'"
        :cancellation-stats="{}"
        :selected-cancellation-status="filters.selectedCancellationStatus || 'all'"
        :years="years"
        :selected-year="filters.selectedYear"
        @filter-changed="handleFilterChanged"
      />
    </aside>

    <!-- 右侧主内容区 -->
    <main class="main-content">
      <div class="budget-container">
        <div class="section-header">
          <h2>会议预算分布</h2>
          <p class="subtitle">不同会议类型的会议场次与预算分布</p>
        </div>

        <!-- 提示选择正确的工作表 -->
        <div v-if="!isCorrectSheet" class="sheet-warning">
          <div class="warning-icon">⚠️</div>
          <h3>请选择正确的工作表</h3>
          <p>会议预算分析功能需要解析"会议信息统计表【Monthly】"工作表，请确保已选择该工作表。</p>
        </div>

        <template v-else-if="hasEventData">
          <!-- 单位切换按钮 -->
          <div class="unit-toggle">
            <button @click="toggleBudgetUnit" class="unit-button">
              当前单位: {{ budgetUnit }} <span class="toggle-icon">⇄</span>
            </button>
          </div>
        
          <!-- 上半部分：图表布局 -->
          <div class="charts-grid">
            <!-- 会议场次by会议类型 -->
            <div class="chart-box">
              <div class="chart-header">
                <h3>会议场次by会议类型</h3>
              </div>
              <div class="chart-content">
                <EventTypePieChart 
                  :event-type-stats="eventTypeStats || []"
                  :is-column-mapping-complete="isColumnMappingComplete"
                  :event-type-index="excelData.eventTypeIndex"
                  :selected-month="filters.selectedMonth"
                  :selected-brand="filters.selectedBrand"
                  :hide-title="true"
                />
              </div>
            </div>
            
            <!-- 会议申请金额by会议类型 -->
            <div class="chart-box">
              <div class="chart-header">
                <h3>会议申请金额by会议类型</h3>
              </div>
              <div class="chart-content">
                <BudgetByEventChart 
                  :filtered-data="filteredData || []"
                  :is-column-mapping-complete="isColumnMappingComplete"
                  :event-type-index="excelData.eventTypeIndex"
                  :budget-index="excelData.budgetIndex"
                  :selected-month="filters.selectedMonth"
                  :selected-brand="filters.selectedBrand"
                  :hide-title="true"
                  :budget-unit="budgetUnit"
                />
              </div>
            </div>
          </div>
          
          <!-- 下半部分：表格布局 -->
          <div class="table-container">
            <div class="table-header">
              <h3>会议预算详情表</h3>
            </div>
            <div class="table-content" v-if="budgetDistribution.length > 0">
              <table>
                <thead>
                  <tr>
                    <th>会议类型</th>
                    <th>会议场次</th>
                    <th>总申请金额({{ budgetUnit }})</th>
                    <th>场均金额({{ budgetUnit }})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in budgetDistribution" :key="item.eventType">
                    <td>{{ item.eventType }}</td>
                    <td>{{ item.meetingCount }}</td>
                    <td class="budget-cell">{{ formatCurrency(item.totalBudget) }}</td>
                    <td class="budget-cell">{{ formatCurrency(item.averageBudget) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td>总计</td>
                    <td>{{ budgetDistribution.reduce((acc, curr) => acc + curr.meetingCount, 0) }}</td>
                    <td class="budget-cell">{{ formatCurrency(budgetDistribution.reduce((acc, curr) => acc + curr.totalBudget, 0)) }}</td>
                    <td class="budget-cell">{{ formatCurrency(budgetDistribution.reduce((acc, curr) => acc + curr.totalBudget, 0) / budgetDistribution.reduce((acc, curr) => acc + curr.meetingCount, 0)) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div v-else class="table-placeholder">
              <div class="error-message">
                <div class="icon">📊</div>
                <p v-if="!isColumnMappingComplete">请先完成列映射以查看预算数据</p>
                <p v-else-if="excelData.eventTypeIndex === -1">未找到会议类型列</p>
                <p v-else-if="excelData.budgetIndex === -1">未找到会议申请金额列</p>
                <p v-else>暂无符合条件的会议预算数据</p>
              </div>
            </div>
          </div>
          
          <!-- 三方纯权益会议预算分布 -->
          <div class="third-party-budget-section">
            <ThirdPartyBudgetChart 
              :filtered-data="filteredData || []"
              :is-column-mapping-complete="isColumnMappingComplete"
              :event-type-index="excelData.eventTypeIndex"
              :budget-index="excelData.budgetIndex"
              :region-index="excelData.regionIndex"
              :selected-month="filters.selectedMonth"
              :selected-brand="filters.selectedBrand"
              :budget-unit="budgetUnit"
            />
          </div>
          
          <!-- 三方卫星会议预算分布 -->
          <div class="satellite-symposium-section">
            <SatelliteSymposiumBudgetChart 
              :filtered-data="filteredData || []"
              :is-column-mapping-complete="isColumnMappingComplete"
              :event-type-index="excelData.eventTypeIndex"
              :budget-index="excelData.budgetIndex"
              :region-index="excelData.regionIndex"
              :speakerContractIndex="excelData.speakerContractIndex"
              :selected-month="filters.selectedMonth"
              :selected-brand="filters.selectedBrand"
              :budget-unit="budgetUnit"
            />
          </div>
          
          <!-- 赛诺菲主办会议预算分布 -->
          <div class="sanofi-event-section">
            <!-- 打印调试信息 -->
            <div class="debug-info">
              <h4>调试信息 (仅开发环境可见)</h4>
              <p>贡献者人数索引: {{ excelData.speakerContractIndex }}</p>
              <p>赛诺菲支付贡献者人数索引: {{ excelData.sanofiPaidSpeakerIndex }}</p>
              <p>赛诺菲支付劳务金额索引: {{ excelData.totalSpeakerFeeIndex }}</p>
            </div>
            <SanofiEventBudgetChart 
              :filtered-data="filteredData || []"
              :is-column-mapping-complete="isColumnMappingComplete"
              :event-type-index="excelData.eventTypeIndex"
              :budget-index="excelData.budgetIndex"
              :region-index="excelData.regionIndex"
              :speaker-contract-index="excelData.speakerContractIndex"
              :sanofi-paid-speaker-index="excelData.sanofiPaidSpeakerIndex"
              :total-speaker-fee-index="excelData.totalSpeakerFeeIndex"
              :selected-month="filters.selectedMonth"
              :selected-brand="filters.selectedBrand"
              :budget-unit="budgetUnit"
            />
          </div>
        </template>
        <div v-else class="data-placeholder">
          <div class="error-message">
            <div class="icon">📈</div>
            <p>请确保选择了包含会议类型和预算信息的数据</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.budget-distribution-view {
  display: flex;
  width: 100%;
  height: calc(100vh - 60px); /* 减去标签导航的高度 */
  overflow: hidden;
  background-color: #f8f9fa;
}

/* 侧边栏样式 */
.sidebar {
  width: 280px;
  height: 100%;
  background-color: #fff;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.05);
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  z-index: 10;
}

/* 主内容区样式 */
.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.section-header {
  margin-bottom: 24px;
}

.section-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.section-header .subtitle {
  margin-top: 8px;
  font-size: 16px;
  color: #666;
}

/* 工作表警告样式 */
.sheet-warning {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin-top: 24px;
}

.warning-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.sheet-warning h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: #FFA500;
}

.sheet-warning p {
  color: #666;
  font-size: 1.1rem;
  line-height: 1.5;
  max-width: 500px;
}

/* 上半部分图表网格布局 */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.chart-box {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.chart-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #495057;
}

.chart-content {
  padding: 16px;
  height: 300px;
}

/* 表格容器 */
.table-container {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  margin-top: 24px;
}

.table-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
}

.table-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #495057;
}

.table-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

/* 表格样式 */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

th {
  font-weight: 600;
  color: #495057;
  background-color: #f8f9fa;
}

.budget-cell {
  font-weight: 500;
  text-align: right;
}

.total-row {
  font-weight: 600;
  background-color: #f8f9fa;
}

.total-row td {
  border-top: 2px solid #dee2e6;
}

.table-placeholder, .data-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
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
@media (max-width: 1200px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

/* 单位切换按钮样式 */
.unit-toggle {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.unit-button {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.unit-button:hover {
  background-color: #e9ecef;
}

.toggle-icon {
  font-size: 16px;
  font-weight: bold;
}

/* 三方会议预算部分 */
.third-party-budget-section {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  margin: 24px 0;
  padding: 20px;
}

/* 三方卫星会议预算部分 */
.satellite-symposium-section {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  margin: 24px 0;
  padding: 20px;
}

/* 赛诺菲主办会议预算分布区域 */
.sanofi-event-section {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 20px;
  margin-top: 24px;
  margin-bottom: 24px;
}

.debug-info {
  background-color: #f0f8ff;
  border: 1px solid #d0e3f7;
  padding: 10px;
  margin-bottom: 15px;
  border-radius: 4px;
  font-size: 12px;
}

.debug-info h4 {
  margin-top: 0;
  margin-bottom: 8px;
  color: #0066cc;
}
</style> 