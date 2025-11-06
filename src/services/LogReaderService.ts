import { FilterOptions, FolderStats, LogEntry, LogLevel } from '@/types/log';

export class LogReaderService {
  private logEntries: LogEntry[] = [];
  private folderStats: FolderStats = {
    totalFiles: 0,
    totalLogEntries: 0,
    fileTypes: [],
    selectedFolder: '',
    levelDistribution: {      // 初始化级别分布
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0
    }
  };

  /**
   * 处理文件夹选择
   */
  public async handleFolderSelection(): Promise<{
    logs: LogEntry[];
    stats: FolderStats;
  }> {
    return new Promise((resolve, reject) => {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;

        input.onchange = async (event: Event) => {
          try {
            const target = event.target as HTMLInputElement;
            const files = target.files;

            if (!files || files.length === 0) {
              // 不再使用 alert，而是通过 reject 传递错误信息
              reject(new Error('没有选择文件'));
              return;
            }

            await this.processFiles(files);
            resolve({
              logs: this.logEntries,
              stats: this.folderStats
            });
          } catch (error) {
            reject(error);
          }
        };

        input.oncancel = () => {
          // 用户取消选择，不视为错误，直接 resolve 空结果
          resolve({
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
            }
          });
        };

        // 添加错误事件监听
        input.onerror = () => {
          reject(new Error('文件选择出现错误'));
        };

        input.click();
      } catch (error) {
        reject(new Error(`创建文件选择器失败: ${error instanceof Error ? error.message : '未知错误'}`));
      }
    });
  }

  /**
   * 处理文件列表
   */
  private async processFiles(files: FileList): Promise<void> {
    this.logEntries = [];
    this.folderStats = {
      totalFiles: files.length,
      totalLogEntries: 0,
      fileTypes: [],
      selectedFolder: this.getFolderName(files[0]),
      levelDistribution: {    // 重置级别分布
        DEBUG: 0,
        INFO: 0,
        WARN: 0,
        ERROR: 0
      }
    };

    const readPromises: Promise<void>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (this.isTextFile(file)) {
        readPromises.push(this.readAndParseFile(file));
        this.recordFileType(file);
      }
    }

    await Promise.all(readPromises);
    this.sortLogsByTime();
    this.folderStats.totalLogEntries = this.logEntries.length;

    // 计算级别分布
    this.calculateLevelDistribution();
  }
  /**
  * 计算日志级别分布
  */
  private calculateLevelDistribution(): void {
    const distribution = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0
    };

    this.logEntries.forEach(entry => {
      distribution[entry.level]++;
    });

    this.folderStats.levelDistribution = distribution;
  }


  private isTextFile(file: File): boolean {
    return file.type.startsWith('text/') ||
      file.name.endsWith('.log') ||
      file.name.endsWith('.txt');
  }

  private recordFileType(file: File): void {
    const fileExt = file.name.split('.').pop() || 'unknown';
    if (!this.folderStats.fileTypes.includes(fileExt)) {
      this.folderStats.fileTypes.push(fileExt);
    }
  }

  private getFolderName(file: File): string {
    const path = file.webkitRelativePath;
    return path.split('/')[0] || '未知文件夹';
  }

  private async readAndParseFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const content = e.target?.result as string;
          if (content) {
            this.parseLogContent(content, file.name);
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error(`读取文件失败: ${file.name}`));
      };

      reader.readAsText(file);
    });
  }

  /**
   * 解析日志内容 - 增强版，支持包名和别名解析
   */
  private parseLogContent(content: string, fileName: string): void {
    const lines = content.split('\n');

    lines.forEach(line => {
      if (line.trim()) {
        const logEntry = this.parseLogLine(line.trim(), fileName);
        if (logEntry) {
          this.logEntries.push(logEntry);
        }
      }
    });
  }

  /**
   * 解析单行日志 - 增强版，支持包名/别名分离
   * 格式: 时间 进程号 应用包名/别名/标签 日志内容
   */
  // 在 LogReaderService.ts 中修复文件处理逻辑
  private parseLogLine(line: string, fileName: string): LogEntry | null {
    // 更灵活的日志解析，适应不同格式
    const parts = line.split(/\s+/);

    if (parts.length < 4) {
      return null;
    }

    try {
      // 尝试解析时间戳（可能是前两部分）
      let timestampIndex = 0;
      let timestamp = '';

      // 检查是否是有效的时间格式
      if (parts[0].includes('-') || parts[0].includes(':') || parts[0].includes('/')) {
        timestamp = `${parts[0]} ${parts[1]}`;
        timestampIndex = 2;
      } else {
        // 如果没有明确的时间格式，使用前两个部分作为时间戳
        timestamp = `${parts[0]} ${parts[1]}`;
        timestampIndex = 2;
      }

      const remainingParts = parts.slice(timestampIndex);

      if (remainingParts.length < 3) {
        return null;
      }

      const pid = remainingParts[0];
      const levelChar = remainingParts[1].toUpperCase();
      const fullPackagePath = remainingParts[2];
      const tag = remainingParts[3] || 'default';
      const message = remainingParts.slice(4).join(' ') || line; // 如果没有明确消息，使用整行

      // 解析日志级别
      const level = this.parseLogLevel(levelChar);

      // 解析包信息
      const { packageName, alias, finalTag } = this.parsePackageInfo(fullPackagePath, tag);

      return {
        timestamp,
        pid,
        level,
        packageName,
        alias,
        tag: finalTag,
        message,
        fileName,
        fullLine: line,
        fullPackagePath
      };
    } catch (error) {
      console.error(`解析日志行失败: ${line}`, error);
      return null;
    }
  }

  /**
   * 解析日志级别
   */
  private parseLogLevel(levelChar: string): LogLevel {
    switch (levelChar) {
      case 'D':
        return 'DEBUG';
      case 'I':
        return 'INFO';
      case 'W':
        return 'WARN';
      case 'E':
        return 'ERROR';
      default:
        console.warn(`未知的日志级别: ${levelChar}，默认使用 INFO`);
        return 'INFO';
    }
  }

  /**
   * 解析包信息，分离包名、别名和标签
   */
  private parsePackageInfo(fullPackagePath: string, originalTag: string): {
    packageName: string;
    alias?: string;
    finalTag: string;
  } {
    // 如果包路径中包含斜杠，尝试解析包名和别名
    if (fullPackagePath.includes('/')) {
      const pathParts = fullPackagePath.split('/');

      // 情况1: com.example.reader/HwBooks/ReaderMainPage
      // 包名: com.example.reader, 别名: HwBooks, 标签: ReaderMainPage
      if (pathParts.length >= 3) {
        return {
          packageName: pathParts[0],
          alias: pathParts[1],
          finalTag: pathParts[2]
        };
      }
      // 情况2: com.example.reader/ReaderMainPage
      // 包名: com.example.reader, 标签: ReaderMainPage (不认为第二项是别名)
      else if (pathParts.length === 2) {
        return {
          packageName: pathParts[0],
          finalTag: pathParts[1]
        };
      }
    }

    // 默认情况: 没有斜杠，使用原始标签
    return {
      packageName: fullPackagePath,
      finalTag: originalTag
    };
  }

  /**
   * 按时间排序日志
   */
  private sortLogsByTime(): void {
    this.logEntries.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }

  // 在 useLogReader.ts 中修复 filterLogs 方法
  public filterLogs(logs: LogEntry[], filters: FilterOptions): LogEntry[] {
    return logs.filter(entry => {
      try {
        // 包名筛选
        if (filters.packageName && !entry.packageName.toLowerCase().includes(filters.packageName.toLowerCase())) {
          return false;
        }

        // 别名筛选
        if (filters.alias) {
          if (!entry.alias) return false;
          const aliasMatch = this.testStringMatch(
            entry.alias,
            filters.alias,
            filters.useRegex
          );
          if (!aliasMatch) return false;
        }

        // 标签筛选
        if (filters.tag) {
          const tagMatch = this.testStringMatch(
            entry.tag,
            filters.tag,
            filters.useRegex
          );
          if (!tagMatch) return false;
        }

        // 日志级别筛选
        if (filters.level && entry.level !== filters.level) {
          return false;
        }

        // 关键词筛选 - 修复正则表达式支持
        if (filters.keyword) {
          const searchableFields = [
            entry.message,
            entry.fullLine,
            entry.packageName,
            entry.alias || '',
            entry.tag,
            entry.pid,
            entry.fileName,
            entry.timestamp
          ];

          const hasMatch = searchableFields.some(field =>
            this.testStringMatch(field, filters.keyword, filters.useRegex)
          );

          if (!hasMatch) {
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error('筛选日志时出错:', error);
        return true;
      }
    });
  }


  /**
   * 获取所有唯一的日志级别
   */
  public getUniqueLevels(logs: LogEntry[]): LogLevel[] {
    try {
      return [...new Set(logs.map(entry => entry.level))];
    } catch (error) {
      console.error('获取唯一级别时出错:', error);
      return [];
    }
  }


  /**
   * 测试字符串匹配，支持正则表达式和普通文本
   */
  private testStringMatch(text: string, pattern: string, useRegex: boolean): boolean {
    if (!pattern) return true;

    try {
      if (useRegex) {
        // 使用正则表达式匹配
        const regex = new RegExp(pattern, 'i'); // 'i' 表示不区分大小写
        return regex.test(text);
      } else {
        // 使用普通文本包含匹配
        return text.toLowerCase().includes(pattern.toLowerCase());
      }
    } catch (error) {
      // 如果正则表达式语法错误，回退到普通文本匹配
      console.warn(`正则表达式语法错误 "${pattern}"，使用普通文本匹配:`, error);
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
  }


  /**
   * 获取所有唯一的包名
   */
  public getUniquePackageNames(logs: LogEntry[]): string[] {
    return [...new Set(logs.map(entry => entry.packageName))];
  }

  /**
   * 获取所有唯一的别名
   */
  public getUniqueAliases(logs: LogEntry[]): string[] {
    const aliases = logs
      .map(entry => entry.alias)
      .filter((alias): alias is string => !!alias); // 过滤掉 undefined
    return [...new Set(aliases)];
  }

  /**
   * 获取所有唯一的标签
   */
  public getUniqueTags(logs: LogEntry[]): string[] {
    return [...new Set(logs.map(entry => entry.tag))];
  }


  /**
     * 清空数据
     */
  public clearData(): void {
    this.logEntries = [];
    this.folderStats = {
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
    };
  }
}