<template>
  <div class="rule-analysis">
    <!-- 头部 -->
    <div class="analysis-header">
      <h1>规则分析工作台</h1>
      <div class="header-actions">
        <div class="log-stats" v-if="currentSession">
          日志: {{ logStats.totalLines }} 行 |
          范围: {{ logStats.currentRange?.startLine || 1 }}-{{ logStats.currentRange?.endLine || logStats.totalLines }}
        </div>
        <div class="header-buttons">
          <button @click="startNewSession" class="btn btn-primary"
            :disabled="analyzer.getCurrentSession()?.status === 'active'">
            🚀 开始新分析
          </button>
          <button @click="endSession" class="btn btn-secondary" :disabled="!analyzer.getCurrentSession()">
            🏁 结束分析
          </button>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="analysis-content">
      <!-- 会话列表 -->
      <div class="sessions-panel" :class="{ 'collapsed': !showSessions }">
        <div class="panel-header">
          <h3>分析会话</h3>
          <button @click="toggleSessions" class="toggle-btn">
            {{ showSessions ? '◀' : '▶' }}
          </button>
        </div>
        <div class="sessions-list" v-if="showSessions">
          <div v-for="session in analysisSessions" :key="session.id" class="session-item" :class="{
            'active': currentSession?.id === session.id,
            'completed': session.status === 'completed'
          }" @click="selectSession(session)">
            <div class="session-name">{{ session.name }}</div>
            <div class="session-meta">
              {{ formatDate(session.updatedAt) }}
              <span class="session-status" :class="session.status">{{ getStatusText(session.status) }}</span>
            </div>
            <div class="session-results" v-if="session.analysisResults.length > 0">
              {{ session.analysisResults.length }} 个规则分析
            </div>
            <button @click.stop="deleteSession(session.id)" class="delete-btn" title="删除会话">
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- 分析工作区 -->
      <div class="analysis-workspace">
        <!-- 工作区工具栏 -->
        <div class="workspace-toolbar">
          <button @click="toggleSessions" class="toggle-sessions-btn">
            {{ showSessions ? '◀ 隐藏会话' : '会话 ▶' }}
          </button>

          <div class="workspace-title" v-if="currentSession">
            {{ currentSession.name }}
            <span class="session-status-badge" :class="currentSession.status">
              {{ getStatusText(currentSession.status) }}
            </span>
          </div>

          <!-- 分析进度 -->
          <div class="analysis-progress" v-if="currentAnalysis && currentAnalysis.status === 'running'">
            <div class="progress-info">
              分析进度: {{ currentAnalysis.completedSteps }}/{{ currentAnalysis.totalSteps }} 步骤
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
            </div>
            <div class="progress-text">{{ progressPercentage }}%</div>
          </div>
        </div>

        <!-- 规则选择和控制栏 -->
        <div class="control-panel" v-if="currentSession">
          <div class="rule-selector">
            <label for="rule-select">选择验证规则:</label>
            <select id="rule-select" v-model="selectedRuleId" class="rule-select"
              :disabled="isAnalysisRunning">
              <option value="">请选择规则...</option>
              <option v-for="rule in availableRules" :key="rule.id" :value="rule.id">
                {{ rule.name }} ({{ rule.steps.length }} 步骤)
              </option>
            </select>
          </div>

          <div class="control-buttons">
            <button @click="startAnalysis" class="btn btn-primary"
              :disabled="!selectedRuleId || isAnalysisRunning">
              {{ isAnalysisRunning ? '分析执行中...' : '开始分析' }}
            </button>
            <button @click="showLogRangeSelector" class="btn btn-secondary"
              :disabled="isAnalysisRunning">
              设置日志范围
            </button>
            <button @click="showSessionSummary" class="btn btn-secondary">
              分析摘要
            </button>
          </div>
        </div>

        <!-- 对话式分析界面 -->
        <div class="chat-interface" v-if="currentSession">
          <div class="messages-container" ref="messagesContainer">
            <div v-for="message in currentSession.messages" :key="message.id" class="message"
              :class="`message-${message.type}`">
              <div class="message-header">
                <span class="message-type">{{ getMessageTypeText(message.type) }}</span>
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              </div>

              <div class="message-content">
                <div class="content-text" v-html="formatMessageContent(message.content)"></div>

                <!-- 日志引用显示 -->
                <div v-if="message.logReferences && message.logReferences.length > 0" class="log-references">
                  <div class="log-references-title">📎 匹配的日志:</div>
                  <div v-for="logRef in message.logReferences" :key="logRef.lineNumber" class="log-reference">
                    <span class="log-line-number">第 {{ logRef.lineNumber }} 行:</span>
                    <code class="log-content">{{ logRef.content }}</code>
                    <span v-if="logRef.matchedPattern" class="matched-pattern">
                      匹配模式: {{ logRef.matchedPattern }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 消息操作 -->
              <div class="message-actions" v-if="message.actions">
                <button v-for="action in message.actions" :key="action.id" @click="executeAction(action)" 
                  class="action-btn" :class="`action-${action.type}`">
                  {{ action.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- 分析状态 -->
          <div class="analysis-status" v-if="currentSession.analysisResults.length > 0">
            <div class="status-summary">
              <h4>📊 分析摘要</h4>
              <div class="results-grid">
                <div v-for="result in currentSession.analysisResults" :key="result.ruleId" class="result-item"
                  :class="`status-${result.status}`">
                  <div class="rule-name">{{ result.ruleName }}</div>
                  <div class="result-stats">
                    {{ result.completedSteps }}/{{ result.totalSteps }} 步骤 ·
                    {{ result.issues.length }} 问题
                  </div>
                  <div class="result-status">{{ getStatusText(result.status) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 无会话时的提示 -->
        <div class="empty-state" v-else>
          <div class="empty-icon">📊</div>
          <h3>开始新的分析会话</h3>
          <p>选择上方的"开始新分析"按钮来创建分析会话，验证日志中的业务流程。</p>
          <div class="log-info" v-if="availableLogLines.length > 0">
            <strong>可用日志:</strong> {{ availableLogLines.length }} 行
          </div>
          <div class="empty-tips">
            <h4>💡 使用提示:</h4>
            <ul>
              <li>选择验证规则来分析日志流程</li>
              <li>设置特定的日志分析范围</li>
              <li>查看步骤匹配和推断结果</li>
              <li>分析结果会实时显示在对话界面</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- 日志范围选择器模态框 -->
    <div class="modal" v-if="showRangeModal">
      <div class="modal-content">
        <h3>设置日志分析范围</h3>

        <div class="range-info">
          <p>当前日志文件共 <strong>{{ availableLogLines.length }}</strong> 行</p>
        </div>

        <div class="range-selector">
          <div class="range-input-group">
            <div class="range-input">
              <label for="start-line">开始行:</label>
              <input id="start-line" type="number" v-model.number="logRange.start" min="1"
                :max="availableLogLines.length" @change="validateRange">
            </div>
            <div class="range-input">
              <label for="end-line">结束行:</label>
              <input id="end-line" type="number" v-model.number="logRange.end" :min="logRange.start"
                :max="availableLogLines.length" @change="validateRange">
            </div>
          </div>

          <div class="range-preview">
            <h4>范围预览 ({{ logRange.end - logRange.start + 1 }} 行)</h4>
            <div class="preview-container">
              <div v-for="i in previewLines" :key="i" class="preview-line">
                <span class="line-number">{{ logRange.start + i - 1 }}:</span>
                <code class="line-content">{{ availableLogLines[logRange.start - 1 + i - 1] }}</code>
              </div>
              <div v-if="previewLines < (logRange.end - logRange.start + 1)" class="preview-more">
                ... 还有 {{ (logRange.end - logRange.start + 1) - previewLines }} 行 ...
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="applyLogRange" class="btn btn-primary">应用范围</button>
          <button @click="resetLogRange" class="btn btn-secondary">重置为全部</button>
          <button @click="showRangeModal = false" class="btn btn-outline">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useCommonStore } from '@/stores/LogStore';
import { useFlowRulesStore } from '@/stores/FlowRulesStore';
import { InteractiveAnalyzer } from '@/utils/InteractiveAnalyzer';
import type { AnalysisSession, MessageAction } from '@/types/AnalysisTypes';

const commonStore = useCommonStore();
const flowRulesStore = useFlowRulesStore();

// 初始化规则
flowRulesStore.loadRules();

const analyzer = ref(new InteractiveAnalyzer());
const currentSession = ref<AnalysisSession | null>(null);
const analysisSessions = ref<AnalysisSession[]>([]);
const selectedRuleId = ref<string>('');
const showSessions = ref(true);
const showRangeModal = ref(false);
const logRange = ref({ start: 1, end: 1 });
const messagesContainer = ref<HTMLElement>();
const previewLines = 5;
const isAnalysisRunning = ref(false);

// 计算属性
const availableRules = computed(() => flowRulesStore.rules);
const availableLogLines = computed(() =>
  commonStore.logFiles.flatMap(file => file.lines)
);
const logStats = computed(() => analyzer.value.getLogStats() || { totalLines: 0 });
const currentAnalysis = computed(() => {
  if (!currentSession.value || !currentSession.value.currentRuleId) return null;
  return currentSession.value.analysisResults.find(
    r => r.ruleId === currentSession.value?.currentRuleId
  );
});
const progressPercentage = computed(() => {
  if (!currentAnalysis.value) return 0;
  return Math.round((currentAnalysis.value.completedSteps / currentAnalysis.value.totalSteps) * 100);
});

// 初始化
onMounted(() => {
  loadSessions();
  if (availableLogLines.value.length > 0) {
    logRange.value = {
      start: 1,
      end: availableLogLines.value.length
    };
  }
});

// 开始新会话
const startNewSession = () => {
  if (availableLogLines.value.length === 0) {
    alert('请先选择要分析的日志文件');
    return;
  }

  const sessionName = `分析会话 ${new Date().toLocaleString()}`;
  const session = analyzer.value.startNewSession(sessionName, availableLogLines.value);
  currentSession.value = session;
  analysisSessions.value.unshift(session);
  saveSessions();

  selectedRuleId.value = '';
  isAnalysisRunning.value = false;
};

// 结束会话
const endSession = () => {
  analyzer.value.endCurrentSession();
  currentSession.value = null;
  saveSessions();
  isAnalysisRunning.value = false;
};

// 选择会话
const selectSession = (session: AnalysisSession) => {
  currentSession.value = session;
  analyzer.value = new InteractiveAnalyzer();
  // 重新加载会话数据
  const logLines = availableLogLines.value;
  if (logLines.length > 0) {
    analyzer.value.startNewSession(session.name, logLines);
    // 恢复消息状态
    session.messages.forEach(msg => {
      analyzer.value.getCurrentSession()?.messages.push(msg);
    });
  }
  isAnalysisRunning.value = false;
};

// 删除会话
const deleteSession = (sessionId: string) => {
  analysisSessions.value = analysisSessions.value.filter(s => s.id !== sessionId);
  if (currentSession.value?.id === sessionId) {
    currentSession.value = null;
  }
  saveSessions();
};

// 开始分析
const startAnalysis = async () => {
  if (!currentSession.value || !selectedRuleId.value) return;

  const rule = flowRulesStore.getRuleById(selectedRuleId.value);
  if (!rule) return;

  try {
    isAnalysisRunning.value = true;
    await analyzer.value.selectRule(currentSession.value, rule);
    
    // 执行分析
    await analyzer.value.executeAnalysis(currentSession.value);
    
    saveSessions();
    scrollToBottom();
  } catch (error) {
    console.error('分析过程中出错:', error);
    if (currentSession.value) {
      analyzer.value.getCurrentSession()?.messages.push({
        id: Date.now().toString(),
        type: 'error',
        content: `分析失败: ${error}`,
        timestamp: new Date().toISOString()
      });
    }
  } finally {
    isAnalysisRunning.value = false;
  }
};

// 执行消息操作
const executeAction = (action: MessageAction) => {
  if (action.handler) {
    action.handler();
    saveSessions();
    scrollToBottom();
  }
};

// 显示日志范围选择器
const showLogRangeSelector = () => {
  if (!currentSession.value) return;

  const range = currentSession.value.currentLogRange || {
    startIndex: 0,
    endIndex: availableLogLines.value.length - 1,
    startLine: 1,
    endLine: availableLogLines.value.length
  };

  logRange.value = {
    start: range.startLine,
    end: range.endLine
  };

  showRangeModal.value = true;
};

// 验证范围输入
const validateRange = () => {
  if (logRange.value.start < 1) {
    logRange.value.start = 1;
  }
  if (logRange.value.end > availableLogLines.value.length) {
    logRange.value.end = availableLogLines.value.length;
  }
  if (logRange.value.start > logRange.value.end) {
    logRange.value.end = logRange.value.start;
  }
};

// 应用日志范围
const applyLogRange = () => {
  if (currentSession.value) {
    analyzer.value.setLogRange(currentSession.value, logRange.value.start, logRange.value.end);
    saveSessions();
  }
  showRangeModal.value = false;
};

// 重置日志范围
const resetLogRange = () => {
  logRange.value = {
    start: 1,
    end: availableLogLines.value.length
  };
};

// 显示会话摘要
const showSessionSummary = () => {
  if (!currentSession.value) return;

  const results = currentSession.value.analysisResults;
  if (results.length === 0) {
    analyzer.value.getCurrentSession()?.messages.push({
      id: Date.now().toString(),
      type: 'system',
      content: '暂无分析结果，请先执行规则分析。',
      timestamp: new Date().toISOString()
    });
    return;
  }

  let summary = `## 📋 分析会话摘要\n\n`;
  summary += `共执行 ${results.length} 个规则分析:\n\n`;

  results.forEach(result => {
    const statusText = {
      'success': '✅ 成功',
      'partial': '⚠️ 部分成功',
      'failed': '❌ 失败',
      'incomplete': '⏳ 未完成',
      'running': '🔄 执行中'
    }[result.status] || result.status;

    summary += `### ${result.ruleName}\n`;
    summary += `- 状态: ${statusText}\n`;
    summary += `- 进度: ${result.completedSteps}/${result.totalSteps} 步骤\n`;
    summary += `- 问题: ${result.issues.length} 个\n`;

    if (result.issues.length > 0) {
      summary += `- 具体问题:\n`;
      result.issues.forEach(issue => {
        summary += `  • ${issue}\n`;
      });
    }
    summary += '\n';
  });

  analyzer.value.getCurrentSession()?.messages.push({
    id: Date.now().toString(),
    type: 'system',
    content: summary,
    timestamp: new Date().toISOString()
  });

  scrollToBottom();
};

// 工具函数
const toggleSessions = () => {
  showSessions.value = !showSessions.value;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString();
};

const formatMessageContent = (content: string) => {
  // 将换行符转换为 <br> 并处理一些简单的 markdown 样式
  return content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
};

const getStatusText = (status: string) => {
  const statusMap: { [key: string]: string } = {
    active: '🔄 进行中',
    completed: '✅ 已完成',
    cancelled: '❌ 已取消',
    success: '✅ 成功',
    partial: '⚠️ 部分成功',
    failed: '❌ 失败',
    incomplete: '⏳ 未完成',
    running: '🔄 执行中'
  };
  return statusMap[status] || status;
};

const getMessageTypeText = (type: string) => {
  const typeMap: { [key: string]: string } = {
    system: '🔧 系统',
    user: '👤 用户',
    rule: '📋 规则',
    error: '❌ 错误',
    warning: '⚠️ 警告',
    success: '✅ 成功',
    log: '📄 日志'
  };
  return typeMap[type] || type;
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// 会话持久化
const saveSessions = () => {
  localStorage.setItem('analysis-sessions', JSON.stringify(analysisSessions.value));
};

const loadSessions = () => {
  const stored = localStorage.getItem('analysis-sessions');
  if (stored) {
    analysisSessions.value = JSON.parse(stored);
  }
};

// 监听消息变化，自动滚动
watch(() => currentSession.value?.messages.length, scrollToBottom);

// 监听日志文件变化
watch(availableLogLines, (newLines) => {
  if (newLines.length > 0 && (!logRange.value.end || logRange.value.end > newLines.length)) {
    logRange.value = {
      start: 1,
      end: newLines.length
    };
  }
});
</script>

<style scoped lang="less">
.rule-analysis {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e9ecef;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;

  h1 {
    margin: 0;
    color: #2c3e50;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .log-stats {
    font-size: 0.9rem;
    color: #6c757d;
    margin-right: 1rem;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .header-buttons {
    display: flex;
    gap: 0.75rem;
  }
}

.analysis-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.sessions-panel {
  width: 320px;
  background: white;
  border-right: 1px solid #e9ecef;
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  &.collapsed {
    width: 0;
    overflow: hidden;
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;

  h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #495057;
  }

  .toggle-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: #6c757d;
    padding: 0.25rem;
    border-radius: 4px;

    &:hover {
      background: #f8f9fa;
    }
  }
}

.sessions-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.session-item {
  position: relative;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #007bff;
    background: #f8f9fa;
  }

  &.active {
    border-color: #007bff;
    background: #e7f3ff;
  }

  &.completed {
    opacity: 0.7;
  }
}

.session-name {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.session-meta {
  font-size: 0.8rem;
  color: #6c757d;
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.session-status {
  font-weight: 500;
  
  &.active {
    color: #28a745;
  }
  &.completed {
    color: #6c757d;
  }
  &.cancelled {
    color: #dc3545;
  }
}

.session-results {
  font-size: 0.75rem;
  color: #28a745;
  font-weight: 500;
}

.delete-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #6c757d;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #dc3545;
    color: white;
  }
}

.analysis-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  position: relative;
}

.workspace-toolbar {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;
  gap: 1rem;
  flex-wrap: wrap;
}

.toggle-sessions-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;

  &:hover {
    background: #545b62;
  }
}

.workspace-title {
  font-weight: 500;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.session-status-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;

  &.active {
    background: #d4edda;
    color: #155724;
  }

  &.completed {
    background: #e2e3e5;
    color: #383d41;
  }

  &.cancelled {
    background: #f8d7da;
    color: #721c24;
  }
}

.analysis-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;

  .progress-info {
    font-size: 0.85rem;
    color: #495057;
    white-space: nowrap;
  }

  .progress-bar {
    width: 120px;
    height: 6px;
    background: #e9ecef;
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #28a745, #20c997);
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 0.8rem;
    color: #6c757d;
    min-width: 40px;
  }
}

.control-panel {
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.rule-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  label {
    font-weight: 500;
    color: #495057;
    white-space: nowrap;
  }
}

.rule-select {
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  min-width: 250px;
  background: white;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  &:disabled {
    background: #f8f9fa;
    color: #6c757d;
  }
}

.control-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.chat-interface {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  overflow: hidden;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  min-height: 0;
}

.message {
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 12px;
  max-width: 100%;
  animation: fadeIn 0.3s ease;
  word-wrap: break-word;

  &.message-system {
    background: #f8f9fa;
    border-left: 4px solid #6c757d;
  }

  &.message-rule {
    background: #e7f3ff;
    border-left: 4px solid #007bff;
  }

  &.message-success {
    background: #d4edda;
    border-left: 4px solid #28a745;
  }

  &.message-warning {
    background: #fff3cd;
    border-left: 4px solid #ffc107;
  }

  &.message-error {
    background: #f8d7da;
    border-left: 4px solid #dc3545;
  }

  &.message-log {
    background: #f8f9fa;
    border-left: 4px solid #17a2b8;
    font-family: 'Courier New', monospace;
  }
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
}

.message-type {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.message-time {
  color: #6c757d;
}

.message-content {
  line-height: 1.5;
  color: #2c3e50;

  .content-text {
    margin-bottom: 0.5rem;
    white-space: pre-wrap;
  }
}

.log-references {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: 0.5rem;
  margin-top: 0.5rem;
}

.log-references-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #495057;
  margin-bottom: 0.5rem;
}

.log-reference {
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 4px;
  border-left: 3px solid #007bff;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  word-break: break-all;

  &:last-child {
    margin-bottom: 0;
  }
}

.log-line-number {
  font-weight: 600;
  color: #495057;
  margin-right: 0.5rem;
}

.log-content {
  color: #2c3e50;
  background: none;
  padding: 0;
}

.matched-pattern {
  display: block;
  font-size: 0.8rem;
  color: #28a745;
  margin-top: 0.25rem;
  font-style: italic;
}

.message-actions {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.analysis-status {
  padding: 1rem;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
  flex-shrink: 0;
}

.status-summary {
  h4 {
    margin: 0 0 0.5rem 0;
    color: #495057;
  }
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.75rem;
}

.result-item {
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  background: white;
  transition: all 0.2s ease;

  &.status-success {
    border-color: #28a745;
    background: #d4edda;
  }

  &.status-partial {
    border-color: #ffc107;
    background: #fff3cd;
  }

  &.status-failed {
    border-color: #dc3545;
    background: #f8d7da;
  }

  &.status-incomplete {
    border-color: #6c757d;
    background: #f8f9fa;
  }

  &.status-running {
    border-color: #007bff;
    background: #e7f3ff;
    animation: pulse 2s infinite;
  }
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

.rule-name {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.result-stats {
  font-size: 0.85rem;
  color: #6c757d;
  margin-bottom: 0.25rem;
}

.result-status {
  font-size: 0.8rem;
  font-weight: 600;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #6c757d;
  padding: 2rem;

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    color: #495057;
  }

  .log-info {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #e7f3ff;
    border-radius: 6px;
    border: 1px solid #007bff;
    max-width: 300px;
  }

  .empty-tips {
    margin-top: 2rem;
    text-align: left;
    max-width: 400px;

    h4 {
      color: #495057;
      margin-bottom: 0.5rem;
    }

    ul {
      padding-left: 1.5rem;
      color: #6c757d;

      li {
        margin-bottom: 0.25rem;
      }
    }
  }
}

.modal {
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
  padding: 2rem;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.range-info {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #e7f3ff;
  border-radius: 6px;
}

.range-selector {
  margin: 1.5rem 0;
}

.range-input-group {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.range-input {
  display: flex;
  align-items: center;
  flex: 1;

  label {
    width: 80px;
    font-weight: 500;
    margin-right: 0.5rem;
  }

  input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;

    &:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }
  }
}

.range-preview {
  h4 {
    margin: 0 0 0.5rem 0;
    color: #495057;
  }
}

.preview-container {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 0.5rem;
  background: #f8f9fa;
}

.preview-line {
  display: flex;
  padding: 0.25rem;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  border-bottom: 1px solid #e9ecef;

  &:last-child {
    border-bottom: none;
  }
}

.line-number {
  font-weight: 600;
  color: #495057;
  min-width: 60px;
  margin-right: 0.5rem;
}

.line-content {
  flex: 1;
  color: #2c3e50;
  word-break: break-all;
}

.preview-more {
  text-align: center;
  padding: 0.5rem;
  color: #6c757d;
  font-style: italic;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.btn-primary {
    background: #007bff;
    color: white;

    &:hover:not(:disabled) {
      background: #0056b3;
    }
  }

  &.btn-secondary {
    background: #6c757d;
    color: white;

    &:hover:not(:disabled) {
      background: #545b62;
    }
  }

  &.btn-outline {
    background: transparent;
    border: 1px solid #6c757d;
    color: #6c757d;

    &:hover:not(:disabled) {
      background: #6c757d;
      color: white;
    }
  }
}

.action-btn {
  padding: 0.25rem 0.75rem;
  border: 1px solid;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &.action-primary {
    background: #007bff;
    border-color: #007bff;
    color: white;

    &:hover {
      background: #0056b3;
    }
  }

  &.action-secondary {
    background: transparent;
    border-color: #6c757d;
    color: #6c757d;

    &:hover {
      background: #6c757d;
      color: white;
    }
  }

  &.action-danger {
    background: #dc3545;
    border-color: #dc3545;
    color: white;

    &:hover {
      background: #c82333;
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 媒体查询 */
@media (max-width: 768px) {
  .analysis-content {
    flex-direction: column;
  }

  .sessions-panel {
    width: 100%;
    height: 200px;

    &.collapsed {
      height: 0;
    }
  }

  .control-panel {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .rule-selector {
    flex-direction: column;
    align-items: stretch;

    label {
      margin-bottom: 0.25rem;
    }
  }

  .rule-select {
    min-width: auto;
  }

  .control-buttons {
    justify-content: center;
  }

  .analysis-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;

    .header-actions {
      flex-direction: column;
      gap: 0.75rem;
    }

    .log-stats {
      margin-right: 0;
      text-align: center;
    }

    .header-buttons {
      justify-content: center;
    }
  }

  .workspace-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .analysis-progress {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
  }

  .range-input-group {
    flex-direction: column;
    gap: 0.75rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .results-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .analysis-header {
    padding: 0.75rem;
  }

  .control-panel {
    padding: 0.75rem;
  }

  .messages-container {
    padding: 0.75rem;
  }

  .analysis-status {
    padding: 0.75rem;
  }

  .modal-content {
    padding: 1rem;
    margin: 1rem;
  }

  .workspace-toolbar {
    padding: 0.5rem 0.75rem;
  }
}
</style>