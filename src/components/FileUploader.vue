<template>
  <div class="file-uploader">
    <input type="file" @change="handleFileChange" ref="fileInput">
    <button @click="uploadFile" :disabled="!selectedFile">上传文件</button>

    <!-- 确认对话框 -->
    <div v-if="showConfirmDialog" class="confirm-dialog">
      <div class="dialog-content">
        <p>文件 "{{ existingFileName }}" 已存在，是否要替换？</p>
        <div class="dialog-buttons">
          <button @click="confirmReplace">确认替换</button>
          <button @click="cancelReplace">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const showConfirmDialog = ref(false)
const existingFileName = ref('')

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
  }
}

const uploadFile = async () => {
  if (!selectedFile.value) return

  const formData = new FormData()
  formData.append('file', selectedFile.value)
  formData.append('name', selectedFile.value.name)
  formData.append('force_override', 'false')

  try {
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData
    })
    const data = await response.json()

    if (data.success) {
      alert('上传成功！')
      resetForm()
    } else if (data.needConfirm) {
      // 显示确认对话框
      showConfirmDialog.value = true
      existingFileName.value = data.name
    } else {
      alert(`上传失败：${data.message}`)
    }
  } catch (error) {
    alert('上传出错：' + error)
  }
}

const confirmReplace = async () => {
  if (!selectedFile.value) return

  const formData = new FormData()
  formData.append('file', selectedFile.value)
  formData.append('name', selectedFile.value.name)
  formData.append('force_override', 'true')

  try {
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData
    })
    const data = await response.json()

    if (data.success) {
      alert('文件替换成功！')
      resetForm()
    } else {
      alert(`替换失败：${data.message}`)
    }
  } catch (error) {
    alert('替换出错：' + error)
  }
  showConfirmDialog.value = false
}

const cancelReplace = () => {
  showConfirmDialog.value = false
  resetForm()
}

const resetForm = () => {
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  selectedFile.value = null
  showConfirmDialog.value = false
  existingFileName.value = ''
}
</script>

<style scoped>
.file-uploader {
  margin: 20px;
}

.confirm-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.dialog-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.dialog-buttons {
  margin-top: 20px;
}

.dialog-buttons button {
  margin: 0 10px;
  padding: 8px 16px;
  cursor: pointer;
}
</style>