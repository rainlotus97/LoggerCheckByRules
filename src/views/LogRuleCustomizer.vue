<template>
  <div class="simple-log-rule">
    <!-- 头部 -->
    <div class="header">
      <h2>📝 日志规则定制</h2>
      <p>选择日志中的字段，定义解析规则</p>
    </div>

    <div class="main-content">
      <!-- 左侧：日志编辑区 -->
      <div class="edit-section">
        <!-- 日志输入 -->
        <div class="log-input-card">
          <h3>1. 输入日志</h3>
          <textarea v-model="logStore.currentLog" @select="handleTextSelect"
            placeholder="粘贴或输入日志内容，例如：2024-01-15 14:23:45.123 2847 I com.example.reader/HwBooks/ReaderMainPage startplay 开始播放请求，书籍ID: 88763"
            class="log-textarea" rows="4"></textarea>
        </div>

        <!-- 字段标记 -->
        <div class="fields-card">
          <h3>2. 标记字段</h3>

          <!-- 选择提示 -->
          <div v-if="logStore.hasSelection" class="selection-prompt">
            <div class="selected-text">
              <span class="label">已选择:</span>
              <code>"{{ logStore.selectedText }}"</code>
            </div>
            <div class="field-form">
              <div class="form-row">
                <div class="form-group">
                  <label>字段类型:</label>
                  <select v-model="newField.type" class="form-select">
                    <option v-for="type in logStore.fieldTypes" :key="type.value" :value="type.value">
                      {{ type.icon }} {{ type.label }}
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label>字段名称:</label>
                  <input v-model="newField.name" type="text" class="form-input"
                    :placeholder="getDefaultName(newField.type)" />
                </div>
              </div>

              <div class="form-row">
                <label class="checkbox-label">
                  <input v-model="newField.isFixedLength" type="checkbox" />
                  固定长度
                </label>

                <label class="checkbox-label">
                  <input v-model="newField.isSeparator" type="checkbox" />
                  设为分割点
                </label>
              </div>

              <div class="form-actions">
                <button @click="addField" class="btn btn-primary" :disabled="!canAddField">
                  添加字段
                </button>
                <button @click="logStore.clearSelection()" class="btn btn-secondary">
                  取消
                </button>
              </div>
            </div>
          </div>

          <!-- 字段列表 -->
          <div v-if="logStore.currentFields.length > 0" class="fields-list">
            <h4>已标记的字段</h4>
            <div class="fields-grid">
              <div v-for="field in logStore.currentFields" :key="field.id" class="field-item"
                :class="{ 'is-separator': field.isSeparator }">
                <div class="field-header">
                  <span class="field-type">{{ getTypeIcon(field.type) }} {{ getTypeLabel(field.type)
                    }}</span>
                  <div class="field-actions">
                    <button @click="editField(field)" class="btn-icon" title="编辑">
                      ✏️
                    </button>
                    <button @click="logStore.deleteField(field.id)" class="btn-icon" title="删除">
                      🗑️
                    </button>
                  </div>
                </div>

                <div class="field-content">
                  <div class="field-text">
                    <span class="label">内容:</span>
                    <code>{{ field.text }}</code>
                  </div>

                  <div class="field-info">
                    <span class="field-name">{{ field.name }}</span>
                    <span v-if="field.isFixedLength" class="badge">
                      固定长度: {{ field.fixedLength }}
                    </span>
                    <span v-if="field.isSeparator" class="badge separator">
                      分割点
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 使用提示 -->
          <div v-else class="help-text">
            <p>💡 <strong>使用说明:</strong></p>
            <ul>
              <li>在日志文本中选择一段文字</li>
              <li>选择字段类型并设置属性</li>
              <li>标记分割点字段，其后的内容将作为日志正文</li>
              <li>保存规则以便后续使用</li>
            </ul>
          </div>
        </div>

        <!-- 规则保存 -->
        <div v-if="logStore.currentFields.length > 0" class="save-card">
          <h3>3. 保存规则</h3>
          <div class="save-form">
            <div class="form-group">
              <label>规则名称:</label>
              <input v-model="ruleForm.name" type="text" class="form-input" placeholder="输入规则名称" />
            </div>

            <div class="form-group">
              <label>规则描述:</label>
              <textarea v-model="ruleForm.description" class="form-input" rows="2" placeholder="描述规则用途"></textarea>
            </div>

            <div class="form-actions">
              <button @click="saveRule" :disabled="!canSaveRule" class="btn btn-primary">
                {{ logStore.isEditing ? '更新规则' : '保存规则' }}
              </button>
              <button @click="cancelEdit" class="btn btn-secondary">
                重置
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：规则列表 -->
      <div class="rules-section">
        <div class="rules-card">
          <h3>已保存的规则</h3>

          <div v-if="logStore.hasRules" class="rules-list">
            <div v-for="rule in logStore.formatRules" :key="rule.id" class="rule-item">
              <div class="rule-header">
                <h4>{{ rule.name }}</h4>
                <div class="rule-actions">
                  <button @click="editRule(rule)" class="btn-icon" title="编辑">
                    ✏️
                  </button>
                  <button @click="testRule(rule)" class="btn-icon" title="测试规则">
                    🧪
                  </button>
                  <button @click="deleteRule(rule.id)" class="btn-icon" title="删除">
                    🗑️
                  </button>
                </div>
              </div>

              <p class="rule-desc">{{ rule.description }}</p>

              <div class="rule-stats">
                <span class="stat">{{ rule.fields.length }} 个字段</span>
                <span v-if="rule.separatorFieldId" class="stat">有分割点</span>
                <span class="stat">{{ formatDate(rule.updatedAt) }}</span>
              </div>
            </div>
          </div>

          <div v-else class="empty-rules">
            <p>暂无保存的规则</p>
          </div>
        </div>
      </div>

      <!-- 测试模态框 -->
      <div v-if="showTestModal" class="modal-overlay" @click="closeTestModal">
        <div class="modal-content test-modal" @click.stop>
          <div class="modal-header">
            <h3>测试规则: {{ testingRule?.name }}</h3>
            <button @click="closeTestModal" class="modal-close">×</button>
          </div>

          <div class="modal-body">
            <!-- 测试日志输入 -->
            <div class="test-input-section">
              <h4>输入测试日志</h4>
              <textarea v-model="testLogInput" placeholder="输入要测试的日志内容..." class="test-textarea" rows="3"></textarea>
              <div class="test-actions">
                <button @click="runTest" class="btn btn-primary" :disabled="!testLogInput.trim()">
                  测试解析
                </button>
                <button @click="addToBatch" class="btn btn-secondary" :disabled="!testLogInput.trim()">
                  添加到批量测试
                </button>
              </div>
            </div>

            <!-- 批量测试 -->
            <div v-if="batchTestLogs.length > 0" class="batch-test-section">
              <h4>批量测试</h4>
              <div class="batch-logs">
                <div v-for="(log, index) in batchTestLogs" :key="index" class="batch-log-item">
                  <span class="log-preview">{{ log }}</span>
                  <button @click="removeFromBatch(index)" class="btn-icon small">×</button>
                </div>
              </div>
              <button @click="runBatchTest" class="btn btn-outline">
                运行批量测试 ({{ batchTestLogs.length }} 条)
              </button>
            </div>

            <!-- 测试结果 -->
            <div v-if="testResults.length > 0" class="test-results">
              <h4>测试结果</h4>
              <div class="results-list">
                <div v-for="(result, index) in testResults" :key="index" class="result-item">
                  <div class="result-header">
                    <span class="result-label">测试 {{ index + 1 }}</span>
                    <span class="result-status" :class="getResultStatus(result)">
                      {{ getResultStatusText(result) }}
                    </span>
                  </div>
                  <div class="original-log">
                    <strong>原始日志:</strong>
                    <code>{{ result.log }}</code>
                  </div>
                  <div class="parsed-fields">
                    <strong>解析结果:</strong>
                    <div class="fields-grid">
                      <div v-for="(value, fieldName) in result.result" :key="fieldName" class="field-result">
                        <span class="field-name">{{ fieldName }}:</span>
                        <code class="field-value">{{ value || '(空)' }}</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 无结果提示 -->
            <div v-else-if="hasTested" class="no-results">
              <p>暂无测试结果，请输入日志进行测试</p>
            </div>
          </div>
        </div>
      </div>


      <!-- 字段编辑模态框 -->
      <div v-if="editingField" class="modal-overlay" @click="closeEditModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>编辑字段</h3>
            <button @click="closeEditModal" class="modal-close">×</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>字段类型:</label>
              <select v-model="editingField.type" class="form-select">
                <option v-for="type in logStore.fieldTypes" :key="type.value" :value="type.value">
                  {{ type.icon }} {{ type.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>字段名称:</label>
              <input v-model="editingField.name" type="text" class="form-input" />
            </div>

            <div class="form-row">
              <label class="checkbox-label">
                <input v-model="editingField.isFixedLength" type="checkbox" />
                固定长度
              </label>

              <label class="checkbox-label">
                <input v-model="editingField.isSeparator" type="checkbox" />
                设为分割点
              </label>
            </div>

            <div class="modal-actions">
              <button @click="saveFieldEdit" class="btn btn-primary">保存</button>
              <button @click="closeEditModal" class="btn btn-secondary">取消</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLogFormatStore } from '@/stores/LogFormatStore'

const logStore = useLogFormatStore()
const editingField = ref<any>(null)

const showTestModal = ref(false)
const testingRule = ref<any>(null)
const testLogInput = ref('')
const batchTestLogs = ref<string[]>([])
const testResults = ref<Array<{ log: string, result: Record<string, string> }>>([])
const hasTested = ref(false)

// 测试方法
const testRule = (rule: any) => {
  testingRule.value = rule
  showTestModal.value = true
  testLogInput.value = ''
  batchTestLogs.value = []
  testResults.value = []
  hasTested.value = false
}

const closeTestModal = () => {
  showTestModal.value = false
  testingRule.value = null
  testLogInput.value = ''
  batchTestLogs.value = []
  testResults.value = []
  hasTested.value = false
}

const runTest = () => {
  if (!testingRule.value || !testLogInput.value.trim()) return

  const result = logStore.testParseLog(testLogInput.value.trim(), testingRule.value)
  testResults.value = [{
    log: testLogInput.value.trim(),
    result
  }]
  hasTested.value = true
}

const addToBatch = () => {
  if (testLogInput.value.trim()) {
    batchTestLogs.value.push(testLogInput.value.trim())
    testLogInput.value = ''
  }
}

const removeFromBatch = (index: number) => {
  batchTestLogs.value.splice(index, 1)
}

const runBatchTest = () => {
  if (!testingRule.value || batchTestLogs.value.length === 0) return

  const results = logStore.batchTestParse(batchTestLogs.value, testingRule.value)
  testResults.value = results
  hasTested.value = true
}
// 结果状态判断
const getResultStatus = (result: any) => {
  const fields = Object.keys(result.result)
  const hasEmptyFields = fields.some(field => !result.result[field])
  const hasData = fields.some(field => result.result[field])

  if (!hasData) return 'error'
  if (hasEmptyFields) return 'warning'
  return 'success'
}
const getResultStatusText = (result: any) => {
  const status = getResultStatus(result)
  const statusMap = {
    success: '✅ 解析成功',
    warning: '⚠️ 部分字段为空',
    error: '❌ 解析失败'
  }
  return statusMap[status]
}

// 新字段表单
const newField = ref({
  type: 'timestamp',
  name: '',
  isFixedLength: false,
  isSeparator: false
})

// 规则表单
const ruleForm = ref({
  name: '',
  description: ''
})

// 计算属性
const canAddField = computed(() => {
  return logStore.hasSelection && newField.value.name.trim().length > 0
})

const canSaveRule = computed(() => {
  return ruleForm.value.name.trim().length > 0 &&
    logStore.currentFields.length > 0
})

// 处理方法
const handleTextSelect = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  const start = target.selectionStart
  const end = target.selectionEnd
  const selectedText = target.value.substring(start, end)

  if (selectedText.trim().length > 0) {
    logStore.setSelection(selectedText, start, end)
    // 为新字段设置默认名称
    newField.value.name = getDefaultName(newField.value.type)
  }
}

