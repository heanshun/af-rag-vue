<template>
    <div class="qa-system">
      <!-- 左侧历史记录面板 -->
      <div class="archives-panel">
        <div class="archives-header">
          <h3>历史对话</h3>
        </div>
        <div class="archives-list">
          <div
            v-for="archive in archives"
            :key="archive.id"
            class="archive-item"
            :class="{ active: currentArchiveId === archive.id }"
          >
            <div class="archive-content" @click="handleRestoreArchive(archive.id)">
              <div class="archive-title">{{ archive.title }}</div>
              <div class="archive-time">{{ archive.timestamp }}</div>
            </div>
            <el-button
              type="danger"
              size="small"
              class="archive-delete-btn"
              @click.stop="handleDeleteArchive(archive.id)"
            >
              删除
            </el-button>
          </div>
        </div>
        <div class="archives-footer">
          <el-button 
            type="primary" 
            @click="handleNewChat"
            class="new-chat-btn"
          >
            新建对话
          </el-button>
        </div>
      </div>

      <!-- 右侧聊天面板 -->
      <div class="chat-panel">
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
              <el-button @click="handleArchive">归档</el-button>
            </div>
          </div>
        </el-card>
      </div>
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
  
  // 添加归档相关的响应式变量
  const showArchives = ref(false)
  const archives = ref<Array<{
    id: string;
    title: string;
    timestamp: string;
  }>>([])
  
  // 添加当前选中的归档ID
  const currentArchiveId = ref('')
  
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
      const response = await api.ask({
        question: question.value,
        session_id: sessionId.value
      })
      
      if (response.data.success) {
        const data = response.data.data
        // 直接使用后端返回的历史记录
        chatHistory.value = data.history
      } else {
        ElMessage.error(response.data.message)
      }
    } catch (error) {
      ElMessage.error('请求失败')
    } finally {
      loading.value = false
      question.value = ''
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
  
  // 修改查看文档的方法
  const handleViewDocument = async (docName: string) => {
    try {
      const response = await api.getDocumentContent(docName)
      // 直接使用返回的文本内容
      documentContent.value = response.data || '文档内容为空'
      currentDocument.value = docName
      showDocumentDialog.value = true
    } catch (error) {
      ElMessage.error('获取文档内容失败')
    }
  }
  
  // 加载归档对话列表
  const loadArchives = async () => {
    try {
      const response = await api.getChatArchives()
      if (response.data.success) {
        archives.value = response.data.data
      }
    } catch (error) {
      ElMessage.error('加载历史对话失败')
    }
  }
  
  // 新增新建对话方法
  const handleNewChat = () => {
    chatHistory.value = []
    currentArchiveId.value = ''
    sessionId.value = Math.random().toString(36).substring(7)
  }
  
  // 修改为归档方法
  const handleArchive = async () => {
    try {
      const response = await api.clearHistory(sessionId.value)
      if (response.data.success) {
        chatHistory.value = []
        ElMessage.success('对话已归档')
        // 重新加载归档列表
        loadArchives()
      }
    } catch (error) {
      ElMessage.error('归档失败')
    }
  }
  
  // 修改恢复归档对话的方法
  const handleRestoreArchive = async (archiveId: string) => {
    try {
      const response = await api.restoreArchive(archiveId)
      if (response.data.success) {
        const data = response.data.data
        sessionId.value = data.session_id
        chatHistory.value = data.history
        currentArchiveId.value = archiveId
        ElMessage.success('已恢复历史对话')
      } else {
        ElMessage.error(response.data.message)
      }
    } catch (error) {
      ElMessage.error('恢复对话失败')
    }
  }
  
  // 添加删除归档对话的方法
  const handleDeleteArchive = async (archiveId: string) => {
    try {
      await ElMessageBox.confirm(
        '确定要删除这条历史对话吗？',
        '确认删除',
        {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )

      const response = await api.deleteArchive(archiveId)
      if (response.data.success) {
        ElMessage.success('历史对话已删除')
        // 重新加载归档列表
        loadArchives()
      } else {
        ElMessage.error(response.data.message)
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除失败')
      }
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
  
  onMounted(async () => {
    loadConfigs()
    loadDocuments()
    loadArchives()
    
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
    height: calc(100vh - 40px);
    display: flex;
    gap: 20px;
  }
  
  .archives-panel {
    width: 260px;
    background-color: #f4f6f8;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  .archives-header {
    padding: 16px;
    border-bottom: 1px solid #e4e7ed;
  }
  
  .archives-header h3 {
    margin: 0;
    color: #303133;
  }
  
  .archives-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  }
  
  .archives-footer {
    padding: 16px;
    border-top: 1px solid #e4e7ed;
  }
  
  .new-chat-btn {
    width: 100%;
  }
  
  .chat-panel {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
  }
  
  .qa-card {
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  :deep(.el-card__body) {
    flex: 1;
    padding: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
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
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    min-height: 0;
  }
  
  .message {
    margin-bottom: 20px;
    padding: 10px;
    border-radius: 8px;
    max-width: 100%;
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
    flex-shrink: 0;
    padding: 20px;
    background-color: white;
    border-top: 1px solid #e4e7ed;
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

  .archive-item {
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.3s;
  }

  .archive-item:hover {
    background-color: #e4e7ed;
  }

  .archive-item.active {
    background-color: #ecf5ff;
  }

  .archive-content {
    flex-grow: 1;
    cursor: pointer;
    margin-right: 8px;
  }

  .archive-delete-btn {
    opacity: 0;
    transition: opacity 0.3s;
  }

  .archive-item:hover .archive-delete-btn {
    opacity: 1;
  }

  .archive-title {
    font-size: 14px;
    margin-bottom: 5px;
    color: #303133;
    /* 限制标题最多显示两行 */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .archive-time {
    font-size: 12px;
    color: #909399;
  }
  </style>