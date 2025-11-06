import { LogReaderService } from '@/services/LogReaderService';
import type { FilterOptions, LogEntry, LogLevel, LogReaderState } from '@/types/log';
import { computed, ref } from 'vue';

export function useLogReader() {
  const logReaderService = new LogReaderService();

  const state = ref<LogReaderState>({
    logs: [],
    stats: {
      totalFiles: 0,
      totalLogEntries: 0,
      fileTypes: [],
      selectedFolder: '',
      levelDistribution: {
        DEBUG: 0,
        INFO: 0,
        WARN: 0,
        ERROR: 0
      }
    },
    loading: false,
    error: null
  });

  const filters = ref<FilterOptions>({
    keyword: '',
    packageName: '',
    alias: '',
    tag: '',
    level: '',              // 替换 pid
    useRegex: false
  });

  // 计算属性
  const filteredLogs = computed(() => {
    try {
      return logReaderService.filterLogs(state.value.logs, filters.value);
    } catch (error) {
      console.error('过滤日志时出错:', error);
      return state.value.logs;
    }
  });

  const uniquePackages = computed(() => {
    try {
      return logReaderService.getUniquePackageNames(state.value.logs);
    } catch (error) {
      console.error('获取包名列表时出错:', error);
      return [];
    }
  });

  const uniqueAliases = computed(() => {
    try {
      return logReaderService.getUniqueAliases(state.value.logs);
    } catch (error) {
      console.error('获取别名列表时出错:', error);
      return [];
    }
  });

  const uniqueTags = computed(() => {
    try {
      return logReaderService.getUniqueTags(state.value.logs);
    } catch (error) {
      console.error('获取标签列表时出错:', error);
      return [];
    }
  });

  const uniqueLevels = computed(() => {
    try {
      return logReaderService.getUniqueLevels(state.value.logs);
    } catch (error) {
      console.error('获取级别列表时出错:', error);
      return [];
    }
  });

  const hasLogs = computed(() => {
    return state.value.logs.length > 0;
  });

  // 方法
  const selectFolder = async (): Promise<void> => {
    state.value.loading = true;
    state.value.error = null;

    try {
      const result = await logReaderService.handleFolderSelection();

      // 只有当有实际文件时才更新状态
      if (result.logs.length > 0) {
        state.value.logs = result.logs;
        state.value.stats = result.stats;
      } else {
        // 用户取消选择或选择空文件夹，不更新日志数据，但也不显示错误
        console.log('用户取消了文件夹选择或选择了空文件夹');
      }
    } catch (error) {
      console.error('文件夹选择错误:', error);
      // 只在实际错误时设置错误信息
      state.value.error = error instanceof Error ? error.message : '读取文件夹失败';
    } finally {
      state.value.loading = false;
    }
  };

  const updateFilters = (newFilters: Partial<FilterOptions>): void => {
    try {
      filters.value = { ...filters.value, ...newFilters };
    } catch (error) {
      console.error('筛选更新错误:', error);
    }
  };

  const toggleRegex = (): void => {
    updateFilters({ useRegex: !filters.value.useRegex });
  };

  const clearFilters = (): void => {
    try {
      filters.value = {
        keyword: '',
        packageName: '',
        alias: '',
        tag: '',
        level: '',
        useRegex: false
      };
    } catch (error) {
      console.error('清除筛选错误:', error);
    }
  };

  const clearAll = (): void => {
    try {
      logReaderService.clearData();
      state.value = {
        logs: [],
        stats: {
          totalFiles: 0,
          totalLogEntries: 0,
          fileTypes: [],
          selectedFolder: '',
          levelDistribution: {
            DEBUG: 0,
            INFO: 0,
            WARN: 0,
            ERROR: 0
          }
        },
        loading: false,
        error: null
      };
      clearFilters();
    } catch (error) {
      console.error('清空数据错误:', error);
    }
  };

  // 更新日志级别判断，现在从 level 字段获取
  const getLogLevel = (level: LogLevel): string => {
    return level.toLowerCase();
  };

  const getDisplayPackageName = (log: LogEntry): string => {
    try {
      if (log.alias) {
        return `${log.packageName}/${log.alias}`;
      }
      return log.packageName;
    } catch (error) {
      return log.packageName;
    }
  };

  // 获取级别显示颜色
  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case 'DEBUG': return '#6c757d'; // 灰色
      case 'INFO': return '#007bff';  // 蓝色
      case 'WARN': return '#ffc107';  // 黄色
      case 'ERROR': return '#dc3545'; // 红色
      default: return '#6c757d';
    }
  };

  // 获取级别显示文本
  const getLevelText = (level: LogLevel): string => {
    switch (level) {
      case 'DEBUG': return 'D';
      case 'INFO': return 'I';
      case 'WARN': return 'W';
      case 'ERROR': return 'E';
      default: return '?';
    }
  };

  return {
    // 状态
    state: computed(() => state.value),
    filters: computed(() => filters.value),

    // 计算属性
    filteredLogs,
    uniquePackages,
    uniqueAliases,
    uniqueTags,
    uniqueLevels,
    hasLogs,

    // 方法
    selectFolder,
    updateFilters,
    toggleRegex,
    clearFilters,
    clearAll,
    getLogLevel,
    getDisplayPackageName,
    getLevelColor,
    getLevelText
  };
}