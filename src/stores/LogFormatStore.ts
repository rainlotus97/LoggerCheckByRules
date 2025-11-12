import { LogField, LogFormat } from '@/types/Common'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 日志格式规则存储
export const useLogFormatStore = defineStore('logFormat', () => {
  // 状态
  const formatRules = ref<LogFormat[]>([])
  const currentLog = ref('')
  const selectedText = ref('')
  const selectionStart = ref(-1)
  const selectionEnd = ref(-1)
  const currentFields = ref<LogField[]>([])
  const editingRule = ref<LogFormat | null>(null)

  // 预定义字段类型
  const fieldTypes = [
    { value: 'timestamp', label: '时间戳', icon: '🕒' },
    { value: 'level', label: '日志级别', icon: '📊' },
    { value: 'package', label: '包名', icon: '📦' },
    { value: 'tag', label: '标签', icon: '🏷️' },
    { value: 'message', label: '日志正文', icon: '💬' },
    { value: 'custom', label: '自定义', icon: '🔧' }
  ]

  const loadFormatRules = () => {
    try {
      const saved = localStorage.getItem('log-format')
      if (saved) {
        formatRules.value = JSON.parse(saved).map((rule: any) => ({
          ...rule,
          createdAt: new Date(rule.createdAt),
          updatedAt: new Date(rule.updatedAt)
        }))
      }
    } catch (error) {
      console.error('加载规则失败:', error)
    }
  }

  // 保存数据到 localStorage
  const saveFormatRules = () => {
    try {
      localStorage.setItem('log-format', JSON.stringify(formatRules.value))
    } catch (error) {
      console.error('保存规则失败:', error)
    }
  }

  // 设置当前日志
  const setCurrentLog = (log: string) => {
    currentLog.value = log
    currentFields.value = []
  }

  // 设置选中的文本
  const setSelection = (text: string, start: number, end: number) => {
    selectedText.value = text
    selectionStart.value = start
    selectionEnd.value = end
  }

  // 添加字段
  const addField = (fieldData: {
    type: string
    name: string
    isFixedLength: boolean
    isSeparator: boolean
  }) => {
    if (!selectedText.value || selectionStart.value === -1) return

    const newField: LogField = {
      id: `field-${Date.now()}`,
      text: selectedText.value,
      start: selectionStart.value,
      end: selectionEnd.value,
      type: fieldData.type as any,
      name: fieldData.name,
      isFixedLength: fieldData.isFixedLength,
      isSeparator: fieldData.isSeparator,
      fixedLength: fieldData.isFixedLength ? selectedText.value.length : undefined
    }

    currentFields.value.push(newField)
    
    // 如果设置为分割点，清除其他字段的分割点标记
    if (fieldData.isSeparator) {
      currentFields.value.forEach(field => {
        if (field.id !== newField.id) {
          field.isSeparator = false
        }
      })
    }

    // 清除选择
    clearSelection()
  }

  // 更新字段
  const updateField = (fieldId: string, updates: Partial<LogField>) => {
    const fieldIndex = currentFields.value.findIndex(f => f.id === fieldId)
    if (fieldIndex !== -1) {
      currentFields.value[fieldIndex] = {
        ...currentFields.value[fieldIndex],
        ...updates
      }

      // 如果设置为分割点，清除其他字段的分割点标记
      if (updates.isSeparator) {
        currentFields.value.forEach(field => {
          if (field.id !== fieldId) {
            field.isSeparator = false
          }
        })
      }
    }
  }

  // 删除字段
  const deleteField = (fieldId: string) => {
    currentFields.value = currentFields.value.filter(f => f.id !== fieldId)
  }

  // 清除选择
  const clearSelection = () => {
    selectedText.value = ''
    selectionStart.value = -1
    selectionEnd.value = -1
  }

  // 添加新规则
  const addFormatRules = (formatData: { name: string; description: string }) => {
    const separatorField = currentFields.value.find(f => f.isSeparator)
    
    const newRule: LogFormat = {
      id: `rule-${Date.now()}`,
      name: formatData.name,
      description: formatData.description,
      fields: [...currentFields.value],
      separatorFieldId: separatorField?.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    formatRules.value.push(newRule)
    saveFormatRules()
    resetCurrent()
  }

  // 更新规则
  const updateFormatRule = (ruleId: string, ruleData: { name: string; description: string }) => {
    const ruleIndex = formatRules.value.findIndex(r => r.id === ruleId)
    if (ruleIndex !== -1) {
      const separatorField = currentFields.value.find(f => f.isSeparator)
      
      formatRules.value[ruleIndex] = {
        ...formatRules.value[ruleIndex],
        name: ruleData.name,
        description: ruleData.description,
        fields: [...currentFields.value],
        separatorFieldId: separatorField?.id,
        updatedAt: new Date()
      }
      saveFormatRules()
      resetCurrent()
    }
  }

  // 删除规则
  const deleteFormatRule = (ruleId: string) => {
    formatRules.value = formatRules.value.filter(r => r.id !== ruleId)
    saveFormatRules()
  }

  // 开始编辑规则
  const startEditRule = (rule: LogFormat) => {
    editingRule.value = rule
    currentLog.value = rule.fields.map(f => f.text).join(' ')
    currentFields.value = [...rule.fields]
  }

  // 重置当前状态
  const resetCurrent = () => {
    currentLog.value = ''
    currentFields.value = []
    editingRule.value = null
    clearSelection()
  }

  // 计算属性
  const hasRules = computed(() => formatRules.value.length > 0)
  const isEditing = computed(() => editingRule.value !== null)
  const hasSelection = computed(() => selectedText.value.length > 0)
  const separatorField = computed(() => currentFields.value.find(f => f.isSeparator))

  // 初始化加载
  loadFormatRules()

  // 测试规则解析日志
const testParseLog = (logLine: string, rule: LogFormat) => {
  const result: Record<string, string> = {}
  let remainingLog = logLine.trim()
  
  // 查找分割点字段
  const separatorField = rule.fields.find(f => f.isSeparator)
  
  // 处理分割点前的字段
  if (separatorField) {
    const separatorIndex = remainingLog.indexOf(separatorField.text)
    if (separatorIndex !== -1) {
      const prefix = remainingLog.substring(0, separatorIndex + separatorField.text.length)
      remainingLog = remainingLog.substring(separatorIndex + separatorField.text.length).trim()
      
      // 解析前缀部分
      let currentIndex = 0
      for (const field of rule.fields) {
        if (field.isSeparator) break // 分割点后面的字段不在这里处理
        
        if (field.isFixedLength && field.fixedLength) {
          // 固定长度字段
          if (currentIndex + field.fixedLength <= prefix.length) {
            const fieldText = prefix.substring(currentIndex, currentIndex + field.fixedLength).trim()
            result[field.name] = fieldText
            currentIndex += field.fixedLength
          }
        } else {
          // 非固定长度字段 - 查找字段文本
          const fieldIndex = prefix.indexOf(field.text, currentIndex)
          if (fieldIndex !== -1) {
            result[field.name] = field.text
            currentIndex = fieldIndex + field.text.length
          }
        }
        
        // 跳过空格
        while (currentIndex < prefix.length && prefix[currentIndex] === ' ') {
          currentIndex++
        }
      }
      
      // 添加分割点字段
      result[separatorField.name] = separatorField.text
    }
  }
  
  // 剩余部分作为日志正文
  const messageField = rule.fields.find(f => f.type === 'message')
  if (messageField && remainingLog) {
    result[messageField.name] = remainingLog
  }
  
  return result
}

// 批量测试多条日志
const batchTestParse = (logLines: string[], rule: LogFormat) => {
  return logLines.map(logLine => ({
    log: logLine,
    result: testParseLog(logLine, rule)
  }))
}

  return {
    // 状态
    formatRules,
    currentLog,
    selectedText,
    selectionStart,
    selectionEnd,
    currentFields,
    editingRule,
    fieldTypes,
    
    // 计算属性
    hasRules,
    isEditing,
    hasSelection,
    separatorField,
    
    // 方法
    loadFormatRules,
    saveFormatRules,
    setCurrentLog,
    setSelection,
    addField,
    updateField,
    deleteField,
    clearSelection,
    addFormatRules,
    updateFormatRule,
    deleteFormatRule,
    startEditRule,
    resetCurrent,
    testParseLog,
    batchTestParse
  }
})