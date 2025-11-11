<script setup lang="ts">
import { computed, ref, watch } from 'vue';

interface Props {
  logs: any[];
  analysisResults: any[];
  availableRules: any[];
}

interface Emits {
  (e: 'analyze', selectedRules: string[]): void;
  (e: 'clear-results'): void;
  (e: 'switch-to-logs'): void;
  (e: 'switch-to-rules'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 选中的规则
const selectedRules = ref<string[]>([]);

// 计算选中的规则名称（用于显示）
const selectedRuleNames = computed(() => {
  return selectedRules.value.map(name => {
    const rule = props.availableRules.find(r => r.name === name);
    return rule ? rule.name : name;
  }).join(', ');
});

// 监听可用规则变化，自动更新选中状态
watch(() => props.availableRules, (newRules) => {
  if (newRules.length === 0) {
    // 如果没有规则，清空选择
    selectedRules.value = [];
    return;
  }

  // 获取当前可用规则的名称
  const currentRuleNames = newRules.map(rule => rule.name);

  // 过滤掉已删除规则的选中项
  selectedRules.value = selectedRules.value.filter(ruleName =>
    currentRuleNames.includes(ruleName)
  );

  // 如果之前没有选中任何规则，或者所有选中的规则都被删除了，默认选中所有规则
  if (selectedRules.value.length === 0 && newRules.length > 0) {
    selectedRules.value = [...currentRuleNames];
  }
}, { immediate: true });

// 切换规则选择
const toggleRuleSelection = (ruleName: string) => {
  const index = selectedRules.value.indexOf(ruleName);
  if (index > -1) {
    selectedRules.value.splice(index, 1);
  } else {
    selectedRules.value.push(ruleName);
  }
};

// 全选规则
const selectAllRules = () => {
  selectedRules.value = props.availableRules.map(rule => rule.name);
};

// 清空选择
const clearSelectedRules = () => {
  selectedRules.value = [];
};

// 统计信息
const successCount = computed(() =>
  props.analysisResults.filter(r => r.status === 'success').length
);

const failedCount = computed(() =>
  props.analysisResults.filter(r => r.status === 'failed').length
);

const inferredCount = computed(() =>
  props.analysisResults.filter(r =>
    r.status === 'inferred_success' || r.status === 'inferred_failed'
  ).length
);

const unknownCount = computed(() =>
  props.analysisResults.filter(r => r.status === 'unknown').length
);

// 状态样式和文本
const getStatusClass = (status: string) => {
  switch (status) {
    case 'success': return 'status-success';
    case 'failed': return 'status-failed';
    case 'inferred_success': return 'status-inferred-success';
    case 'inferred_failed': return 'status-inferred-failed';
    default: return 'status-unknown';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'success': return '成功';
    case 'failed': return '失败';
    case 'inferred_success': return '推测成功';
    case 'inferred_failed': return '推测失败';
    default: return '未知';
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

// 运行分析
const runAnalysis = () => {
  emit('analyze', selectedRules.value);
};

// 清除分析结果
const clearAnalysis = () => {
  emit('clear-results');
};

// 切换到日志查看
const switchToLogs = () => {
  emit('switch-to-logs');
};

// 格式化时间
const formatTime = (date: Date) => {
  return date.toLocaleTimeString();
};
</script>

<template>
  <div class="rule-analysis">
    <!-- 分析控制栏 -->
    <div class="analysis-controls">
      <div class="controls-left">
        <h2>规则分析</h2>
        <p v-if="logs.length === 0" class="warning-text">
          ⚠️ 请先在日志查看页面加载日志文件
        </p>
        <p v-else-if="availableRules.length === 0" class="warning-text">
          ⚠️ 请先在规则管理页面创建规则
        </p>
        <p v-else class="info-text">
          已加载 {{ logs.length }} 条日志，{{ selectedRules.length }} 个规则被选中进行分析
        </p>
      </div>

      <div class="controls-right">
        <!-- 规则选择器 -->
        <div class="rule-selector-container" v-if="availableRules.length > 0">
          <div class="rule-selector-header">
            <label class="selector-label">选择分析规则</label>
            <div class="selector-actions">
              <button @click="selectAllRules" class="btn-action"
                :disabled="selectedRules.length === availableRules.length">
                全选
              </button>
              <button @click="clearSelectedRules" class="btn-action" :disabled="selectedRules.length === 0">
                清空
              </button>
            </div>
          </div>

          <div class="rule-cards-grid">
            <div v-for="rule in availableRules" :key="rule.name" class="rule-card-selector"
              :class="{ selected: selectedRules.includes(rule.name) }" @click="toggleRuleSelection(rule.name)">
              <div class="rule-card-header">
                <div class="checkbox-container">
                  <input type="checkbox" :id="`rule-${rule.name}`" :checked="selectedRules.includes(rule.name)"
                    @click.stop="toggleRuleSelection(rule.name)" class="rule-checkbox" />
                  <span class="checkmark"></span>
                </div>
                <h4 class="rule-title">{{ rule.name }}</h4>
              </div>
              <p class="rule-description">{{ rule.description }}</p>
              <div class="rule-stats">
                <span class="stat">
                  <span class="stat-number">{{ rule.processRules.length }}</span>
                  <span class="stat-label">步骤</span>
                </span>
                <span class="stat">
                  <span class="stat-number">{{ rule.successPatterns.length }}</span>
                  <span class="stat-label">成功模式</span>
                </span>
                <span class="stat">
                  <span class="stat-number">{{ rule.failedPatterns.length }}</span>
                  <span class="stat-label">失败模式</span>
                </span>
              </div>
            </div>
          </div>

          <div class="selection-summary">
            <div class="summary-text">
              已选择 <strong>{{ selectedRules.length }}</strong> 个规则
              <span v-if="selectedRules.length > 0" class="selected-names">
                ({{ selectedRuleNames }})
              </span>
            </div>
          </div>
        </div>

        <div class="analysis-actions">
          <button @click="runAnalysis" :disabled="logs.length === 0 || selectedRules.length === 0"
            class="btn btn-primary btn-large">
            <span class="btn-icon">🔍</span>
            开始分析
          </button>
          <button @click="clearAnalysis" :disabled="!analysisResults.length" class="btn btn-secondary">
            <span class="btn-icon">🗑️</span>
            清除结果
          </button>
          <button @click="switchToLogs" class="btn btn-outline">
            <span class="btn-icon">📋</span>
            返回日志查看
          </button>
        </div>
      </div>
    </div>

    <!-- 分析结果 -->
    <div v-if="analysisResults.length > 0" class="analysis-results">
      <div class="results-header">
        <h3>分析结果 ({{ analysisResults.length }} 个规则实例)</h3>
        <div class="results-summary">
          <span class="summary-item success">
            ✅ 成功: {{ successCount }}
          </span>
          <span class="summary-item failed">
            ❌ 失败: {{ failedCount }}
          </span>
          <span class="summary-item inferred">
            🟡 推测: {{ inferredCount }}
          </span>
          <span class="summary-item unknown">
            ⚪ 未知: {{ unknownCount }}
          </span>
        </div>
      </div>

      <div class="results-list">
        <div v-for="(result, index) in analysisResults" :key="`${result.ruleName}-${index}`" class="result-card"
          :class="getStatusClass(result.status)">
          <div class="result-header">
            <h4 class="rule-name">{{ result.ruleName }} #{{ index + 1 }}</h4>
            <div class="result-status">
              <span class="status-badge" :class="result.status">
                {{ getStatusText(result.status) }}
              </span>
              <span class="confidence" :class="result.confidence">
                置信度: {{ getConfidenceText(result.confidence) }}
              </span>
            </div>
          </div>

          <!-- 过程结果 -->
          <div class="process-flow">
            <div v-for="process in result.processResults" :key="process.processName" class="process-step"
              :class="process.status">
              <div class="step-indicator">
                <span v-if="process.status === 'matched'" class="indicator matched">✅</span>
                <span v-else-if="process.status === 'inferred'" class="indicator inferred">🟡</span>
                <span v-else class="indicator missing">❌</span>
              </div>
              <div class="step-info">
                <div class="step-name">{{ process.processName }}</div>
                <div v-if="process.inferredReason" class="inferred-reason">
                  {{ process.inferredReason }}
                </div>
                <div v-if="process.matchedLogs.length > 0" class="step-logs">
                  {{ process.matchedLogs.length }} 条匹配日志
                </div>
              </div>
            </div>
          </div>

          <!-- 证据 -->
          <div v-if="result.evidence.inferredFrom.length > 0" class="inferred-evidence">
            <strong>推断依据:</strong>
            <ul>
              <li v-for="evidence in result.evidence.inferredFrom" :key="evidence">
                {{ evidence }}
              </li>
            </ul>
          </div>

          <!-- 时间范围 -->
          <div class="time-range">
            分析时间: {{ formatTime(result.timeRange.start) }} - {{ formatTime(result.timeRange.end) }}
          </div>

          <!-- 过程中断位置（如果有） -->
          <div v-if="result.interruptedAt" class="interruption-info">
            <strong>❌ 过程中断位置:</strong> {{ result.interruptedAt }}
          </div>
        </div>
      </div>
    </div>

    <!-- 无结果状态 -->
    <div v-else-if="logs.length > 0 && availableRules.length > 0" class="empty-analysis">
      <div class="empty-content">
        <div class="empty-icon">🔍</div>
        <h3>准备开始分析</h3>
        <p>请选择要分析的规则，然后点击"开始分析"按钮</p>
        <button @click="runAnalysis" class="btn btn-primary" style="margin: 0 auto;"
          :disabled="selectedRules.length === 0">
          开始分析
        </button>
      </div>
    </div>

    <!-- 无规则状态 -->
    <div v-else-if="logs.length > 0 && availableRules.length === 0" class="empty-analysis">
      <div class="empty-content">
        <div class="empty-icon">⚙️</div>
        <h3>暂无分析规则</h3>
        <p>请在规则管理页面创建规则后再进行分析</p>
        <button @click="$emit('switch-to-rules')" class="btn btn-primary">
          前往规则管理
        </button>
      </div>
    </div>

    <!-- 无日志状态 -->
    <div v-else class="empty-logs">
      <div class="empty-content">
        <div class="empty-icon">📁</div>
        <h3>暂无日志数据</h3>
        <p>请先在日志查看页面选择文件夹加载日志文件</p>
        <button @click="switchToLogs" class="btn btn-primary">
          前往日志查看
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rule-analysis {
  padding: 24px;
}

.analysis-controls {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e9ecef;
}

.controls-left h2 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.warning-text {
  margin: 0;
  color: #e74c3c;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-text {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.controls-right {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 400px;
}

/* 规则选择器样式 */
.rule-selector-container {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.rule-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.selector-label {
  font-weight: 600;
  color: #333;
  font-size: 16px;
  margin: 0;
}

.selector-actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  background: transparent;
  border: 1px solid #007bff;
  color: #007bff;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:hover:not(:disabled) {
  background: #007bff;
  color: white;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: #6c757d;
  color: #6c757d;
}

/* 规则卡片网格 */
.rule-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
  max-height: 300px;
  overflow-y: auto;
  padding: 4px;
}

.rule-card-selector {
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.rule-card-selector:hover {
  border-color: #007bff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.1);
}

.rule-card-selector.selected {
  border-color: #007bff;
  background: #f0f8ff;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
}

.rule-card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.checkbox-container {
  position: relative;
  margin-top: 2px;
}

.rule-checkbox {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  position: relative;
  display: inline-block;
  width: 18px;
  height: 18px;
  background: white;
  border: 2px solid #dee2e6;
  border-radius: 4px;
  transition: all 0.2s;
}

.rule-card-selector.selected .checkmark {
  background: #007bff;
  border-color: #007bff;
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.rule-card-selector.selected .checkmark:after {
  display: block;
}

.rule-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  line-height: 1.3;
  flex: 1;
}

.rule-description {
  margin: 0 0 12px 0;
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rule-stats {
  display: flex;
  gap: 12px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-number {
  font-size: 14px;
  font-weight: 600;
  color: #007bff;
}

.stat-label {
  font-size: 10px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 选择摘要 */
.selection-summary {
  border-top: 1px solid #e9ecef;
  padding-top: 12px;
}

.summary-text {
  font-size: 14px;
  color: #666;
  text-align: center;
}

.summary-text strong {
  color: #007bff;
}

.selected-names {
  font-size: 12px;
  color: #888;
  font-style: italic;
}

/* 分析操作按钮 */
.analysis-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
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
  gap: 8px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
}

.btn-outline {
  background: transparent;
  border: 1px solid #6c757d;
  color: #6c757d;
}

.btn-outline:hover {
  background: #6c757d;
  color: white;
}

.btn-large {
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
}

.btn-icon {
  font-size: 16px;
}

/* 滚动条样式 */
.rule-cards-grid::-webkit-scrollbar {
  width: 6px;
}

.rule-cards-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.rule-cards-grid::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.rule-cards-grid::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .analysis-controls {
    flex-direction: column;
    gap: 20px;
  }

  .controls-right {
    min-width: 100%;
  }

  .rule-cards-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .rule-analysis {
    padding: 16px;
  }

  .rule-selector-container {
    padding: 16px;
  }

  .analysis-actions {
    flex-direction: column;
  }

  .btn {
    justify-content: center;
  }

  .rule-selector-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .selector-actions {
    width: 100%;
    justify-content: space-between;
  }

  .btn-action {
    flex: 1;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .rule-cards-grid {
    max-height: 250px;
  }

  .rule-card-selector {
    padding: 12px;
  }
}

/* 分析结果部分样式保持不变 */
.analysis-results {
  margin-top: 24px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.results-header h3 {
  margin: 0;
  color: #333;
}

.results-summary {
  display: flex;
  gap: 16px;
}

.summary-item {
  font-size: 14px;
  font-weight: 500;
}

.summary-item.success {
  color: #28a745;
}

.summary-item.failed {
  color: #dc3545;
}

.summary-item.inferred {
  color: #ffc107;
}

.summary-item.unknown {
  color: #6c757d;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background: white;
}

.result-card.status-success {
  border-left: 4px solid #28a745;
  background: #f8fff8;
}

.result-card.status-failed {
  border-left: 4px solid #dc3545;
  background: #fff8f8;
}

.result-card.status-inferred-success {
  border-left: 4px solid #ffc107;
  background: #fffef0;
}

.result-card.status-inferred-failed {
  border-left: 4px solid #fd7e14;
  background: #fff4e6;
}

.result-card.status-unknown {
  border-left: 4px solid #6c757d;
  background: #f8f9fa;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.rule-name {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.result-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  color: white;
}

.status-badge.success {
  background: #28a745;
}

.status-badge.failed {
  background: #dc3545;
}

.status-badge.inferred_success {
  background: #ffc107;
}

.status-badge.inferred_failed {
  background: #fd7e14;
}

.status-badge.unknown {
  background: #6c757d;
}

.confidence {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
}

.confidence.high {
  background: #e8f5e8;
  color: #2e7d32;
}

.confidence.medium {
  background: #fff3e0;
  color: #ef6c00;
}

.confidence.low {
  background: #ffebee;
  color: #c62828;
}

.process-flow {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.process-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  background: #f8f9fa;
}

.process-step.matched {
  background: #e8f5e8;
}

.process-step.inferred {
  background: #fff3cd;
}

.process-step.missing {
  background: #f8d7da;
}

.step-indicator {
  flex-shrink: 0;
}

.indicator {
  font-size: 16px;
}

.step-info {
  flex: 1;
}

.step-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.inferred-reason {
  font-size: 12px;
  color: #666;
  font-style: italic;
}

.step-logs {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.inferred-evidence {
  background: #fff3cd;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 14px;
}

.inferred-evidence ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.inferred-evidence li {
  margin-bottom: 4px;
}

.time-range {
  font-size: 12px;
  color: #666;
  text-align: right;
}

.interruption-info {
  background: #f8d7da;
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 12px;
  font-size: 14px;
  color: #721c24;
}

.empty-analysis,
.empty-logs {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-content {
  max-width: 400px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-content h3 {
  margin: 0 0 12px 0;
  color: #333;
}

.empty-content p {
  margin: 0 0 20px 0;
  color: #666;
}
</style>