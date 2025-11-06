<template>
  <div class="log-viewer">
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="header">
        <h2>日志文件查看器</h2>
        <p>选择包含日志文件的文件夹，系统将自动解析并按时间排序</p>
      </div>

      <div class="actions">
        <button @click="selectFolder" :disabled="loading" class="btn btn-primary">
          {{ loading ? '读取中...' : '📁 选择日志文件夹' }}
        </button>

        <button v-if="hasLogs" @click="clearAll" class="btn btn-secondary">
          清空所有
        </button>

        <!-- 新增：切换到分析按钮 -->
        <button v-if="hasLogs" @click="$emit('switch-to-analysis')" class="btn btn-outline">
          🔍 切换到规则分析
        </button>
      </div>

      <!-- 操作状态提示 -->
      <div v-if="operationStatus" class="operation-status" :class="operationStatus.type">
        <span class="status-icon">{{ operationStatus.icon }}</span>
        <span class="status-message">{{ operationStatus.message }}</span>
        <button @click="clearOperationStatus" class="status-close">×</button>
      </div>

      <!-- 统计信息 -->
      <div v-if="stats.selectedFolder" class="stats-panel">
        <h3>文件夹信息</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <label>文件夹:</label>
            <span>{{ stats.selectedFolder }}</span>
          </div>
          <div class="stat-item">
            <label>文件数:</label>
            <span>{{ stats.totalFiles }}</span>
          </div>
          <div class="stat-item">
            <label>日志条目:</label>
            <span>{{ stats.totalLogEntries }}</span>
          </div>
          <div class="stat-item">
            <label>文件类型:</label>
            <span>{{ stats.fileTypes.join(', ') }}</span>
          </div>
        </div>

        <!-- 级别分布统计 -->
        <div class="level-stats" v-if="hasLogs">
          <h4>日志级别分布</h4>
          <div class="level-stats-grid">
            <div v-for="level in uniqueLevels" :key="level" class="level-stat-item"
              :style="{ color: getLevelColor(level) }">
              <span class="level-badge">{{ getLevelText(level) }}</span>
              <span class="level-count">{{ stats.levelDistribution[level] }}</span>
              <span class="level-name">{{ level }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 筛选面板 -->
      <div v-if="hasLogs" class="filter-panel">
        <h3>筛选条件</h3>
        <div class="filter-grid">
          <div class="filter-group keyword-group">
            <label>关键词搜索:</label>
            <div class="keyword-input-container">
              <input type="text" v-model="localFilters.keyword"
                :placeholder="filters.useRegex ? '输入正则表达式...' : '输入搜索关键词...'" class="filter-input keyword-input" />
              <button @click="toggleRegex" :class="['regex-btn', { active: filters.useRegex }]"
                :title="filters.useRegex ? '关闭正则表达式' : '使用正则表达式'">
                .*
              </button>
            </div>
          </div>

          <div class="filter-group">
            <label>包名:</label>
            <select v-model="localFilters.packageName" class="filter-select">
              <option value="">所有包名</option>
              <option v-for="pkg in uniquePackages" :key="pkg" :value="pkg">
                {{ pkg }}
              </option>
            </select>
          </div>

          <div class="filter-group">
            <label>别名:</label>
            <select v-model="localFilters.alias" class="filter-select">
              <option value="">所有别名</option>
              <option v-for="alias in uniqueAliases" :key="alias" :value="alias">
                {{ alias }}
              </option>
            </select>
          </div>

          <div class="filter-group">
            <label>标签:</label>
            <select v-model="localFilters.tag" class="filter-select">
              <option value="">所有标签</option>
              <option v-for="tag in uniqueTags" :key="tag" :value="tag">
                {{ tag }}
              </option>
            </select>
          </div>

          <!-- 替换进程ID为日志级别筛选 -->
          <div class="filter-group">
            <label>日志级别:</label>
            <select v-model="localFilters.level" class="filter-select">
              <option value="">所有级别</option>
              <option v-for="level in uniqueLevels" :key="level" :value="level">
                {{ level }} ({{ getLevelText(level) }})
              </option>
            </select>
          </div>

          <div class="filter-actions">
            <button @click="clearFilters" class="btn btn-outline">
              清除筛选
            </button>
            <span class="filter-count">
              显示 {{ filteredLogs.length }} / {{ logs.length }} 条日志
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-panel">
      <div class="error-message">
        <span class="error-icon">❌</span>
        {{ error }}
        <button @click="clearError" class="error-close">×</button>
      </div>
    </div>

    <!-- 日志列表 -->
    <div v-if="filteredLogs.length > 0" class="log-container">
      <div class="log-panel">
        <div class="log-header">
          <div class="log-column level">级别</div>
          <div class="log-column timestamp">时间</div>
          <div class="log-column pid">进程号</div>
          <div class="log-column package">包名/别名</div>
          <div class="log-column tag">标签</div>
          <div class="log-column message">日志内容</div>
          <div class="log-column filename">文件名</div>
        </div>

        <div class="log-list">
          <div v-for="(log, index) in filteredLogs" :key="index" class="log-row"
            :class="`log-level-${getLogLevel(log.level)}`">
            <div class="log-column level">
              <span class="level-badge" :style="{ backgroundColor: getLevelColor(log.level) }">
                {{ getLevelText(log.level) }}
              </span>
            </div>
            <div class="log-column timestamp">
              <span class="cell-content">{{ log.timestamp }}</span>
            </div>
            <div class="log-column pid">
              <span class="cell-content">{{ log.pid }}</span>
            </div>
            <div class="log-column package">
              <span class="cell-content" :title="log.fullPackagePath">
                {{ getDisplayPackageName(log) }}
              </span>
            </div>
            <div class="log-column tag">
              <span class="cell-content">{{ log.tag }}</span>
            </div>
            <div class="log-column message">
              <span class="cell-content">{{ log.message }}</span>
            </div>
            <div class="log-column filename">
              <span class="cell-content">{{ log.fileName }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading && !hasLogs" class="empty-state">
      <div class="empty-content">
        <div class="empty-icon">📁</div>
        <h3>暂无日志数据</h3>
        <p>请选择包含日志文件的文件夹开始分析</p>
      </div>
    </div>

    <!-- 无结果状态 -->
    <div v-else-if="hasLogs && filteredLogs.length === 0" class="empty-state">
      <div class="empty-content">
        <div class="empty-icon">🔍</div>
        <h3>未找到匹配的日志</h3>
        <p>请调整筛选条件后重试</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FilterOptions, FolderStats, LogEntry, LogLevel } from '@/types/log';
import { computed, ref, watch } from 'vue';

interface Props {
  logs: LogEntry[];
  stats: FolderStats;
  loading: boolean;
  error: string | null;
}

interface Emits {
  (e: 'select-folder'): void;
  (e: 'clear-all'): void;
  (e: 'switch-to-analysis'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 本地筛选状态
const filters = ref<FilterOptions>({
  keyword: '',
  packageName: '',
  alias: '',
  tag: '',
  level: '',
  useRegex: false
});

// 操作状态提示
const operationStatus = ref<{ type: 'info' | 'success' | 'warning'; icon: string; message: string } | null>(null);

// 计算属性
const hasLogs = computed(() => props.logs.length > 0);

// 清除操作状态
const clearOperationStatus = () => {
  operationStatus.value = null;
};

// 清除错误
const clearError = () => {
  // 通过事件通知父组件清除错误
  emit('clear-all');
};

// 选择文件夹
const selectFolder = () => {
  // 先清除之前的操作状态
  clearOperationStatus();
  emit('select-folder');
};

// 监听加载状态和错误状态，显示相应的操作提示
watch(() => props.loading, (newLoading, oldLoading) => {
  if (oldLoading && !newLoading) {
    // 加载完成
    if (props.error) {
      // 有错误
      operationStatus.value = {
        type: 'warning',
        icon: '⚠️',
        message: props.error
      };
    } else if (props.logs.length > 0) {
      // 成功加载日志
      operationStatus.value = {
        type: 'success',
        icon: '✅',
        message: `成功加载 ${props.logs.length} 条日志文件`
      };

      // 3秒后自动清除成功提示
      setTimeout(() => {
        if (operationStatus.value?.type === 'success') {
          clearOperationStatus();
        }
      }, 3000);
    } else {
      // 用户取消了选择
      operationStatus.value = {
        type: 'info',
        icon: 'ℹ️',
        message: '已取消选择文件夹'
      };

      // 2秒后自动清除取消提示
      setTimeout(() => {
        if (operationStatus.value?.type === 'info') {
          clearOperationStatus();
        }
      }, 2000);
    }
  }
});

const filteredLogs = computed(() => {
  if (!hasLogs.value) return [];

  return props.logs.filter(log => {
    // 关键词筛选 - 修复正则表达式支持
    if (filters.value.keyword) {
      const hasKeywordMatch = testStringMatch(
        [
          log.message,
          log.fullLine,
          log.packageName,
          log.alias || '',
          log.tag,
          log.pid,
          log.fileName
        ],
        filters.value.keyword,
        filters.value.useRegex
      );

      if (!hasKeywordMatch) {
        return false;
      }
    }

    // 包名筛选
    if (filters.value.packageName && !log.packageName.includes(filters.value.packageName)) {
      return false;
    }

    // 别名筛选
    if (filters.value.alias) {
      if (!log.alias) return false;
      if (!log.alias.includes(filters.value.alias)) return false;
    }

    // 标签筛选
    if (filters.value.tag && !log.tag.includes(filters.value.tag)) {
      return false;
    }

    // 级别筛选
    if (filters.value.level && log.level !== filters.value.level) {
      return false;
    }

    return true;
  });
});

// 字符串匹配测试函数（支持正则表达式）
const testStringMatch = (fields: string[], pattern: string, useRegex: boolean): boolean => {
  if (!pattern.trim()) return true;

  try {
    if (useRegex) {
      // 使用正则表达式匹配
      const regex = new RegExp(pattern, 'i');
      return fields.some(field => regex.test(field));
    } else {
      // 使用普通文本包含匹配
      const lowerPattern = pattern.toLowerCase();
      return fields.some(field => field.toLowerCase().includes(lowerPattern));
    }
  } catch (error) {
    // 如果正则表达式语法错误，回退到普通文本匹配
    console.warn(`正则表达式语法错误 "${pattern}"，使用普通文本匹配:`, error);
    const lowerPattern = pattern.toLowerCase();
    return fields.some(field => field.toLowerCase().includes(lowerPattern));
  }
};


const uniquePackages = computed(() => {
  return [...new Set(props.logs.map(log => log.packageName))];
});

const uniqueAliases = computed(() => {
  const aliases = props.logs
    .map(log => log.alias)
    .filter((alias): alias is string => !!alias);
  return [...new Set(aliases)];
});

const uniqueTags = computed(() => {
  return [...new Set(props.logs.map(log => log.tag))];
});

const uniqueLevels = computed(() => {
  return [...new Set(props.logs.map(log => log.level))];
});

const clearAll = () => {
  emit('clear-all');
};

const toggleRegex = () => {
  filters.value.useRegex = !filters.value.useRegex;
};

const clearFilters = () => {
  filters.value = {
    keyword: '',
    packageName: '',
    alias: '',
    tag: '',
    level: '',
    useRegex: false
  };
};

// 监听筛选条件变化
const localFilters = {
  get keyword() {
    return filters.value.keyword;
  },
  set keyword(value: string) {
    filters.value.keyword = value;
  },
  get packageName() {
    return filters.value.packageName;
  },
  set packageName(value: string) {
    filters.value.packageName = value;
  },
  get alias() {
    return filters.value.alias;
  },
  set alias(value: string) {
    filters.value.alias = value;
  },
  get tag() {
    return filters.value.tag;
  },
  set tag(value: string) {
    filters.value.tag = value;
  },
  get level() {
    return filters.value.level;
  },
  set level(value: string) {
    filters.value.level = value;
  }
};

// 日志级别相关方法
const getLogLevel = (level: LogLevel): string => {
  return level.toLowerCase();
};

const getLevelColor = (level: LogLevel): string => {
  switch (level) {
    case 'DEBUG': return '#6c757d';
    case 'INFO': return '#007bff';
    case 'WARN': return '#ffc107';
    case 'ERROR': return '#dc3545';
    default: return '#6c757d';
  }
};

const getLevelText = (level: LogLevel): string => {
  switch (level) {
    case 'DEBUG': return 'D';
    case 'INFO': return 'I';
    case 'WARN': return 'W';
    case 'ERROR': return 'E';
    default: return '?';
  }
};

const getDisplayPackageName = (log: LogEntry): string => {
  if (log.alias) {
    return `${log.packageName}/${log.alias}`;
  }
  return log.packageName;
};
</script>

<style scoped>
.log-viewer {
  padding: 20px;
  max-width: 100%;
  margin: 0 auto;
}

.control-panel {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header h2 {
  margin: 0 0 8px 0;
  color: #333;
}

.header p {
  margin: 0;
  color: #666;
}

.actions {
  margin: 20px 0;
  display: flex;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
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

.stats-panel,
.filter-panel {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e9ecef;
}

.stats-panel h3,
.filter-panel h3 {
  margin: 0 0 16px 0;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-item label {
  font-weight: 600;
  color: #666;
  font-size: 14px;
}

.stat-item span {
  color: #333;
  font-size: 16px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.filter-input,
.filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: #007bff;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.filter-count {
  color: #666;
  font-size: 14px;
}

.error-panel {
  margin-bottom: 20px;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #f5c6cb;
}

/* 修复日志容器样式 */
.log-container {
  width: 100%;
  overflow-x: auto;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.log-panel {
  min-width: 1200px;
  /* 确保有足够的最小宽度 */
  width: 100%;
}

.log-header {
  display: grid;
  grid-template-columns: 200px 100px 250px 150px minmax(400px, 1fr) 150px;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  font-weight: 600;
  position: sticky;
  left: 0;
}

.log-column {
  padding: 12px 8px;
  border-right: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  min-height: 44px;
  word-break: break-word;
  overflow-wrap: break-word;
}

.log-column:last-child {
  border-right: none;
}

.log-list {
  max-height: 70vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.log-row {
  display: grid;
  grid-template-columns: 200px 100px 250px 150px minmax(400px, 1fr) 150px;
  border-bottom: 1px solid #f1f3f4;
  transition: background-color 0.2s;
  min-height: 44px;
}

.log-row:hover {
  background: #f8f9fa;
}

.log-level-error {
  background: #f8d7da;
}

.log-level-warning {
  background: #fff3cd;
}

.log-level-success {
  background: #d1edff;
}

.log-level-info {
  background: #fff;
}

.cell-content {
  width: 100%;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: normal;
  line-height: 1.4;
}

/* 特定列的样式调整 */
.log-column.timestamp {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #666;
}

.log-column.pid {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  color: #28a745;
}

.log-column.package {
  color: #007bff;
  font-weight: 500;
}

.log-column.tag {
  color: #6f42c1;
  font-weight: 500;
}

.log-column.message {
  color: #343a40;
  line-height: 1.5;
}

.log-column.filename {
  font-size: 11px;
  color: #fd7e14;
  font-family: 'Courier New', monospace;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-content {
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-content h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.empty-content p {
  margin: 0;
  color: #666;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .log-viewer {
    padding: 12px;
  }

  .control-panel {
    padding: 16px;
  }

  .stats-grid,
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .actions {
    flex-direction: column;
  }

  .log-panel {
    min-width: 1000px;
    /* 在移动端保持足够宽度以支持滚动 */
  }

  .log-header,
  .log-row {
    grid-template-columns: 180px 80px 200px 120px minmax(300px, 1fr) 120px;
  }
}

/* 滚动条样式 */
.log-container::-webkit-scrollbar {
  height: 8px;
}

.log-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.log-list::-webkit-scrollbar {
  width: 8px;
}

.log-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.log-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.log-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.keyword-group {
  grid-column: 1 / -1;
  /* 关键词搜索占据整行 */
}

.keyword-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.keyword-input {
  flex: 1;
  padding-right: 40px;
  /* 为按钮留出空间 */
}

.regex-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  border-radius: 2px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Courier New', monospace;
  color: #6c757d;
}

.regex-btn:hover {
  color: #495057;
  background-color: #f8f9fa;
}

.regex-btn.active {
  color: #007bff;
  background-color: #e7f3ff;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .keyword-input-container {
    flex-direction: column;
    gap: 8px;
  }

  .keyword-input {
    padding-right: 12px;
  }

  .regex-btn {
    position: static;
    align-self: flex-end;
  }

  .filter-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

/* 级别统计样式 */
.level-stats {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e9ecef;
}

.level-stats h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 14px;
}

.level-stats-grid {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.level-stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.level-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.level-count {
  font-weight: bold;
}

.level-name {
  color: #666;
  font-size: 12px;
}

/* 日志列表级别列样式 */
.log-header {
  display: grid;
  grid-template-columns: 80px 180px 80px 200px 120px minmax(400px, 1fr) 120px;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  font-weight: 600;
  position: sticky;
  left: 0;
}

.log-row {
  display: grid;
  grid-template-columns: 80px 180px 80px 200px 120px minmax(400px, 1fr) 120px;
  border-bottom: 1px solid #f1f3f4;
  transition: background-color 0.2s;
  min-height: 44px;
}

/* 修复响应式设计 */
@media (max-width: 768px) {
  .log-panel {
    min-width: 1000px;
  }

  .log-header,
  .log-row {
    grid-template-columns: 60px 150px 70px 150px 100px minmax(300px, 1fr) 100px;
  }
}

.log-column.level {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

/* 日志级别颜色样式 */
.log-level-debug {
  background-color: #f8f9fa;
}

.log-level-info {
  background-color: #ffffff;
}

.log-level-warn {
  background-color: #fff3cd;
}

.log-level-error {
  background-color: #f8d7da;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .level-stats-grid {
    flex-direction: column;
    gap: 8px;
  }

  .log-panel {
    min-width: 1100px;
  }

  .log-header,
  .log-row {
    grid-template-columns: 60px 180px 80px 180px 120px minmax(300px, 1fr) 120px;
  }
}

/* 其他原有样式保持不变 */
.keyword-group {
  grid-column: 1 / -1;
}

.keyword-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.keyword-input {
  flex: 1;
  padding-right: 40px;
}

.regex-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  border-radius: 2px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Courier New', monospace;
  color: #6c757d;
}

.regex-btn:hover {
  color: #495057;
  background-color: #f8f9fa;
}

.regex-btn.active {
  color: #007bff;
  background-color: #e7f3ff;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

::-webkit-scrollbar {
  display: none;
}
</style>