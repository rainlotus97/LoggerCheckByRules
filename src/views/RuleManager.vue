<template>
  <div class="rule-management">
    <div class="container">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-content">
          <h1>流程规则管理</h1>
          <p>创建和管理日志校验规则，用于验证业务流程执行</p>
        </div>
        <div class="header-actions">
          <!-- 新增导入规则按钮 -->
          <button @click="showImportDialog = true" class="btn btn-outline">
            <span class="icon">📥</span> 导入规则
          </button>
          <button @click="handleExport" class="btn btn-outline" :disabled="rulesCount === 0">
            <span class="icon">📤</span> 导出规则
          </button>
          <button @click="showCreateForm = true" class="btn btn-primary">
            <span class="icon">+</span> 新增规则
          </button>
        </div>
      </div>

      <!-- 规则列表 -->
      <div class="rules-section">
        <div class="section-header">
          <h2>规则列表</h2>
          <div class="search-box">
            <input v-model="searchQuery" type="text" placeholder="搜索规则..." class="search-input">
            <span class="search-icon">🔍</span>
          </div>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <span>加载规则中...</span>
        </div>

        <div v-else-if="filteredRules.length === 0" class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>暂无规则</h3>
          <p>创建您的第一个规则来开始验证日志流程</p>
          <div class="empty-actions">
            <button @click="showCreateForm = true" class="btn btn-primary">
              创建规则
            </button>
            <button @click="showImportDialog = true" class="btn btn-outline">
              导入规则
            </button>
          </div>
        </div>

        <div v-else class="rules-grid">
          <div v-for="rule in filteredRules" :key="rule.id" class="rule-card">
            <div class="rule-header">
              <h3 class="rule-name">{{ rule.name }}</h3>
              <div class="rule-actions">
                <button @click="editRule(rule)" class="btn-icon" title="编辑">
                  <span class="icon">✏️</span>
                </button>
                <button @click="deleteRule(rule)" class="btn-icon" title="删除">
                  <span class="icon">🗑️</span>
                </button>
              </div>
            </div>

            <p class="rule-description">{{ rule.description }}</p>

            <div class="rule-meta">
              <div class="meta-item">
                <span class="meta-label">步骤数:</span>
                <span class="meta-value">{{ rule.steps.length }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">开始模式:</span>
                <code class="meta-value pattern">{{ rule.startPattern }}</code>
              </div>
            </div>

            <div class="rule-footer">
              <span class="update-time">
                更新于 {{ formatDate(rule.updatedAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 创建/编辑规则模态框 -->
      <div v-if="showCreateForm || showEditForm" class="modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <h2>{{ showEditForm ? '编辑规则' : '创建新规则' }}</h2>
            <button @click="closeForm" class="btn-close">×</button>
          </div>
          <div class="modal-body">
            <RuleForm :rule="editingRule" :mode="showEditForm ? 'edit' : 'create'" @submit="handleFormSubmit"
              @cancel="closeForm" />
          </div>
        </div>
      </div>

      <!-- 导入规则模态框 -->
      <div v-if="showImportDialog" class="modal-overlay">
        <div class="modal-container import-modal">
          <div class="modal-header">
            <h2>导入规则</h2>
            <button @click="closeImportDialog" class="btn-close">×</button>
          </div>
          <div class="modal-body">
            <div class="import-content">
              <div class="upload-area" :class="{ 'drag-over': isDragOver }" @dragover.prevent="handleDragOver"
                @dragleave.prevent="handleDragLeave" @drop.prevent="handleDrop">
                <input ref="fileInput" type="file" accept=".json" @change="handleFileSelect" class="file-input">
                <div class="upload-icon">📁</div>
                <h3>选择规则文件</h3>
                <p>拖放 JSON 文件到这里，或点击选择文件</p>
                <button @click="triggerFileInput" class="btn btn-outline">
                  选择文件
                </button>
              </div>

              <!-- 导入选项 -->
              <div class="import-options">
                <label class="option-item">
                  <input v-model="importOptions.merge" type="checkbox" class="option-checkbox">
                  <span class="option-text">合并到现有规则</span>
                  <small class="option-hint">如果取消勾选，将替换所有现有规则</small>
                </label>
              </div>

              <!-- 导入结果 -->
              <div v-if="importResult" class="import-result" :class="importResult.type">
                <div class="result-icon">
                  {{ importResult.type === 'success' ? '✅' : '❌'
                  }}
                </div>
                <div class="result-content">
                  <h4>{{ importResult.title }}</h4>
                  <p>{{ importResult.message }}</p>
                  <div v-if="importResult.details" class="result-details">
                    {{ importResult.details }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="closeImportDialog" class="btn btn-outline">
              取消
            </button>
            <button @click="confirmImport" class="btn btn-primary" :disabled="!selectedFile || importInProgress">
              <span v-if="importInProgress" class="loading-spinner"></span>
              {{ importInProgress ? '导入中...' : '确认导入' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 删除确认对话框 -->
      <div v-if="showDeleteConfirm" class="modal-overlay">
        <div class="modal-container confirm-modal">
          <div class="modal-header">
            <h2>确认删除</h2>
          </div>
          <div class="modal-body">
            <p>确定要删除规则 "<strong>{{ deletingRule?.name }}</strong>" 吗？此操作不可撤销。</p>
          </div>
          <div class="modal-footer">
            <button @click="showDeleteConfirm = false" class="btn btn-outline">
              取消
            </button>
            <button @click="confirmDelete" class="btn btn-danger">
              确认删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRuleStore } from '@/stores/RulesStore';
import RuleForm from '@/components/RuleForm.vue';
import type { ValidationRule, RuleFormData } from '@/types/rule';

const ruleStore = useRuleStore();
const { rules, loading, rulesCount } = storeToRefs(ruleStore);
const {
  loadRules,
  addRule,
  updateRule,
  deleteRuleById,
  exportRules,
  importRules
} = ruleStore;

// 响应式数据
const showCreateForm = ref(false);
const showEditForm = ref(false);
const showImportDialog = ref(false);
const showDeleteConfirm = ref(false);
const searchQuery = ref('');
const editingRule = ref<ValidationRule | undefined>(undefined);
const deletingRule = ref<ValidationRule | null>(null);

// 导入相关状态
const fileInput = ref<HTMLInputElement>();
const selectedFile = ref<File | null>(null);
const isDragOver = ref(false);
const importInProgress = ref(false);
const importResult = ref<{
  type: 'success' | 'error';
  title: string;
  message: string;
  details?: string;
} | null>(null);

// 导入选项
const importOptions = ref({
  merge: true
});

// 计算属性
const filteredRules = computed(() => {
  if (!searchQuery.value.trim()) {
    return rules.value;
  }

  const query = searchQuery.value.toLowerCase();
  return rules.value.filter(rule =>
    rule.name.toLowerCase().includes(query) ||
    rule.description.toLowerCase().includes(query) ||
    rule.startPattern.toLowerCase().includes(query)
  );
});

// 生命周期
onMounted(() => {
  loadRules();
});

// 方法
const editRule = (rule: ValidationRule) => {
  editingRule.value = rule;
  showEditForm.value = true;
};

const deleteRule = (rule: ValidationRule) => {
  deletingRule.value = rule;
  showDeleteConfirm.value = true;
};

const confirmDelete = () => {
  if (deletingRule.value) {
    deleteRuleById(deletingRule.value.id);
    showDeleteConfirm.value = false;
    deletingRule.value = null;
  }
};

const handleFormSubmit = (formData: RuleFormData) => {
  if (showEditForm.value && editingRule.value) {
    updateRule(editingRule.value.id, formData);
  } else {
    addRule(formData);
  }
  closeForm();
};

const closeForm = () => {
  showCreateForm.value = false;
  showEditForm.value = false;
  editingRule.value = undefined;
};

const handleExport = () => {
  if (rulesCount.value > 0) {
    exportRules();
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// 导入相关方法
const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    selectedFile.value = file;
    importResult.value = null; // 清除之前的结果
  }
};

const handleDragOver = () => {
  isDragOver.value = true;
};

const handleDragLeave = () => {
  isDragOver.value = false;
};

const handleDrop = (event: DragEvent) => {
  isDragOver.value = false;
  const file = event.dataTransfer?.files[0];
  if (file && file.type === 'application/json') {
    selectedFile.value = file;
    importResult.value = null; // 清除之前的结果
  }
};

const confirmImport = async () => {
  if (!selectedFile.value) return;

  importInProgress.value = true;
  importResult.value = null;

  try {
    await importRules(selectedFile.value, importOptions.value.merge);

    importResult.value = {
      type: 'success',
      title: '导入成功',
      message: `成功导入规则文件：${selectedFile.value.name}`,
      details: `当前共有 ${rules.value.length} 个规则`
    };

    // 2秒后自动关闭对话框
    setTimeout(() => {
      closeImportDialog();
    }, 2000);

  } catch (error) {
    console.error('导入失败:', error);
    importResult.value = {
      type: 'error',
      title: '导入失败',
      message: '文件格式不正确或解析失败',
      details: error instanceof Error ? error.message : '未知错误'
    };
  } finally {
    importInProgress.value = false;
  }
};

const closeImportDialog = () => {
  showImportDialog.value = false;
  selectedFile.value = null;
  importResult.value = null;
  isDragOver.value = false;

  // 重置文件输入
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};
</script>

<style scoped>
.rule-management {
  min-height: 100vh;
  background: #f8fafc;
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  background: white;
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.header-content h1 {
  margin: 0 0 8px 0;
  font-size: 2em;
  font-weight: 700;
  color: #1f2937;
}

.header-content p {
  margin: 0;
  color: #6b7280;
  font-size: 1.1em;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.rules-section {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.section-header h2 {
  margin: 0;
  font-size: 1.5em;
  font-weight: 600;
  color: #1f2937;
}

.search-box {
  position: relative;
  min-width: 300px;
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95em;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 4em;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #374151;
  font-size: 1.25em;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #6b7280;
}

.empty-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

.rule-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  background: white;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.rule-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
  transform: translateY(-2px);
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.rule-name {
  margin: 0;
  font-size: 1.2em;
  font-weight: 600;
  color: #1f2937;
  flex: 1;
}

.rule-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 0.9em;
}

.btn-icon:hover {
  background: #f3f4f6;
}

.btn-icon.btn-danger:hover {
  background: #fef2f2;
}

.rule-description {
  color: #6b7280;
  font-size: 0.9em;
  margin: 0 0 16px 0;
  line-height: 1.5;
  flex: 1;
}

.rule-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85em;
}

.meta-label {
  color: #6b7280;
  min-width: 70px;
}

.meta-value {
  color: #374151;
  font-weight: 500;
}

.meta-value.pattern {
  background: #f9fafb;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 0.8em;
  color: #4b5563;
}

.rule-footer {
  border-top: 1px solid #f3f4f6;
  padding-top: 12px;
  margin-top: auto;
}

.update-time {
  color: #9ca3af;
  font-size: 0.8em;
}

/* 模态框样式 */
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
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.1);
}

.import-modal {
  max-width: 500px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5em;
  font-weight: 600;
  color: #1f2937;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  flex: 1;
  overflow: auto;
  padding: 24px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 24px;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.confirm-modal {
  max-width: 400px;
}

/* 导入相关样式 */
.import-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  background: #f9fafb;
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.upload-icon {
  font-size: 3em;
  margin-bottom: 16px;
  opacity: 0.7;
}

.upload-area h3 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 1.2em;
}

.upload-area p {
  margin: 0 0 20px 0;
  color: #6b7280;
}

.import-options {
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.option-item {
  display: flex;
  flex-direction: row;
  gap: 4px;
  cursor: pointer;
}

.option-checkbox {
  margin-right: 8px;
  transform: scale(1.1);
}

.option-text {
  font-weight: 500;
  color: #374151;
  font-size: 0.95em;
}

.option-hint {
  color: #6b7280;
  font-size: 0.85em;
  margin-left: 24px;
}

.import-result {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid;
}

.import-result.success {
  background: #f0f9ff;
  border-color: #bae6fd;
  color: #0369a1;
}

.import-result.error {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.result-icon {
  font-size: 1.5em;
  flex-shrink: 0;
}

.result-content {
  flex: 1;
}

.result-content h4 {
  margin: 0 0 4px 0;
  font-size: 1em;
  font-weight: 600;
}

.result-content p {
  margin: 0 0 8px 0;
  font-size: 0.9em;
}

.result-details {
  font-size: 0.85em;
  opacity: 0.8;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-right: 8px;
}

/* 按钮样式 */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 0.9em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-outline {
  background: transparent;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-outline:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.icon {
  font-size: 1.1em;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .rule-management {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
    padding: 24px;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .btn {
    flex: 1;
    justify-content: center;
  }

  .rules-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: auto;
  }

  .modal-container {
    width: 95%;
    margin: 0;
  }

  .modal-footer {
    flex-direction: column;
  }

  .empty-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 20px;
  }

  .header-content h1 {
    font-size: 1.5em;
  }

  .rules-section {
    padding: 20px;
  }

  .rule-card {
    padding: 16px;
  }

  .modal-body {
    padding: 16px;
  }

  .upload-area {
    padding: 30px 16px;
  }
}
</style>