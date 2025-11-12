import { GlobalMessage, LogFile } from "@/types/Common";
import { defineStore } from "pinia";
import { ref } from "vue";

// 日志全局存储
export const useCommonStore = defineStore('logStore',
  () => {
    // 全局消息提示
    const globalMessage = ref<GlobalMessage | null>(null);
    // 日志文件列表
    const logFiles = ref<LogFile[]>([]);
    // 当前选中的日志文件ID
    const selectedLogFileIds = ref<string[]>([]);
    // 当前选中的规则ID
    const selectedRuleId = ref<string>('');

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const setGlobalMessage = (message: GlobalMessage | null) => {
      // 清除之前的定时器
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      globalMessage.value = message;
      // 设置自动清除
      if (message) {
        const duration = message.duration || 2000;
        timeoutId = setTimeout(() => {
          globalMessage.value = null;
          timeoutId = null;
        }, duration);
      }
    };

    // 添加日志文件
    const addLogFile = (file: LogFile) => {
      // 检查是否已存在相同文件
      const exists = logFiles.value.some(f =>
        f.name === file.name && f.size === file.size
      );

      if (!exists) {
        logFiles.value.push(file);
      }
    };

    // 批量添加日志文件
    const addLogFiles = (files: LogFile[]) => {
      files.forEach(file => addLogFile(file));
    };

    // 删除选中的日志文件
    const deleteSelectedLogFiles = () => {
      logFiles.value = logFiles.value.filter(
        file => !selectedLogFileIds.value.includes(file.id)
      );
      selectedLogFileIds.value = [];
    };

    // 清空所有日志文件
    const clearAllLogFiles = () => {
      logFiles.value = [];
      selectedLogFileIds.value = [];
    };

    // 设置选中的日志文件
    const setSelectedLogFileIds = (ids: string[]) => {
      selectedLogFileIds.value = ids;
    };

    // 设置选中的规则
    const setSelectedRuleId = (ruleId: string) => {
      selectedRuleId.value = ruleId;
    };

    // 获取所有日志内容（合并所有选中的文件）
    const getAllLogContent = () => {
      const selectedFiles = logFiles.value.filter(
        file => selectedLogFileIds.value.includes(file.id)
      );

      return selectedFiles.flatMap(file => file.lines);
    };

    // 获取选中的日志文件
    const getSelectedLogFiles = () => {
      return logFiles.value.filter(
        file => selectedLogFileIds.value.includes(file.id)
      );
    };

    return {
      globalMessage,
      logFiles,
      selectedLogFileIds,
      selectedRuleId,
      setGlobalMessage,
      addLogFile,
      addLogFiles,
      deleteSelectedLogFiles,
      clearAllLogFiles,
      setSelectedLogFileIds,
      setSelectedRuleId,
      getAllLogContent,
      getSelectedLogFiles
    };
  },
  {
    persist: true,
  }
);