const addField = () => {
  if (!canAddField.value) return

  logStore.addField({ ...newField.value })
  // 重置表单
  newField.value = {
    type: 'timestamp',
    name: '',
    isFixedLength: false,
    isSeparator: false
  }
}

const editField = (field: any) => {
  editingField.value = { ...field }
}

const saveFieldEdit = () => {
  if (editingField.value) {
    logStore.updateField(editingField.value.id, { ...editingField.value })
    closeEditModal()
  }
}

const closeEditModal = () => {
  editingField.value = null
}

const saveRule = () => {
  if (!canSaveRule.value) return

  if (logStore.isEditing) {
    logStore.updateFormatRule(logStore.editingRule!.id, ruleForm.value)
  } else {
    logStore.addFormatRules(ruleForm.value)
  }
}

const editRule = (rule: any) => {
  logStore.startEditRule(rule)
  ruleForm.value = {
    name: rule.name,
    description: rule.description
  }

  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const deleteRule = (ruleId: string) => {
  if (confirm('确定要删除这个规则吗？')) {
    logStore.deleteFormatRule(ruleId)
  }
}

const cancelEdit = () => {
  logStore.resetCurrent()
  ruleForm.value = { name: '', description: '' }
}

// 工具函数
const getDefaultName = (type: string) => {
  const typeMap: Record<string, string> = {
    timestamp: '时间戳',
    level: '日志级别',
    package: '包名',
    tag: '标签',
    message: '日志正文',
    custom: '自定义字段'
  }
  return typeMap[type] || '字段'
}

const getTypeLabel = (type: string) => {
  const typeInfo = logStore.fieldTypes.find(t => t.value === type)
  return typeInfo?.label || '未知'
}

const getTypeIcon = (type: string) => {
  const typeInfo = logStore.fieldTypes.find(t => t.value === type)
  return typeInfo?.icon || '❓'
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric'
  }).format(date)
}

