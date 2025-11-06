import type { LogEntry } from '@/types/log';
import { ref } from 'vue';

// 规则相关类型定义
export interface ProcessRule {
  name: string;
  patterns: string[];
}

export interface AnalysisRule {
  name: string;
  description: string;
  processRules: ProcessRule[];
  successPatterns: string[];
  failedPatterns: string[];
}

export interface ProcessResult {
  processName: string;
  status: 'matched' | 'inferred' | 'missing';
  matchedLogs: LogEntry[];
  inferredReason?: string;
}

export interface RuleMatchResult {
  ruleName: string;
  status: 'success' | 'failed' | 'inferred_success' | 'inferred_failed' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  processResults: ProcessResult[];
  evidence: {
    successLogs: LogEntry[];
    failedLogs: LogEntry[];
    inferredFrom: string[];
  };
  timeRange: {
    start: Date;
    end: Date;
  };
  interruptedAt?: string; // 新增：过程中断位置
}


class RuleEngine {
  private rules: AnalysisRule[] = [];
  private readonly storageKey = 'log-analyzer-rules';
  constructor() {
    this.loadFromStorage();
  }

  /**
   * 从 localStorage 加载规则
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsedRules = JSON.parse(stored);
        if (Array.isArray(parsedRules)) {
          // 验证每个规则的结构
          this.rules = parsedRules.filter(rule =>
            rule &&
            typeof rule.name === 'string' &&
            Array.isArray(rule.processRules) &&
            Array.isArray(rule.successPatterns)
          );

          // 如果没有任何有效规则，添加示例规则
          if (this.rules.length === 0) {
            this.addExampleRule();
          }
        } else {
          this.addExampleRule();
        }
      } else {
        this.addExampleRule();
      }
    } catch (error) {
      console.error('从存储加载规则失败:', error);
      this.addExampleRule();
    }
  }

  /**
   * 保存规则到 localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.rules));
    } catch (error) {
      console.error('保存规则到存储失败:', error);
    }
  }

  /**
  * 添加示例规则
  */
  private addExampleRule(): void {
    const exampleRule: AnalysisRule = {
      name: "startplayer-text",
      description: "起播流程验证",
      processRules: [
        {
          name: "开始起播",
          patterns: ["startplay"]
        },
        {
          name: "章节列表加载成功",
          patterns: ["onChapterListLoaded"]
        },
        {
          name: "章节加载成功",
          patterns: ["onChaptersLoaded"]
        }
      ],
      successPatterns: ["startplay_success"],
      failedPatterns: ["startplay_failed"]
    };
    this.rules.push(exampleRule);
    this.saveToStorage();
  }


  clearResults(): void {
  }

  clearRules(): void {
    this.rules = [];
    this.saveToStorage();
  }

  addRule(rule: AnalysisRule): void {
    // 验证规则数据
    if (!rule.name || !rule.processRules || rule.processRules.length === 0) {
      throw new Error('无效的规则数据');
    }

    // 检查是否已存在同名规则
    const existingIndex = this.rules.findIndex(r => r.name === rule.name);
    if (existingIndex >= 0) {
      this.rules[existingIndex] = rule;
    } else {
      this.rules.push(rule);
    }

    this.saveToStorage();
  }

