export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  pid: string;
  level: LogLevel;
  packageName: string;
  alias?: string;
  tag: string;
  message: string;
  fileName: string;
  fullLine: string;
  fullPackagePath: string;
}

export interface FolderStats {
  totalFiles: number;
  totalLogEntries: number;
  fileTypes: string[];
  selectedFolder: string;
  levelDistribution: Record<LogLevel, number>;
}

export interface FilterOptions {
  keyword: string;
  packageName: string;
  alias: string;
  tag: string;
  level: string;
  useRegex: boolean;
}

export interface LogReaderState {
  logs: LogEntry[];
  stats: FolderStats;
  loading: boolean;
  error: string | null;
}