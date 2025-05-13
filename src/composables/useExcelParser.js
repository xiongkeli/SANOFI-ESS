import { ref, reactive } from 'vue'
import * as XLSX from 'xlsx'

/**
 * Excel 文件解析组合式函数
 * 处理 Excel 文件的解析、工作表处理和初始数据提取
 */
export function useExcelParser() {
  // 解析状态
  const isLoading = ref(false)
  const errorMessage = ref('')
  const fileName = ref('')

  // Excel 数据
  const excelData = reactive({
    headers: [],
    rows: [],
    sheetNames: [],
    activeSheet: '',
    monthIndex: -1,
    regionIndex: -1,
    essParticipationIndex: -1,
    essOnlineParticipationIndex: -1,
    essNameIndex: -1,
    brandIndex: -1,
    cancellationIndex: -1,
    eventTypeIndex: -1,
    travelCostIndex: -1, // 差旅成本列索引
    budgetIndex: -1,     // 会议申请金额含税列索引
    speakerContractIndex: -1, // 贡献者人数列索引
    sanofiPaidSpeakerIndex: -1, // 赛诺菲支付贡献者人数列索引
    totalSpeakerFeeIndex: -1, // 赛诺菲支付劳务金额列索引
    months: [],
    regions: [],
    brands: [],
    essNames: [],
    cancellationStatus: [],
    eventTypes: [],
    yearIndex: -1,  // 添加年份列索引
  })

  /**
   * 查找匹配的工作表
   * @param {Array} sheetNames - 工作表名称列表
   * @param {String} targetName - 目标匹配的工作表名称关键字
   * @returns {String|null} - 找到的工作表名称或null
   */
  const findMatchingSheet = (sheetNames, targetName) => {
    if (!sheetNames || sheetNames.length === 0) return null
    
    console.log(`尝试查找匹配 "${targetName}" 的工作表...`)
    
    // 1. 查找名称完全包含目标字符串的工作表
    const exactMatch = sheetNames.find(name => 
      name.includes(targetName)
    )
    
    if (exactMatch) {
      console.log(`找到精确匹配的工作表: "${exactMatch}"`)
      return exactMatch
    }
    
    // 2. 查找名称包含简化版目标字符串的工作表（去除特殊字符）
    const simplifiedTarget = targetName.replace(/[【】\[\]()（）]/g, '').trim()
    const simplifiedMatch = sheetNames.find(name => 
      name.includes(simplifiedTarget)
    )
    
    if (simplifiedMatch) {
      console.log(`找到简化匹配的工作表: "${simplifiedMatch}" (匹配简化的 "${simplifiedTarget}")`)
      return simplifiedMatch
    }
    
    // 3. 尝试更宽松的匹配
    const looserMatch = sheetNames.find(name => {
      const nameLower = name.toLowerCase()
      const targetLower = targetName.toLowerCase()
      return nameLower.includes(targetLower) || 
             targetLower.includes(nameLower)
    })
    
    if (looserMatch) {
      console.log(`找到宽松匹配的工作表: "${looserMatch}"`)
      return looserMatch
    }
    
    // 4. 尝试关键词匹配
    if (targetName.includes('会议差旅')) {
      // 对于差旅相关工作表，尝试用"差旅"关键词匹配
      const travelMatch = sheetNames.find(name => 
        name.includes('差旅') || 
        name.toLowerCase().includes('travel') || 
        name.toLowerCase().includes('cost')
      )
      
      if (travelMatch) {
        console.log(`找到差旅关键词匹配工作表: "${travelMatch}"`)
        return travelMatch
      }
    }
    
    console.log(`未找到匹配 "${targetName}" 的工作表`)
    return null
  }
  
  /**
   * 根据视图类型选择合适的工作表
   * @param {Object} workbook - Excel工作簿对象
   * @param {String} viewType - 视图类型 ('data-visual', 'budget-distribution', 'travel-cost', 'performance')
   * @returns {String} - 选择的工作表名称
   */
  const selectSheetByViewType = (workbook, viewType) => {
    const sheetNames = workbook.SheetNames
    console.log('可用工作表列表:', sheetNames)
    
    // 默认使用第一个工作表
    let selectedSheet = sheetNames[0]
    
    if (viewType === 'travel-cost') {
      // 差旅成本分析使用"会议差旅【Monthly】"工作表
      const travelCostSheet = findMatchingSheet(sheetNames, '会议差旅【Monthly】')
      if (travelCostSheet) {
        selectedSheet = travelCostSheet
        console.log('为差旅成本分析选择了精确匹配工作表:', selectedSheet)
      } else {
        console.log('未找到精确匹配的会议差旅【Monthly】工作表，尝试替代匹配...')
        
        // 如果没有找到精确名称，尝试查找包含"会议差旅"和"Monthly"的工作表
        const alternateTravelSheet = sheetNames.find(name => 
          name.includes('会议差旅') && name.includes('Monthly')
        )
        
        if (alternateTravelSheet) {
          selectedSheet = alternateTravelSheet
          console.log('为差旅成本分析选择了替代工作表(包含会议差旅+Monthly):', selectedSheet)
        } else {
          // 进一步放宽匹配条件，只要包含"差旅"或"travel"或"cost"关键词的都接受
          const looseMatchSheet = sheetNames.find(name => {
            const lowerName = name.toLowerCase()
            return lowerName.includes('差旅') || 
                   lowerName.includes('travel') || 
                   lowerName.includes('cost')
          })
          
          if (looseMatchSheet) {
            selectedSheet = looseMatchSheet
            console.log('为差旅成本分析选择了宽松匹配工作表:', selectedSheet)
          } else {
            console.warn('没有找到任何差旅相关工作表，使用默认工作表:', selectedSheet)
          }
        }
      }
    } else {
      // 数据可视化、会议预算分布和绩效分析使用"会议信息统计表【Monthly】"工作表
      const meetingInfoSheet = findMatchingSheet(sheetNames, '会议信息统计表【Monthly】')
      if (meetingInfoSheet) {
        selectedSheet = meetingInfoSheet
        console.log(`为${viewType}视图选择了工作表:`, selectedSheet)
      }
    }
    
    return selectedSheet
  }

  /**
   * 解析 Excel 文件
   * @param {File} file - 用户选择的 Excel 文件
   * @param {Function} onColumnsFound - 找到列时的回调函数
   * @param {String} viewType - 视图类型 ('data-visual', 'travel-cost', 'performance')
   */
  const parseExcel = (file, onColumnsFound, viewType = 'data-visual') => {
    isLoading.value = true
    fileName.value = file.name
    errorMessage.value = ''

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })

        // 获取所有工作表名称
        excelData.sheetNames = workbook.SheetNames
        
        // 根据视图类型选择合适的工作表
        excelData.activeSheet = selectSheetByViewType(workbook, viewType)

        console.log('工作表名称:', excelData.sheetNames)
        console.log('激活的工作表:', excelData.activeSheet)

        // 获取选择的工作表数据
        processSheet(workbook, excelData.activeSheet)

        // 初始化筛选条件
        findDataColumns()

        // 调用回调函数，通知外部已找到列
        if (onColumnsFound) {
          onColumnsFound({
            monthIndex: excelData.monthIndex,
            regionIndex: excelData.regionIndex,
            brandIndex: excelData.brandIndex
          })
        }

        isLoading.value = false
      } catch (error) {
        console.error('解析 Excel 文件时出错:', error)
        errorMessage.value = '解析文件时出错，请检查文件格式'
        isLoading.value = false
      }
    }

    reader.onerror = () => {
      errorMessage.value = '读取文件时出错'
      isLoading.value = false
    }

    reader.readAsArrayBuffer(file)
  }

  /**
   * 处理工作表数据
   * @param {Object} workbook - Excel 工作簿对象
   * @param {String} sheetName - 工作表名称
   */
  const processSheet = (workbook, sheetName) => {
    const worksheet = workbook.Sheets[sheetName]

    // 尝试两种方法读取 Excel 数据
    try {
      // 使用 header: 1 选项读取所有数据行，不假设第一行是表头
      let jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      console.log('原始数据:', jsonData)

      if (jsonData.length > 0) {
        // 检查是否有真实表头
        const hasHeader = checkForHeader(jsonData[0])
        console.log('是否有表头行:', hasHeader)

        if (!hasHeader) {
          // 没有真实表头，自动为每列创建索引名称
          excelData.headers = jsonData[0].map((_, index) => `列 ${index + 1}`)
          // 所有行都作为数据
          excelData.rows = jsonData
        } else {
          // 有表头行，按常规处理
          excelData.headers = jsonData[0].map((h) => (h !== undefined ? h : ''))
          // 其余行作为数据
          excelData.rows = jsonData.slice(1).filter((row) => row.length > 0)
        }

        console.log('解析后的表头:', excelData.headers)
        console.log('解析后的数据行数:', excelData.rows.length)

        if (excelData.rows.length > 0) {
          console.log('第一行数据:', excelData.rows[0])
        }
      } else {
        excelData.headers = []
        excelData.rows = []
        console.log('Excel 文件没有数据')
      }
    } catch (error) {
      console.error('处理 Excel 数据时出错:', error)
      excelData.headers = []
      excelData.rows = []
    }
  }

  /**
   * 检查是否为表头行
   * @param {Array} row - 表格行数据
   * @returns {Boolean} 是否为表头行
   */
  const checkForHeader = (row) => {
    // 通常表头不会包含数字或日期值
    // 这里简单检查一下，如果大部分单元格是数字或日期，则可能不是表头
    if (!row || row.length === 0) return false

    // 检查是否第一行包含 "month" 或 "region" 关键词，不区分大小写
    const rowString = row.join(' ').toLowerCase()
    if (rowString.includes('month') || rowString.includes('region')) {
      return true
    }

    // 检查是否有很多数字，如果数字很多，可能不是表头
    const numericCount = row.filter((cell) => typeof cell === 'number').length
    if (numericCount > row.length / 2) {
      return false
    }

    // 默认返回 true，假设有表头
    return true
  }

  /**
   * 查找数据中的列索引
   */
  const findDataColumns = () => {
    if (excelData.headers.length === 0 && excelData.rows.length === 0) {
      console.log('未找到数据')
      return
    }

    console.log('表头数据:', excelData.headers)
    if (excelData.rows.length > 0) {
      console.log('第一行数据:', excelData.rows[0])
    }

    // 首先在表头中查找
    let yearIndex = excelData.headers.findIndex(
      (header) => header && (
        header.toString().toLowerCase() === 'year' ||
        header.toString().toLowerCase() === 'fiscal year' ||
        header.toString().toLowerCase() === 'fy' ||
        header.toString().toLowerCase().includes('年份')
      )
    )

    let monthIndex = excelData.headers.findIndex(
      (header) => header && header.toString().toLowerCase() === 'month'
    )

    let regionIndex = excelData.headers.findIndex(
      (header) => header && header.toString().toLowerCase() === 'region'
    )

    let brandIndex = excelData.headers.findIndex(
      (header) => 
        header && 
        (header.toString().toLowerCase() === 'brand' || 
         header.toString().toLowerCase() === 'team' ||
         header.toString().toLowerCase().includes('brand/team') ||
         header.toString().toLowerCase().includes('brand') ||
         header.toString().toLowerCase().includes('team'))
    )
    
    // 查找ESS Name列
    let essNameIndex = excelData.headers.findIndex(
      (header) => 
        header && 
        (header.toString().toLowerCase() === 'ess name' ||
         header.toString().toLowerCase().includes('ess') && 
         header.toString().toLowerCase().includes('name'))
    )

    // 查找"是否需要ESS线下参会"列 - 扩展匹配条件
    let essParticipationIndex = excelData.headers.findIndex(
      (header) =>
        header &&
        (header.toString() === '是否需要ESS线下参会' ||
          header.toString().toLowerCase().includes('ess参会') ||
          header.toString().toLowerCase().includes('线下参会') ||
          header.toString().toLowerCase().includes('ess线下'))
    )

    // 查找"是否需要ESS线上参会"列
    let essOnlineParticipationIndex = excelData.headers.findIndex(
      (header) =>
        header &&
        (header.toString() === '是否需要ESS线上参会' ||
          header.toString().toLowerCase().includes('ess线上') ||
          header.toString().toLowerCase().includes('线上参会'))
    )

    // 查找Event Type列
    let eventTypeIndex = excelData.headers.findIndex(
      (header) => 
        header && 
        (header.toString().toLowerCase() === 'event type' ||
         header.toString().toLowerCase().includes('event type (campaign') ||
         header.toString().toLowerCase().includes('event type (campaign/one time/sub event)') ||
         (header.toString().toLowerCase().includes('campaign') && 
          header.toString().toLowerCase().includes('one time') && 
          header.toString().toLowerCase().includes('sub event')) ||
         header.toString().includes('Event Taxonomy') ||
         header.toString().includes('会议种类'))
    )
    
    // 查找会议申请金额含税列 - 优先精确匹配
    let budgetIndex = excelData.headers.findIndex(
      (header) => header && header.toString() === '会议申请金额含税'
    )
    
    // 如果未精确匹配到，则进行模糊匹配
    if (budgetIndex === -1) {
      budgetIndex = excelData.headers.findIndex(
        (header) => 
          header && 
          (header.toString().includes('会议申请金额') ||
           header.toString().includes('申请金额') ||
           header.toString().toLowerCase().includes('amount'))
      )
    }
    
    // 查找差旅成本列
    let travelCostIndex = excelData.headers.findIndex(
      (header) => 
        header && 
        (header.toString().includes('结算-差旅总') || 
         header.toString().includes('结算—差旅总') ||
         header.toString().includes('结算-总计') ||
         header.toString().includes('结算—总计'))
    )
    
    // 如果没有找到差旅成本列，且当前工作表名包含"会议差旅"，尝试查找可能的总计列
    if (travelCostIndex === -1 && excelData.activeSheet && excelData.activeSheet.includes('会议差旅')) {
      console.log('尝试查找备选的差旅总计列')
      
      // 尝试查找带有"结算"字样的列，但避免匹配"计划"相关列
      travelCostIndex = excelData.headers.findIndex(
        (header) => 
          header && 
          header.toString().includes('结算') &&
          !header.toString().includes('计划') &&
          (header.toString().includes('总计') ||
           header.toString().includes('总额') ||
           header.toString().includes('合计') ||
           header.toString().includes('差旅'))
      )
      
      if (travelCostIndex !== -1) {
        console.log('找到可能的差旅总计列:', excelData.headers[travelCostIndex])
      }
    }
    
    // 查找贡献者人数列 - "# of Speaker contract"
    let speakerContractIndex = excelData.headers.findIndex(
      (header) => 
        header && 
        (header.toString().includes('# of Speaker contract') || 
         header.toString().toLowerCase().includes('speaker contract') ||
         header.toString().toLowerCase().includes('speakers') ||
         header.toString().includes('贡献者人数') ||
         header.toString().includes('演讲者数量'))
    )
    
    // 查找赛诺菲支付贡献者人数列 - "# of Sanofi paid Speaker"
    let sanofiPaidSpeakerIndex = excelData.headers.findIndex(
      (header) => 
        header && 
        (header.toString().includes('# of Sanofi paid Speaker') || 
         header.toString().toLowerCase().includes('sanofi paid speaker') ||
         header.toString().includes('赛诺菲支付贡献者') ||
         header.toString().includes('赛诺菲贡献者'))
    )
    
    // 查找赛诺菲支付劳务金额列 - "total speaker fee by Sanofi"
    let totalSpeakerFeeIndex = excelData.headers.findIndex(
      (header) => 
        header && 
        (header.toString().includes('total speaker fee by Sanofi') || 
         header.toString().toLowerCase().includes('speaker fee') ||
         header.toString().includes('劳务金额') ||
         header.toString().includes('赛诺菲支付劳务'))
    )
    
    // 如果未找到Brand/Team列，检查是否是J列（索引9）
    if (brandIndex === -1 && excelData.headers.length > 9) {
      console.log('尝试检查J列是否为Brand/Team列');
      // 将J列（索引9）设为brandIndex
      brandIndex = 9;
      console.log('已将J列设为Brand/Team列');
    }

    // 查找"会议取消"列
    let cancellationIndex = excelData.headers.findIndex(
      (header) => 
        header && 
        (header.toString().includes('取消') ||
         header.toString().toLowerCase().includes('cancel') ||
         header.toString().toLowerCase().includes('cancellation'))
    )

    console.log('在表头中找到 - Year 列索引:', yearIndex, 'Month 列索引:', monthIndex, 
      'Region 列索引:', regionIndex, 'Brand/Team 列索引:', brandIndex, 'ESS Name 列索引:', essNameIndex,
      'ESS线下参会索引:', essParticipationIndex, 'ESS线上参会索引:', essOnlineParticipationIndex, 
      '会议取消索引:', cancellationIndex, '差旅成本索引:', travelCostIndex,
      '会议类型索引:', eventTypeIndex, '会议申请金额索引:', budgetIndex,
      '贡献者人数索引:', speakerContractIndex, '赛诺菲支付贡献者人数索引:', sanofiPaidSpeakerIndex,
      '赛诺菲支付劳务金额索引:', totalSpeakerFeeIndex)

    // 如果表头中找不到，那么尝试在第一行数据中查找
    if (yearIndex === -1 || monthIndex === -1 || regionIndex === -1 || brandIndex === -1 ||
      essNameIndex === -1 || essParticipationIndex === -1 || essOnlineParticipationIndex === -1 || cancellationIndex === -1 || 
      travelCostIndex === -1 || eventTypeIndex === -1 || budgetIndex === -1 || speakerContractIndex === -1 ||
      sanofiPaidSpeakerIndex === -1 || totalSpeakerFeeIndex === -1) {
      if (excelData.rows.length > 0) {
        const firstRow = excelData.rows[0]

        if (yearIndex === -1) {
          yearIndex = firstRow.findIndex((cell) => cell && cell.toString().toLowerCase() === 'year')
        }

        if (monthIndex === -1) {
          monthIndex = firstRow.findIndex((cell) => cell && cell.toString().toLowerCase() === 'month')
        }

        if (regionIndex === -1) {
          regionIndex = firstRow.findIndex(
            (cell) => cell && cell.toString().toLowerCase() === 'region'
          )
        }

        // 查找Brand/Team列
        if (brandIndex === -1) {
          brandIndex = firstRow.findIndex(
            (cell) => 
              cell && 
              (cell.toString().toLowerCase() === 'brand' || 
               cell.toString().toLowerCase() === 'team' ||
               cell.toString().toLowerCase().includes('brand/team') ||
               cell.toString().toLowerCase().includes('brand') ||
               cell.toString().toLowerCase().includes('team'))
          )
        }

        // 查找ESS Name列
        if (essNameIndex === -1) {
          essNameIndex = firstRow.findIndex(
            (cell) => 
              cell && 
              (cell.toString().toLowerCase() === 'ess name' ||
              cell.toString().toLowerCase().includes('ess') && 
              cell.toString().toLowerCase().includes('name'))
          )
        }

        // 查找"是否需要ESS线上参会"列
        if (essOnlineParticipationIndex === -1) {
          essOnlineParticipationIndex = firstRow.findIndex(
            (cell) =>
              cell &&
              (cell.toString() === '是否需要ESS线上参会' ||
                cell.toString().toLowerCase().includes('ess线上') ||
                cell.toString().toLowerCase().includes('线上参会'))
          )
        }

        // ESS参会列查找 - 扩展匹配条件
        if (essParticipationIndex === -1) {
          essParticipationIndex = firstRow.findIndex(
            (cell) =>
              cell &&
              (cell.toString() === '是否需要ESS线下参会' ||
                cell.toString().toLowerCase().includes('ess参会') ||
                cell.toString().toLowerCase().includes('参会') ||
                cell.toString().toLowerCase().includes('线下参会'))
          )
        }

        // 会议取消列查找
        if (cancellationIndex === -1) {
          cancellationIndex = firstRow.findIndex(
            (cell) => 
              cell && 
              (cell.toString().includes('取消') ||
               cell.toString().toLowerCase().includes('cancel') ||
               cell.toString().toLowerCase().includes('cancellation'))
          )
        }

        // 查找差旅成本列
        if (travelCostIndex === -1) {
          travelCostIndex = firstRow.findIndex(
            (cell) => 
              cell && 
              (cell.toString().includes('结算-差旅总') || 
               cell.toString().includes('结算—差旅总') ||
               cell.toString().includes('结算-总计') ||
               cell.toString().includes('结算—总计'))
          )
        }

        // 查找贡献者人数列
        if (speakerContractIndex === -1) {
          speakerContractIndex = firstRow.findIndex(
            (cell) => 
              cell && 
              (cell.toString().includes('# of Speaker contract') || 
               cell.toString().toLowerCase().includes('speaker contract') ||
               cell.toString().toLowerCase().includes('speakers') ||
               cell.toString().includes('贡献者人数') ||
               cell.toString().includes('演讲者数量'))
          )
        }

        // 查找赛诺菲支付贡献者人数列
        if (sanofiPaidSpeakerIndex === -1) {
          sanofiPaidSpeakerIndex = firstRow.findIndex(
            (cell) => 
              cell && 
              (cell.toString().includes('# of Sanofi paid Speaker') || 
               cell.toString().toLowerCase().includes('sanofi paid speaker') ||
               cell.toString().includes('赛诺菲支付贡献者') ||
               cell.toString().includes('赛诺菲贡献者'))
          )
        }

        // 查找赛诺菲支付劳务金额列
        if (totalSpeakerFeeIndex === -1) {
          totalSpeakerFeeIndex = firstRow.findIndex(
            (cell) => 
              cell && 
              (cell.toString().includes('total speaker fee by Sanofi') || 
               cell.toString().toLowerCase().includes('speaker fee') ||
               cell.toString().includes('劳务金额') ||
               cell.toString().includes('赛诺菲支付劳务'))
          )
        }

        // 查找Event Type列（包括Event Taxonomy 会议种类）
        if (eventTypeIndex === -1) {
          eventTypeIndex = firstRow.findIndex(
            (cell) => 
              cell && 
              (cell.toString().toLowerCase() === 'event type' ||
               cell.toString().toLowerCase().includes('event type (campaign') ||
               cell.toString().toLowerCase().includes('event type (campaign/one time/sub event)') ||
               (cell.toString().toLowerCase().includes('campaign') && 
                cell.toString().toLowerCase().includes('one time') && 
                cell.toString().toLowerCase().includes('sub event')) ||
               cell.toString().includes('Event Taxonomy') ||
               cell.toString().includes('会议种类'))
          )
        }
        
        // 查找会议申请金额含税列
        if (budgetIndex === -1) {
          budgetIndex = firstRow.findIndex(
            (cell) => 
              cell && 
              (cell.toString().includes('会议申请金额含税') || 
               cell.toString().includes('会议申请金额') ||
               cell.toString().includes('申请金额') ||
               cell.toString().toLowerCase().includes('amount'))
          )
        }

        console.log('在第一行数据中找到 - Year 列索引:', yearIndex, 'Month 列索引:', monthIndex, 
          'Region 列索引:', regionIndex, 'Brand/Team 列索引:', brandIndex, 'ESS Name 列索引:', essNameIndex,
          'ESS线下参会索引:', essParticipationIndex, 'ESS线上参会索引:', essOnlineParticipationIndex, 
          '会议取消索引:', cancellationIndex, '差旅成本索引:', travelCostIndex,
          '会议类型索引:', eventTypeIndex, '会议申请金额索引:', budgetIndex,
          '贡献者人数索引:', speakerContractIndex, '赛诺菲支付贡献者人数索引:', sanofiPaidSpeakerIndex,
          '赛诺菲支付劳务金额索引:', totalSpeakerFeeIndex)

        // 如果在第一行找到了，需要调整数据，将第一行作为表头
        if (yearIndex !== -1 || monthIndex !== -1 || regionIndex !== -1 || essNameIndex !== -1 ||
          essParticipationIndex !== -1 || essOnlineParticipationIndex !== -1 || cancellationIndex !== -1 || 
          travelCostIndex !== -1 || eventTypeIndex !== -1 || budgetIndex !== -1 || speakerContractIndex !== -1 ||
          sanofiPaidSpeakerIndex !== -1 || totalSpeakerFeeIndex !== -1) {
          // 提取第一行作为新表头
          excelData.headers = firstRow.map((h) => (h !== undefined && h !== null ? h.toString() : ''))
          // 剩余行作为数据
          excelData.rows = excelData.rows.slice(1)
          console.log('已调整 - 新表头:', excelData.headers)
          console.log('已调整 - 新数据行数:', excelData.rows.length)
        }
      }
    }

    // 如果找不到Event Type列，尝试更广泛的匹配
    if (excelData.eventTypeIndex === -1) {
      console.log('尝试通过更广泛的关键词查找Event Type列');
      // 查找包含"event"、"type"、"活动"等关键词的列，但排除包含"start"和"date"的列
      excelData.eventTypeIndex = excelData.headers.findIndex(
        (header) =>
          header &&
          // 确保真正匹配的是Event Type而不是Event Start Date
          (header.toString().toLowerCase().includes('event type') || 
           (header.toString().toLowerCase().includes('event') &&
            header.toString().toLowerCase().includes('type'))) &&
          // 排除可能是Event Start Date的列
          !header.toString().toLowerCase().includes('start') &&
          !header.toString().toLowerCase().includes('date') &&
          !header.toString().toLowerCase().includes('日期')
      )
      console.log('通过扩展关键词找到的Event Type列索引:', excelData.eventTypeIndex)
      
      // 如果仍找不到，重点检查数据内容是否包含Campaign/One Time/Sub Event
      if (excelData.eventTypeIndex === -1 && excelData.rows.length > 0) {
        console.log('通过检查数据内容寻找Event Type列...');
        
        const eventTypeKeywords = ['campaign', 'one time', 'sub event'];
        const dataMatchScores = [];
        
        // 初始化计数数组
        for (let i = 0; i < excelData.headers.length; i++) {
          // 检查表头名称 - 如果包含"date"或"start"明显是不相关的，分数为-100
          let initialScore = 0;
          const headerText = excelData.headers[i]?.toString().toLowerCase() || '';
          if (headerText.includes('date') || headerText.includes('start')) {
            initialScore = -100;
          }
          dataMatchScores.push({ index: i, score: initialScore, matchCount: 0 });
        }
        
        // 统计每列匹配关键词的次数和分数
        const rowsToCheck = Math.min(excelData.rows.length, 50); // 检查前50行
        for (let rowIndex = 0; rowIndex < rowsToCheck; rowIndex++) {
          const row = excelData.rows[rowIndex];
          for (let colIndex = 0; colIndex < excelData.headers.length; colIndex++) {
            // 如果初始分数为负，跳过检查
            if (dataMatchScores[colIndex].score < 0) continue;
            
            const value = row[colIndex];
            if (value !== undefined && value !== null) {
              const strValue = String(value).toLowerCase();
              
              // 精确匹配 - 这是最强的证据
              if (
                strValue === 'campaign' || 
                strValue === 'one time' || 
                strValue === 'sub event'
              ) {
                dataMatchScores[colIndex].score += 10;
                dataMatchScores[colIndex].matchCount++;
              }
              // 部分匹配 - 可能是包含这些词的短语
              else if (eventTypeKeywords.some(keyword => strValue.includes(keyword))) {
                dataMatchScores[colIndex].score += 3;
                dataMatchScores[colIndex].matchCount++;
              }
              // 负面证据 - 如果包含日期格式，这更可能是日期列
              else if (
                strValue.includes('/') || 
                strValue.includes('-') || 
                strValue.match(/\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?/) ||
                strValue.match(/\d{4}/)  // 年份格式
              ) {
                dataMatchScores[colIndex].score -= 5;
              }
            }
          }
        }
        
        // 排序并找出最高分
        dataMatchScores.sort((a, b) => b.score - a.score);
        
        if (dataMatchScores.length > 0 && dataMatchScores[0].score > 20) {
          excelData.eventTypeIndex = dataMatchScores[0].index;
          console.log('通过数据内容分析找到的可能Event Type列:', excelData.eventTypeIndex,
            '表头:', excelData.headers[excelData.eventTypeIndex],
            '分数:', dataMatchScores[0].score,
            '匹配次数:', dataMatchScores[0].matchCount);
            
          // 记录一些样本数据
          console.log('此列的样本数据:');
          for (let i = 0; i < Math.min(5, excelData.rows.length); i++) {
            console.log(`  行${i+1}: ${excelData.rows[i][excelData.eventTypeIndex]}`);
          }
        } else if (dataMatchScores.length > 0) {
          console.log('未找到足够证据的Event Type列, 最高分:', dataMatchScores[0].score);
        }
      }
    }

    // 更新找到的索引
    excelData.yearIndex = yearIndex
    excelData.monthIndex = monthIndex
    excelData.regionIndex = regionIndex
    excelData.brandIndex = brandIndex
    excelData.essNameIndex = essNameIndex
    excelData.essParticipationIndex = essParticipationIndex
    excelData.essOnlineParticipationIndex = essOnlineParticipationIndex
    excelData.cancellationIndex = cancellationIndex
    excelData.eventTypeIndex = eventTypeIndex
    excelData.travelCostIndex = travelCostIndex
    excelData.budgetIndex = budgetIndex
    excelData.speakerContractIndex = speakerContractIndex
    excelData.sanofiPaidSpeakerIndex = sanofiPaidSpeakerIndex
    excelData.totalSpeakerFeeIndex = totalSpeakerFeeIndex

    console.log('最终列索引 - Year:', yearIndex, 'Month:', monthIndex, 'Region:', regionIndex, 
      'Brand/Team:', brandIndex, 'ESS Name:', essNameIndex,
      'ESS线下参会:', essParticipationIndex, 'ESS线上参会:', essOnlineParticipationIndex, 
      '会议取消:', cancellationIndex, '会议类型:', eventTypeIndex,
      '差旅成本:', travelCostIndex, '会议申请金额:', budgetIndex,
      '贡献者人数:', speakerContractIndex, '赛诺菲支付贡献者人数:', sanofiPaidSpeakerIndex,
      '赛诺菲支付劳务金额:', totalSpeakerFeeIndex)

    // 如果找不到 Month 或 Region 列，尝试查找可能的替代名称或部分匹配
    if (excelData.monthIndex === -1) {
      // 尝试查找替代名称，比如"月份"、"月"等，或者包含"month"的列
      excelData.monthIndex = excelData.headers.findIndex(
        (header) =>
          header &&
          (header.toString().toLowerCase().includes('month') ||
            header.toString().toLowerCase().includes('月') ||
            header.toString().toLowerCase() === 'm')
      )
      console.log('通过替代名称找到的 Month 列索引:', excelData.monthIndex)
    }

    if (excelData.regionIndex === -1) {
      // 尝试查找替代名称，比如"区域"、"地区"等，或者包含"region"的列
      excelData.regionIndex = excelData.headers.findIndex(
        (header) =>
          header &&
          (header.toString().toLowerCase().includes('region') ||
            header.toString().toLowerCase().includes('区域') ||
            header.toString().toLowerCase().includes('地区') ||
            header.toString().toLowerCase() === 'r')
      )
      console.log('通过替代名称找到的 Region 列索引:', excelData.regionIndex)
    }

    // 如果找不到ESS线上参会列，尝试更广泛的匹配策略
    if (excelData.essOnlineParticipationIndex === -1) {
      // 打印所有表头，便于调试
      console.log('尝试查找ESS线上参会列 - 所有表头:', excelData.headers);

      // 尝试通过更广泛的关键词匹配
      excelData.essOnlineParticipationIndex = excelData.headers.findIndex(
        (header) =>
          header &&
          (header.toString().includes('ESS线上') ||
            header.toString().includes('线上参会') ||
            header.toString().includes('线上参加') ||
            header.toString().toLowerCase().includes('participation') ||
            header.toString().toLowerCase().includes('attend') ||
            header.toString().toLowerCase().includes('meeting'))
      )
      console.log('通过扩展关键词找到的 ESS线上参会 列索引:', excelData.essOnlineParticipationIndex)

      // 如果仍然找不到，尝试检查每列的内容，看哪一列可能包含Y/N值
      if (excelData.essOnlineParticipationIndex === -1 && excelData.rows.length > 0) {
        console.log('通过表头未找到ESS线上参会列，尝试通过列值内容识别...');

        // 尝试找到主要包含Y/N值的列
        const rowsToCheck = Math.min(excelData.rows.length, 20); // 检查前20行
        const ynCounts = [];

        // 初始化计数数组
        for (let i = 0; i < excelData.headers.length; i++) {
          ynCounts.push({ index: i, yCount: 0, nCount: 0, otherCount: 0 });
        }

        // 统计每列Y/N值的数量
        for (let rowIndex = 0; rowIndex < rowsToCheck; rowIndex++) {
          const row = excelData.rows[rowIndex];
          for (let colIndex = 0; colIndex < excelData.headers.length; colIndex++) {
            const value = row[colIndex];
            if (value !== undefined && value !== null) {
              const strValue = String(value).trim().toUpperCase();
              if (strValue === 'Y' || strValue === 'YES' || strValue === 'TRUE' || strValue === '1' || strValue === 'T') {
                ynCounts[colIndex].yCount++;
              } else if (strValue === 'N' || strValue === 'NO' || strValue === 'FALSE' || strValue === '0' || strValue === 'F') {
                ynCounts[colIndex].nCount++;
              } else {
                ynCounts[colIndex].otherCount++;
              }
            }
          }
        }

        // 找出Y/N值比例最高的列
        const ynRatios = ynCounts.map(count => {
          const total = count.yCount + count.nCount + count.otherCount;
          const ynRatio = total > 0 ? (count.yCount + count.nCount) / total : 0;
          return { ...count, ynRatio, total };
        });

        // 过滤掉几乎没有值的列
        const validColumns = ynRatios.filter(col => col.total > rowsToCheck * 0.5);

        // 按Y/N值比例排序
        validColumns.sort((a, b) => b.ynRatio - a.ynRatio);

        console.log('列Y/N值分析结果:', validColumns.slice(0, 5)); // 显示排名前5的列

        // 如果找到可能的ESS线上参会列
        if (validColumns.length > 0 && validColumns[0].ynRatio > 0.7) {
          excelData.essOnlineParticipationIndex = validColumns[0].index;
          console.log('通过Y/N值比例识别出的可能ESS线上参会列:', excelData.essOnlineParticipationIndex,
            '表头:', excelData.headers[excelData.essOnlineParticipationIndex]);
        }
      }
    }

    // 如果找不到ESS Name列，尝试更广泛的匹配
    if (excelData.essNameIndex === -1) {
      console.log('尝试通过更广泛的关键词查找ESS Name列');
      // 查找包含"ess"、"name"等关键词的列
      excelData.essNameIndex = excelData.headers.findIndex(
        (header) =>
          header &&
          (header.toString().toLowerCase().includes('ess') ||
           header.toString().toLowerCase().includes('name') ||
           header.toString().toLowerCase().includes('人员') ||
           header.toString().toLowerCase().includes('人名'))
      )
      console.log('通过扩展关键词找到的ESS Name列索引:', excelData.essNameIndex)
    }

    // 如果找不到会议取消列，尝试更广泛的匹配
    if (excelData.cancellationIndex === -1) {
      console.log('尝试通过更广泛的关键词查找会议取消列');
      // 查找包含"取消"、"cancel"、"status"等关键词的列
      excelData.cancellationIndex = excelData.headers.findIndex(
        (header) =>
          header &&
          (header.toString().includes('状态') ||
           header.toString().toLowerCase().includes('status') ||
           header.toString().toLowerCase().includes('state'))
      )
      console.log('通过扩展关键词找到的会议取消列索引:', excelData.cancellationIndex)
      
      // 如果仍然找不到，尝试遍历数据行查找包含"R"值的列
      if (excelData.cancellationIndex === -1 && excelData.rows.length > 0) {
        console.log('尝试查找包含"R"值的列作为可能的会议取消列');
        
        // 遍历所有列，统计每列包含"R"值的行数
        const columnCount = excelData.headers.length;
        const rValueCounts = new Array(columnCount).fill(0);
        
        // 检查前20行数据
        const rowsToCheck = Math.min(excelData.rows.length, 20);
        for (let rowIndex = 0; rowIndex < rowsToCheck; rowIndex++) {
          const row = excelData.rows[rowIndex];
          for (let colIndex = 0; colIndex < columnCount; colIndex++) {
            const value = row[colIndex];
            if (value !== undefined && value !== null) {
              const strValue = String(value).trim().toUpperCase();
              if (strValue === 'R') {
                rValueCounts[colIndex]++;
              }
            }
          }
        }
        
        // 找出包含"R"值最多的列
        let maxRCount = 0;
        let maxRColumnIndex = -1;
        
        rValueCounts.forEach((count, index) => {
          if (count > maxRCount) {
            maxRCount = count;
            maxRColumnIndex = index;
          }
        });
        
        // 如果找到至少有一个"R"值的列
        if (maxRCount > 0) {
          excelData.cancellationIndex = maxRColumnIndex;
          console.log('通过"R"值识别出的可能会议取消列:', excelData.cancellationIndex,
            '表头:', excelData.headers[excelData.cancellationIndex]);
        }
      }
    }

    // 如果上述方法仍找不到，尝试手动输出所有表头，帮助调试
    if (excelData.monthIndex === -1 || excelData.regionIndex === -1 || excelData.essNameIndex === -1 || excelData.essParticipationIndex === -1 || excelData.essOnlineParticipationIndex === -1 || excelData.cancellationIndex === -1) {
      console.log('尝试手动检查可能的列:')
      excelData.headers.forEach((header, index) => {
        if (header) {
          console.log(`列 ${index}:`, header, `(小写: ${header.toString().toLowerCase()})`)
        }
      })

      // 如果还是找不到，输出第一行数据的内容供调试
      if (excelData.rows.length > 0) {
        console.log('第一行数据内容:')
        excelData.rows[0].forEach((cell, index) => {
          if (cell !== undefined && cell !== null) {
            console.log(`列 ${index}:`, cell, `(小写: ${cell.toString().toLowerCase()})`)
          }
        })
      }
    }

    // 如果找到了相应的列，打印一些样本数据用于验证
    if (excelData.essOnlineParticipationIndex !== -1 && excelData.rows.length > 0) {
      console.log('ESS线上参会列样本数据 (前5行):');
      for (let i = 0; i < Math.min(excelData.rows.length, 5); i++) {
        const value = excelData.rows[i][excelData.essOnlineParticipationIndex];
        console.log(`行 ${i + 1}:`, value, typeof value);
      }
    }

    // 如果找到了相应的列，提取唯一值
    updateMonthAndRegionLists()
    
    // 更新Brand/Team列表
    updateBrandList()
    
    // 更新ESS Name列表
    updateEssNameList()
    
    // 更新Event Type列表
    updateEventTypeList()
    
    // 初始化会议取消状态列表
    excelData.cancellationStatus = ["已取消", "未取消"];
  }

  /**
   * 切换到指定工作表
   * @param {String} sheetName - 工作表名称
   * @param {File} file - Excel 文件
   * @param {Function} onColumnsFound - 找到列时的回调函数
   * @param {String} viewType - 视图类型
   */
  const switchSheet = (sheetName, file, onColumnsFound, viewType = 'data-visual') => {
    console.log('useExcelParser - switchSheet: 开始切换工作表:', sheetName, '视图类型:', viewType);
    isLoading.value = true

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        console.log('useExcelParser - switchSheet: 文件读取完成，开始解析Excel');
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        console.log('useExcelParser - switchSheet: Excel解析完成，可用工作表:', workbook.SheetNames);

        // 自动模式或工作表不存在的情况
        if (sheetName === 'auto' || !workbook.SheetNames.includes(sheetName)) {
          if (sheetName !== 'auto') {
            console.warn(`useExcelParser - switchSheet: 工作表 "${sheetName}" 不存在，将使用自动选择模式`);
          } else {
            console.log('useExcelParser - switchSheet: 使用自动选择模式');
          }
          
          // 使用自动选择
          excelData.activeSheet = selectSheetByViewType(workbook, viewType);
          console.log('useExcelParser - switchSheet: 自动选择的工作表:', excelData.activeSheet);
        } else {
          // 工作表存在的情况
          console.log(`useExcelParser - switchSheet: 使用指定的工作表: "${sheetName}"`);
          excelData.activeSheet = sheetName;
        }

        // 处理工作表数据
        console.log('useExcelParser - switchSheet: 开始处理工作表数据:', excelData.activeSheet);
        processSheet(workbook, excelData.activeSheet);

        // 重新查找和初始化列
        console.log('useExcelParser - switchSheet: 开始查找数据列');
        findDataColumns();

        // 调用回调函数
        if (onColumnsFound) {
          const columns = {
            monthIndex: excelData.monthIndex,
            regionIndex: excelData.regionIndex,
            brandIndex: excelData.brandIndex
          };
          console.log('useExcelParser - switchSheet: 调用列映射回调函数, 列映射:', columns);
          onColumnsFound(columns);
        }

        isLoading.value = false;
        console.log('useExcelParser - switchSheet: 工作表切换完成');
      } catch (error) {
        console.error('useExcelParser - switchSheet: 切换工作表时出错:', error)
        errorMessage.value = '切换工作表时出错'
        isLoading.value = false
      }
    }

    reader.onerror = (error) => {
      console.error('useExcelParser - switchSheet: 读取文件时出错:', error)
      errorMessage.value = '读取文件时出错'
      isLoading.value = false
    }

    console.log('useExcelParser - switchSheet: 开始读取文件');
    reader.readAsArrayBuffer(file)
  }

  /**
   * 更新月份和区域列表
   */
  const updateMonthAndRegionLists = () => {
    if (excelData.rows.length === 0) return

    if (excelData.monthIndex !== -1) {
      excelData.months = [
        ...new Set(
          excelData.rows
            .map((row) => row[excelData.monthIndex])
            .filter((month) => month !== undefined && month !== null)
        ),
      ].sort()
      console.log('月份列表:', excelData.months)
    }

    if (excelData.regionIndex !== -1) {
      excelData.regions = [
        ...new Set(
          excelData.rows
            .map((row) => row[excelData.regionIndex])
            .filter((region) => region !== undefined && region !== null)
        ),
      ].sort()
      console.log('区域列表:', excelData.regions)
    }
  }

  /**
   * 更新Brand/Team列表
   */
  const updateBrandList = () => {
    if (excelData.rows.length === 0 || excelData.brandIndex === -1) return

    // 提取所有非空的Brand/Team值
    excelData.brands = [
      ...new Set(
        excelData.rows
          .map((row) => row[excelData.brandIndex])
          .filter((brand) => brand !== undefined && brand !== null && brand.toString().trim() !== '')
          .map(brand => brand.toString().trim())
      ),
    ].sort()

    console.log('Brand/Team列表:', excelData.brands)
  }

  /**
   * 更新ESS Name列表
   */
  const updateEssNameList = () => {
    if (excelData.rows.length === 0 || excelData.essNameIndex === -1) return

    // 提取所有非空的ESS Name值
    excelData.essNames = [
      ...new Set(
        excelData.rows
          .map((row) => row[excelData.essNameIndex])
          .filter((name) => name !== undefined && name !== null && name.toString().trim() !== '')
          .map(name => name.toString().trim())
      ),
    ].sort()

    console.log('ESS Name列表:', excelData.essNames)
  }

  /**
   * 更新Event Type列表
   */
  const updateEventTypeList = () => {
    if (excelData.rows.length === 0 || excelData.eventTypeIndex === -1) return

    // 提取所有非空的Event Type值
    excelData.eventTypes = [
      ...new Set(
        excelData.rows
          .map((row) => row[excelData.eventTypeIndex])
          .filter((eventType) => eventType !== undefined && eventType !== null && eventType.toString().trim() !== '')
          .map(eventType => eventType.toString().trim())
      ),
    ].sort()

    console.log('Event Type列表:', excelData.eventTypes)
  }

  /**
   * 更新列索引
   * @param {Object} columns - 包含各种列索引的对象
   */
  const updateColumnIndices = (columns) => {
    if (columns.yearIndex !== undefined) {
      excelData.yearIndex = columns.yearIndex
    }
    if (columns.monthIndex !== undefined) {
      excelData.monthIndex = columns.monthIndex
    }
    if (columns.regionIndex !== undefined) {
      excelData.regionIndex = columns.regionIndex
    }
    if (columns.brandIndex !== undefined) {
      excelData.brandIndex = columns.brandIndex
    }
    if (columns.essParticipationIndex !== undefined) {
      excelData.essParticipationIndex = columns.essParticipationIndex
    }
    if (columns.essOnlineParticipationIndex !== undefined) {
      excelData.essOnlineParticipationIndex = columns.essOnlineParticipationIndex
    }
    if (columns.essNameIndex !== undefined) {
      excelData.essNameIndex = columns.essNameIndex
    }
    if (columns.cancellationIndex !== undefined) {
      excelData.cancellationIndex = columns.cancellationIndex
    }
    if (columns.eventTypeIndex !== undefined) {
      excelData.eventTypeIndex = columns.eventTypeIndex
    }
    if (columns.travelCostIndex !== undefined) {
      excelData.travelCostIndex = columns.travelCostIndex
    }
    if (columns.budgetIndex !== undefined) {
      excelData.budgetIndex = columns.budgetIndex
    }
    if (columns.speakerContractIndex !== undefined) {
      excelData.speakerContractIndex = columns.speakerContractIndex
    }
    if (columns.sanofiPaidSpeakerIndex !== undefined) {
      excelData.sanofiPaidSpeakerIndex = columns.sanofiPaidSpeakerIndex
    }
    if (columns.totalSpeakerFeeIndex !== undefined) {
      excelData.totalSpeakerFeeIndex = columns.totalSpeakerFeeIndex
    }
    
    console.log('列索引已更新:', columns)
    
    // 更新月份和地区列表
    updateMonthAndRegionLists()
    
    // 更新品牌列表
    updateBrandList()
    
    // 更新ESS Name列表
    updateEssNameList()
    
    // 更新Event Type列表
    updateEventTypeList()
  }

  // 返回公共接口
  return {
    isLoading,
    errorMessage,
    fileName,
    excelData,
    parseExcel,
    switchSheet,
    updateColumnIndices,
    findMatchingSheet,
    selectSheetByViewType
  }
}
