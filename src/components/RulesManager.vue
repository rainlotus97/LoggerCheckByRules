<template>
  <div class="rules-manager">
    <!-- 头部操作栏 -->
    <div class="rules-header">
      <div class="header-left">
        <h2>规则管理</h2>
        <p>创建和管理日志分析规则 (已保存 {{ rules.length }} 个规则)</p>
      </div>
      <div class="header-actions">
        <button @click="showRuleEditor()" class="btn btn-primary">
          ➕ 创建规则
        </button>
        <button @click="importRules" class="btn btn-secondary">
          📥 导入规则
        </button>
        <button @click="exportAllRules" class="btn btn-outline">
          📤 导出所有规则
        </button>
        <div class="storage-actions">
          <button @click="showStorageMenu = !showStorageMenu" class="btn btn-icon">
            ⚙️
          </button>
          <div v-if="showStorageMenu" class="storage-menu">
            <button @click="backupRules" class="menu-item">
              💾 备份规则
            </button>
            <button @click="clearAllRules" class="menu-item danger">
              🗑️ 清空所有规则
            </button>
          </div>
        </div>
        <input ref="fileInput" type="file" accept=".json" multiple @change="handleFileImport" style="display: none" />
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteConfirm" class="delete-confirm-overlay" @click.self="cancelDelete">
      <div class="delete-confirm-dialog">
        <div class="dialog-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"
              fill="#E53E3E" />
          </svg>
        </div>
        <div class="dialog-content">
          <h3 class="dialog-title">删除规则</h3>
          <p class="dialog-message">确定要删除规则 <strong>"{{ ruleToDelete }}"</strong> 吗？此操作不可恢复。</p>
        </div>
        <div class="dialog-actions">
          <button @click="cancelDelete" class="btn btn-secondary">取消</button>
          <button @click="confirmDelete" class="btn btn-danger">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
              style="margin-right: 8px;">
              <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z"
                fill="currentColor" />
            </svg>
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 清空规则确认对话框 -->
    <div v-if="showClearConfirm" class="delete-confirm-overlay" @click.self="showClearConfirm = false">
      <div class="delete-confirm-dialog">
        <div class="dialog-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"
              fill="#E53E3E" />
          </svg>
        </div>
        <div class="dialog-content">
          <h3 class="dialog-title">清空所有规则</h3>
          <p class="dialog-message">确定要清空所有规则吗？此操作不可恢复，所有规则将被永久删除。</p>
        </div>
        <div class="dialog-actions">
          <button @click="showClearConfirm = false" class="btn btn-cancel">取消</button>
          <button @click="confirmClearAllRules" class="btn btn-delete">
            🗑️ 清空所有
          </button>
        </div>
      </div>
    </div>

    <!-- 规则列表 -->
    <div class="rules-list">
      <div v-if="rules.length === 0" class="empty-state">
        <div class="empty-icon">⚙️</div>
        <h3>暂无规则</h3>
        <p>创建第一个规则来开始分析日志</p>
        <button @click="showRuleEditor()" class="btn btn-primary">
          创建规则
        </button>
      </div>

      <div v-else class="rules-grid">
        <div v-for="rule in rules" :key="rule.name" class="rule-card">
          <div class="rule-header">
            <h3 class="rule-name">{{ rule.name }}</h3>
            <div class="rule-actions">
              <button @click="editRule(rule)" class="btn-icon" title="编辑">
                ✏️
              </button>
              <button @click="deleteRule(rule.name)" class="btn-icon" title="删除">
                🗑️
              </button>
              <button @click="exportRule(rule)" class="btn-icon" title="导出">
                📤
              </button>
            </div>
          </div>

          <p class="rule-description">{{ rule.description }}</p>

          <div class="rule-stats">
            <span class="stat">
              <strong>{{ rule.processRules.length }}</strong> 个过程规则
            </span>
            <span class="stat">
              <strong>{{ rule.successPatterns.length }}</strong> 个成功模式
            </span>
            <span class="stat">
              <strong>{{ rule.failedPatterns.length }}</strong> 个失败模式
            </span>
          </div>

          <div class="rule-processes">
            <div v-for="(process, index) in rule.processRules" :key="process.name" class="process-item">
              <span class="process-index">{{ index + 1 }}</span>
              <span class="process-name">{{ process.name }}</span>
              <span class="process-patterns">
                {{ process.patterns.join(', ') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 规则编辑器模态框 -->
    <div v-if="showEditor" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingRule ? '编辑规则' : '创建规则' }}</h3>
          <button @click="closeEditor" class="btn-close">×</button>
        </div>

        <div class="modal-body">
          <RuleEditor :rule="editingRule" @save="handleSaveRule" @cancel="closeEditor" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import RuleEditor from '@/components/RuleEditor.vue';
import { useRuleEngine } from '@/composables/useRuleEngine';
import { onMounted, ref } from 'vue';

// 正确使用规则引擎
const ruleEngine = useRuleEngine();
const {
  getRules,
  removeRule,
  addRule,
  exportRulesToFile,
  importRulesFromFile,
  clearRules
} = ruleEngine;

const rules = ref<any[]>([]);
const showEditor = ref(false);
const editingRule = ref<any>(null);
const fileInput = ref<HTMLInputElement>();
const showDeleteConfirm = ref(false);
const showClearConfirm = ref(false);
const showStorageMenu = ref(false);
const ruleToDelete = ref('');
const deleting = ref(false);

// 加载规则列表
const loadRules = () => {
  rules.value = getRules();
};

// 显示规则编辑器
const showRuleEditor = (rule?: any) => {
  editingRule.value = rule ? { ...rule } : null;
  showEditor.value = true;
  showStorageMenu.value = false;
};

