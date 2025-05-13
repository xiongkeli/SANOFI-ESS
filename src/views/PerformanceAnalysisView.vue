<script setup>
import { computed, ref } from 'vue'
import FilterPanel from '../components/FilterPanel.vue'
import EssNameAnalysisChart from '../components/EssNameAnalysisChart.vue'

const props = defineProps({
  fileName: String,
  excelData: Object,
  filters: Object,
  isColumnMappingComplete: Boolean,
  filteredData: Array,
  essNameStats: Array,
  months: Array,
  years: Array,
})

const emit = defineEmits(['filter-changed'])

const handleFilterChanged = (event) => {
  emit('filter-changed', event)
}

// 检查当前是否在正确的工作表
const isMeetingSheet = computed(() => {
  if (!props.excelData || !props.excelData.activeSheet) return false
  
  return props.excelData.activeSheet.includes('会议信息统计表') && 
         props.excelData.activeSheet.includes('Monthly')
})

// 线下会议评分标准（可编辑）
const offlineScoreRules = ref([
  { min: 8, max: Infinity, score: 4 },
  { min: 5, max: 7, score: 2 },
  { min: 0, max: 4, score: 0 }
])

// 线上会议评分标准（可编辑）
const onlineScoreRules = ref([
  // 删除旧标准
  // { min: 30, max: 60, score: 4 },
  // { min: 27, max: 29, score: 3 },
  // { min: 24, max: 26, score: 2.2 },
  // { min: 21, max: 23, score: 1.4 },
  // { min: 18, max: 20, score: 0.8 },
  // { min: 0, max: 17, score: 0 }
  
  // 添加新标准
  { min: 50, max: 59, score: 6 },
  { min: 40, max: 49, score: 5 },
  { min: 30, max: 39, score: 4 },
  { min: 27, max: 29, score: 3 },
  { min: 24, max: 26, score: 2.2 },
  { min: 21, max: 23, score: 1.4 },
  { min: 18, max: 20, score: 0.8 },
  { min: 0, max: 17, score: 0 }
])

// 绩效计算系数（可编辑）
const performanceCoefficient = ref(0.05)

// 更新评分规则
const updateScoreRule = (ruleSet, index, field, value) => {
  if (index >= 0 && index < ruleSet.value.length) {
    const newRules = [...ruleSet.value]
    newRules[index][field] = parseFloat(value) || 0
    
    // 更新相邻规则的边界，保持连续性
    if (field === 'min' && index > 0) {
      newRules[index-1].max = newRules[index].min - 1
    } else if (field === 'max' && index < newRules.length - 1) {
      newRules[index+1].min = newRules[index].max + 1
    }
    
    ruleSet.value = newRules
  }
}

// 添加新规则
const addScoreRule = (ruleSet) => {
  // 创建新规则数组的副本
  const newRules = [...ruleSet.value]
  
  // 按照min值从大到小排序规则
  newRules.sort((a, b) => b.min - a.min)
  
  // 找到一个合适的位置添加新规则（在第二高和第三高之间）
  let newMin, newMax, newScore
  
  if (newRules.length >= 2) {
    // 在第一和第二个规则之间添加
    const highestRule = newRules[0]
    const secondRule = newRules[1]
    
    // 计算新规则的值
    newMin = Math.floor((highestRule.min + secondRule.min) / 2)
    newMax = highestRule.min - 1
    newScore = (highestRule.score + secondRule.score) / 2
    
    // 更新相邻规则的边界
    highestRule.max = newMin - 1
    
    // 插入到第一个规则后面
    newRules.splice(1, 0, { min: newMin, max: newMax, score: newScore })
  } else if (newRules.length === 1) {
    // 只有一个规则时，在其上方添加新规则
    const existingRule = newRules[0]
    
    // 计算新规则的值
    newMin = existingRule.min + 5 // 增加5个场次
    newMax = newMin + 5
    newScore = existingRule.score + 1 // 增加1分
    
    // 更新原规则的上限
    existingRule.max = newMin - 1
    
    // 在现有规则前添加
    newRules.unshift({ min: newMin, max: newMax, score: newScore })
  } else {
    // 没有规则时添加一个默认规则
    newRules.push({ min: 1, max: 10, score: 1 })
  }
  
  // 更新规则集
  ruleSet.value = newRules
  
  // 输出调试信息
  console.log('添加规则后:', ruleSet.value)
}

