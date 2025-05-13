<script setup>
import { defineProps, defineEmits } from 'vue'
import FileUploader from '../components/FileUploader.vue'

const props = defineProps({
  isLoading: Boolean,
  fileName: String,
  errorMessage: String,
})

const emit = defineEmits(['file-parsed'])

const handleFileParsed = (result) => {
  emit('file-parsed', result)
}
</script>

<template>
  <div class="file-upload-view-container">
    <div class="file-upload-card">
      <FileUploader
        :is-loading="isLoading"
        :file-name="fileName"
        :error-message="errorMessage"
        @file-parsed="handleFileParsed"
        class="file-uploader-component"
      />

      <div class="upload-tips">
        <h3>文件要求</h3>
        <ul>
          <li>支持 .xlsx 和 .xls 格式</li>
          <li>文件应包含分析所需的必要数据列（如月份、区域、品牌、事件类型、预算、差旅成本、ESS相关列等）</li>
          <li>系统会尝试自动识别列，也可在后续视图中手动调整</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-upload-view-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 120px); /* Adjust based on header/footer height */
  padding: 20px;
  background-color: #f4f5f7; /* Light grey background */
}

.file-upload-card {
  max-width: 700px; /* Slightly wider card */
  width: 100%;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
  padding: 30px; /* Reduced padding */
  text-align: center; /* Center content */
}

.upload-tips {
  margin-top: 30px; /* Adjusted top margin */
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 5px solid #7A00E6; /* Sanofi Purple */
  text-align: left; /* Align text left within tips box */
}

.upload-tips h3 {
  font-size: 1.15rem;
  font-weight: 600;
  color: #7A00E6; /* Sanofi Purple */
  margin-top: 0;
  margin-bottom: 18px;
}

.upload-tips ul {
  margin: 0;
  padding-left: 20px;
  list-style-type: disc; /* Use standard bullets */
}

.upload-tips li {
  margin-bottom: 10px;
  color: #444;
  font-size: 0.95rem;
  line-height: 1.5;
}

.file-uploader-component {
  margin-bottom: 30px; /* Add some space before tips */
}
</style>
