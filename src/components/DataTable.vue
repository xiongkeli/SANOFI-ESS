<script setup>
import { defineProps } from 'vue'

defineProps({
  headers: {
    type: Array,
    default: () => [],
  },
  rows: {
    type: Array,
    default: () => [],
  },
  filteredData: {
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
  isColumnMappingComplete: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <div v-if="headers.length > 0" class="card data-table-card">
    <div class="table-header">
      <h2>Excel 数据表</h2>
      <div class="table-info">
        <span v-if="filteredData.length > 0">显示 {{ filteredData.length }} 行数据</span>
        <span v-else-if="rows.length > 10 && !isColumnMappingComplete">显示前 10 行数据预览</span>
      </div>
    </div>

    <div class="table-container">
      <table class="excel-table">
        <thead>
          <tr>
            <th
              v-for="(header, index) in headers"
              :key="index"
              :class="{ 'important-column': index === monthIndex || index === regionIndex }"
            >
              {{ header || `列 ${index + 1}` }}
              <div v-if="index === monthIndex" class="column-tag month-tag">月份</div>
              <div v-if="index === regionIndex" class="column-tag region-tag">区域</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIndex) in filteredData.length > 0 ? filteredData : rows.slice(0, 10)"
            :key="rowIndex"
          >
            <td
              v-for="(cell, cellIndex) in row"
              :key="cellIndex"
              :class="{ 'important-column': cellIndex === monthIndex || cellIndex === regionIndex }"
            >
              {{ cell }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="filteredData.length === 0 && isColumnMappingComplete" class="no-data-message">
      没有符合条件的数据
    </div>

    <div
      v-if="rows.length > 10 && filteredData.length === 0 && !isColumnMappingComplete"
      class="table-note"
    >
      <i class="note-icon">ℹ️</i> 表格较大，仅显示前 10 行预览。请使用筛选功能查看完整数据。
    </div>
  </div>
  <div v-else class="card data-table-card empty-state">
    <p>尚未加载任何数据。请上传 Excel 文件并选择适当的列映射。</p>
  </div>
</template>

<style scoped>
.data-table-card {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.table-info {
  font-size: 0.9rem;
  color: #666;
}

.table-container {
  overflow-x: auto;
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid #eaeaea;
  border-radius: 4px;
  background-color: #fff;
}

.excel-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.excel-table th,
.excel-table td {
  border: 1px solid #eee;
  padding: 10px;
  text-align: left;
}

.excel-table th {
  background-color: #f7f7f7;
  position: sticky;
  top: 0;
  z-index: 1;
  font-weight: 600;
}

.important-column {
  background-color: #f9fff9;
}

.excel-table th.important-column {
  background-color: #f3f9f3;
}

.excel-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.excel-table tr:hover {
  background-color: #f0f7ff;
}

.column-tag {
  display: inline-block;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 4px;
  font-weight: normal;
}

.month-tag {
  background-color: #4bc0c0;
  color: white;
}

.region-tag {
  background-color: #ff9f40;
  color: white;
}

.no-data-message {
  text-align: center;
  padding: 20px;
  color: #666;
  background-color: #f9f9f9;
  border-radius: 4px;
  margin-top: 20px;
}

.table-note {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: center;
  padding: 15px;
  color: #666;
  background-color: #f5f8ff;
  border-radius: 4px;
  margin-top: 20px;
  font-style: italic;
  font-size: 0.9rem;
}

.note-icon {
  font-style: normal;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #888;
  font-style: italic;
}

@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .excel-table th,
  .excel-table td {
    padding: 8px;
    font-size: 0.85rem;
  }
}
</style>