// 编辑规则
const editRule = (rule: any) => {
  showRuleEditor(rule);
};

// 删除规则
const deleteRule = (ruleName: string) => {
  ruleToDelete.value = ruleName;
  showDeleteConfirm.value = true;
  showStorageMenu.value = false;
};

// 确认删除
const confirmDelete = async () => {
  deleting.value = true;

  try {
    await new Promise(resolve => setTimeout(resolve, 600));
    removeRule(ruleToDelete.value);
    loadRules();
  } catch (error) {
    console.error('删除失败:', error);
  } finally {
    deleting.value = false;
    showDeleteConfirm.value = false;
    ruleToDelete.value = '';
  }
};

// 取消删除
const cancelDelete = () => {
  showDeleteConfirm.value = false;
  ruleToDelete.value = '';
};

// 导出单个规则
const exportRule = (rule: any) => {
  try {
    const dataStr = JSON.stringify(rule, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${rule.name}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出规则失败:', error);
  }
};

// 导出所有规则
const exportAllRules = () => {
  try {
    exportRulesToFile();
    showStorageMenu.value = false;
  } catch (error) {
    console.error('导出所有规则失败:', error);
  }
};

// 备份规则
const backupRules = () => {
  exportAllRules();
  showStorageMenu.value = false;
};

// 导入规则
const importRules = () => {
  fileInput.value?.click();
  showStorageMenu.value = false;
};

// 处理文件导入
const handleFileImport = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  try {
    for (const file of files) {
      await importRulesFromFile(file);
    }
    loadRules();
  } catch (error) {
    console.error('导入规则失败:', error);
  } finally {
    target.value = '';
  }
};

// 清空所有规则
const clearAllRules = () => {
  showClearConfirm.value = true;
  showStorageMenu.value = false;
};

// 确认清空所有规则
const confirmClearAllRules = () => {
  try {
    clearRules();
    loadRules();
    showClearConfirm.value = false;
  } catch (error) {
    console.error('清空规则失败:', error);
  }
};

// 保存规则
const handleSaveRule = (ruleData: any) => {
  try {
    addRule(ruleData);
    closeEditor();
    loadRules();
  } catch (error) {
    console.error('保存规则失败:', error);
  }
};

// 关闭编辑器
const closeEditor = () => {
  showEditor.value = false;
  editingRule.value = null;
};

// 点击页面其他地方关闭存储菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.storage-actions')) {
    showStorageMenu.value = false;
  }
};

onMounted(() => {
  loadRules();
  document.addEventListener('click', handleClickOutside);
});
</script>

<style scoped>
/* 存储管理相关样式 */
.storage-actions {
  position: relative;
  display: inline-block;
}

.storage-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 8px 0;
  min-width: 160px;
  z-index: 100;
  margin-top: 4px;
}

.menu-item {
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  color: #4a5568;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-item:hover {
  background: #f7fafc;
}

.menu-item.danger {
  color: #e53e3e;
}

.menu-item.danger:hover {
  background: #fed7d7;
}

.empty-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
}

/* 添加确认对话框样式 */
.confirm-dialog {
  max-width: 400px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #e9ecef;
}

.btn-danger {
  background: #dc3545;
  color: white;
  border: 1px solid #dc3545;
}

.btn-danger:hover {
  background: #c82333;
  border-color: #bd2130;
}

.rules-manager {
  padding: 24px;
}

.rules-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e9ecef;
}

.header-left h2 {
  margin: 0 0 4px 0;
  color: #333;
}

.header-left p {
  margin: 0;
  color: #666;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.rules-list {
  min-height: 400px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.rule-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background: white;
  transition: box-shadow 0.2s;
}

.rule-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.rule-name {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.rule-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
}

.btn-icon:hover {
  background: #f5f5f5;
}

.rule-description {
  margin: 0 0 16px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.4;
}

.rule-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.stat {
  font-size: 12px;
  color: #666;
}

.stat strong {
  color: #333;
}

.rule-processes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.process-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 13px;
}

.process-index {
  background: #007bff;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.process-name {
  font-weight: 500;
  color: #333;
  min-width: 100px;
}

.process-patterns {
  color: #666;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  color: #333;
}

.modal-body {
  padding: 0;
  max-height: calc(90vh - 80px);
  overflow: auto;
}

@media (max-width: 768px) {
  .rules-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .rules-grid {
    grid-template-columns: 1fr;
  }

  .modal-content {
    margin: 0;
    border-radius: 0;
    max-height: 100vh;
  }
}

/* 删除确认对话框样式 */
.delete-confirm-overlay {
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
  backdrop-filter: blur(4px);
}

.delete-confirm-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  max-width: 440px;
  width: 100%;
  padding: 32px;
  text-align: center;
  animation: dialog-appear 0.2s ease-out;
}

@keyframes dialog-appear {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-10px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.dialog-icon {
  margin-bottom: 20px;
}

.dialog-content {
  margin-bottom: 24px;
}

.dialog-title {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
}

.dialog-message {
  margin: 0;
  color: #718096;
  font-size: 14px;
  line-height: 1.5;
}

.dialog-message strong {
  color: #2d3748;
  font-weight: 600;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 100px;
}

.btn-secondary {
  background: #f7fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #edf2f7;
  border-color: #cbd5e0;
}

.btn-danger {
  background: #e53e3e;
  color: white;
  border: 1px solid #e53e3e;
}

.btn-danger:hover {
  background: #c53030;
  border-color: #c53030;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(229, 62, 62, 0.3);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .delete-confirm-dialog {
    padding: 24px;
    margin: 0 16px;
  }

  .dialog-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>