import type {
  AnalysisMessage,
  AnalysisProcessInstance,
  AnalysisProcessInstanceResult,
  AnalysisSession,
  LogReference,
  RuleAnalysisResult,
  StepAnalysisResult
} from '@/types/AnalysisTypes';
import type { ValidationRule } from '@/types/FlowRuleType';

export class InteractiveAnalyzer {
  private currentSession: AnalysisSession | null = null;
  private currentLogLines: string[] = [];
  private currentRule: ValidationRule | null = null;

  // 开始新的分析会话
  startNewSession(sessionName: string, logLines: string[]): AnalysisSession {
    const session: AnalysisSession = {
      id: this.generateId(),
      name: sessionName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      messages: [],
      analysisResults: [],
      currentLogRange: {
        startIndex: 0,
        endIndex: logLines.length - 1,
        startLine: 1,
        endLine: logLines.length
      }
    };

    this.currentLogLines = logLines;
    this.currentRule = null;

    this.addMessage(session, {
      type: 'system',
      content: `分析会话已开始。共加载 ${logLines.length} 行日志。`,
      timestamp: new Date().toISOString()
    });

    this.currentSession = session;
    return session;
  }

  // 选择规则并开始分析
  async selectRule(
    session: AnalysisSession,
    rule: ValidationRule
  ): Promise<RuleAnalysisResult> {
    session.currentRuleId = rule.id;
    this.currentRule = rule;
    
    this.addMessage(session, {
      type: 'system',
      content: `已选择规则: ${rule.name} - ${rule.description}`,
      timestamp: new Date().toISOString(),
      ruleId: rule.id
    });

    // 显示规则步骤信息
    this.addMessage(session, {
      type: 'system',
      content: `规则包含 ${rule.steps.length} 个步骤:\n${rule.steps.map((step, index) => 
        `${index + 1}. ${step.name}${step.required ? ' (必需)' : ''} - 模式: ${step.pattern}`
      ).join('\n')}`,
      timestamp: new Date().toISOString()
    });

    // 显示当前分析范围
    const range = session.currentLogRange!;
    this.addMessage(session, {
      type: 'system',
      content: `分析范围: 第 ${range.startLine} 行 到 第 ${range.endLine} 行，共 ${range.endLine - range.startLine + 1} 行日志`,
      timestamp: new Date().toISOString()
    });

    // 创建分析结果
    const result: RuleAnalysisResult = {
      ruleId: rule.id,
      ruleName: rule.name,
      status: 'running',
      matchedInstances: 0,
      totalSteps: rule.steps.length,
      completedSteps: 0,
      issues: [],
      stepResults: [],
      instanceResults: [],
      startTime: Date.now(),
      endTime: 0
    };

    session.analysisResults.push(result);
    
    return result;
  }

  // 执行规则分析
  async executeAnalysis(session: AnalysisSession): Promise<RuleAnalysisResult> {
    const rule = this.getCurrentRule(session);
    if (!rule) {
      throw new Error('未找到当前规则，请先选择规则');
    }

    const result = this.getCurrentResult(session);
    if (!result) {
      throw new Error('未找到分析结果');
    }

    this.addMessage(session, {
      type: 'system',
      content: '开始执行规则分析...',
      timestamp: new Date().toISOString()
    });

    // 首先识别流程实例
    const instances = this.identifyProcessInstances(session, rule);
    
    if (instances.length === 0) {
      this.addMessage(session, {
        type: 'warning',
        content: '未找到匹配的流程实例。请检查开始模式是否正确。',
        timestamp: new Date().toISOString()
      });
      result.status = 'incomplete';
      result.endTime = Date.now();
      return result;
    }

    this.addMessage(session, {
      type: 'success',
      content: `识别到 ${instances.length} 个流程实例`,
      timestamp: new Date().toISOString()
    });

    // 分析每个实例
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < instances.length; i++) {
      const instance = instances[i];
      
      this.addMessage(session, {
        type: 'system',
        content: `分析实例 ${i + 1}/${instances.length} (第 ${instance.startLine} 行开始)`,
        timestamp: new Date().toISOString()
      });

      const instanceResult = await this.analyzeProcessInstance(session, rule, instance);
      
      if (instanceResult.overallStatus === 'success') {
        successCount++;
        this.addMessage(session, {
          type: 'success',
          content: `实例 ${i + 1} 分析完成: 成功`,
          timestamp: new Date().toISOString()
        });
      } else {
        failedCount++;
        this.addMessage(session, {
          type: 'error',
          content: `实例 ${i + 1} 分析完成: 失败`,
          timestamp: new Date().toISOString(),
          actions: [{
            id: 'show-instance-details',
            label: '查看失败详情',
            type: 'secondary',
            handler: () => this.showInstanceDetails(session, instance, instanceResult)
          }]
        });
      }
    }

