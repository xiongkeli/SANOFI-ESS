<script setup>
import { ref, reactive, watch, nextTick } from 'vue'
import { defineAsyncComponent } from 'vue'

// 导入视图组件
import FileUploadView from './views/FileUploadView.vue'
import DataVisualView from './views/DataVisualView.vue'

// 使用异步组件导入其他标签页，减少初始加载时间
const BudgetDistributionView = defineAsyncComponent(() => 
  import('./views/BudgetDistributionView.vue')
)
const TravelCostAnalysisView = defineAsyncComponent(() => 
  import('./views/TravelCostAnalysisView.vue')
)
const PerformanceAnalysisView = defineAsyncComponent(() => 
  import('./views/PerformanceAnalysisView.vue')
)
const CustomChartView = defineAsyncComponent(() => 
  import('./views/CustomChartView.vue')
)

import TabsNavigation from './components/TabsNavigation.vue'

// 导入组合式函数
import { useExcelParser } from './composables/useExcelParser'
import { useDataFilter } from './composables/useDataFilter'
import { useColumnMapping } from './composables/useColumnMapping'
import { useViewState } from './composables/useViewState'

const title = ref('Sanofi 会议信息管理系统')
const subtitle = ref('上传并解析您的 Excel 文件')

// 初始化视图状态管理
const { isFileUploadView, isDataView, switchToFileUploadView, switchToDataView } = useViewState()

// 添加标签页状态缓存
const tabStateCache = reactive({
  'travel-cost': {
    initialized: false,
    scrollPosition: 0
  },
  'data-visual': {
    initialized: false,
    scrollPosition: 0
  },
  'budget-distribution': {
    initialized: false,
    scrollPosition: 0
  },
  'performance': {
    initialized: false,
    scrollPosition: 0
  },
  'custom-chart': {
    initialized: false,
    scrollPosition: 0
  }
})

// 添加标签页状态管理
const activeTab = ref('data-visual') // 默认显示数据可视化标签
const previousTab = ref('') // 用于跟踪前一个标签

// 保存当前加载的Excel文件
const currentExcelFile = ref(null)

// 初始化 Excel 解析器
const {
  isLoading,
  errorMessage,
  fileName,
  excelData,
  parseExcel,
  switchSheet,
  updateColumnIndices,
} = useExcelParser()

// 初始化数据筛选
const {
  filters,
  isColumnMappingComplete,
  filteredRows,
  regionStats,
  essParticipationStats,
  monthlyEssStats,
  cancellationStats,
  eventTypeStats,
  brands,
  updateMonthFilter,
  updateBrandFilter,
  updateCancellationFilter,
  essNameStats,
  months,
  years,
  updateYearFilter,
} = useDataFilter(excelData)

// 初始化列映射管理
const {
  manualColumnSelection,
  initializeColumnMapping,
  updateColumnSelection,
  resetColumnSelection,
} = useColumnMapping({ excelData, updateColumnIndices })

// 切换标签页
const handleTabChange = (tab) => {
  // 保存上一个标签的滚动位置
  if (activeTab.value) {
    const contentEl = document.querySelector('.tab-content')
    if (contentEl) {
      tabStateCache[activeTab.value].scrollPosition = contentEl.scrollTop
    }
  }
  
  // 记录前一个标签
  previousTab.value = activeTab.value
  
  // 更新当前标签
  activeTab.value = tab
  
  // 标记当前标签为已初始化
  tabStateCache[tab].initialized = true
  
  // 如果已有Excel文件且切换了标签页，根据标签页选择适当的工作表
  if (!isFileUploadView.value && fileName.value) {
    // 使用保存的文件引用而不是从DOM获取
    if (currentExcelFile.value) {
      // 将页面标题更新为当前视图名称
      updatePageTitle(tab)
      
      // 仅在必要时切换工作表
      const needSheetSwitch = shouldSwitchSheet(tab, previousTab.value)
      
      if (needSheetSwitch) {
        // 使用'auto'参数让系统自动选择适合当前视图的工作表
        switchSheet('auto', currentExcelFile.value, (columns) => {
          initializeColumnMapping(columns)
        }, tab)
      }
      
      // 使用nextTick确保DOM更新后再恢复滚动位置
      nextTick(() => {
        const contentEl = document.querySelector('.tab-content')
        if (contentEl && tabStateCache[tab].scrollPosition) {
          contentEl.scrollTop = tabStateCache[tab].scrollPosition
        }
      })
    } else {
      console.error('App.vue: 切换标签页时，没有保存的Excel文件引用');
    }
  }
}

