export interface AnalysisSession {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'cancelled';
  messages: AnalysisMessage[];
  currentRuleId?: string;
  currentLogRange?: LogRange;
  analysisResults: RuleAnalysisResult[];
  currentStepIndex?: number; // 当前执行的步骤索引
  currentInstanceIndex?: number; // 当前执行的实例索引
  isPaused?: boolean; // 是否暂停等待用户交互
}

export interface LogRange {
  startIndex: number;
  endIndex: number;
  startLine: number;
  endLine: number;
}

export interface AnalysisMessage {
  id: string;
  type: 'system' | 'user' | 'rule' | 'error' | 'warning' | 'success' | 'log';
  content: string;
  timestamp: string;
  ruleId?: string;
  stepIndex?: number;
  logReferences?: LogReference[];
  actions?: MessageAction[];
}

export interface LogReference {
  lineNumber: number;
  content: string;
  matchedPattern?: string;
}

export interface MessageAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  handler: () => void;
}

export interface StepAnalysisResult {
  stepName: string;
  stepIndex: number;
  status: 'success' | 'missing' | 'inferred' | 'failed';
  matchedLogs: LogReference[];
  inferredFrom?: LogReference;
  message?: string;
}

export interface StepExecutionState {
  stepIndex: number;
  status: 'pending' | 'success' | 'missing' | 'inferred' | 'failed';
  matchedLogs: LogReference[];
  message?: string;
  waitingForUser?: boolean; // 是否需要用户确认
}
export interface RuleAnalysisResult {
  ruleId: string;
  ruleName: string;
  status: 'success' | 'partial' | 'failed' | 'incomplete' | 'running';
  matchedInstances: number;
  totalSteps: number;
  completedSteps: number;
  issues: string[];
  stepResults: StepAnalysisResult[];
  instanceResults: InstanceAnalysisResult[]; // 新增：每个实例的分析结果
  startTime: number;
  endTime?: number;
  currentStepIndex?: number; // 当前执行的步骤
}

// 每个实例的分析结果
export interface InstanceAnalysisResult {
  instanceId: string;
  startLine: number;
  endLine?: number;
  steps: StepExecutionState[];
  overallStatus: 'success' | 'failed' | 'incomplete';
  issues: string[];
}

export interface AnalysisProcessInstance {
  id: string;
  startLine: number;
  endLine?: number;
  lines: string[];
  overallStatus: 'success' | 'failed' | 'incomplete';
  issues: string[];
}

export interface AnalysisProcessInstanceResult {
  instanceId: string;
  steps: StepAnalysisResult[];
  overallStatus: 'success' | 'failed' | 'incomplete';
  issues: string[];
}