    // 生成步骤级别的分析结果
    const stepResults = await this.analyzeStepsAcrossInstances(session, rule, instances);
    result.stepResults = stepResults;
    result.completedSteps = stepResults.filter(r => 
      r.status === 'success' || r.status === 'inferred'
    ).length;
    result.matchedInstances = instances.length;

    // 完成分析
    result.endTime = Date.now();
    result.status = this.determineOverallStatus(result, successCount, instances.length);
    
    const duration = ((result.endTime - result.startTime) / 1000).toFixed(2);
    
    this.addMessage(session, {
      type: 'system',
      content: `分析完成！耗时 ${duration} 秒。\n共分析 ${instances.length} 个实例，成功 ${successCount} 个，失败 ${failedCount} 个。`,
      timestamp: new Date().toISOString(),
      ruleId: rule.id
    });

    // 生成详细报告
    this.generateAnalysisReport(session, result);

    return result;
  }

  // 识别流程实例 - 改进版本
  private identifyProcessInstances(session: AnalysisSession, rule: ValidationRule): AnalysisProcessInstance[] {
    const range = session.currentLogRange!;
    const analysisLines = this.currentLogLines.slice(range.startIndex, range.endIndex + 1);
    const instances: AnalysisProcessInstance[] = [];
    let currentInstance: AnalysisProcessInstance | null = null;

    for (let i = 0; i < analysisLines.length; i++) {
      const line = analysisLines[i];
      const lineNumber = range.startLine + i;

      // 检查开始模式
      if (this.matchesPattern(line, rule.startPattern)) {
        // 如果已经有实例在进行中，先结束它
        if (currentInstance) {
          currentInstance.endLine = lineNumber - 1;
          // 检查实例是否以失败结束
          this.checkInstanceFailure(currentInstance);
          instances.push(currentInstance);
        }

        // 开始新实例
        currentInstance = {
          id: `instance_${instances.length + 1}`,
          startLine: lineNumber,
          endLine: undefined,
          lines: [line],
          overallStatus: 'incomplete',
          issues: []
        };
      }
      // 检查结束模式
      else if (currentInstance && rule.endPattern && this.matchesPattern(line, rule.endPattern)) {
        currentInstance.lines.push(line);
        currentInstance.endLine = lineNumber;
        // 检查实例是否以失败结束
        this.checkInstanceFailure(currentInstance);
        instances.push(currentInstance);
        currentInstance = null;
      }
      // 如果当前有实例，将行添加到实例中
      else if (currentInstance) {
        currentInstance.lines.push(line);
      }
    }

    // 处理最后一个未结束的实例
    if (currentInstance) {
      currentInstance.endLine = range.endLine;
      this.checkInstanceFailure(currentInstance);
      instances.push(currentInstance);
    }

    return instances;
  }

  // 检查实例是否失败
  private checkInstanceFailure(instance: AnalysisProcessInstance): void {
    // 检查是否有错误日志
    const hasError = instance.lines.some(line => 
      line.includes('Error') || line.includes('error') || line.includes('failed') || line.includes('failure')
    );

    if (hasError) {
      instance.overallStatus = 'failed';
      instance.issues.push('实例执行过程中出现错误');
    } else if (instance.endLine) {
      instance.overallStatus = 'success';
    } else {
      instance.overallStatus = 'incomplete';
    }
  }

  // 分析单个流程实例
  private async analyzeProcessInstance(
    session: AnalysisSession,
    rule: ValidationRule,
    instance: AnalysisProcessInstance
  ): Promise<AnalysisProcessInstanceResult> {
    const result: AnalysisProcessInstanceResult = {
      instanceId: instance.id,
      steps: [],
      overallStatus: 'incomplete',
      issues: []
    };

    let currentPosition = 0;

    // 按顺序分析每个步骤
    for (let stepIndex = 0; stepIndex < rule.steps.length; stepIndex++) {
      const step = rule.steps[stepIndex];
      
      this.addMessage(session, {
        type: 'rule',
        content: `实例 ${instance.id} - 步骤 ${stepIndex + 1}/${rule.steps.length}: ${step.name}`,
        timestamp: new Date().toISOString(),
        ruleId: rule.id,
        stepIndex
      });

      const stepResult = await this.findStepInInstance(step, stepIndex, instance, currentPosition, session);
      result.steps.push(stepResult);

      // 如果步骤匹配成功，更新当前位置
      if (stepResult.status === 'success' && stepResult.matchedLogs.length > 0) {
        const matchedLine = stepResult.matchedLogs[0].lineNumber;
        currentPosition = matchedLine - instance.startLine;
      }

      // 检查必需步骤是否缺失
      if (step.required && stepResult.status === 'missing') {
        result.issues.push(`必需步骤 "${step.name}" 缺失`);
        result.overallStatus = 'failed';
      }
    }

    // 如果实例本身已经标记为失败，则覆盖步骤分析结果
    if (instance.overallStatus === 'failed') {
      result.overallStatus = 'failed';
      if (!result.issues.includes('实例执行过程中出现错误')) {
        result.issues.push('实例执行过程中出现错误');
      }
    }
    // 如果没有明确失败，则根据步骤成功率判断
    else if (result.overallStatus !== 'failed') {
      const successSteps = result.steps.filter(step => 
        step.status === 'success' || step.status === 'inferred'
      ).length;
      
      if (successSteps >= rule.steps.length * 0.8) { // 80%以上的步骤成功
        result.overallStatus = 'success';
      } else {
        result.overallStatus = 'failed';
        result.issues.push('步骤成功率过低');
      }
    }

    return result;
  }

  // 在实例中查找步骤
  private async findStepInInstance(
    step: any,
    stepIndex: number,
    instance: AnalysisProcessInstance,
    startPosition: number,
    session: AnalysisSession
  ): Promise<StepAnalysisResult> {
    const matchedLogs: LogReference[] = [];

    // 在当前实例的日志中查找匹配（从当前位置开始）
    for (let i = startPosition; i < instance.lines.length; i++) {
      const line = instance.lines[i];
      const lineNumber = instance.startLine + i;
      
      if (this.matchesPattern(line, step.pattern)) {
        matchedLogs.push({
          lineNumber,
          content: line,
          matchedPattern: step.pattern
        });
      }
    }

    if (matchedLogs.length > 0) {
      // 显示第一个匹配
      this.addMessage(session, {
        type: 'success',
        content: `步骤 "${step.name}" 匹配成功`,
        timestamp: new Date().toISOString(),
        ruleId: session.currentRuleId,
        stepIndex,
        logReferences: [matchedLogs[0]]
      });

      return {
        stepName: step.name,
        stepIndex,
        status: 'success',
        matchedLogs: [matchedLogs[0]]
      };
    }

    // 尝试推断步骤 - 改进的推断逻辑
    const canInfer = await this.canInferStep(step, stepIndex, instance, session);
    if (canInfer.canInfer) {
      this.addMessage(session, {
        type: 'warning',
        content: `步骤 "${step.name}" 推断成功: ${canInfer.reason}`,
        timestamp: new Date().toISOString(),
        ruleId: session.currentRuleId,
        stepIndex
      });

      return {
        stepName: step.name,
        stepIndex,
        status: 'inferred',
        matchedLogs: [],
        message: canInfer.reason
      };
    }

    // 步骤缺失
    this.addMessage(session, {
      type: 'error',
      content: `步骤 "${step.name}" 未找到匹配日志`,
      timestamp: new Date().toISOString(),
      ruleId: session.currentRuleId,
      stepIndex,
      actions: [{
        id: 'show-instance-context',
        label: '查看实例上下文',
        type: 'secondary',
        handler: () => this.showInstanceContext(session, instance, stepIndex)
      }]
    });

    return {
      stepName: step.name,
      stepIndex,
      status: 'missing',
      matchedLogs: [],
      message: '未找到匹配的日志记录'
    };
  }

  // 分析步骤在所有实例中的表现
  private async analyzeStepsAcrossInstances(
    session: AnalysisSession,
    rule: ValidationRule,
    instances: AnalysisProcessInstance[]
  ): Promise<StepAnalysisResult[]> {
    const stepResults: StepAnalysisResult[] = [];

    for (let stepIndex = 0; stepIndex < rule.steps.length; stepIndex++) {
      const step = rule.steps[stepIndex];
      let successCount = 0;
      let inferredCount = 0;
      let missingCount = 0;
      const matchedLogs: LogReference[] = [];

      // 在所有实例中统计该步骤的状态
      for (const instance of instances) {
        let found = false;
        for (let i = 0; i < instance.lines.length; i++) {
          if (this.matchesPattern(instance.lines[i], step.pattern)) {
            found = true;
            matchedLogs.push({
              lineNumber: instance.startLine + i,
              content: instance.lines[i],
              matchedPattern: step.pattern
            });
            break;
          }
        }

        if (found) {
          successCount++;
        } else {
          const canInfer = await this.canInferStep(step, stepIndex, instance, session);
          if (canInfer.canInfer) {
            inferredCount++;
          } else {
            missingCount++;
          }
        }
      }

      let status: 'success' | 'missing' | 'inferred' | 'failed' = 'success';
      if (successCount === 0 && inferredCount === 0) {
        status = 'missing';
      } else if (successCount < instances.length) {
        status = 'inferred';
      }

      stepResults.push({
        stepName: step.name,
        stepIndex,
        status,
        matchedLogs: matchedLogs.slice(0, 2),
        message: `成功: ${successCount}, 推断: ${inferredCount}, 缺失: ${missingCount} / ${instances.length} 实例`
      });
    }

    return stepResults;
  }

  // 检查是否可以推断步骤 - 重大改进
  private async canInferStep(
    step: any,
    stepIndex: number,
    instance: AnalysisProcessInstance,
    session: AnalysisSession
  ): Promise<{ canInfer: boolean; reason: string }> {
    // 如果实例已经失败，不允许推断必需步骤
    if (instance.overallStatus === 'failed' && step.required) {
      return { canInfer: false, reason: '实例已失败，必需步骤不能推断' };
    }

    // 检查是否是可选步骤
    if (!step.required) {
      return { canInfer: true, reason: '步骤为可选步骤' };
    }

    // 检查是否是推断点
    if (step.isInferencePoint) {
      return { canInfer: true, reason: '步骤标记为推断点' };
    }

    // 检查是否有后续步骤成功（如果后续步骤成功，可能当前步骤被跳过是合理的）
    const rule = this.getCurrentRule(session);
    if (rule) {
      for (let i = stepIndex + 1; i < rule.steps.length; i++) {
        const laterStep = rule.steps[i];
        // 检查后续步骤是否在实例中成功匹配
        for (let j = 0; j < instance.lines.length; j++) {
          if (this.matchesPattern(instance.lines[j], laterStep.pattern)) {
            return { 
              canInfer: true, 
              reason: `后续步骤 "${laterStep.name}" 成功执行，推断当前步骤已执行` 
            };
          }
        }
      }
    }

    // 检查超时推断 - 更严格的逻辑
    if (step.timeout) {
      // 简化的超时检查 - 在实际实现中需要更复杂的时间计算
      const hasSubsequentActivity = instance.lines.some((line, index) => {
        const lineNumber = instance.startLine + index;
        // 检查是否有后续的活动（非错误日志）
        return lineNumber > (instance.startLine + 5) && 
               !line.includes('Error') && 
               !line.includes('error') &&
               !line.includes('failed');
      });
      
      if (hasSubsequentActivity) {
        return { canInfer: true, reason: '超时时间内有后续活动，推断步骤可能已执行' };
      }
    }

    return { canInfer: false, reason: '无法推断步骤执行' };
  }

  // 显示实例详情
  private showInstanceDetails(
    session: AnalysisSession, 
    instance: AnalysisProcessInstance, 
    instanceResult: AnalysisProcessInstanceResult
  ): void {
    this.addMessage(session, {
      type: 'system',
      content: `实例 ${instance.id} 详细分析:`,
      timestamp: new Date().toISOString()
    });

    this.addMessage(session, {
      type: 'system',
      content: `范围: 第 ${instance.startLine} 行 - 第 ${instance.endLine} 行`,
      timestamp: new Date().toISOString()
    });

    this.addMessage(session, {
      type: 'system',
      content: `状态: ${instanceResult.overallStatus}`,
      timestamp: new Date().toISOString()
    });

    if (instanceResult.issues.length > 0) {
      this.addMessage(session, {
        type: 'error',
        content: `问题: ${instanceResult.issues.join('; ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // 显示步骤详情
    instanceResult.steps.forEach((stepResult, index) => {
      const statusIcon = {
        'success': '✅',
        'inferred': '⚠️',
        'missing': '❌',
        'failed': '💥'
      }[stepResult.status] || '❓';

      let content = `${statusIcon} 步骤 ${index + 1}: ${stepResult.stepName} - ${stepResult.status}`;
      
      if (stepResult.message) {
        content += ` - ${stepResult.message}`;
      }

      this.addMessage(session, {
        type: 'system',
        content: content,
        timestamp: new Date().toISOString()
      });
    });
  }

  // 显示实例上下文
  private showInstanceContext(
    session: AnalysisSession,
    instance: AnalysisProcessInstance,
    stepIndex: number
  ): void {
    this.addMessage(session, {
      type: 'log',
      content: `实例 ${instance.id} 步骤 ${stepIndex + 1} 的上下文日志:`,
      timestamp: new Date().toISOString()
    });

    instance.lines.forEach((line, index) => {
      const lineNumber = instance.startLine + index;
      const isError = line.includes('Error') || line.includes('error') || line.includes('failed');
      const highlight = isError ? '❌ ' : '';
      
      this.addMessage(session, {
        type: 'log',
        content: `${highlight}第 ${lineNumber} 行: ${line}`,
        timestamp: new Date().toISOString()
      });
    });
  }

  // 模式匹配
  private matchesPattern(message: string, pattern: string): boolean {
    if (!pattern || typeof pattern !== 'string') {
      console.warn('无效的模式:', pattern);
      return false;
    }

    const patternParts = pattern.split(' ').filter(part => part.length > 0);
    if (patternParts.length > 1) {
      return patternParts.every(part => 
        part.length > 2 && message.includes(part)
      );
    }
    
    try {
      const regex = new RegExp(pattern);
      return regex.test(message);
    } catch (error) {
      console.warn('正则表达式匹配失败，使用字符串包含匹配:', pattern, error);
      return message.includes(pattern);
    }
  }

  // 确定整体状态
  private determineOverallStatus(
    result: RuleAnalysisResult, 
    successCount: number, 
    totalInstances: number
  ): 'success' | 'partial' | 'failed' | 'incomplete' {
    if (successCount === totalInstances && totalInstances > 0) {
      return 'success';
    } else if (successCount > 0) {
      return 'partial';
    } else if (totalInstances === 0) {
      return 'incomplete';
    } else {
      return 'failed';
    }
  }

  // 生成分析报告
  private generateAnalysisReport(session: AnalysisSession, result: RuleAnalysisResult): void {
    let report = `## 📊 规则分析报告: ${result.ruleName}\n\n`;
    report += `**状态**: ${this.getStatusText(result.status)}\n`;
    report += `**完成步骤**: ${result.completedSteps}/${result.totalSteps}\n`;
    report += `**匹配实例**: ${result.matchedInstances}\n`;
    report += `**分析时长**: ${((result.endTime! - result.startTime) / 1000).toFixed(2)} 秒\n\n`;

    report += `### 步骤详情:\n`;
    result.stepResults.forEach(stepResult => {
      const statusIcon = {
        'success': '✅',
        'inferred': '⚠️',
        'missing': '❌',
        'failed': '💥'
      }[stepResult.status] || '❓';

      report += `${statusIcon} **${stepResult.stepName}** - ${this.getStepStatusText(stepResult.status)}\n`;
      if (stepResult.message) {
        report += `   📝 ${stepResult.message}\n`;
      }
      if (stepResult.matchedLogs && stepResult.matchedLogs.length > 0) {
        report += `   📍 匹配日志: ${stepResult.matchedLogs.length} 处\n`;
      }
      report += '\n';
    });

    if (result.issues.length > 0) {
      report += `### ❗ 发现的问题:\n`;
      result.issues.forEach(issue => {
        report += `• ${issue}\n`;
      });
      report += '\n';
    }

    this.addMessage(session, {
      type: 'system',
      content: report,
      timestamp: new Date().toISOString()
    });
  }

  // 工具方法
  private getCurrentRule(session: AnalysisSession): ValidationRule | null {
    if (this.currentRule) {
      return this.currentRule;
    }
    
    if (!session.currentRuleId) {
      return null;
    }
    
    console.warn('无法获取当前规则，请确保已正确选择规则');
    return null;
  }

  private getCurrentResult(session: AnalysisSession): RuleAnalysisResult | null {
    if (!session.currentRuleId) return null;
    return session.analysisResults.find(r => r.ruleId === session.currentRuleId) || null;
  }

  private addMessage(session: AnalysisSession, message: Omit<AnalysisMessage, 'id'>): void {
    const newMessage: AnalysisMessage = {
      ...message,
      id: this.generateId()
    };

    session.messages.push(newMessage);
    session.updatedAt = new Date().toISOString();
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'success': '✅ 成功',
      'partial': '⚠️ 部分成功',
      'failed': '❌ 失败',
      'incomplete': '⏳ 未完成',
      'running': '🔄 执行中'
    };
    return statusMap[status] || status;
  }

  private getStepStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'success': '成功',
      'inferred': '推断成功',
      'missing': '缺失',
      'failed': '失败'
    };
    return statusMap[status] || status;
  }

  // 公共方法
  setLogRange(session: AnalysisSession, startLine: number, endLine: number): void {
    const startIndex = startLine - 1;
    const endIndex = endLine - 1;
    
    session.currentLogRange = {
      startIndex,
      endIndex,
      startLine,
      endLine
    };

    this.addMessage(session, {
      type: 'system',
      content: `📊 日志范围已更新: 第 ${startLine} 行 到 第 ${endLine} 行`,
      timestamp: new Date().toISOString()
    });
  }

  getCurrentSession(): AnalysisSession | null {
    return this.currentSession;
  }

  endCurrentSession(): void {
    if (this.currentSession) {
      this.currentSession.status = 'completed';
      this.currentSession.updatedAt = new Date().toISOString();
      
      this.addMessage(this.currentSession, {
        type: 'system',
        content: '🏁 分析会话已结束',
        timestamp: new Date().toISOString()
      });
      
      this.currentSession = null;
      this.currentRule = null;
    }
  }

  getLogStats() {
    return {
      totalLines: this.currentLogLines.length,
      currentRange: this.currentSession?.currentLogRange
    };
  }

  getCurrentRuleForDebug(): ValidationRule | null {
    return this.currentRule;
  }
}