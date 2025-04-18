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
  ask(question: string) {
    return axios.post(`${BASE_URL}/qa/ask`, { question })
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
  }
}