// 检查是否需要切换工作表
const shouldSwitchSheet = (newTab, oldTab) => {
  // 如果是首次加载该标签页，或者从数据视图切换到差旅成本视图等需要不同数据的情况
  // 仅当切换到需要不同工作表的视图时才切换
  
  const dataVisualTabs = ['data-visual', 'custom-chart']
  const budgetTabs = ['budget-distribution', 'performance']
  const travelCostTabs = ['travel-cost']
  
  const getTabCategory = (tab) => {
    if (dataVisualTabs.includes(tab)) return 'data'
    if (budgetTabs.includes(tab)) return 'budget'
    if (travelCostTabs.includes(tab)) return 'travel'
    return 'unknown'
  }
  
  const newCategory = getTabCategory(newTab)
  const oldCategory = getTabCategory(oldTab)
  
  return newCategory !== oldCategory
}

// 更新页面标题
const updatePageTitle = (tab) => {
  if (tab === 'data-visual') {
    subtitle.value = '会议数据可视化'
  } else if (tab === 'budget-distribution') {
    subtitle.value = '会议预算分布'
  } else if (tab === 'travel-cost') {
    subtitle.value = '差旅成本分析'
  } else if (tab === 'performance') {
    subtitle.value = '绩效分析'
  } else if (tab === 'custom-chart') {
    subtitle.value = '自定义图表生成'
  }
}

// 处理文件解析结果
const handleFileParsed = (result) => {
  if (result.success) {
    // 保存当前文件引用
    currentExcelFile.value = result.file;
    console.log('App.vue: 保存文件引用成功，文件名:', result.file.name);
    
    // 解析 Excel 文件，根据当前活动标签页选择工作表
    parseExcel(result.file, (columns) => {
      // 初始化列映射
      initializeColumnMapping(columns)

      // 如果列映射成功，切换到数据查看视图
      if (columns.monthIndex !== -1 && columns.regionIndex !== -1) {
        switchToDataView()
        updatePageTitle(activeTab.value)
      }
    }, activeTab.value)
  } else {
    errorMessage.value = result.errorMessage
  }
}

// 选择新文件（返回文件上传视图）
const handleNewFile = () => {
  switchToFileUploadView()
}

// 处理工作表切换
const handleSheetChanged = (sheetName) => {
  console.log('App.vue: 收到工作表切换事件，正在切换到工作表:', sheetName);
  
  // 使用保存的文件引用而不是从DOM获取
  if (currentExcelFile.value) {
    console.log('App.vue: 使用已保存的文件引用，文件名:', currentExcelFile.value.name);
    
    // 切换工作表
    switchSheet(sheetName, currentExcelFile.value, (columns) => {
      console.log('App.vue: 工作表切换完成，列映射:', columns);
      
      if (manualColumnSelection.isManuallySet) {
        // 如果之前是手动选择的列，并且索引在有效范围内
        if (
          manualColumnSelection.monthIndex >= 0 &&
          manualColumnSelection.monthIndex < excelData.headers.length &&
          manualColumnSelection.regionIndex >= 0 &&
          manualColumnSelection.regionIndex < excelData.headers.length
        ) {
          // 应用手动选择的列
          const updates = {
            monthIndex: parseInt(manualColumnSelection.monthIndex),
            regionIndex: parseInt(manualColumnSelection.regionIndex),
          };
          
          // 如果有Brand/Team列选择，也一并更新
          if (
            manualColumnSelection.brandIndex >= 0 &&
            manualColumnSelection.brandIndex < excelData.headers.length
          ) {
            updates.brandIndex = parseInt(manualColumnSelection.brandIndex);
          }
          
          // 如果有ESS参会列选择，也一并更新
          if (
            manualColumnSelection.essParticipationIndex >= 0 &&
            manualColumnSelection.essParticipationIndex < excelData.headers.length
          ) {
            updates.essParticipationIndex = parseInt(manualColumnSelection.essParticipationIndex);
          }
          
          // 如果有会议类型列选择，也一并更新
          if (
            manualColumnSelection.eventTypeIndex >= 0 &&
            manualColumnSelection.eventTypeIndex < excelData.headers.length
          ) {
            updates.eventTypeIndex = parseInt(manualColumnSelection.eventTypeIndex);
          }
          
          // 如果有预算金额列选择，也一并更新
          if (
            manualColumnSelection.budgetIndex >= 0 &&
            manualColumnSelection.budgetIndex < excelData.headers.length
          ) {
            updates.budgetIndex = parseInt(manualColumnSelection.budgetIndex);
          }
          
          updateColumnIndices(updates);
          console.log('App.vue: 应用了手动列映射');
        } else {
          // 如果索引超出范围，重置为自动检测
          resetColumnSelection()
          console.log('App.vue: 列索引超出范围，重置为自动检测');
        }
      } else {
        // 更新列映射
        initializeColumnMapping(columns)
        console.log('App.vue: 初始化了新的列映射');
      }
    }, activeTab.value)
  } else {
    console.error('App.vue: 没有保存的Excel文件引用，无法切换工作表');
  }
}

