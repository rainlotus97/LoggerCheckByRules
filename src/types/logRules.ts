// 日志条目
export interface LogEntry {
  timestamp: number;  // 时间戳
  message: string;    // 日志内容
  level?: string;     // 日志级别
  sessionId?: string; // 会话ID，用于区分不同的流程实例
}

// 规则步骤
export interface RuleStep {
  id: string;
  name: string;
  // 匹配模式，可以是字符串、正则表达式或自定义匹配函数
  pattern: string | RegExp | ((log: string) => boolean);
  // 是否必需步骤（如果必需步骤缺失且无法推断，则流程失败）
  required: boolean;
  // 是否是推断步骤（如开始步骤，用于识别流程实例）
  isInferencePoint?: boolean;
  // 超时时间（毫秒），用于推断
  timeout?: number;
}

// 规则定义
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  steps: RuleStep[];
  // 流程开始标识（用于识别新的流程实例）
  startPattern: string | RegExp;
  // 流程结束标识
  endPattern?: string | RegExp;
  // 最大流程时长（用于推断结束）
  maxDuration?: number;
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