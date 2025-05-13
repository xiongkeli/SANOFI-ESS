<script setup>
import { ref, defineEmits, onMounted, onUnmounted } from 'vue'
import * as XLSX from 'xlsx'

const props = defineProps({
  isLoading: {
    type: Boolean,
    default: false,
  },
  fileName: {
    type: String,
    default: '',
  },
  errorMessage: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['file-parsed'])

const fileInput = ref(null)
const isDragging = ref(false)

// 打开文件选择器
const openFileSelector = () => {
  fileInput.value.click()
}

// 处理文件选择 (点击或拖拽)
const processFile = (file) => {
  if (!file) return

  // 检查文件类型
  const fileTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
  ]

  if (!fileTypes.includes(file.type)) {
    emit('file-parsed', {
      success: false,
      errorMessage: '文件类型无效，请选择 .xlsx 或 .xls 文件',
    })
    return
  }

  emit('file-parsed', {
    success: true,
    fileName: file.name,
    file: file,
  })
}

const handleFileChange = (event) => {
  processFile(event.target.files[0])
}

// --- Drag and Drop Handlers ---
const onDragEnter = (event) => {
  event.preventDefault();
  isDragging.value = true;
}

const onDragLeave = (event) => {
  event.preventDefault();
  isDragging.value = false;
}

const onDragOver = (event) => {
  event.preventDefault();
}

const onDrop = (event) => {
  event.preventDefault();
  isDragging.value = false;
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}

// --- Event Listener Setup for Drag/Drop on the window ---
// Prevent browser default behavior for drag/drop outside the drop zone
const preventDefaults = (e) => {
    e.preventDefault()
    e.stopPropagation()
}

onMounted(() => {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, preventDefaults, false)
    });
});

onUnmounted(() => {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.removeEventListener(eventName, preventDefaults, false)
    });
});
</script>

<template>
  <div 
    class="file-uploader-wrapper" 
    :class="{ 'is-dragging': isDragging }"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <div class="upload-content">
      <div class="upload-icon">📤</div>
      <h2>拖拽文件到此处或点击上传</h2>
      <p>选择或拖拽您要解析的 Excel 文件 (.xlsx 或 .xls)</p>

      <input
        type="file"
        ref="fileInput"
        @change="handleFileChange"
        accept=".xlsx,.xls"
        class="hidden-input"
      />

      <button class="primary-button" @click="openFileSelector" :disabled="isLoading">
        <span v-if="!isLoading">选择 Excel 文件</span>
        <span v-else class="loading-spinner"></span>
      </button>

      <!-- Transition for file info and error message -->
      <transition name="fade">
        <div v-if="fileName && !isLoading" class="file-info">
          <p>已选择: {{ fileName }} ✅</p>
        </div>
      </transition>
      <transition name="fade">
        <div v-if="errorMessage" class="error-message">
          <p>⚠️ {{ errorMessage }}</p>
        </div>
      </transition>
      
    </div>
  </div>
</template>

<style scoped>
.file-uploader-wrapper {
  border: 2px dashed #ccc;
  border-radius: 10px;
  padding: 40px 20px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
  background-color: #fff;
}

.file-uploader-wrapper.is-dragging {
  border-color: #7A00E6; /* Sanofi Purple */
  background-color: #f3f0ff; /* Lighter purple background */
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px; 
}

.upload-icon {
  font-size: 3rem;
  color: #7A00E6; /* Sanofi Purple */
  margin-bottom: 10px;
}

h2 {
  font-size: 1.3rem;
  color: #333;
  margin: 0;
}

p {
  color: #666;
  margin: 0 0 15px 0; /* Add bottom margin */
  font-size: 0.95rem;
}

.hidden-input {
  display: none;
}

.primary-button {
  background-color: #7A00E6; /* Sanofi Purple */
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 5px rgba(122, 0, 230, 0.2);
  display: inline-flex; /* Align spinner */
  align-items: center;
  justify-content: center;
  min-width: 150px; /* Ensure button size consistency */
  min-height: 45px; /* Ensure button size consistency */
}

.primary-button:hover:not(:disabled) {
  background-color: #6A00C9;
  box-shadow: 0 4px 8px rgba(122, 0, 230, 0.3);
  transform: translateY(-1px);
}

.primary-button:active:not(:disabled) {
  background-color: #5A00AE;
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(122, 0, 230, 0.2);
}

.primary-button:disabled {
  background-color: #c5a0f0; /* Lighter purple when disabled */
  cursor: not-allowed;
  box-shadow: none;
}

/* Loading Spinner */
.loading-spinner {
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 3px solid #fff;
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.file-info, .error-message {
  margin-top: 20px;
  padding: 12px 15px;
  border-radius: 6px;
  width: 100%;
  box-sizing: border-box; /* Include padding in width */
  text-align: center;
}

.file-info {
  background-color: #e9f7ef; /* Light green for success */
  color: #1e4620;
  border: 1px solid #a3d6b8;
}

.file-info p,
.error-message p {
  margin: 0;
  font-weight: 500;
}

.error-message {
  background-color: #fdeded;
  color: #c0392b;
  border: 1px solid #f5c6cb;
}

/* Fade transition */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

</style>
