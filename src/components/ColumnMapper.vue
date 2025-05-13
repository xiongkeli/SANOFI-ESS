<script setup>
import { defineProps, defineEmits, reactive, computed } from 'vue'

const props = defineProps({
  headers: {
    type: Array,
    default: () => [],
  },
  monthIndex: {
    type: Number,
    default: -1,
  },
  regionIndex: {
    type: Number,
    default: -1,
  },
  brandIndex: {
    type: Number,
    default: -1,
  },
  essParticipationIndex: {
    type: Number,
    default: -1,
  },
  cancellationIndex: {
    type: Number,
    default: -1,
  },
  eventTypeIndex: {
    type: Number,
    default: -1,
  },
  isManuallySet: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update-columns', 'reset-columns'])

// 手动列选择
const manualColumnSelection = reactive({
  monthIndex: props.monthIndex,
  regionIndex: props.regionIndex,
  brandIndex: props.brandIndex,
  essParticipationIndex: props.essParticipationIndex,
  cancellationIndex: props.cancellationIndex,
  eventTypeIndex: props.eventTypeIndex,
})

// 是否已完成列映射
const isColumnMappingComplete = computed(() => {
  return props.monthIndex !== -1 && props.regionIndex !== -1
})

// 更新列选择
const updateColumnSelection = () => {
  // 将字符串转为数字
  const monthIndex = parseInt(manualColumnSelection.monthIndex)
  const regionIndex = parseInt(manualColumnSelection.regionIndex)
  const brandIndex = parseInt(manualColumnSelection.brandIndex)
  const essParticipationIndex = parseInt(manualColumnSelection.essParticipationIndex)
  const cancellationIndex = parseInt(manualColumnSelection.cancellationIndex)
  const eventTypeIndex = parseInt(manualColumnSelection.eventTypeIndex)

  // 构建更新对象
  const updates = {
    monthIndex,
    regionIndex,
  }

  // 如果Brand/Team列有选择，则添加到更新对象中
  if (brandIndex >= 0) {
    updates.brandIndex = brandIndex
  }

  // 如果ESS参会列有选择，则添加到更新对象中
  if (essParticipationIndex >= 0) {
    updates.essParticipationIndex = essParticipationIndex
  }
  
  // 如果会议取消列有选择，则添加到更新对象中
  if (cancellationIndex >= 0) {
    updates.cancellationIndex = cancellationIndex
  }
  
  // 如果Event Type列有选择，则添加到更新对象中
  if (eventTypeIndex >= 0) {
    updates.eventTypeIndex = eventTypeIndex
  }

  // 月份和区域列必须有有效值时才更新
  if (monthIndex >= 0 && regionIndex >= 0) {
    emit('update-columns', updates)
  }
}

// 重置为自动检测
const resetColumnSelection = () => {
  emit('reset-columns')
}
</script>

<template>
  <div v-if="headers.length > 0" class="card">
    <h2>数据列映射</h2>
    <p>自动检测的结果可能不准确，您可以手动选择列映射关系：</p>

    <div class="column-selection">
      <div class="filter-group">
        <label for="month-column">月份列:</label>
        <select
          id="month-column"
          v-model="manualColumnSelection.monthIndex"
          class="filter-select"
          @change="updateColumnSelection"
        >
          <option value="-1">请选择...</option>
          <option v-for="(header, index) in headers" :key="`month-${index}`" :value="index">
            {{ header || `列 ${index + 1}` }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label for="region-column">区域列:</label>
        <select
          id="region-column"
          v-model="manualColumnSelection.regionIndex"
          class="filter-select"
          @change="updateColumnSelection"
        >
          <option value="-1">请选择...</option>
          <option v-for="(header, index) in headers" :key="`region-${index}`" :value="index">
            {{ header || `列 ${index + 1}` }}
          </option>
        </select>
      </div>

      <div class="filter-group brand-filter">
        <label for="brand-column">Brand/Team列 (推荐J列):</label>
        <select
          id="brand-column"
          v-model="manualColumnSelection.brandIndex"
          class="filter-select"
          @change="updateColumnSelection"
        >
          <option value="-1">请选择...</option>
          <option value="9" selected>J列 - Brand/Team</option>
          <option v-for="(header, index) in headers" :key="`brand-${index}`" :value="index" v-if="index !== 9">
            {{ header || `列 ${index + 1}` }}
          </option>
        </select>
        <small class="help-text">选择包含"Brand/Team"数据的列（通常是J列，索引为9）</small>
      </div>

      <div class="filter-group">
        <label for="ess-participation-column">ESS参会列:</label>
        <select
          id="ess-participation-column"
          v-model="manualColumnSelection.essParticipationIndex"
          class="filter-select"
          @change="updateColumnSelection"
        >
          <option value="-1">请选择...</option>
          <option v-for="(header, index) in headers" :key="`ess-${index}`" :value="index">
            {{ header || `列 ${index + 1}` }}
          </option>
        </select>
        <small class="help-text">选择包含"是否需要ESS线下参会"数据的列</small>
      </div>

      <div class="filter-group">
        <label for="cancellation-column">会议取消列:</label>
        <select
          id="cancellation-column"
          v-model="manualColumnSelection.cancellationIndex"
          class="filter-select"
          @change="updateColumnSelection"
        >
          <option value="-1">请选择...</option>
          <option v-for="(header, index) in headers" :key="`cancellation-${index}`" :value="index">
            {{ header || `列 ${index + 1}` }}
          </option>
        </select>
        <small class="help-text">选择包含"会议取消"数据的列</small>
      </div>

      <div class="filter-group event-type-filter">
        <label for="event-type-column">Event Type列:</label>
        <select
          id="event-type-column"
          v-model="manualColumnSelection.eventTypeIndex"
          class="filter-select"
          @change="updateColumnSelection"
        >
          <option value="-1">请选择...</option>
          <option v-for="(header, index) in headers" :key="`event-type-${index}`" :value="index">
            {{ header || `列 ${index + 1}` }}
          </option>
        </select>
        <small class="help-text">选择包含"Event Type (Campaign/One Time/Sub Event)"数据的列</small>
        <div class="event-type-hint">
          <p>🔍 <strong>重要提示：</strong>请选择含有以下值的列:</p>
          <ul>
            <li><code>Campaign</code></li>
            <li><code>One Time</code></li>
            <li><code>Sub Event</code></li>
          </ul>
          <p class="warning">注意：请勿选择"Event Start Date"日期列，该列包含的是日期而非活动类型。</p>
        </div>
      </div>

      <button class="secondary-button" @click="resetColumnSelection">重置为自动检测</button>
    </div>

    <div v-if="isColumnMappingComplete" class="mapping-success">
      <p>✓ 已成功映射数据列</p>
    </div>
    <div v-else class="mapping-warning">
      <p>请选择月份和区域列以继续分析</p>
    </div>
  </div>
</template>

<style scoped>
.column-selection {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: flex-end;
}

.filter-group {
  margin-bottom: 15px;
  min-width: 200px;
}

.brand-filter, .event-type-filter {
  background-color: #f3eaf8;
  padding: 15px;
  border-radius: 8px;
  border-left: 3px solid #662D91;
}

.brand-filter {
  order: -1; /* 确保Brand筛选器显示在最前面 */
}

.event-type-filter {
  order: 1; /* 将Event Type筛选器放在前面的位置 */
}

.filter-group label {
  display: block;
  margin-bottom: 5px;
  color: #555;
  font-weight: 500;
}

.filter-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.filter-select:focus {
  border-color: #8E44AD;
  outline: none;
  box-shadow: 0 0 0 2px rgba(142, 68, 173, 0.2);
}

.help-text {
  display: block;
  margin-top: 5px;
  font-size: 0.8rem;
  color: #666;
  font-style: italic;
}

.mapping-success {
  margin-top: 15px;
  color: #2ecc71;
  font-weight: 500;
}

.mapping-warning {
  margin-top: 15px;
  color: #e67e22;
  font-weight: 500;
}

.secondary-button {
  background-color: #8E44AD;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-end;
}

.secondary-button:hover {
  background-color: #7D3C98;
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .column-selection {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    min-width: auto;
  }
}

.event-type-hint {
  margin-top: 10px;
  padding: 8px 12px;
  background-color: #fff9e6;
  border-left: 3px solid #ffcc00;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #555;
}

.event-type-hint p {
  margin: 5px 0;
  font-size: 0.85rem;
}

.event-type-hint ul {
  margin: 5px 0 5px 20px;
  padding: 0;
}

.event-type-hint li {
  margin-bottom: 3px;
}

.event-type-hint .warning {
  color: #e74c3c;
  font-weight: 500;
  margin-top: 8px;
  background-color: #ffeeee;
  padding: 5px;
  border-radius: 3px;
}

.event-type-hint code {
  background-color: #f8f8f8;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
  color: #8E44AD;
}
</style>
