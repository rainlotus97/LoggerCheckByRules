// tab页枚举
export enum ActiveTab {
  LOGS = 'logs',
  RULES = 'rules',
  LOG_RULES = 'log_rules',
  ANALYSIS = 'analysis'
}

// 消息类型枚举
export type MessageType = 'success' | 'error' | 'warning' | 'info';

// 全局消息提示接口
export interface GlobalMessage {
  type: MessageType;
  text: string;
  duration?: number; // 可选，消息显示时长，默认2000ms
}

// 日志字段接口
export interface LogField {
  id: string
  text: string
  start: number
  end: number
  type: 'timestamp' | 'level' | 'package' | 'tag' | 'message' | 'custom'
  name: string
  isFixedLength: boolean
  isSeparator: boolean
  fixedLength?: number
}

// 日志规则接口
export interface LogFormat {
  id: string
  name: string
  description: string
  fields: LogField[]
  separatorFieldId?: string
  createdAt: Date
  updatedAt: Date
}

// 日志文件接口
export interface LogFile {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  lines: string[];
  uploadTime: Date;
}