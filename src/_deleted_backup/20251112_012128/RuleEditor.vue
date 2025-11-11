<template>
  <div class="rule-editor">
    <div class="editor-content">
      <!-- 基础信息 -->
      <div class="section">
        <h3>基础信息</h3>
        <div class="form-group">
          <label>规则名称 *</label>
          <input type="text" v-model="editingRule.name" placeholder="输入规则名称" class="form-input" />
        </div>
        <div class="form-group">
          <label>规则描述</label>
          <textarea v-model="editingRule.description" placeholder="描述这个规则的作用" class="form-textarea" rows="3"></textarea>
        </div>
      </div>

      <!-- 过程规则 -->
      <div class="section">
        <div class="section-header">
          <h3>过程规则</h3>
          <button @click="addProcessRule" class="btn btn-outline btn-sm">
            ➕ 添加过程规则
          </button>
        </div>
        <p class="section-description">
          按顺序定义流程中的各个步骤，系统会按这个顺序检查日志
        </p>

        <div class="process-rules-list">
          <div v-for="(processRule, index) in editingRule.processRules" :key="index" class="process-rule-item">
            <div class="process-rule-header">
              <span class="process-index">步骤 {{ index + 1 }}</span>
              <button @click="removeProcessRule(index)" class="btn-icon danger" title="删除此步骤">
                🗑️
              </button>
            </div>

            <div class="process-rule-content">
              <div class="form-group">
                <label>步骤名称 *</label>
                <input type="text" v-model="processRule.name" placeholder="如：开始起播、数据加载等" class="form-input" />
              </div>

              <div class="form-group">
                <label>匹配模式 *</label>
                <div class="patterns-list">
                  <div v-for="(_, patternIndex) in processRule.patterns" :key="patternIndex" class="pattern-item">
                    <input type="text" v-model="processRule.patterns[patternIndex]" placeholder="输入关键词或正则表达式"
                      class="form-input pattern-input" />
                    <button @click="removePattern(index, patternIndex)" class="btn-icon danger" title="删除此模式">
                      ×
                    </button>
                  </div>
                </div>
                <button @click="addPattern(index)" class="btn btn-outline btn-sm">
                  ➕ 添加匹配模式
                </button>
                <p class="help-text">
                  可以添加多个匹配模式，只要日志中包含任意一个即认为匹配
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 成功模式 -->
      <div class="section">
        <div class="section-header">
          <div class="section-title">
            <h3>成功模式</h3>
            <span class="pattern-count">({{ editingRule.successPatterns.length }})</span>
          </div>
          <button @click="addSuccessPattern" class="btn btn-outline btn-sm">
            ➕ 添加成功模式
          </button>
        </div>
        <p class="section-description">
          定义表示流程成功结束的日志模式，可以添加多个成功条件
        </p>

        <div class="patterns-list">
          <div v-for="(_, index) in editingRule.successPatterns" :key="index" class="pattern-item">
            <input type="text" v-model="editingRule.successPatterns[index]" placeholder="如：startplay_success、渲染完成等"
              class="form-input pattern-input" />
            <button @click="removeSuccessPattern(index)" class="btn-icon danger" title="删除此模式">
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- 失败模式 -->
      <div class="section">
        <div class="section-header">
          <div class="section-title">
            <h3>失败模式</h3>
            <span class="pattern-count">({{ editingRule.failedPatterns.length }})</span>
          </div>
          <button @click="addFailedPattern" class="btn btn-outline btn-sm">
            ➕ 添加失败模式
          </button>
        </div>
        <p class="section-description">
          定义表示流程失败的日志模式，可以添加多个失败条件
        </p>

        <div class="patterns-list">
          <div v-for="(_, index) in editingRule.failedPatterns" :key="index" class="pattern-item">
            <input type="text" v-model="editingRule.failedPatterns[index]" placeholder="如：startplay_failed、加载失败等"
              class="form-input pattern-input" />
            <button @click="removeFailedPattern(index)" class="btn-icon danger" title="删除此模式">
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="actions">
        <button @click="handleSave" class="btn btn-primary" :disabled="!isValid">
          保存规则
        </button>
        <button @click="handleCancel" class="btn btn-secondary">
          取消
        </button>
        <button @click="handleTest" class="btn btn-outline" v-if="hasTestLogs">
          测试规则
        </button>
      </div>

      <!-- 测试结果 -->
      <div v-if="testResult" class="test-result">
        <h4>测试结果</h4>
        <div class="test-status" :class="testResult.status">
          {{ getStatusText(testResult.status) }}
          <span class="confidence">置信度: {{ getConfidenceText(testResult.confidence) }}</span>
        </div>

        <div class="test-processes">
          <div v-for="process in testResult.processResults" :key="process.processName" class="test-process"
            :class="process.status">
            <span class="process-name">{{ process.processName }}</span>
            <span class="process-status">
              {{ getProcessStatusText(process.status) }}
              <span v-if="process.inferredReason" class="inferred-reason">
                ({{ process.inferredReason }})
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalysisRule, RuleMatchResult } from '@/composables/useRuleEngine';
import { computed, onMounted, ref } from 'vue';