// 删除规则
const removeScoreRule = (ruleSet, index) => {
  if (ruleSet.value.length > 1 && index >= 0 && index < ruleSet.value.length) {
    const newRules = [...ruleSet.value]
    const removedRule = newRules[index]
    
    newRules.splice(index, 1)
    
    // 更新相邻规则的边界
    if (index > 0 && index < newRules.length) {
      newRules[index-1].max = newRules[index].min - 1
    }
    
    ruleSet.value = newRules
  }
}

// 计算分数
const calculateScore = (count, rules) => {
  for (const rule of rules) {
    if (count >= rule.min && count <= rule.max) {
      return rule.score
    }
  }
  return 0
}

// 计算ESS人员绩效
const essPerformanceData = computed(() => {
  if (!props.essNameStats || props.essNameStats.length === 0) {
    return []
  }
  
  return props.essNameStats.map(person => {
    let offlineYes = person.offlineYes || 0
    let onlineCount = person.total - offlineYes
    
    // 计算线下分数和线上分数
    let offlineScore = calculateScore(offlineYes, offlineScoreRules.value)
    let onlineScore = calculateScore(onlineCount, onlineScoreRules.value)
    
    // 计算绩效百分比 = (线上分数 + 线下分数) * 系数
    const performancePercentage = (onlineScore + offlineScore) * performanceCoefficient.value
    
    return {
      ...person,
      offlineScore,
      onlineScore,
      onlineCount,
      totalScore: offlineScore + onlineScore,
      performancePercentage
    }
  }).sort((a, b) => b.performancePercentage - a.performancePercentage)
})

// 绩效数据统计
const performanceData = computed(() => {
  // 如果不是正确的工作表或没有数据，返回空数据
  if (!isMeetingSheet.value || !props.filteredData || props.filteredData.length === 0) {
    return {
      totalMeetings: 0,
      essParticipationRate: 0,
      meetingCompletionRate: 0
    }
  }
  
  // 统计ESS参与率
  let totalEssParticipation = 0
  let totalMeetings = props.filteredData.length
  
  if (props.excelData.essParticipationIndex !== -1) {
    props.filteredData.forEach(row => {
      const value = row[props.excelData.essParticipationIndex]
      if (value && ['Y', 'YES', '是', 'TRUE', '1'].includes(String(value).trim().toUpperCase())) {
        totalEssParticipation++
      }
    })
  }
  
  // 统计已完成会议率
  let completedMeetings = 0
  
  if (props.excelData.cancellationIndex !== -1) {
    props.filteredData.forEach(row => {
      const value = row[props.excelData.cancellationIndex]
      if (!value || (value !== 'R' && value !== 'r')) {
        completedMeetings++
      }
    })
  }
  
  return {
    totalMeetings,
    essParticipationRate: totalMeetings > 0 ? (totalEssParticipation / totalMeetings) * 100 : 0,
    meetingCompletionRate: totalMeetings > 0 ? (completedMeetings / totalMeetings) * 100 : 0
  }
})

// 格式化百分比
const formatPercentage = (value) => {
  return `${(value * 100).toFixed(1)}%`
}

// 是否显示编辑模式
const isEditingScoreRules = ref(false)

// 切换编辑模式
const toggleEditMode = () => {
  isEditingScoreRules.value = !isEditingScoreRules.value
}
</script>

