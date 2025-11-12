import { RuleStep, ValidationRule } from "./FlowRuleType";

// 日志条目
export interface LogEntry {
  timestamp: number;  // 时间戳
  message: string;    // 日志内容
  level?: string;     // 日志级别
  sessionId?: string; // 会话ID，用于区分不同的流程实例
}

// 步骤执行状态
export type StepStatus = 'success' | 'failed' | 'inferred_success' | 'missing' | 'timeout';

// 步骤执行结果
export interface StepExecution {
  step: RuleStep;
  status: StepStatus;
  logEntry?: LogEntry;          // 匹配到的日志条目
  inferredFrom?: LogEntry;      // 推断来源的日志
  timestamp: number;            // 执行时间
  message?: string;             // 附加信息
}

// 流程实例执行结果
export interface ProcessInstance {
  sessionId: string;
  startTime: number;
  endTime?: number;
  steps: StepExecution[];
  overallStatus: 'success' | 'failed' | 'incomplete';
  issues: string[];
}

// 校验结果
export interface ValidationResult {
  rule: ValidationRule;
  instances: ProcessInstance[];
  summary: {
    totalInstances: number;
    successInstances: number;
    failedInstances: number;
    incompleteInstances: number;
  };
}