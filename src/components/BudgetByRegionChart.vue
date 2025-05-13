<template>
  <!-- No changes to template section -->
</template>

<script>
import { computed } from 'vue';

export default {
  props: {
    isColumnMappingComplete: {
      type: Boolean,
      default: false
    },
    regionIndex: {
      type: Number,
      default: -1
    },
    budgetIndex: {
      type: Number,
      default: -1
    },
    filteredData: {
      type: Array,
      default: () => []
    }
  },
  setup(props) {
    // 处理预算数据
    const budgetData = computed(() => {
      if (!props.isColumnMappingComplete || 
          props.regionIndex === -1 || 
          props.budgetIndex === -1 || 
          !props.filteredData || 
          props.filteredData.length === 0) {
        return {};
      }
      
      // 计算每个区域的预算总和
      const budgetByRegion = {};
      
      // 记录前几个预算值用于调试
      const debugSamples = [];
      
      props.filteredData.forEach((row, index) => {
        const region = row[props.regionIndex] || '未知';
        
        // 获取原始预算值
        let originalBudget = row[props.budgetIndex];
        let budget = 0;
        
        // 处理预算值
        if (originalBudget !== undefined && originalBudget !== null) {
          // 如果是字符串类型，需要先转换为数值
          if (typeof originalBudget === 'string') {
            // 移除非数字字符，保留小数点
            originalBudget = originalBudget.replace(/[^\d.]/g, '');
            originalBudget = parseFloat(originalBudget);
          }
          
          // 如果是数值，乘以1000修正单位
          if (!isNaN(originalBudget)) {
            budget = originalBudget * 1000;
          }
        }
        
        // 收集前10个样本用于调试
        if (index < 10) {
          debugSamples.push({
            index,
            region,
            originalValue: row[props.budgetIndex],
            parsedValue: originalBudget,
            finalBudget: budget
          });
        }
        
        if (!budgetByRegion[region]) {
          budgetByRegion[region] = 0;
        }
        
        // 累加预算总额
        budgetByRegion[region] += budget;
      });
      
      // 输出调试样本
      console.log("区域预算数据样本(前10条):", JSON.stringify(debugSamples, null, 2));
      
      // 输出总统计结果
      console.log("区域预算统计:", Object.entries(budgetByRegion).map(([region, amount]) => ({
        区域: region,
        总金额: amount.toFixed(2)
      })));
      
      return budgetByRegion;
    });

    return {
      budgetData
    };
  }
};
</script>

<style>
  /* No changes to style section */
</style> 