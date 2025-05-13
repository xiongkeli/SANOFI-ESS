import { reactive } from 'vue'

/**
 * 列映射管理组合式函数
 * 处理列映射相关的逻辑
 * @param {Object} excelParserRef - Excel 解析器的引用
 */
export function useColumnMapping(excelParserRef) {
  // 手动列选择状态
  const manualColumnSelection = reactive({
    monthIndex: -1,
    regionIndex: -1,
    brandIndex: -1,
    essParticipationIndex: -1,
    cancellationIndex: -1,
    eventTypeIndex: -1,
    budgetIndex: -1,
    isManuallySet: false,
  })

  /**
   * 初始化列映射
   * @param {Object} columns - 包含各种列索引的对象
   */
  const initializeColumnMapping = (columns) => {
    manualColumnSelection.monthIndex = columns.monthIndex
    manualColumnSelection.regionIndex = columns.regionIndex
    
    // 如果存在Brand/Team索引，也初始化它
    if ('brandIndex' in columns) {
      manualColumnSelection.brandIndex = columns.brandIndex
    }
    
    // 如果存在ESS参会索引，也初始化它
    if ('essParticipationIndex' in columns) {
      manualColumnSelection.essParticipationIndex = columns.essParticipationIndex
    }
    
    // 如果存在会议取消索引，也初始化它
    if ('cancellationIndex' in columns) {
      manualColumnSelection.cancellationIndex = columns.cancellationIndex
    }
    
    // 如果存在Event Type索引，也初始化它
    if ('eventTypeIndex' in columns) {
      manualColumnSelection.eventTypeIndex = columns.eventTypeIndex
    }
    
    // 如果存在会议申请金额索引，也初始化它
    if ('budgetIndex' in columns) {
      manualColumnSelection.budgetIndex = columns.budgetIndex
    }
  }

  /**
   * 更新列选择
   * @param {Object} columns - 包含各种列索引的对象
   */
  const updateColumnSelection = (columns) => {
    const monthIndex = parseInt(columns.monthIndex)
    const regionIndex = parseInt(columns.regionIndex)

    // 仅在都有有效值时更新
    if (monthIndex >= 0 && regionIndex >= 0) {
      manualColumnSelection.isManuallySet = true

      // 构建更新对象
      const updates = { monthIndex, regionIndex }
      
      // 如果提供了Brand/Team索引
      if ('brandIndex' in columns && parseInt(columns.brandIndex) >= 0) {
        updates.brandIndex = parseInt(columns.brandIndex)
      }
      
      // 如果提供了ESS参会索引
      if ('essParticipationIndex' in columns && parseInt(columns.essParticipationIndex) >= 0) {
        updates.essParticipationIndex = parseInt(columns.essParticipationIndex)
      }
      
      // 如果提供了会议取消索引
      if ('cancellationIndex' in columns && parseInt(columns.cancellationIndex) >= 0) {
        updates.cancellationIndex = parseInt(columns.cancellationIndex)
      }
      
      // 如果提供了Event Type索引
      if ('eventTypeIndex' in columns && parseInt(columns.eventTypeIndex) >= 0) {
        updates.eventTypeIndex = parseInt(columns.eventTypeIndex)
      }
      
      // 如果提供了会议申请金额索引
      if ('budgetIndex' in columns && parseInt(columns.budgetIndex) >= 0) {
        updates.budgetIndex = parseInt(columns.budgetIndex)
      }

      // 更新 Excel 解析器中的列索引
      if (excelParserRef && excelParserRef.updateColumnIndices) {
        excelParserRef.updateColumnIndices(updates)
      }
    }
  }

  /**
   * 重置为自动检测
   */
  const resetColumnSelection = () => {
    manualColumnSelection.isManuallySet = false

    // 重新执行自动列检测
    if (excelParserRef && excelParserRef.findDataColumns) {
      excelParserRef.findDataColumns()

      // 更新手动选择的值，以匹配自动检测结果
      if (excelParserRef.excelData) {
        manualColumnSelection.monthIndex = excelParserRef.excelData.monthIndex
        manualColumnSelection.regionIndex = excelParserRef.excelData.regionIndex
        manualColumnSelection.brandIndex = excelParserRef.excelData.brandIndex
        manualColumnSelection.essParticipationIndex = excelParserRef.excelData.essParticipationIndex
        manualColumnSelection.cancellationIndex = excelParserRef.excelData.cancellationIndex
        manualColumnSelection.eventTypeIndex = excelParserRef.excelData.eventTypeIndex
        manualColumnSelection.budgetIndex = excelParserRef.excelData.budgetIndex
      }
    }
  }

  // 返回公开的状态和方法
  return {
    manualColumnSelection,
    initializeColumnMapping,
    updateColumnSelection,
    resetColumnSelection
  }
}