// 处理列映射更新
const handleUpdateColumns = (columns) => {
  updateColumnSelection(columns)
}

// 处理列映射重置
const handleResetColumns = () => {
  resetColumnSelection()
}

// 处理筛选条件变更
const handleFilterChanged = (event) => {
  if (event.type === 'year') {
    updateYearFilter(event.value)
  } else if (event.type === 'month') {
    updateMonthFilter(event.value)
  } else if (event.type === 'brand') {
    updateBrandFilter(event.value)
  } else if (event.type === 'cancellation') {
    updateCancellationFilter(event.value)
  }
}

// 监听月份列表变化，初始化筛选条件
watch(
  () => months,
  (newMonths) => {
    if (newMonths.length > 0) {
      // 默认选择 "全部"
      filters.selectedMonth = 'all'
    }
  }
)
</script>

<template>
  <div id="app" :class="{ 'fullscreen-mode': isDataView }">
    <header class="header" v-if="isFileUploadView">
      <div class="logo-container">
        <img src="./assets/sanofi_logo.png" class="logo sanofi-logo" alt="Sanofi logo" />
        <h1>{{ title }}</h1>
      </div>
      <p class="subtitle">{{ subtitle }}</p>
    </header>

    <main class="main-content" :class="{ 'fullscreen-content': isDataView }">
      <!-- 根据当前视图状态显示对应视图组件 -->
      <FileUploadView
        v-if="isFileUploadView"
        :is-loading="isLoading"
        :file-name="fileName"
        :error-message="errorMessage"
        @file-parsed="handleFileParsed"
      />

      <template v-else-if="isDataView">
        <!-- 标签导航 -->
        <TabsNavigation :active-tab="activeTab" @tab-changed="handleTabChange" />

        <keep-alive>
          <component 
            :is="activeTab === 'data-visual' ? DataVisualView :
                  activeTab === 'budget-distribution' ? BudgetDistributionView :
                  activeTab === 'travel-cost' ? TravelCostAnalysisView :
                  activeTab === 'performance' ? PerformanceAnalysisView :
                  activeTab === 'custom-chart' ? CustomChartView : null"
            :key="activeTab"
            class="tab-content"
            :file-name="fileName"
            :excel-data="excelData"
            :filters="filters"
            :is-column-mapping-complete="isColumnMappingComplete"
            :filtered-data="filteredRows"
            :region-stats="activeTab === 'data-visual' ? regionStats : undefined"
            :ess-participation-stats="activeTab === 'data-visual' ? essParticipationStats : undefined"
            :monthly-ess-stats="activeTab === 'data-visual' ? monthlyEssStats : undefined"
            :cancellation-stats="activeTab === 'data-visual' ? cancellationStats : undefined"
            :event-type-stats="['data-visual', 'budget-distribution'].includes(activeTab) ? eventTypeStats : undefined"
            :manual-column-selection="activeTab === 'data-visual' ? manualColumnSelection : undefined"
            :ess-name-stats="activeTab === 'performance' ? essNameStats : undefined"
            :months="months"
            :years="years"
            @new-file="handleNewFile"
            @sheet-changed="handleSheetChanged"
            @update-columns="activeTab === 'data-visual' ? handleUpdateColumns : undefined"
            @reset-columns="activeTab === 'data-visual' ? handleResetColumns : undefined"
            @filter-changed="handleFilterChanged"
          />
        </keep-alive>
      </template>
    </main>

    <footer class="footer" v-if="isFileUploadView">
      <p>&copy; 2025 Excel 解析与图表生成工具</p>
    </footer>
  </div>
</template>

<style scoped>
.header {
  margin-bottom: 20px;
  text-align: center;
  padding-top: 20px;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.logo {
  height: 40px;
  will-change: filter;
  transition: filter 300ms;
}

.sanofi-logo {
  /* Add any specific styles, e.g., width, padding */
}

.subtitle {
  color: #666;
  font-size: 1.2rem;
  margin-top: 10px;
}

.main-content {
  margin-bottom: 40px;
}

.footer {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #eaeaea;
  color: #666;
}
</style>