// 监听字段类型变化，更新默认名称
import { watch } from 'vue'
watch(() => newField.value.type, (newType) => {
  if (!newField.value.name || newField.value.name === getDefaultName(newField.value.type)) {
    newField.value.name = getDefaultName(newType)
  }
})

onMounted(() => {
  logStore.loadFormatRules()
})
</script>


<style scoped lang="less">
// 测试模态框样式
.test-modal {
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.test-input-section {
  margin-bottom: 24px;
  flex-shrink: 0;

  h4 {
    margin: 0 0 12px 0;
    color: #333;
    font-size: 1.1rem;
  }
}

.test-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 14px;
  resize: vertical;
  margin-bottom: 12px;

  &:focus {
    outline: none;
    border-color: #4a90e2;
  }
}

.test-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;

  .btn {
    flex: 1;
  }
}

.batch-test-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  flex-shrink: 0;

  h4 {
    margin: 0 0 12px 0;
    color: #333;
    font-size: 1.1rem;
  }
}

.batch-logs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
  max-height: 120px;
  min-height: 40px;
  overflow-y: auto;
  flex-shrink: 0;

  // 确保滚动条可见
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
}

.batch-log-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  flex-shrink: 0;

  .log-preview {
    flex: 1;
    font-size: 12px;
    color: #495057;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-icon.small {
    padding: 2px;
    font-size: 12px;
    flex-shrink: 0;
  }
}

