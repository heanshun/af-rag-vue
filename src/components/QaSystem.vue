<template>
    <div class="qa-system">
      <el-card class="qa-card">
        <template #header>
          <div class="card-header">
            <div class="left-section">
              <el-dropdown @command="handleLoad">
                <span class="model-selector">
                  <span>{{ currentConfig || '选择配置' }}</span>
                  <el-icon class="el-icon--right"><arrow-down /></el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <div v-for="config in configs" :key="config.filename" class="config-item">
                      <el-dropdown-item :command="config.filename">
                        {{ config.filename }}
                      </el-dropdown-item>
                      <el-button
                        type="danger"
                        size="small"
                        class="delete-btn"
                        @click.stop="handleDelete(config.filename)"
                      >
                        删除
                      </el-button>
                    </div>
                    <el-dropdown-item divided>
                      <el-upload
                        class="upload-in-dropdown"
                        :http-request="handleUpload"
                        :show-file-list="false"
                        accept=".yml"
                      >
                        <span>上传新配置</span>
                      </el-upload>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </template>
  
        <div class="question-input">
          <el-input
            v-model="question"
            placeholder="请输入您的问题"
            :disabled="loading"
            @keyup.enter="handleAsk"
          >
            <template #append>
              <el-button :loading="loading" @click="handleAsk">提问</el-button>
            </template>
          </el-input>
        </div>
  
        <div v-if="answer" class="answer">
          <pre>{{ answer }}</pre>
        </div>
      </el-card>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { ArrowDown } from '@element-plus/icons-vue'
  import { api } from '../api'
  
  const question = ref('')
  const answer = ref('')
  const loading = ref(false)
  const configs = ref<{ filename: string }[]>([])
  const currentConfig = ref('')
  
  // 加载配置列表
  const loadConfigs = async () => {
    try {
      const response = await api.getConfigs()
      if (response.data.success) {
        configs.value = response.data.data.map((filename: string) => ({ filename }))
      }
    } catch (error) {
      ElMessage.error('加载配置列表失败')
    }
  }
  
  // 处理文件上传
  const handleUpload = async (options: any) => {
    const file = options.file
    if (!file.name.endsWith('.yml')) {
      ElMessage.error('只支持上传 .yml 文件')
      return
    }
  
    try {
      const checkResponse = await api.checkConfig(file.name)
      if (checkResponse.data.exists) {
        try {
          await ElMessageBox.confirm(
            `配置文件 "${file.name}" 已存在，是否覆盖？`,
            '确认覆盖',
            {
              confirmButtonText: '覆盖',
              cancelButtonText: '取消',
              type: 'warning',
            }
          )
        } catch {
          return
        }
      }
  
      const response = await api.uploadConfig(file, checkResponse.data.exists)
      if (response.data.success) {
        ElMessage.success('上传成功')
        loadConfigs()
      } else {
        ElMessage.error(response.data.message)
      }
    } catch (error) {
      ElMessage.error('上传失败')
    }
  }
  
  // 处理配置加载
  const handleLoad = async (filename: string) => {
    try {
      const response = await api.loadConfig(filename)
      if (response.data.success) {
        currentConfig.value = filename
        ElMessage.success(response.data.message)
      } else {
        ElMessage.error(response.data.message)
      }
    } catch (error) {
      ElMessage.error('加载配置失败')
    }
  }
  
  const handleAsk = async () => {
    if (!question.value.trim()) {
      ElMessage.warning('请输入问题')
      return
    }
  
    if (!currentConfig.value) {
      ElMessage.warning('请先选择配置文件')
      return
    }
  
    loading.value = true
    try {
      const response = await api.ask(question.value)
      if (response.data.success) {
        answer.value = response.data.data
      } else {
        ElMessage.error(response.data.message)
      }
    } catch (error) {
      ElMessage.error('请求失败')
    } finally {
      loading.value = false
    }
  }
  
  // 处理配置删除
  const handleDelete = async (filename: string) => {
    try {
      await ElMessageBox.confirm(
        `确定要删除配置文件 "${filename}" 吗？`,
        '确认删除',
        {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )

      const response = await api.deleteConfig(filename)
      if (response.data.success) {
        ElMessage.success(response.data.message)
        if (currentConfig.value === filename) {
          currentConfig.value = ''
        }
        loadConfigs()
      } else {
        ElMessage.error(response.data.message)
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除失败')
      }
    }
  }
  
  onMounted(() => {
    loadConfigs()
  })
  </script>
  
  <style scoped>
  .qa-system {
    padding: 20px;
  }
  
  .qa-card {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .left-section {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .model-selector {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 5px 10px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
  }
  
  .model-selector:hover {
    background-color: #f5f7fa;
  }
  
  .question-input {
    margin-bottom: 20px;
  }
  
  .answer {
    padding: 15px;
    background-color: #f5f7fa;
    border-radius: 4px;
  }
  
  .answer pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    margin: 0;
  }
  
  .upload-in-dropdown {
    width: 100%;
  }
  
  :deep(.upload-in-dropdown .el-upload) {
    width: 100%;
  }
  
  :deep(.upload-in-dropdown .el-upload-dragger) {
    width: 100%;
    height: auto;
    padding: 0;
  }
  
  .config-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-right: 10px;
  }
  
  .config-item .el-dropdown-item {
    flex-grow: 1;
    margin-right: 10px;
  }
  
  .delete-btn {
    padding: 2px 5px;
    font-size: 12px;
  }
  
  :deep(.el-dropdown-menu__item) {
    padding: 5px 10px;
  }
  
  :deep(.el-dropdown-menu__item:not(.is-disabled):hover) {
    background-color: transparent;
  }
  </style>