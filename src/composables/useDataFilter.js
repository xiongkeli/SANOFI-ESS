import { ref, reactive, computed } from 'vue'

/**
 * 数据筛选组合式函数
 * 处理数据筛选和统计相关的逻辑
 * @param {Object} excelDataRef - 引用的 Excel 数据对象
 */
export function useDataFilter(excelDataRef) {
  // 筛选条件
  const filters = reactive({
    selectedYear: 'all',  // 添加年份筛选
    selectedMonth: 'all',
    selectedBrand: 'all',
    selectedCancellationStatus: 'all', // 会议取消状态筛选: 'all', '已取消', '未取消'
  })

  // 月份排序顺序 (自定义)
  const monthOrder = {
    'May': 1,
    'Jun': 2,
    'Jul': 3,
    'Aug': 4,
    'Sep': 5,
    'Oct': 6,
    'Nov': 7,
    'Dec': 8,
    'Jan': 9,
    'Feb': 10
  }

  /**
   * 是否已完成列映射
   */
  const isColumnMappingComplete = computed(() => {
    return excelDataRef.monthIndex !== -1 && excelDataRef.regionIndex !== -1
  })

  /**
   * 处理数据过滤的计算方法
   */
  const filteredRows = computed(() => {
    if (!excelDataRef.rows || excelDataRef.rows.length === 0) {
      console.log('筛选数据: 无原始数据');
      return []
    }

    // 记录筛选前的行数
    const originalRowCount = excelDataRef.rows.length;
    
    // 记录筛选条件
    console.log('当前筛选条件:', {
      year: filters.selectedYear,
      month: filters.selectedMonth,
      brand: filters.selectedBrand,
      cancellation: filters.selectedCancellationStatus
    });

    // 进行筛选
    const result = excelDataRef.rows.filter((row) => {
      // 年份筛选逻辑 - 如果选择了特定年份，过滤数据
      const yearMatch =
        !filters.selectedYear ||
        filters.selectedYear === 'all' ||
        (excelDataRef.yearIndex !== -1 &&
          row[excelDataRef.yearIndex]?.toString() === filters.selectedYear) ||
        // 如果月份包含年份信息（如Dec 2024），也进行匹配
        (excelDataRef.monthIndex !== -1 &&
          row[excelDataRef.monthIndex]?.toString().includes(filters.selectedYear));

      // 如果没有选择月份，或者选择了"全部"，则不筛选月份
      const monthMatch =
        !filters.selectedMonth ||
        filters.selectedMonth === 'all' ||
        (excelDataRef.monthIndex !== -1 &&
          (Array.isArray(filters.selectedMonth)
            ? filters.selectedMonth.includes(row[excelDataRef.monthIndex]?.toString())
            : row[excelDataRef.monthIndex]?.toString() === filters.selectedMonth));

      // 如果没有选择品牌/团队，或者选择了"全部"，则不筛选品牌/团队
      const brandMatch =
        !filters.selectedBrand ||
        filters.selectedBrand === 'all' ||
        (excelDataRef.brandIndex !== -1 &&
          row[excelDataRef.brandIndex]?.toString() === filters.selectedBrand);
          
      // 如果没有选择会议取消状态，或者选择了"全部"，则不筛选会议取消状态  
      let cancellationMatch = true;
      if (filters.selectedCancellationStatus !== 'all' && excelDataRef.cancellationIndex !== -1) {
        const cancellationValue = row[excelDataRef.cancellationIndex];
        
        if (filters.selectedCancellationStatus === '已取消') {
          // "R"表示已取消
          cancellationMatch = cancellationValue === 'R' || cancellationValue === 'r';
        } else if (filters.selectedCancellationStatus === '未取消') {
          // 空或非"R"表示未取消
          cancellationMatch = !cancellationValue || (cancellationValue !== 'R' && cancellationValue !== 'r');
        }
      }

      return yearMatch && monthMatch && brandMatch && cancellationMatch;
    });
    
    // 记录筛选结果数量
    console.log(`筛选结果: 从 ${originalRowCount} 行中筛选出 ${result.length} 行`);
    
    // 检查是否有月份为Dec和取消状态为已取消的记录
    if (filters.selectedMonth === 'Dec' && filters.selectedCancellationStatus === '已取消') {
      console.log('特殊检查 - Dec月已取消会议:');
      let decCancelledCount = 0;
      
      excelDataRef.rows.forEach((row, index) => {
        const isDecMonth = excelDataRef.monthIndex !== -1 && 
                          row[excelDataRef.monthIndex]?.toString() === 'Dec';
        
        const isCancelled = excelDataRef.cancellationIndex !== -1 && 
                           (row[excelDataRef.cancellationIndex] === 'R' || 
                            row[excelDataRef.cancellationIndex] === 'r');
        
        if (isDecMonth && isCancelled) {
          decCancelledCount++;
          console.log(`Dec已取消会议 - 行 ${index}:`, {
            month: row[excelDataRef.monthIndex],
            cancellation: row[excelDataRef.cancellationIndex],
            region: row[excelDataRef.regionIndex]
          });
        }
      });
      
      console.log(`Dec月已取消会议总数: ${decCancelledCount}`);
    }
    
    return result;
  })

  /**
   * 提取品牌/团队列表
   */
  const brands = computed(() => {
    if (
      !excelDataRef.rows || 
      excelDataRef.rows.length === 0 || 
      excelDataRef.brandIndex === -1
    ) {
      return []
    }

    // 创建一个Set来存储唯一的品牌/团队名称
    const brandSet = new Set()

    // 遍历所有行，收集品牌/团队值
    excelDataRef.rows.forEach((row) => {
      const brand = row[excelDataRef.brandIndex]?.toString()
      if (brand && brand.trim() !== '') {
        brandSet.add(brand.trim())
      }
    })

    // 将Set转换为排序后的数组
    return Array.from(brandSet).sort()
  })

  /**
   * 生成区域统计
   */
  const regionStats = computed(() => {
    const stats = {
      regions: {},
      total: 0,
    }

    if (
      !filteredRows.value ||
      filteredRows.value.length === 0 ||
      excelDataRef.regionIndex === -1
    ) {
      // 记录当前的筛选条件，帮助调试
      console.log('区域统计返回空结果:', {
        hasFilteredRows: !!filteredRows.value,
        filteredRowsLength: filteredRows.value?.length || 0,
        regionIndex: excelDataRef.regionIndex,
        currentFilters: {
          month: filters.selectedMonth,
          brand: filters.selectedBrand,
          cancellation: filters.selectedCancellationStatus
        }
      });
      
      // 如果是特定月份和会议取消状态组合，检查原始数据中是否实际存在
      if (filters.selectedMonth !== 'all' && filters.selectedCancellationStatus !== 'all') {
        let monthCount = 0, cancellationCount = 0, combinedCount = 0;
        
        excelDataRef.rows.forEach(row => {
          const matchesMonth = excelDataRef.monthIndex !== -1 && 
                            row[excelDataRef.monthIndex]?.toString() === filters.selectedMonth;
          
          const matchesCancellation = excelDataRef.cancellationIndex !== -1;
          let cancellationMatch = false;
          
          if (matchesCancellation) {
            const cancellationValue = row[excelDataRef.cancellationIndex];
            if (filters.selectedCancellationStatus === '已取消') {
              cancellationMatch = cancellationValue === 'R' || cancellationValue === 'r';
            } else if (filters.selectedCancellationStatus === '未取消') {
              cancellationMatch = !cancellationValue || (cancellationValue !== 'R' && cancellationValue !== 'r');
            }
          }
          
          if (matchesMonth) monthCount++;
          if (cancellationMatch) cancellationCount++;
          if (matchesMonth && cancellationMatch) combinedCount++;
        });
        
        console.log(`数据检查: 月份=${filters.selectedMonth}的记录有${monthCount}条, ` +
                   `状态=${filters.selectedCancellationStatus}的记录有${cancellationCount}条, ` +
                   `两者同时满足的有${combinedCount}条`);
      }
      
      return stats;
    }

    // 统计每个区域的数量
    filteredRows.value.forEach((row) => {
      const region = row[excelDataRef.regionIndex]?.toString() || '未知';
      if (!stats.regions[region]) {
        stats.regions[region] = 0;
      }
      stats.regions[region]++;
      stats.total++;
    })

    // 计算百分比
    Object.keys(stats.regions).forEach((region) => {
      stats.regions[region] = {
        count: stats.regions[region],
        percentage: Math.round((stats.regions[region] / stats.total) * 100),
      }
    })

    console.log(`区域统计: 找到${stats.total}条记录，分布在${Object.keys(stats.regions).length}个区域`);
    return stats
  })

  /**
   * ESS参会统计
   */
  const essParticipationStats = computed(() => {
    const stats = {
      yes: 0,
      no: 0,
      unknown: 0,
      total: 0,
      yesPercentage: 0,
      noPercentage: 0,
      unknownPercentage: 0
    }

    if (
      !filteredRows.value ||
      filteredRows.value.length === 0 ||
      excelDataRef.essParticipationIndex === -1
    ) {
      console.log('无法计算ESS参会统计: ',
        !filteredRows.value ? '无过滤数据' : '',
        filteredRows.value?.length === 0 ? '过滤数据为空' : '',
        excelDataRef.essParticipationIndex === -1 ? 'ESS参会列索引无效' : '')
      console.log('行数: ', filteredRows.value?.length, 'ESS参会列索引: ', excelDataRef.essParticipationIndex)
      return stats
    }

    // 用于调试的样本值集合
    const sampleValues = new Set();
    const unknownValues = [];

    // 统计ESS参会情况
    filteredRows.value.forEach((row) => {
      stats.total++;

      const value = row[excelDataRef.essParticipationIndex];

      // 收集样本值用于调试
      if (sampleValues.size < 10 && value !== undefined && value !== null) {
        sampleValues.add(value.toString());
      }

      // 处理可能的空值情况
      if (value === undefined || value === null || value === '') {
        stats.unknown++;
        return;
      }

      // 将值标准化为字符串并去除空格，转为大写以进行比较
      const normalizedValue = value.toString().trim().toUpperCase();

      // 扩展匹配条件，包括各种"是"的表示
      if (
        normalizedValue === 'Y' ||
        normalizedValue === 'YES' ||
        normalizedValue === '是' ||
        normalizedValue === 'TRUE' ||
        normalizedValue === '1' ||
        normalizedValue === 'T'
      ) {
        stats.yes++;
      }
      // 扩展匹配条件，包括各种"否"的表示
      else if (
        normalizedValue === 'N' ||
        normalizedValue === 'NO' ||
        normalizedValue === '否' ||
        normalizedValue === 'FALSE' ||
        normalizedValue === '0' ||
        normalizedValue === 'F'
      ) {
        stats.no++;
      }
      // 记录未识别的值
      else {
        stats.unknown++;
        if (unknownValues.length < 10) {
          unknownValues.push(normalizedValue);
        }
      }
    })

    // 输出样本值和未识别值，用于调试
    console.log('ESS参会数据样本值 (前10个不同值): ', Array.from(sampleValues));
    if (unknownValues.length > 0) {
      console.log('未识别的ESS参会值 (前10个): ', unknownValues);
    }

    // 计算百分比
    if (stats.total > 0) {
      stats.yesPercentage = Math.round((stats.yes / stats.total) * 100);
      stats.noPercentage = Math.round((stats.no / stats.total) * 100);
      stats.unknownPercentage = Math.round((stats.unknown / stats.total) * 100);
    }

    console.log('ESS参会统计结果: ', stats);
    return stats;
  })

  /**
   * 按月份统计ESS参会情况
   */
  const monthlyEssStats = computed(() => {
    const stats = [];

    if (
      !filteredRows.value ||
      filteredRows.value.length === 0 ||
      excelDataRef.monthIndex === -1 ||
      excelDataRef.essParticipationIndex === -1
    ) {
      console.log('无法计算月度ESS参会统计: ',
        !filteredRows.value ? '无过滤数据' : '',
        filteredRows.value?.length === 0 ? '过滤数据为空' : '',
        excelDataRef.monthIndex === -1 ? '月份列索引无效' : '',
        excelDataRef.essParticipationIndex === -1 ? 'ESS参会列索引无效' : '')
      return stats;
    }

    // 按月份分组统计
    const monthMap = new Map();

    filteredRows.value.forEach((row) => {
      const month = row[excelDataRef.monthIndex]?.toString() || '未知';
      const essValue = row[excelDataRef.essParticipationIndex];

      if (!monthMap.has(month)) {
        monthMap.set(month, { yes: 0, no: 0, unknown: 0, total: 0 });
      }

      const monthStat = monthMap.get(month);
      monthStat.total++;

      // 处理可能的空值情况
      if (essValue === undefined || essValue === null || essValue === '') {
        monthStat.unknown++;
        return;
      }

      // 标准化值
      const normalizedValue = essValue.toString().trim().toUpperCase();

      // 扩展匹配条件
      if (
        normalizedValue === 'Y' ||
        normalizedValue === 'YES' ||
        normalizedValue === '是' ||
        normalizedValue === 'TRUE' ||
        normalizedValue === '1' ||
        normalizedValue === 'T'
      ) {
        monthStat.yes++;
      }
      else if (
        normalizedValue === 'N' ||
        normalizedValue === 'NO' ||
        normalizedValue === '否' ||
        normalizedValue === 'FALSE' ||
        normalizedValue === '0' ||
        normalizedValue === 'F'
      ) {
        monthStat.no++;
      }
      else {
        monthStat.unknown++;
      }
    });

    // 转换为数组格式
    monthMap.forEach((value, key) => {
      stats.push({
        month: key,
        yes: value.yes,
        no: value.no,
        unknown: value.unknown,
        total: value.total,
        yesPercentage: value.total > 0 ? Math.round((value.yes / value.total) * 100) : 0,
        noPercentage: value.total > 0 ? Math.round((value.no / value.total) * 100) : 0,
      });
    });

    console.log('月度ESS参会统计结果: ', stats);
    return stats;
  })

  /**
   * 会议取消统计
   */
  const cancellationStats = computed(() => {
    const stats = {
      cancelled: 0,
      notCancelled: 0,
      total: 0,
      cancelledPercentage: 0,
      notCancelledPercentage: 0
    }

    if (
      !filteredRows.value ||
      filteredRows.value.length === 0 ||
      excelDataRef.cancellationIndex === -1
    ) {
      console.log('无法计算会议取消统计: ',
        !filteredRows.value ? '无过滤数据' : '',
        filteredRows.value?.length === 0 ? '过滤数据为空' : '',
        excelDataRef.cancellationIndex === -1 ? '会议取消列索引无效' : '')
      return stats
    }

    // 统计会议取消情况
    filteredRows.value.forEach((row) => {
      stats.total++
      
      const value = row[excelDataRef.cancellationIndex]
      if (value === 'R' || value === 'r') {
        stats.cancelled++
      } else {
        stats.notCancelled++
      }
    })

    // 计算百分比
    if (stats.total > 0) {
      stats.cancelledPercentage = Math.round((stats.cancelled / stats.total) * 100)
      stats.notCancelledPercentage = Math.round((stats.notCancelled / stats.total) * 100)
    }

    console.log('会议取消统计结果: ', stats)
    return stats
  })

  /**
   * Event Type统计
   */
  const eventTypeStats = computed(() => {
    const stats = {
      types: {},
      total: 0,
    }

    if (
      !filteredRows.value ||
      filteredRows.value.length === 0 ||
      excelDataRef.eventTypeIndex === -1
    ) {
      console.log('无法计算Event Type统计: ',
        !filteredRows.value ? '无过滤数据' : '',
        filteredRows.value?.length === 0 ? '过滤数据为空' : '',
        excelDataRef.eventTypeIndex === -1 ? 'Event Type列索引无效' : '')
      return stats
    }

    // 统计每种Event Type的数量
    filteredRows.value.forEach((row) => {
      const eventType = row[excelDataRef.eventTypeIndex]?.toString() || '未知';
      if (!stats.types[eventType]) {
        stats.types[eventType] = 0;
      }
      stats.types[eventType]++;
      stats.total++;
    })

    // 计算百分比
    Object.keys(stats.types).forEach((type) => {
      stats.types[type] = {
        count: stats.types[type],
        percentage: Math.round((stats.types[type] / stats.total) * 100),
      }
    })

    console.log(`Event Type统计: 找到${stats.total}条记录，分布在${Object.keys(stats.types).length}种类型`);
    return stats
  })

  /**
   * ESS人员参会情况统计
   */
  const essNameStats = computed(() => {
    const stats = {}

    if (
      !filteredRows.value ||
      filteredRows.value.length === 0 ||
      excelDataRef.essNameIndex === -1 ||
      (excelDataRef.essParticipationIndex === -1 && excelDataRef.essOnlineParticipationIndex === -1)
    ) {
      console.log('无法计算ESS人员参会统计: ',
        !filteredRows.value ? '无过滤数据' : '',
        filteredRows.value?.length === 0 ? '过滤数据为空' : '',
        excelDataRef.essNameIndex === -1 ? 'ESS Name列索引无效' : '',
        excelDataRef.essParticipationIndex === -1 ? 'ESS线下参会列索引无效' : '',
        excelDataRef.essOnlineParticipationIndex === -1 ? 'ESS线上参会列索引无效' : '')
      return stats
    }

    // 初始化统计对象
    const essNameSet = new Set()
    
    // 收集所有ESS人员名称
    filteredRows.value.forEach(row => {
      const essName = row[excelDataRef.essNameIndex]
      if (essName && essName.toString().trim() !== '') {
        essNameSet.add(essName.toString().trim())
      }
    })
    
    // 初始化每个ESS人员的统计数据
    Array.from(essNameSet).forEach(name => {
      stats[name] = {
        name,
        offlineYes: 0, // 线下参会需要的数量
        onlineNo: 0,   // 线上参会不需要的数量
        total: 0       // 总会议数
      }
    })
    
    // 统计每个ESS人员的线下参会和线上参会情况
    filteredRows.value.forEach(row => {
      const essName = row[excelDataRef.essNameIndex]
      if (!essName || essName.toString().trim() === '') return
      
      const name = essName.toString().trim()
      stats[name].total++
      
      // 统计线下参会（Y表示线下会议）
      if (excelDataRef.essParticipationIndex !== -1) {
        const offlineValue = row[excelDataRef.essParticipationIndex]
        if (offlineValue !== undefined && offlineValue !== null) {
          const normalizedValue = offlineValue.toString().trim().toUpperCase()
          if (normalizedValue === 'Y' || normalizedValue === 'YES' || normalizedValue === '是' || normalizedValue === 'TRUE' || normalizedValue === '1') {
            stats[name].offlineYes++
          }
        }
      }
      
      // 统计线上参会（N表示线上会议）
      if (excelDataRef.essOnlineParticipationIndex !== -1) {
        const onlineValue = row[excelDataRef.essOnlineParticipationIndex]
        if (onlineValue !== undefined && onlineValue !== null) {
          const normalizedValue = onlineValue.toString().trim().toUpperCase()
          if (normalizedValue === 'N' || normalizedValue === 'NO' || normalizedValue === '否' || normalizedValue === 'FALSE' || normalizedValue === '0') {
            stats[name].onlineNo++
          }
        }
      }
    })
    
    // 转换为数组格式，并按线下参会数量降序排序
    const resultArray = Object.values(stats).sort((a, b) => {
      // 首先按线下参会数量排序
      const offlineDiff = b.offlineYes - a.offlineYes
      if (offlineDiff !== 0) return offlineDiff
      
      // 其次按线上不参会数量排序
      const onlineDiff = b.onlineNo - a.onlineNo
      if (onlineDiff !== 0) return onlineDiff
      
      // 最后按总数排序
      return b.total - a.total
    })
    
    console.log(`ESS人员参会统计: 共 ${resultArray.length} 名人员`);
    return resultArray;
  })

  /**
   * 提取月份列表并按照指定顺序排序
   */
  const months = computed(() => {
    if (
      !excelDataRef.rows || 
      excelDataRef.rows.length === 0 || 
      excelDataRef.monthIndex === -1
    ) {
      return []
    }

    // 创建一个Set来存储唯一的月份
    const monthSet = new Set()

    // 遍历所有行，收集月份值
    excelDataRef.rows.forEach((row) => {
      const month = row[excelDataRef.monthIndex]?.toString()
      if (month && month.trim() !== '') {
        monthSet.add(month.trim())
      }
    })

    // 将Set转换为数组
    const monthArray = Array.from(monthSet)
    
    // 按照自定义顺序排序月份
    monthArray.sort((a, b) => {
      // 如果月份在预定义顺序中
      if (monthOrder[a] && monthOrder[b]) {
        return monthOrder[a] - monthOrder[b]
      } 
      // 如果只有a在预定义顺序中
      else if (monthOrder[a]) {
        return -1
      } 
      // 如果只有b在预定义顺序中
      else if (monthOrder[b]) {
        return 1
      } 
      // 如果都不在预定义顺序中，按字母排序
      else {
        return a.localeCompare(b)
      }
    })
    
    console.log('排序后的月份列表:', monthArray)
    return monthArray
  })

  /**
   * 提取年份列表
   */
  const years = computed(() => {
    // 检查是否有Year列
    if (excelDataRef.yearIndex !== -1 && excelDataRef.rows && excelDataRef.rows.length > 0) {
      // 创建一个Set来存储唯一的年份
      const yearSet = new Set();
      
      // 遍历所有行，收集年份值
      excelDataRef.rows.forEach((row) => {
        const year = row[excelDataRef.yearIndex]?.toString();
        if (year && year.trim() !== '') {
          yearSet.add(year.trim());
        }
      });
      
      // 将Set转换为排序后的数组
      return Array.from(yearSet).sort();
    } else {
      // 如果没有专门的Year列，尝试从月份中提取年份信息
      if (excelDataRef.monthIndex !== -1 && excelDataRef.rows && excelDataRef.rows.length > 0) {
        const yearSet = new Set();
        
        // 遍历所有行，从月份中提取年份信息
        excelDataRef.rows.forEach((row) => {
          const month = row[excelDataRef.monthIndex]?.toString();
          if (month && month.includes(' ')) {
            // 尝试提取格式如 "Dec 2024" 中的年份部分
            const parts = month.split(' ');
            if (parts.length > 1) {
              const yearPart = parts[parts.length - 1].trim();
              // 检查是否为4位数字年份
              if (/^\d{4}$/.test(yearPart)) {
                yearSet.add(yearPart);
              }
            }
          }
        });
        
        if (yearSet.size > 0) {
          return Array.from(yearSet).sort();
        }
      }
      
      // 如果无法从数据中提取年份，返回默认年份
      return ["2024", "2025"];
    }
  });

  /**
   * 更新月份筛选条件
   * @param {string} month - 月份值
   */
  const updateMonthFilter = (month) => {
    filters.selectedMonth = month
    
    // 如果是首次加载，记录加载完成
    if (!tabStateCache.isInitialized) {
      tabStateCache.isInitialized = true
    }
    
    console.log('月份筛选更新为:', month)
  }

  /**
   * 更新品牌/团队筛选条件
   * @param {string} brand - 品牌/团队值
   */
  const updateBrandFilter = (brand) => {
    filters.selectedBrand = brand
  }

  /**
   * 更新会议取消状态筛选条件
   * @param {string} status - 会议取消状态值：'all', '已取消', '未取消'
   */
  const updateCancellationFilter = (status) => {
    filters.selectedCancellationStatus = status
  }

  /**
   * 更新年份筛选条件
   * @param {string} year - 年份值
   */
  const updateYearFilter = (year) => {
    filters.selectedYear = year;
  };

  /**
   * 重置所有筛选条件
   */
  const resetFilters = () => {
    filters.selectedYear = 'all';
    filters.selectedMonth = 'all';
    filters.selectedBrand = 'all';
    filters.selectedCancellationStatus = 'all';
  }

  // 返回公开的状态和方法
  return {
    filters,
    isColumnMappingComplete,
    filteredRows,
    regionStats,
    essParticipationStats,
    monthlyEssStats,
    cancellationStats,
    eventTypeStats,
    essNameStats,
    brands,
    months,
    years,
    updateYearFilter,
    updateMonthFilter,
    updateBrandFilter,
    updateCancellationFilter,
    resetFilters
  }
}