.test-results {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 200px;
  overflow: hidden;

  h4 {
    margin: 0 0 16px 0;
    color: #333;
    font-size: 1.1rem;
    flex-shrink: 0;
  }
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;

  // 确保滚动条可见
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
}

.result-item {
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 16px;
  background: white;
  flex-shrink: 0;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f3f4;
}

.result-label {
  font-weight: 500;
  color: #495057;
}

.result-status {
  font-size: 12px;
  font-weight: 500;

  &.success {
    color: #28a745;
  }

  &.warning {
    color: #ffc107;
  }

  &.error {
    color: #dc3545;
  }
}

.original-log {
  margin-bottom: 12px;

  strong {
    color: #495057;
    margin-right: 8px;
  }

  code {
    background: #f8f9fa;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 13px;
    color: #495057;
  }
}

.parsed-fields {
  strong {
    display: block;
    margin-bottom: 8px;
    color: #495057;
  }
}

.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.field-result {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;

  .field-name {
    font-size: 12px;
    color: #6c757d;
    font-weight: 500;
  }

  .field-value {
    font-size: 13px;
    color: #495057;
    font-family: 'Monaco', 'Consolas', monospace;
    word-break: break-all;
  }
}

.no-results {
  text-align: center;
  padding: 40px 20px;
  color: #6c757d;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-outline {
  background: transparent;
  border: 1px solid #6c757d;
  color: #6c757d;

  &:hover {
    background: #6c757d;
    color: white;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .test-modal {
    width: 95%;
    margin: 20px auto;
  }

  .test-actions {
    flex-direction: column;
  }

  .fields-grid {
    grid-template-columns: 1fr;
  }

  .result-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .batch-logs {
    max-height: 100px;
  }

  .results-list {
    max-height: 300px;
  }
}

@media (max-width: 480px) {
  .modal-body {
    padding: 16px;
  }

  .batch-test-section {
    padding: 12px;
  }

  .batch-logs {
    max-height: 80px;
  }

  .results-list {
    max-height: 250px;
  }
}

// 暗色模式支持
@media (prefers-color-scheme: dark) {

  .test-input-section h4,
  .batch-test-section h4,
  .test-results h4 {
    color: #e2e8f0;
  }

  .test-textarea {
    background: #4a5568;
    border-color: #718096;
    color: #e2e8f0;

    &:focus {
      border-color: #63b3ed;
    }
  }

  .batch-test-section {
    background: #4a5568;
  }

  .batch-log-item {
    background: #2d3748;
    border-color: #4a5568;

    .log-preview {
      color: #a0aec0;
    }
  }

  .result-item {
    background: #2d3748;
    border-color: #4a5568;
  }

  .original-log {
    strong {
      color: #e2e8f0;
    }

    code {
      background: #4a5568;
      color: #e2e8f0;
    }
  }

  .parsed-fields strong {
    color: #e2e8f0;
  }

  .field-result {
    background: #4a5568;

    .field-name {
      color: #a0aec0;
    }

    .field-value {
      color: #e2e8f0;
    }
  }

  .no-results {
    color: #a0aec0;
  }

  .btn-outline {
    border-color: #a0aec0;
    color: #a0aec0;

    &:hover {
      background: #a0aec0;
      color: #2d3748;
    }
  }

  // 暗色模式下的滚动条
  .batch-logs::-webkit-scrollbar-track {
    background: #4a5568;
  }

  .batch-logs::-webkit-scrollbar-thumb {
    background: #718096;
  }

  .batch-logs::-webkit-scrollbar-thumb:hover {
    background: #a0aec0;
  }

  .results-list::-webkit-scrollbar-track {
    background: #4a5568;
  }

  .results-list::-webkit-scrollbar-thumb {
    background: #718096;
  }

  .results-list::-webkit-scrollbar-thumb:hover {
    background: #a0aec0;
  }
}

// 其他样式保持不变...
.simple-log-rule {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 30px;

  h2 {
    margin: 0 0 8px 0;
    color: #333;
    font-size: 1.8rem;
  }

  p {
    margin: 0;
    color: #666;
    font-size: 1rem;
  }
}

.main-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  align-items: start;
}

