<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useLogReader } from '@/composables/useLogReader';
import { useRuleEngine } from '@/composables/useRuleEngine';
import LogViewer from '@/components/LogViewer.vue';
import RulesManager from '@/components/RulesManager.vue';
import RuleAnalysis from '@/components/RuleAnalysis.vue';

// 标签页状态
const activeTab = ref<'logs' | 'rules' | 'analysis'>('logs');

// 日志读取功能
const logReader = useLogReader();
const { state, selectFolder, clearAll } = logReader;

// 规则引擎功能
const ruleEngine = useRuleEngine();
const { analysisResults, analyzeWithRules, getRules, clearResults } = ruleEngine;

// 使用计算属性实时获取规则列表
const availableRules = getRules();

// 全局消息提示
const globalMessage = ref<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

// 切换到分析标签页
const switchToAnalysis = () => {
  if (state.value.logs.length === 0) {
    globalMessage.value = {
      type: 'error',
      text: '请先在日志查看页面加载日志文件'
    };
    return;
  }
  activeTab.value = 'analysis';
};

// 运行分析
const runAnalysis = (selectedRules: string[]) => {
  if (state.value.logs.length === 0) {
    globalMessage.value = {
      type: 'error',
      text: '没有可分析的日志数据'
    };
    return;
  }

  try {
    analyzeWithRules(state.value.logs, selectedRules);
    globalMessage.value = {
      type: 'success',
      text: `分析完成，共检测到 ${analysisResults.value.length} 个规则实例`
    };
  } catch (error) {
    globalMessage.value = {
      type: 'error',
      text: `分析失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
};

// 清除分析结果
const clearAnalysisResults = () => {
  clearResults();
};

// 监听日志数据变化，自动清除分析结果
watch(() => state.value.logs, (newLogs, oldLogs) => {
  if (newLogs.length === 0 && oldLogs.length > 0) {
    clearAnalysisResults();
  }
});

// 计算属性：是否有日志数据
const hasLogs = computed(() => state.value.logs.length > 0);
</script>

<template>
  <div class="log-analyzer-app">
    <!-- 头部导航 -->
    <header class="app-header">
      <div class="header-content">
        <h1>📊 智能日志分析工具</h1>
        <nav class="main-nav">
          <button :class="['nav-btn', { active: activeTab === 'logs' }]" @click="activeTab = 'logs'">
            📋 日志查看
          </button>
          <button :class="['nav-btn', { active: activeTab === 'rules' }]" @click="activeTab = 'rules'">
            ⚙️ 规则管理
          </button>
          <button :class="['nav-btn', { active: activeTab === 'analysis' }]" @click="switchToAnalysis">
            🔍 规则分析
          </button>
        </nav>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="app-main">
      <!-- 日志查看标签页 -->
      <div v-if="activeTab === 'logs'" class="tab-content">
        <LogViewer :logs="state.logs" :stats="state.stats" :loading="state.loading" :error="state.error"
          @select-folder="selectFolder" @clear-all="clearAll" @switch-to-analysis="switchToAnalysis" />
      </div>

      <!-- 规则管理标签页 -->
      <div v-if="activeTab === 'rules'" class="tab-content">
        <RulesManager />
      </div>

      <!-- 规则分析标签页 -->
      <div v-if="activeTab === 'analysis'" class="tab-content">
        <RuleAnalysis :logs="state.logs" :analysis-results="analysisResults" :available-rules="availableRules"
          @analyze="runAnalysis" @clear-results="clearAnalysisResults" @switch-to-logs="activeTab = 'logs'"
          @switch-to-rules="activeTab = 'rules'" />
      </div>
    </main>

    <!-- 全局状态提示 -->
    <div v-if="globalMessage" class="global-message" :class="globalMessage.type">
      {{ globalMessage.text }}
      <button @click="globalMessage = null" class="close-btn">×</button>
    </div>
  </div>
</template>

<style scoped>
.log-analyzer-app {
  min-height: 100vh;
  background: #f8f9fa;
}

.app-header {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 70px;
}

.app-header h1 {
  margin: 0;
  color: #333;
  font-size: 1.5rem;
}

.main-nav {
  display: flex;
  gap: 8px;
}

.nav-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #666;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.nav-btn.active {
  background: #007bff;
  color: white;
}

.app-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.tab-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.global-message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 16px 20px;
  border-radius: 6px;
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1000;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.global-message.success {
  background: #28a745;
}

.global-message.error {
  background: #dc3545;
}

.global-message.info {
  background: #17a2b8;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    height: auto;
    padding: 15px 20px;
    gap: 15px;
  }

  .main-nav {
    width: 100%;
    justify-content: space-between;
  }

  .nav-btn {
    flex: 1;
    justify-content: center;
  }

  .global-message {
    left: 20px;
    right: 20px;
    max-width: none;
  }
}
</style>