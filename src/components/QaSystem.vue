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

            <!-- 新增文档管理部分 -->
            <div class="right-section">
              <el-dropdown>
                <span class="model-selector">
                  <span>文档管理</span>
                  <el-icon class="el-icon--right"><arrow-down /></el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <div v-for="doc in documents" :key="doc" class="config-item">
                      <el-dropdown-item @click="handleViewDocument(doc)">
                        {{ doc }}
                      </el-dropdown-item>
                      <el-button
                        type="danger"
                        size="small"
                        class="delete-btn"
                        @click.stop="handleDeleteDocument(doc)"
                      >
                        删除
                      </el-button>
                    </div>
                    <el-dropdown-item divided>
                      <el-upload
                        class="upload-in-dropdown"
                        :http-request="handleUploadDocument"
                        :show-file-list="false"
                        accept=".txt,.pdf,.doc,.docx"
                      >
                        <span>上传新文档</span>
                      </el-upload>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </template>
  
        <div class="chat-container">
          <div v-for="(message, index) in chatHistory" 
               :key="index" 
               class="message"
               :class="message.role">
            <div class="message-content">
              <template v-if="message.role === 'assistant'">
                <div class="answer-section">
                  <div class="section-title">回答：</div>
                  <div class="section-content">{{ message.content }}</div>
                </div>
                
                <div class="answer-section">
                  <div class="section-title">理由：</div>
                  <div class="section-content">{{ message.rationale }}</div>
                </div>
                
                <div class="answer-section">
                  <div class="section-title">参考来源：</div>
                  <div class="section-content">
                    <div v-for="(ref, refIndex) in message.references" 
                         :key="refIndex" 
                         class="reference-item">
                      <el-button link type="primary" @click="handleViewDocument(ref)">
                        {{ ref }}
                      </el-button>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="question-content">{{ message.content }}</div>
              </template>
            </div>
          </div>
        </div>
  
        <div class="question-input">
          <el-input
            v-model="question"
            type="textarea"
            :rows="3"
            placeholder="请输入您的问题"
            :disabled="loading"
            @keyup.enter.ctrl="handleAsk"
          >
          </el-input>
          <div class="input-actions">
            <el-button type="primary" :loading="loading" @click="handleAsk">发送</el-button>
            <el-button @click="handleClearHistory">清空对话</el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 添加文档内容对话框 -->
    <el-dialog
      v-model="showDocumentDialog"
      :title="currentDocument"
      width="60%"
      :close-on-click-modal="false"
    >
      <pre class="document-content">{{ documentContent }}</pre>
    </el-dialog>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { ArrowDown } from '@element-plus/icons-vue'
  import { api } from '../api'
  
  const question = ref('')
  const loading = ref(false)
  const configs = ref<{ filename: string }[]>([])
  const currentConfig = ref('')
  const documents = ref<string[]>([])
  
  // 添加文档内容相关的响应式变量
  const showDocumentDialog = ref(false)
  const documentContent = ref('')
  const currentDocument = ref('')
  
  // 新增聊天历史相关变量
  const chatHistory = ref<Array<{
    role: 'user' | 'assistant';
    content: string;
    rationale?: string;
    references?: string[];
  }>>([])
  
  // 生成随机会话ID
  const sessionId = ref(Math.random().toString(36).substring(7))
  
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
      // 先添加用户问题到历史记录
      chatHistory.value.push({
        role: 'user',
        content: question.value
      })

      const response = await api.ask({
        question: question.value,
        session_id: sessionId.value
      })
      
      if (response.data.success) {
        const data = response.data.data
        // 添加助手回答到历史记录
        chatHistory.value.push({
          role: 'assistant',
          content: data.answer,
          rationale: data.rationale,
          references: data.references || []
        })
      } else {
        ElMessage.error(response.data.message)
        // 如果请求失败，移除刚才添加的用户问题
        chatHistory.value.pop()
      }
    } catch (error) {
      ElMessage.error('请求失败')
      // 如果请求失败，移除刚才添加的用户问题
      chatHistory.value.pop()
    } finally {
      loading.value = false
      question.value = ''
    }
  }
  
  // 添加清空历史记录方法
  const handleClearHistory = async () => {
    try {
      const response = await api.clearHistory(sessionId.value)
      if (response.data.success) {
        chatHistory.value = []
        ElMessage.success('对话历史已清空')
      }
    } catch (error) {
      ElMessage.error('清空历史记录失败')
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
  
  // 加载文档列表
  const loadDocuments = async () => {
    try {
      const response = await api.getDocuments()
      if (response.data.success) {
        documents.value = response.data.data
      }
    } catch (error) {
      ElMessage.error('加载文档列表失败')
    }
  }
  
  // 处理文档上传
  const handleUploadDocument = async (options: any) => {
    const file = options.file
    const formData = new FormData()
    formData.append('file', file)
    formData.append('force_override', 'false')

    try {
      const response = await api.uploadDocument(formData)
      if (response.data.success) {
        ElMessage.success('文档上传成功')
        loadDocuments()
      } else if (response.data.needConfirm) {
        try {
          await ElMessageBox.confirm(
            `文档 "${response.data.name}" 已存在，是否要替换？`,
            '确认替换',
            {
              confirmButtonText: '替换',
              cancelButtonText: '取消',
              type: 'warning',
            }
          )
          const formDataWithOverride = new FormData()
          formDataWithOverride.append('file', file)
          formDataWithOverride.append('force_override', 'true')
          
          const replaceResponse = await api.uploadDocument(formDataWithOverride)
          if (replaceResponse.data.success) {
            ElMessage.success('文档替换成功')
            loadDocuments()
          } else {
            ElMessage.error(replaceResponse.data.message)
          }
        } catch {
          return
        }
      } else {
        ElMessage.error(response.data.message)
      }
    } catch (error) {
      ElMessage.error('文档上传失败')
    }
  }
  
  // 处理文档删除
  const handleDeleteDocument = async (name: string) => {
    try {
      await ElMessageBox.confirm(
        `确定要删除文档 "${name}" 吗？`,
        '确认删除',
        {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )

      const response = await api.deleteDocument(name)
      if (response.data.success) {
        ElMessage.success(response.data.message)
        loadDocuments()
      } else {
        ElMessage.error(response.data.message)
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除失败')
      }
    }
  }
  
  // 添加查看文档的方法
  const handleViewDocument = async (docName: string) => {
    try {
      const response = await api.getDocumentContent(docName)
      if (response.data.success) {
        documentContent.value = response.data.data.content
        currentDocument.value = docName
        showDocumentDialog.value = true
      } else {
        ElMessage.error(response.data.message)
      }
    } catch (error) {
      ElMessage.error('获取文档内容失败')
    }
  }
  
  onMounted(async () => {
    loadConfigs()
    loadDocuments()
    
    try {
      const response = await api.getChatHistory(sessionId.value)
      if (response.data.success) {
        chatHistory.value = response.data.data
      }
    } catch (error) {
      console.error('获取对话历史失败:', error)
    }
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
    width: 100%;
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
  
  .chat-container {
    margin-bottom: 20px;
    max-height: 60vh;
    overflow-y: auto;
    padding: 10px;
  }
  
  .message {
    margin-bottom: 20px;
    padding: 10px;
    border-radius: 8px;
  }
  
  .message.user {
    background-color: #f5f7fa;
    margin-left: 20%;
  }
  
  .message.assistant {
    background-color: #ecf5ff;
    margin-right: 20%;
  }
  
  .message-content {
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  
  .references {
    margin-top: 10px;
    font-size: 0.9em;
    border-top: 1px solid #dcdfe6;
    padding-top: 5px;
  }
  
  .reference-title {
    color: #409EFF;
    font-weight: bold;
    margin-bottom: 5px;
  }
  
  .reference-item {
    margin: 5px 0;
  }
  
  .reference-item .el-button {
    padding: 0;
    font-size: inherit;
  }
  
  .input-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
  }
  
  .question-input {
    position: sticky;
    bottom: 0;
    background-color: white;
    padding: 10px 0;
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
  
  /* 添加右侧部分样式 */
  .right-section {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .document-content {
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: monospace;
    padding: 10px;
    background-color: #f5f7fa;
    border-radius: 4px;
    max-height: 60vh;
    overflow-y: auto;
  }
  
  .answer-section {
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid #e4e7ed;
  }
  
  .answer-section:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
  
  .section-title {
    font-weight: bold;
    color: #409EFF;
    margin-bottom: 8px;
  }
  
  .section-content {
    white-space: pre-wrap;
    word-wrap: break-word;
    line-height: 1.5;
  }
  
  .question-content {
    padding: 8px 0;
  }
  </style>