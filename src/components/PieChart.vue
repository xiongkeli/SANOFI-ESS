<script setup>
import { defineProps, ref, watch, onMounted } from 'vue'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Pie } from 'vue-chartjs'

// 注册 Chart.js 组件
ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps({
  chartData: {
    type: Object,
    required: true,
  },
  chartOptions: {
    type: Object,
    default: () => ({
      responsive: true,
      maintainAspectRatio: false,
    }),
  },
})

const chartInstance = ref(null)

// 当数据变化时更新图表
watch(
  () => props.chartData,
  (newData) => {
    if (chartInstance.value && chartInstance.value.chart) {
      chartInstance.value.chart.data = newData
      chartInstance.value.chart.update()
    }
  },
  { deep: true }
)
</script>

<template>
  <div class="chart-container">
    <Pie ref="chartInstance" :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