interface Props {
  rule?: AnalysisRule;
  testLogs?: any[]; // 用于测试的日志数据
}

interface Emits {
  (e: 'save', rule: AnalysisRule): void;
  (e: 'cancel'): void;
  (e: 'test', rule: AnalysisRule): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 编辑中的规则
const editingRule = ref<AnalysisRule>({
  name: '',
  description: '',
  processRules: [],
  successPatterns: [],
  failedPatterns: []
});

// 测试结果
const testResult = ref<RuleMatchResult | null>(null);

// 验证规则是否有效
const isValid = computed(() => {
  return (
    editingRule.value.name.trim() !== '' &&
    editingRule.value.processRules.length > 0 &&
    editingRule.value.processRules.every(rule =>
      rule.name.trim() !== '' && rule.patterns.length > 0
    ) &&
    editingRule.value.successPatterns.length > 0
  );
});

const hasTestLogs = computed(() => props.testLogs && props.testLogs.length > 0);

// 初始化编辑数据
onMounted(() => {
  if (props.rule) {
    editingRule.value = JSON.parse(JSON.stringify(props.rule));
  } else {
    // 新建规则时添加一个默认的过程规则
    addProcessRule();
  }
});

// 过程规则操作
const addProcessRule = () => {
  editingRule.value.processRules.push({
    name: '',
    patterns: ['']
  });
};

const removeProcessRule = (index: number) => {
  editingRule.value.processRules.splice(index, 1);
};

// 模式操作
const addPattern = (processIndex: number) => {
  editingRule.value.processRules[processIndex].patterns.push('');
};

const removePattern = (processIndex: number, patternIndex: number) => {
  editingRule.value.processRules[processIndex].patterns.splice(patternIndex, 1);
};

const addSuccessPattern = () => {
  editingRule.value.successPatterns.push('');
};

const removeSuccessPattern = (index: number) => {
  editingRule.value.successPatterns.splice(index, 1);
};

const addFailedPattern = () => {
  editingRule.value.failedPatterns.push('');
};

const removeFailedPattern = (index: number) => {
  editingRule.value.failedPatterns.splice(index, 1);
};

// 保存规则
const handleSave = () => {
  if (!isValid.value) return;

  // 清理空字符串
  const cleanedRule = {
    ...editingRule.value,
    processRules: editingRule.value.processRules.map(rule => ({
      ...rule,
      patterns: rule.patterns.filter(pattern => pattern.trim() !== '')
    })).filter(rule => rule.patterns.length > 0),
    successPatterns: editingRule.value.successPatterns.filter(pattern => pattern.trim() !== ''),
    failedPatterns: editingRule.value.failedPatterns.filter(pattern => pattern.trim() !== '')
  };

  emit('save', cleanedRule);
};

// 取消编辑
const handleCancel = () => {
  emit('cancel');
};

// 测试规则
const handleTest = () => {
  emit('test', editingRule.value);
};

// 状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'success': return '✅ 成功';
    case 'failed': return '❌ 失败';
    case 'inferred_success': return '🟡 推测成功';
    case 'inferred_failed': return '🟠 推测失败';
    default: return '⚪ 未知';
  }
};