<template>
  <div class="performance-view">
    <!-- 左侧侧边栏 -->
    <aside class="sidebar">
      <!-- 文件信息区域和筛选组件将从主布局继承 -->
      <FilterPanel
        :months="months || excelData.months || []"
        :selected-month="filters.selectedMonth"
        :brands="excelData.brands || []"
        :selected-brand="filters.selectedBrand || 'all'"
        :regions="excelData.regions || []"
        :selected-region="filters.selectedRegion || 'all'"
        :cancellation-stats="{}"
        :selected-cancellation-status="filters.selectedCancellationStatus || 'all'"
        :years="years || []"
        :selected-year="filters.selectedYear"
        @filter-changed="handleFilterChanged"
      />
    </aside>

    <!-- 右侧主内容区 -->
    <main class="main-content">
      <div class="performance-container">
        <div class="section-header">
          <h2>绩效分析</h2>
          <p class="subtitle">分析和可视化会议相关绩效指标</p>
        </div>

        <!-- 提示选择正确的工作表 -->
        <div v-if="!isMeetingSheet" class="sheet-warning">
          <div class="warning-icon">⚠️</div>
          <h3>请选择正确的工作表</h3>
          <p>绩效分析功能需要解析"会议信息统计表【Monthly】"工作表，请确保已选择该工作表。</p>
        </div>

        <template v-else>
          <!-- 绩效指标卡片 -->
          <div class="stats-summary">
            <div class="stat-card">
              <span class="stat-title">总会议数量</span>
              <span class="stat-value">{{ performanceData.totalMeetings }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-title">ESS参与率</span>
              <span class="stat-value">{{ performanceData.essParticipationRate.toFixed(1) }}%</span>
            </div>
            <div class="stat-card">
              <span class="stat-title">会议完成率</span>
              <span class="stat-value">{{ performanceData.meetingCompletionRate.toFixed(1) }}%</span>
            </div>
          </div>

          <div class="performance-content">
            <!-- ESS人员参会情况分析图表 -->
            <div class="chart-section">
              <EssNameAnalysisChart
                :ess-name-stats="essNameStats || []"
                :is-column-mapping-complete="isColumnMappingComplete"
                :ess-name-index="excelData.essNameIndex"
                :ess-participation-index="excelData.essParticipationIndex"
                :ess-online-participation-index="excelData.essOnlineParticipationIndex"
                :selected-month="filters.selectedMonth"
                :selected-brand="filters.selectedBrand"
              />
            </div>
            
            <!-- ESS人员绩效表格 -->
            <div class="performance-table-section">
              <div class="section-title-bar">
              <h3 class="section-title">ESS人员绩效统计</h3>
                <button class="edit-toggle-button" @click="toggleEditMode">
                  {{ isEditingScoreRules ? '完成编辑' : '编辑评分标准' }}
                </button>
              </div>
              
              <div class="performance-criteria">
                <!-- 线下会议评分标准 -->
                <div class="criteria-box">
                  <h4>线下会议评分标准</h4>
                  <!-- 编辑模式 -->
                  <div v-if="isEditingScoreRules" class="edit-rules-table">
                    <div class="rule-row rule-header">
                      <div class="rule-cell">场次范围</div>
                      <div class="rule-cell">分数</div>
                      <div class="rule-cell">操作</div>
                    </div>
                    <div v-for="(rule, index) in offlineScoreRules" :key="`offline-${index}`" class="rule-row">
                      <div class="rule-cell range-cell">
                        <input type="number" v-model="rule.min" @input="updateScoreRule(offlineScoreRules, index, 'min', rule.min)" min="0" class="rule-input" />
                        -
                        <input type="number" v-model="rule.max" @input="updateScoreRule(offlineScoreRules, index, 'max', rule.max)" :min="rule.min" class="rule-input" />
                      </div>
                      <div class="rule-cell">
                        <input type="number" v-model="rule.score" step="0.1" min="0" class="rule-input" />
                      </div>
                      <div class="rule-cell action-cell">
                        <button class="rule-btn delete-btn" @click="removeScoreRule(offlineScoreRules, index)">删除</button>
                      </div>
                    </div>
                    <div class="rule-row add-row">
                      <button class="rule-btn add-btn" @click="addScoreRule(offlineScoreRules)">添加规则</button>
                    </div>
                  </div>
                  <!-- 查看模式 -->
                  <ul v-else>
                    <li v-for="(rule, index) in offlineScoreRules" :key="`offline-view-${index}`">
                      <template v-if="rule.max === Infinity">≥{{ rule.min }}场：{{ rule.score }}分</template>
                      <template v-else>{{ rule.min }}-{{ rule.max }}场：{{ rule.score }}分</template>
                    </li>
                  </ul>
                </div>
                
                <!-- 线上会议评分标准 -->
                <div class="criteria-box">
                  <h4>线上会议评分标准</h4>
                  <!-- 编辑模式 -->
                  <div v-if="isEditingScoreRules" class="edit-rules-table">
                    <div class="rule-row rule-header">
                      <div class="rule-cell">场次范围</div>
                      <div class="rule-cell">分数</div>
                      <div class="rule-cell">操作</div>
                    </div>
                    <div v-for="(rule, index) in onlineScoreRules" :key="`online-${index}`" class="rule-row">
                      <div class="rule-cell range-cell">
                        <input type="number" v-model="rule.min" @input="updateScoreRule(onlineScoreRules, index, 'min', rule.min)" min="0" class="rule-input" />
                        -
                        <input type="number" v-model="rule.max" @input="updateScoreRule(onlineScoreRules, index, 'max', rule.max)" :min="rule.min" class="rule-input" />
                      </div>
                      <div class="rule-cell">
                        <input type="number" v-model="rule.score" step="0.1" min="0" class="rule-input" />
                      </div>
                      <div class="rule-cell action-cell">
                        <button class="rule-btn delete-btn" @click="removeScoreRule(onlineScoreRules, index)">删除</button>
                      </div>
                    </div>
                    <div class="rule-row add-row">
                      <button class="rule-btn add-btn" @click="addScoreRule(onlineScoreRules)">添加规则</button>
                    </div>
                  </div>
                  <!-- 查看模式 -->
                  <ul v-else>
                    <li v-for="(rule, index) in onlineScoreRules" :key="`online-view-${index}`">
                      <template v-if="rule.max === Infinity">≥{{ rule.min }}场：{{ rule.score }}分</template>
                      <template v-else>{{ rule.min }}-{{ rule.max }}场：{{ rule.score }}分</template>
                    </li>
                  </ul>
                </div>
                
                <!-- 绩效计算 -->
                <div class="criteria-box">
                  <h4>绩效计算</h4>
                  <div v-if="isEditingScoreRules" class="coefficient-edit">
                    <label>
                      绩效系数：
                      <input type="number" v-model="performanceCoefficient" step="0.01" min="0.01" max="1" class="coefficient-input" />
                    </label>
                  </div>
                  <p v-else>绩效百分比 = (线上分数 + 线下分数) × {{ performanceCoefficient }}</p>
                </div>
              </div>
              
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>ESS人员</th>
                      <th>线下会议场次</th>
                      <th>线下分数</th>
                      <th>线上会议场次</th>
                      <th>线上分数</th>
                      <th>总分数</th>
                      <th>绩效百分比</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="person in essPerformanceData" :key="person.name">
                      <td>{{ person.name }}</td>
                      <td>{{ person.offlineYes }}</td>
                      <td>{{ person.offlineScore }}</td>
                      <td>{{ person.onlineCount }}</td>
                      <td>{{ person.onlineScore }}</td>
                      <td>{{ person.totalScore }}</td>
                      <td>{{ formatPercentage(person.performancePercentage) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<style scoped>
.performance-view {
  display: flex;
  width: 100%;
  height: calc(100vh - 60px);
  overflow: hidden;
  background-color: #f8f9fa;
}

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

.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background-color: #f8f9fa;
}

.performance-container {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
}

.section-header {
  margin-bottom: 24px;
  text-align: center;
}

.section-header h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.section-header .subtitle {
  color: #666;
  font-size: 1rem;
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
}

.stat-title {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 12px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #8E44AD;
}

.performance-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.chart-section {
  background-color: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  min-height: 400px;
}

.performance-table-section {
  background-color: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.section-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 20px 0;
}

.performance-criteria {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 24px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.criteria-box {
  background-color: #fff;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.criteria-box h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px 0;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.criteria-box ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.criteria-box li {
  padding: 6px 0;
  color: #444;
}

.criteria-box p {
  color: #444;
  margin: 8px 0;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background-color: #fff;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: center;
  border-bottom: 1px solid #eee;
}

.data-table th {
  font-weight: 600;
  background-color: #f8f9fa;
  color: #333;
  white-space: nowrap;
}

.data-table tr:hover {
  background-color: #f8f4fc;
}

.data-table tr:last-child td {
  border-bottom: none;
}

.sheet-warning {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.warning-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  color: #f39c12;
}

.sheet-warning h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.sheet-warning p {
  color: #666;
  max-width: 500px;
}

/* 编辑模式样式 */
.edit-toggle-button {
  padding: 8px 16px;
  background-color: #8E44AD;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.edit-toggle-button:hover {
  background-color: #7D3C98;
}

.edit-rules-table {
  width: 100%;
}

.rule-row {
  display: flex;
  padding: 6px 0;
  border-bottom: 1px solid #eee;
}

.rule-header {
  font-weight: 600;
  background-color: #f5f5f5;
  padding: 8px 0;
  border-radius: 4px;
}

.rule-cell {
  flex: 1;
  padding: 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.range-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rule-input {
  width: 50px;
  padding: 4px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
}

.rule-input:focus {
  border-color: #8E44AD;
  outline: none;
}

.action-cell {
  justify-content: center;
}

.rule-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}

.delete-btn {
  background-color: #e74c3c;
  color: white;
}

.delete-btn:hover {
  background-color: #c0392b;
}

.add-row {
  justify-content: center;
  padding: 8px 0;
  border-bottom: none;
}

.add-btn {
  background-color: #2ecc71;
  color: white;
  padding: 6px 12px;
}

.add-btn:hover {
  background-color: #27ae60;
}

.coefficient-edit {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}

.coefficient-input {
  width: 60px;
  padding: 4px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  margin-left: 8px;
}

.coefficient-input:focus {
  border-color: #8E44AD;
  outline: none;
}

@media (max-width: 1200px) {
  .performance-criteria {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: 240px;
  }
  
  .stats-summary {
    grid-template-columns: 1fr;
  }
}
</style> 