.edit-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.log-input-card,
.fields-card,
.save-card,
.rules-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 1.2rem;
  font-weight: 600;
}

.log-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 14px;
  resize: vertical;
  line-height: 1.4;

  &:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
  }
}

.selection-prompt {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.selected-text {
  margin-bottom: 12px;

  .label {
    font-weight: 500;
    color: #495057;
    margin-right: 8px;
  }

  code {
    background: #e9ecef;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: 'Monaco', 'Consolas', monospace;
    color: #495057;
  }
}

.field-form {
  .form-row {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .form-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;

    label {
      font-weight: 500;
      color: #495057;
      font-size: 14px;
    }
  }
}

.form-select,
.form-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #4a90e2;
  }
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #495057;
  cursor: pointer;

  input[type="checkbox"] {
    margin: 0;
  }
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.btn-primary {
    background: #4a90e2;
    color: white;

    &:hover:not(:disabled) {
      background: #357abd;
    }
  }

  &.btn-secondary {
    background: #6c757d;
    color: white;

    &:hover {
      background: #545b62;
    }
  }
}

.btn-icon {
  background: none;
  border: none;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;

  &:hover {
    background: #f8f9fa;
  }
}

.fields-list {
  h4 {
    margin: 0 0 12px 0;
    color: #495057;
    font-size: 1rem;
  }
}

