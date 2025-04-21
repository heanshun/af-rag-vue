import axios from 'axios'

const BASE_URL = 'http://localhost:5000/api'

export const api = {
  // 获取配置列表
  getConfigs() {
    return axios.get(`${BASE_URL}/configs`)
  },

  // 检查配置是否存在
  checkConfig(filename: string) {
    return axios.post(`${BASE_URL}/config/check`, { filename })
  },

  // 上传配置
  uploadConfig(file: File, forceOverride = false) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('force_override', String(forceOverride))
    return axios.post(`${BASE_URL}/config/upload`, formData)
  },

  // 删除配置
  deleteConfig(filename: string) {
    return axios.delete(`${BASE_URL}/config/delete`, {
      data: { filename }
    })
  },

  // 加载配置
  loadConfig(filename: string) {
    return axios.post(`${BASE_URL}/config/load`, { filename })
  },

  // 提问
  ask(data: { question: string; session_id: string }) {
    return axios.post(`${BASE_URL}/qa/chat`, data)
  },

  // 获取文档列表
  getDocuments() {
    return axios.get(`${BASE_URL}/documents`)
  },
    
  // 上传文档
  uploadDocument(formData: FormData) {
    return axios.post(`${BASE_URL}/documents/upload`, formData)
  },
    
  // 删除文档
  deleteDocument(name: string) {
    return axios.delete(`${BASE_URL}/documents/delete`, {
      data: { name }
    })
  },

  // 获取文档内容
  getDocumentContent(docName: string) {
    return axios.get(`${BASE_URL}/documents/content/${encodeURIComponent(docName)}`, {
      responseType: 'text'
    })
  },

  // 获取聊天历史
  getChatHistory(sessionId: string) {
    return axios.get(`${BASE_URL}/qa/history?session_id=${sessionId}`)
  },
  
  // 清空聊天历史
  clearHistory(sessionId: string) {
    return axios.post(`${BASE_URL}/qa/clear`, { session_id: sessionId })
  },

  // 获取归档对话列表
  getChatArchives() {
    return axios.get(`${BASE_URL}/qa/archives`)
  },

  // 恢复归档对话
  restoreArchive(archiveId: string) {
    return axios.get(`${BASE_URL}/qa/archives/${archiveId}`)
  },

  // 添加删除归档对话的方法
  deleteArchive(archiveId: string) {
    return axios.delete(`${BASE_URL}/qa/archives/${archiveId}`)
  }
}