  importFromJson(json: string): void {
    try {
      const ruleData: AnalysisRule = JSON.parse(json);

      // 验证导入的数据格式
      if (!ruleData.name || !ruleData.processRules) {
        throw new Error('无效的规则格式');
      }

      this.addRule(ruleData);
    } catch (error) {
      throw new Error(`规则JSON格式错误: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
  // 添加规则验证方法
  private isValidRule(rule: any): rule is AnalysisRule {
    return (
      rule &&
      typeof rule.name === 'string' &&
      Array.isArray(rule.processRules) &&
      rule.processRules.length > 0 &&
      Array.isArray(rule.successPatterns) &&
      rule.successPatterns.length > 0
    );
  }

  analyzeLogs(logs: LogEntry[], selectedRuleNames?: string[]): RuleMatchResult[] {
    const results: RuleMatchResult[] = [];

    // 确定要分析的规则
    const rulesToAnalyze = selectedRuleNames
      ? this.rules.filter(rule => selectedRuleNames.includes(rule.name))
      : this.rules;

    for (const rule of rulesToAnalyze) {
      const ruleResults = this.analyzeSingleRuleWithMultipleInstances(rule, logs);
      results.push(...ruleResults);
    }

    // 按时间顺序排序结果
    return results.sort((a, b) =>
      a.timeRange.start.getTime() - b.timeRange.start.getTime()
    );
  }

  /**
   * 分析单个规则的多个实例
   */
  private analyzeSingleRuleWithMultipleInstances(rule: AnalysisRule, logs: LogEntry[]): RuleMatchResult[] {
    const instances: RuleMatchResult[] = [];
    let currentIndex = 0;

    while (currentIndex < logs.length) {
      const instance = this.findNextRuleInstance(rule, logs, currentIndex);

      if (instance) {
        instances.push(instance);
        // 移动到这次实例结束位置之后继续查找
        currentIndex = logs.findIndex(log =>
          new Date(log.timestamp).getTime() > instance.timeRange.end.getTime()
        );

        if (currentIndex === -1) break; // 没有更多日志了
      } else {
        break; // 没有找到更多实例
      }
    }

    return instances;
  }

  /**
   * 查找下一个规则实例
   */
  private findNextRuleInstance(rule: AnalysisRule, logs: LogEntry[], startIndex: number): RuleMatchResult | null {
    const processResults: ProcessResult[] = [];
    const successLogs: LogEntry[] = [];
    const failedLogs: LogEntry[] = [];
    const inferredFrom: string[] = [];

    let currentIndex = startIndex;
    let instanceStartTime: Date | null = null;
    let instanceEndTime: Date | null = null;
    let interruptedAt: string | undefined = undefined;

    // 按顺序检查每个过程规则
    for (let i = 0; i < rule.processRules.length; i++) {
      const processRule = rule.processRules[i];
      const processLogs = this.findMatchingLogsInTimeWindow(logs, processRule.patterns, currentIndex);

      if (processLogs.length > 0) {
        // 找到匹配的日志
        const firstMatch = processLogs[0];

        if (!instanceStartTime) {
          instanceStartTime = new Date(firstMatch.timestamp);
        }
        instanceEndTime = new Date(processLogs[processLogs.length - 1].timestamp);

        processResults.push({
          processName: processRule.name,
          status: 'matched',
          matchedLogs: processLogs
        });

        // 更新当前索引到这次匹配之后
        currentIndex = logs.indexOf(firstMatch) + 1;

        // 检查是否有成功/失败模式在当前过程之后出现
        const subsequentSuccessLogs = this.findMatchingLogsInTimeWindow(
          logs,
          rule.successPatterns,
          currentIndex
        );
        const subsequentFailedLogs = this.findMatchingLogsInTimeWindow(
          logs,
          rule.failedPatterns,
          currentIndex
        );

        successLogs.push(...subsequentSuccessLogs);
        failedLogs.push(...subsequentFailedLogs);

      } else {
        // 没有找到匹配日志，检查是否可以在后续过程中推断
        const canInfer = this.canInferProcess(processRule, rule, logs, currentIndex, i);

        if (canInfer) {
          processResults.push({
            processName: processRule.name,
            status: 'inferred',
            matchedLogs: [],
            inferredReason: '由后续过程推断完成'
          });
          inferredFrom.push(`过程 "${processRule.name}" 由后续过程推断`);
        } else {
          // 无法推断，记录中断位置
          processResults.push({
            processName: processRule.name,
            status: 'missing',
            matchedLogs: []
          });

          interruptedAt = `在过程 "${processRule.name}" 中断`;
          break; // 流程中断，停止继续匹配
        }
      }
    }

    // 如果没有找到任何过程匹配，返回null
    if (!instanceStartTime) {
      return null;
    }

    // 确定最终状态
    const finalStatus = this.determineInstanceStatus(
      rule,
      processResults,
      successLogs,
      failedLogs,
      interruptedAt
    );

    return {
      ruleName: rule.name,
      status: finalStatus.status,
      confidence: finalStatus.confidence,
      processResults,
      evidence: {
        successLogs,
        failedLogs,
        inferredFrom
      },
      timeRange: {
        start: instanceStartTime,
        end: instanceEndTime || new Date(logs[logs.length - 1].timestamp)
      },
      interruptedAt
    };
  }

  /**
   * 在时间窗口内查找匹配日志
   */
  private findMatchingLogsInTimeWindow(
    logs: LogEntry[],
    patterns: string[],
    startIndex: number,
    maxLookahead: number = 100 // 最多向前查找100条日志
  ): LogEntry[] {
    const matchingLogs: LogEntry[] = [];
    const endIndex = Math.min(startIndex + maxLookahead, logs.length);

    for (let i = startIndex; i < endIndex; i++) {
      const log = logs[i];
      for (const pattern of patterns) {
        if (log.message.includes(pattern) || log.fullLine.includes(pattern)) {
          matchingLogs.push(log);
          break;
        }
      }
    }

    return matchingLogs;
  }

  /**
   * 检查是否可以推断某个过程
   */
  private canInferProcess(
    processRule: ProcessRule,
    rule: AnalysisRule,
    logs: LogEntry[],
    currentIndex: number,
    currentProcessIndex: number
  ): boolean {
    // 检查后续过程是否有匹配
    const subsequentProcesses = rule.processRules.slice(currentProcessIndex + 1);
    for (const subsequentProcess of subsequentProcesses) {
      const subsequentLogs = this.findMatchingLogsInTimeWindow(
        logs,
        subsequentProcess.patterns,
        currentIndex
      );
      if (subsequentLogs.length > 0) {
        return true;
      }
    }

    // 检查成功/失败模式
    const successLogs = this.findMatchingLogsInTimeWindow(logs, rule.successPatterns, currentIndex);
    const failedLogs = this.findMatchingLogsInTimeWindow(logs, rule.failedPatterns, currentIndex);

    return successLogs.length > 0 || failedLogs.length > 0;
  }

  /**
   * 确定实例的最终状态
   */
  private determineInstanceStatus(
    rule: AnalysisRule,
    processResults: ProcessResult[],
    successLogs: LogEntry[],
    failedLogs: LogEntry[],
    interruptedAt: string | undefined
  ): { status: RuleMatchResult['status']; confidence: RuleMatchResult['confidence'] } {

    // 明确成功
    if (successLogs.length > 0 && !interruptedAt) {
      return { status: 'success', confidence: 'high' };
    }

    // 明确失败
    if (failedLogs.length > 0) {
      return { status: 'failed', confidence: 'high' };
    }

    // 流程中断
    if (interruptedAt) {
      return { status: 'failed', confidence: 'medium' };
    }

    // 检查所有过程规则是否都完成（匹配或推断）
    const allProcessesCompleted = processResults.every(result =>
      result.status === 'matched' || result.status === 'inferred'
    );

    if (allProcessesCompleted) {
      // 有推断的情况
      const hasInferred = processResults.some(result => result.status === 'inferred');
      if (hasInferred) {
        return { status: 'inferred_success', confidence: 'medium' };
      } else {
        return { status: 'success', confidence: 'high' };
      }
    }

    return { status: 'unknown', confidence: 'low' };
  }

  private analyzeSingleRule(rule: AnalysisRule, logs: LogEntry[]): RuleMatchResult | null {
    const processResults: ProcessResult[] = [];
    const successLogs: LogEntry[] = [];
    const failedLogs: LogEntry[] = [];
    const inferredFrom: string[] = [];

    let currentIndex = 0;
    let startTime: Date | null = null;
    let endTime: Date | null = null;

    // 按顺序检查每个过程规则
    for (const processRule of rule.processRules) {
      const processLogs = this.findMatchingLogs(logs, processRule.patterns, currentIndex);

      if (processLogs.length > 0) {
        processResults.push({
          processName: processRule.name,
          status: 'matched',
          matchedLogs: processLogs
        });

        // 更新当前索引和时间范围
        currentIndex = logs.indexOf(processLogs[processLogs.length - 1]) + 1;
        if (!startTime) {
          startTime = new Date(processLogs[0].timestamp);
        }
        endTime = new Date(processLogs[processLogs.length - 1].timestamp);

      } else {
        // 没有找到匹配日志，尝试推断
        const inferredResult = this.inferProcessRule(processRule, logs, currentIndex, rule, processResults);
        processResults.push(inferredResult);

        if (inferredResult.status === 'inferred' && inferredResult.inferredReason) {
          inferredFrom.push(inferredResult.inferredReason);
        }
      }
    }

    // 检查成功和失败模式
    const allSuccessLogs = this.findMatchingLogs(logs, rule.successPatterns);
    const allFailedLogs = this.findMatchingLogs(logs, rule.failedPatterns);

    successLogs.push(...allSuccessLogs);
    failedLogs.push(...allFailedLogs);

    // 确定最终状态
    const finalStatus = this.determineFinalStatus(
      rule,
      processResults,
      successLogs,
      failedLogs,
      inferredFrom
    );

    if (!startTime) {
      const firstLog = this.findFirstRelevantLog(logs, rule);
      startTime = firstLog ? new Date(firstLog.timestamp) : new Date();
    }

    if (!endTime) {
      endTime = new Date();
    }

    return {
      ruleName: rule.name,
      status: finalStatus.status,
      confidence: finalStatus.confidence,
      processResults,
      evidence: {
        successLogs,
        failedLogs,
        inferredFrom
      },
      timeRange: {
        start: startTime,
        end: endTime
      }
    };
  }

  private inferProcessRule(
    processRule: ProcessRule,
    logs: LogEntry[],
    currentIndex: number,
    rule: AnalysisRule,
    previousResults: ProcessResult[]
  ): ProcessResult {
    // 检查后续过程规则是否有匹配
    const subsequentIndex = rule.processRules.indexOf(processRule);
    const subsequentRules = rule.processRules.slice(subsequentIndex + 1);

    for (const subsequentRule of subsequentRules) {
      const subsequentLogs = this.findMatchingLogs(logs, subsequentRule.patterns, currentIndex);
      if (subsequentLogs.length > 0) {
        return {
          processName: processRule.name,
          status: 'inferred',
          matchedLogs: [],
          inferredReason: `由后续规则"${subsequentRule.name}"推断完成`
        };
      }
    }

    // 检查成功/失败模式
    const successLogs = this.findMatchingLogs(logs, rule.successPatterns, currentIndex);
    const failedLogs = this.findMatchingLogs(logs, rule.failedPatterns, currentIndex);

    if (successLogs.length > 0) {
      return {
        processName: processRule.name,
        status: 'inferred',
        matchedLogs: [],
        inferredReason: '由成功结果推断完成'
      };
    }

    if (failedLogs.length > 0) {
      return {
        processName: processRule.name,
        status: 'inferred',
        matchedLogs: [],
        inferredReason: '由失败结果推断完成'
      };
    }

    // 无法推断
    return {
      processName: processRule.name,
      status: 'missing',
      matchedLogs: []
    };
  }

  private determineFinalStatus(
    rule: AnalysisRule,
    processResults: ProcessResult[],
    successLogs: LogEntry[],
    failedLogs: LogEntry[],
    inferredFrom: string[]
  ): { status: RuleMatchResult['status']; confidence: RuleMatchResult['confidence'] } {
    // 明确成功
    if (successLogs.length > 0) {
      return { status: 'success', confidence: 'high' };
    }

    // 明确失败
    if (failedLogs.length > 0) {
      return { status: 'failed', confidence: 'high' };
    }

    // 检查所有过程规则是否都完成（匹配或推断）
    const allProcessesCompleted = processResults.every(result =>
      result.status === 'matched' || result.status === 'inferred'
    );

    if (allProcessesCompleted) {
      if (inferredFrom.length > 0) {
        return { status: 'inferred_success', confidence: 'medium' };
      } else {
        return { status: 'success', confidence: 'high' };
      }
    }

    // 检查是否有失败推断
    const hasFailedInference = processResults.some(result =>
      result.inferredReason?.includes('失败')
    );

    if (hasFailedInference) {
      return { status: 'inferred_failed', confidence: 'low' };
    }

    return { status: 'unknown', confidence: 'low' };
  }

  private findMatchingLogs(logs: LogEntry[], patterns: string[], startIndex: number = 0): LogEntry[] {
    const matchingLogs: LogEntry[] = [];

    for (let i = startIndex; i < logs.length; i++) {
      const log = logs[i];
      for (const pattern of patterns) {
        if (log.message.includes(pattern) || log.fullLine.includes(pattern)) {
          matchingLogs.push(log);
          break;
        }
      }
    }

    return matchingLogs;
  }

  private findFirstRelevantLog(logs: LogEntry[], rule: AnalysisRule): LogEntry | null {
    for (const log of logs) {
      // 检查是否匹配任何过程规则
      for (const processRule of rule.processRules) {
        if (processRule.patterns.some(pattern =>
          log.message.includes(pattern) || log.fullLine.includes(pattern)
        )) {
          return log;
        }
      }

      // 检查是否匹配成功/失败模式
      if (rule.successPatterns.some(pattern =>
        log.message.includes(pattern) || log.fullLine.includes(pattern)
      ) || rule.failedPatterns.some(pattern =>
        log.message.includes(pattern) || log.fullLine.includes(pattern)
      )) {
        return log;
      }
    }

    return null;
  }

  getRules(): AnalysisRule[] {
    return [...this.rules];
  }

  removeRule(ruleName: string): void {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(rule => rule.name !== ruleName);

    if (this.rules.length === initialLength) {
      throw new Error(`规则 "${ruleName}" 不存在`);
    }

    this.saveToStorage();
  }

  // 导出所有规则为JSON
  exportAllRules(): string {
    return JSON.stringify(this.rules, null, 2);
  }
}

// 组合式函数
export function useRuleEngine() {
  const ruleEngine = ref(new RuleEngine());
  const analysisResults = ref<RuleMatchResult[]>([]);
  // 创建响应式的规则列表引用
  const rulesList = ref<AnalysisRule[]>([]);

  // 初始化时加载规则
  const initializeRules = () => {
    rulesList.value = ruleEngine.value.getRules();
  };

  // 在组合式函数初始化时调用
  initializeRules();

  const analyzeWithRules = (logs: LogEntry[], selectedRuleNames?: string[]): void => {
    analysisResults.value = ruleEngine.value.analyzeLogs(logs, selectedRuleNames);
  };

  const importRule = (json: string): void => {
    ruleEngine.value.importFromJson(json);
    initializeRules(); // 更新规则列表
  };

  const getRules = (): AnalysisRule[] => {
    return rulesList.value;
  };

  // 删除规则
  const removeRule = (ruleName: string): void => {
    ruleEngine.value.removeRule(ruleName);
    initializeRules(); // 更新规则列表
  };

  // 添加规则
  const addRule = (rule: AnalysisRule): void => {
    ruleEngine.value.addRule(rule);
    initializeRules(); // 更新规则列表
  };

  const exportAllRules = (): string => {
    return ruleEngine.value.exportAllRules();
  };

  const clearResults = (): void => {
    analysisResults.value = [];
  };

  const clearRules = (): void => {
    ruleEngine.value.clearRules();
    initializeRules(); // 更新规则列表
  };

  // 添加存储管理方法
  const exportRulesToFile = (): void => {
    const dataStr = exportAllRules();
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `log-analyzer-rules-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importRulesFromFile = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const fileContent = e.target?.result as string;
          const ruleData = JSON.parse(fileContent);

          // 支持导入单个规则或规则数组
          if (Array.isArray(ruleData)) {
            ruleData.forEach(rule => {
              if (rule.name && rule.processRules) {
                addRule(rule);
              }
            });
          } else if (ruleData.name && ruleData.processRules) {
            addRule(ruleData);
          } else {
            throw new Error('无效的规则格式');
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file);
    });
  };

  const resetToDefault = (): void => {
    ruleEngine.value.clearRules();
    // 重新添加示例规则
    const exampleRule: AnalysisRule = {
      name: "startplayer-text",
      description: "起播流程验证",
      processRules: [
        {
          name: "开始起播",
          patterns: ["startplay"]
        },
        {
          name: "章节列表加载成功",
          patterns: ["onChapterListLoaded"]
        },
        {
          name: "章节加载成功",
          patterns: ["onChaptersLoaded"]
        }
      ],
      successPatterns: ["startplay_success"],
      failedPatterns: ["startplay_failed"]
    };
    addRule(exampleRule);
  };

  return {
    analysisResults: analysisResults,
    analyzeWithRules,
    importRule,
    getRules,
    removeRule,
    addRule,
    exportAllRules,
    clearResults,
    clearRules,
    exportRulesToFile,
    importRulesFromFile,
    resetToDefault
  };
}