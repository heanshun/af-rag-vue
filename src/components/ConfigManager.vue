<template>
    <div class="config-manager">
      <el-card class="config-card">
        <template #header>
          <div class="card-header">
            <span>配置管理</span>
            <el-upload
              class="upload-demo"
              :http-request="handleUpload"
              :show-file-list="false"
              accept=".yml"
            >
              <el-button type="primary">上传配置</el-button>
            </el-upload>
          </div>
        </template>
        
        <el-table :data="configs" style="width: 100%">
          <el-table-column prop="filename" label="配置文件" />
          <el-table-column align="right">
            <template #default="scope">
              <el-button size="small" @click="handleLoad(scope.row.filename)">
                加载
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="handleDelete(scope.row.filename)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { api } from '../api'
  
  const configs = ref<{ filename: string }[]>([])
  
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
      // 检查文件是否存在
      const checkResponse = await api.checkConfig(file.name)
      if (checkResponse.data.exists) {
        // 如果文件存在，询问是否覆盖
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
          return // 用户取消覆盖
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
        ElMessage.success(response.data.message)
      } else {
        ElMessage.error(response.data.message)
      }
    } catch (error) {
      ElMessage.error('加载配置失败')
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
  .config-manager {
    padding: 20px;
  }
  
  .config-card {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  </style>