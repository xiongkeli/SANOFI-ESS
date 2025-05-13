import { reactive } from 'vue'

/**
 * 绩效计算组合式函数
 * 处理ESS人员的绩效计算逻辑
 */
export function usePerformanceCalculation() {
  /**
   * 根据线上场次计算分数
   * @param {number} onlineMeetings - 线上场次数量
   * @returns {number} 分数
   */
  const calculateOnlineScore = (onlineMeetings) => {
    if (onlineMeetings >= 30 && onlineMeetings <= 40) return 4
    if (onlineMeetings >= 27 && onlineMeetings <= 29) return 3
    if (onlineMeetings >= 24 && onlineMeetings <= 26) return 2.2
    if (onlineMeetings >= 21 && onlineMeetings <= 23) return 1.4
    if (onlineMeetings >= 18 && onlineMeetings <= 20) return 0.8
    return 0
  }

  /**
   * 根据线下场次计算分数
   * @param {number} offlineMeetings - 线下场次数量
   * @returns {number} 分数
   */
  const calculateOfflineScore = (offlineMeetings) => {
    if (offlineMeetings >= 8) return 4
    if (offlineMeetings >= 5 && offlineMeetings <= 8) return 2
    return 0
  }

  /**
   * 计算ESS人员的绩效百分比
   * @param {number} offlineMeetings - 线下场次数量
   * @param {number} onlineMeetings - 线上场次数量
   * @returns {object} 包含分数和百分比的对象
   */
  const calculatePerformance = (offlineMeetings, onlineMeetings) => {
    // 确保输入是数字
    const offline = Number(offlineMeetings) || 0
    const online = Number(onlineMeetings) || 0
    
    // 计算分数
    const offlineScore = calculateOfflineScore(offline)
    const onlineScore = calculateOnlineScore(online)
    const totalScore = offlineScore + onlineScore
    
    // 计算绩效百分比 (分数 * 0.05)
    const performancePercentage = totalScore * 0.05
    
    return {
      offlineScore,
      onlineScore,
      totalScore,
      performancePercentage,
      formattedPercentage: `${(performancePercentage * 100).toFixed(1)}%`
    }
  }

  /**
   * 计算多个ESS人员的绩效数据
   * @param {Array} essData - ESS人员数据数组，每项包含name, offlineMeetings, onlineMeetings属性
   * @returns {Array} 包含绩效数据的数组
   */
  const calculateTeamPerformance = (essData) => {
    return essData.map(person => {
      const performance = calculatePerformance(person.offlineMeetings, person.onlineMeetings)
      return {
        ...person,
        ...performance
      }
    }).sort((a, b) => b.performancePercentage - a.performancePercentage) // 按绩效百分比降序排序
  }

  return {
    calculatePerformance,
    calculateTeamPerformance
  }
} 