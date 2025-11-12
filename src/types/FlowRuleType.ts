export interface RuleStep {
  id: string;
  name: string;
  // 匹配模式，可实际内容可以是字符串和正则表达式
  pattern: string;
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
  startPattern: string;
  // 流程结束标识
  endPattern?: string;
  // 最大流程时长（用于推断结束）
  maxDuration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlowRuleFormData {
  name: string;
  description: string;
  startPattern: string;
  endPattern: string;
  maxDuration: number;
  steps: Omit<RuleStep, 'id'>[];
}