.fields-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-item {
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 12px;

  &.is-separator {
    border-left: 4px solid #28a745;
    background: #f8fff9;
  }
}

.field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.field-type {
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.field-actions {
  display: flex;
  gap: 4px;
}

.field-content {
  .field-text {
    margin-bottom: 6px;

    .label {
      font-size: 12px;
      color: #6c757d;
      margin-right: 4px;
    }

    code {
      background: #f8f9fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 13px;
      color: #495057;
    }
  }
}

.field-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.field-name {
  font-weight: 500;
  color: #333;
}

.badge {
  background: #e9ecef;
  color: #495057;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 11px;

  &.separator {
    background: #d4edda;
    color: #155724;
  }
}

.help-text {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 16px;

  p {
    margin: 0 0 8px 0;
    font-weight: 500;
  }

  ul {
    margin: 0;
    padding-left: 20px;
    color: #6c757d;

    li {
      margin-bottom: 4px;
    }
  }
}

.save-form {
  .form-group {
    margin-bottom: 16px;

    label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: #495057;
    }
  }
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rule-item {
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 16px;

  .rule-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;

    h4 {
      margin: 0;
      color: #333;
      font-size: 1rem;
    }
  }

  .rule-desc {
    margin: 0 0 12px 0;
    color: #6c757d;
    font-size: 14px;
    line-height: 1.4;
  }

  .rule-stats {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: #6c757d;
  }
}

.empty-rules {
  text-align: center;
  padding: 40px 20px;
  color: #6c757d;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 0;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;

  h3 {
    margin: 0;
    color: #333;
  }
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6c757d;

  &:hover {
    color: #495057;
  }
}

.modal-body {
  padding: 24px;
}

.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .simple-log-rule {
    padding: 16px;
  }

  .main-content {
    grid-template-columns: 1fr;
  }

  .form-row {
    flex-direction: column;
    gap: 12px !important;
  }

  .field-form .form-row {
    flex-direction: column;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .simple-log-rule {
    padding: 12px;
  }

  .log-input-card,
  .fields-card,
  .save-card,
  .rules-card {
    padding: 16px;
  }

  .header h2 {
    font-size: 1.5rem;
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .simple-log-rule {
    background: transparent;
  }

  .log-input-card,
  .fields-card,
  .save-card,
  .rules-card {
    background: #2d3748;
    border-color: #4a5568;
  }

  .header h2,
  h3,
  h4 {
    color: #e2e8f0;
  }

  .header p {
    color: #a0aec0;
  }

  .log-textarea,
  .form-input,
  .form-select {
    background: #4a5568;
    border-color: #718096;
    color: #e2e8f0;

    &:focus {
      border-color: #63b3ed;
    }
  }

  .selection-prompt {
    background: #4a5568;
    border-color: #718096;
  }

  code {
    background: #718096 !important;
    color: #e2e8f0 !important;
  }

  .field-item {
    border-color: #4a5568;

    &.is-separator {
      background: #2d5c3d;
    }
  }

  .badge {
    background: #718096;
    color: #e2e8f0;

    &.separator {
      background: #48bb78;
      color: white;
    }
  }

  .help-text {
    background: #4a5568;
    color: #a0aec0;
  }

  .rule-item {
    border-color: #4a5568;
  }

  .modal-content {
    background: #2d3748;
    color: #e2e8f0;
  }

  .modal-header {
    border-color: #4a5568;
  }
}
</style>