const getConfidenceText = (confidence: string) => {
  switch (confidence) {
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
    default: return '未知';
  }
};

const getProcessStatusText = (status: string) => {
  switch (status) {
    case 'matched': return '✅ 已匹配';
    case 'inferred': return '🟡 已推断';
    case 'missing': return '❌ 缺失';
    default: return '⚪ 未知';
  }
};

// 设置测试结果（从父组件调用）
const setTestResult = (result: RuleMatchResult) => {
  testResult.value = result;
};

// 暴露方法给父组件
defineExpose({
  setTestResult
});
</script>

<style scoped>
.rule-editor {
  padding: 0;
}

.editor-content {
  padding: 0 24px 24px;
  max-height: calc(90vh - 80px);
  overflow-y: auto;
}

.section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e9ecef;
}

.section:last-child {
  border-bottom: none;
}

.section h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  
  h3{
    margin: 0;
  }
  /* 在 RuleEditor.vue 的样式中添加 */
  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pattern-count {
    font-size: 14px;
    color: #666;
    background: #f0f0f0;
    padding: 2px 8px;
    border-radius: 12px;
  }
}

.section-description {
  margin: 0 0 16px 0;
  color: #666;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #007bff;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.process-rules-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.process-rule-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background: #f8f9fa;
}

.process-rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.process-index {
  font-weight: bold;
  color: #007bff;
}

.process-rule-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.patterns-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pattern-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pattern-input {
  flex: 1;
}

.btn-icon {
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon.danger {
  color: #dc3545;
}

.btn-icon.danger:hover {
  background: #f8d7da;
}

.btn {
  padding: 8px 16px;
  border: 1px solid;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-primary {
  background: #007bff;
  border-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
  border-color: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  border-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
  border-color: #545b62;
}

.btn-outline {
  background: transparent;
  border-color: #007bff;
  color: #007bff;
}

.btn-outline:hover {
  background: #007bff;
  color: white;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.help-text {
  margin: 8px 0 0 0;
  color: #666;
  font-size: 12px;
  font-style: italic;
}

.test-result {
  margin-top: 24px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f8f9fa;
}

.test-result h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.test-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-weight: bold;
}

.test-status.success {
  background: #d4edda;
  color: #155724;
}

.test-status.failed {
  background: #f8d7da;
  color: #721c24;
}

.test-status.inferred_success {
  background: #fff3cd;
  color: #856404;
}

.test-status.inferred_failed {
  background: #ffeaa7;
  color: #8d6e00;
}

.test-status.unknown {
  background: #e2e3e5;
  color: #383d41;
}

.confidence {
  font-size: 12px;
  font-weight: normal;
  opacity: 0.8;
}

.test-processes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.test-process {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.test-process.matched {
  background: #d4edda;
  color: #155724;
}

.test-process.inferred {
  background: #fff3cd;
  color: #856404;
}

.test-process.missing {
  background: #f8d7da;
  color: #721c24;
}

.process-name {
  font-weight: 500;
}

.inferred-reason {
  font-size: 12px;
  opacity: 0.8;
  font-style: italic;
}

@media (max-width: 768px) {
  .editor-content {
    padding: 0 16px 16px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .actions {
    flex-direction: column;
  }

  .pattern-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .btn-icon {
    align-self: flex-end;
  }
}
</style>