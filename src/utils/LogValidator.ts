import type {
	LogEntry, ValidationRule, ProcessInstance,
	StepExecution, StepStatus, ValidationResult,
	RuleStep
} from '@/types/logRules';

export class LogValidator {
	private rules: ValidationRule[] = [];

	addRule(rule: ValidationRule): void {
		this.rules.push(rule);
	}

	// 主要校验方法
	validate(logs: LogEntry[], ruleId: string): ValidationResult {
		const rule = this.rules.find(r => r.id === ruleId);
		if (!rule) {
			throw new Error(`Rule ${ruleId} not found`);
		}

		// 1. 识别流程实例
		const instances = this.identifyProcessInstances(logs, rule);

		// 2. 对每个实例进行校验
		const validatedInstances = instances.map(instance =>
			this.validateInstance(instance, logs, rule)
		);

		// 3. 生成摘要
		const summary = this.generateSummary(validatedInstances);

		return {
			rule,
			instances: validatedInstances,
			summary
		};
	}

	// 识别流程实例（基于开始模式）
	private identifyProcessInstances(logs: LogEntry[], rule: ValidationRule): ProcessInstance[] {
		const instances: ProcessInstance[] = [];
		let currentSessionId = 1;

		for (const log of logs) {
			if (this.matchesPattern(log.message, rule.startPattern)) {
				instances.push({
					sessionId: `session_${currentSessionId++}`,
					startTime: log.timestamp,
					steps: [],
					overallStatus: 'incomplete',
					issues: []
				});
			}
		}

		return instances;
	}

	// 校验单个流程实例
	private validateInstance(
		instance: ProcessInstance,
		allLogs: LogEntry[],
		rule: ValidationRule
	): ProcessInstance {
		// 获取该实例时间范围内的日志
		const instanceLogs = this.getLogsForInstance(instance, allLogs, rule);
		const steps: StepExecution[] = [];

		let currentStepIndex = 0;
		let currentLogIndex = 0;

		while (currentStepIndex < rule.steps.length && currentLogIndex < instanceLogs.length) {
			const currentStep = rule.steps[currentStepIndex];
			const currentLog = instanceLogs[currentLogIndex];

			if (this.matchesPattern(currentLog.message, currentStep.pattern)) {
				// 找到匹配的步骤
				steps.push({
					step: currentStep,
					status: 'success',
					logEntry: currentLog,
					timestamp: currentLog.timestamp
				});
				currentStepIndex++;
				currentLogIndex++;
			} else {
				// 检查是否需要推断
				const shouldInfer = this.shouldInferStep(
					currentStep,
					currentStepIndex,
					instanceLogs,
					currentLogIndex,
					rule
				);

				if (shouldInfer.infer) {
					steps.push({
						step: currentStep,
						status: 'inferred_success',
						inferredFrom: shouldInfer.evidence,
						timestamp: shouldInfer.evidence!.timestamp,
						message: `推断执行成功，基于后续步骤: ${shouldInfer.evidence!.message}`
					});
					currentStepIndex++;
				} else {
					// 检查是否是必需步骤缺失
					if (currentStep.required) {
						steps.push({
							step: currentStep,
							status: 'missing',
							timestamp: currentLog.timestamp,
							message: '必需步骤缺失且无法推断'
						});
						// 记录问题并继续
						instance.issues.push(`步骤 ${currentStep.name} 缺失且无法推断`);
					} else {
						steps.push({
							step: currentStep,
							status: 'missing',
							timestamp: currentLog.timestamp,
							message: '非必需步骤缺失'
						});
					}
					currentStepIndex++;
				}
			}
		}

		// 处理剩余的步骤（日志已用完但步骤未完成）
		for (let i = currentStepIndex; i < rule.steps.length; i++) {
			const step = rule.steps[i];
			const status: StepStatus = step.required ? 'missing' : 'missing';

			steps.push({
				step,
				status,
				timestamp: instanceLogs[instanceLogs.length - 1]?.timestamp || instance.startTime,
				message: step.required ? '必需步骤缺失' : '非必需步骤缺失'
			});

			if (step.required) {
				instance.issues.push(`步骤 ${step.name} 缺失`);
			}
		}

		// 确定整体状态
		const hasRequiredMissing = steps.some(step =>
			step.step.required && (step.status === 'missing' || step.status === 'failed')
		);

		instance.steps = steps;
		instance.overallStatus = hasRequiredMissing ? 'failed' : 'success';
		instance.endTime = this.determineEndTime(instance, instanceLogs, rule);

		return instance;
	}

	// 判断是否应该推断步骤执行
	private shouldInferStep(
		step: RuleStep,
		stepIndex: number,
		logs: LogEntry[],
		currentLogIndex: number,
		rule: ValidationRule
	): { infer: boolean; evidence?: LogEntry } {
		// 如果后续步骤已经出现，推断当前步骤成功
		for (let i = stepIndex + 1; i < rule.steps.length; i++) {
			const futureStep = rule.steps[i];
			for (let j = currentLogIndex; j < logs.length; j++) {
				if (this.matchesPattern(logs[j].message, futureStep.pattern)) {
					return { infer: true, evidence: logs[j] };
				}
			}
		}

		// 检查超时推断（如果后续步骤在超时时间内出现）
		if (step.timeout) {
			const stepStartTime = logs[currentLogIndex].timestamp;
			for (let j = currentLogIndex + 1; j < logs.length; j++) {
				if (logs[j].timestamp - stepStartTime > step.timeout) {
					break;
				}
				for (let i = stepIndex + 1; i < rule.steps.length; i++) {
					if (this.matchesPattern(logs[j].message, rule.steps[i].pattern)) {
						return { infer: true, evidence: logs[j] };
					}
				}
			}
		}

		return { infer: false };
	}

	// 获取实例相关的日志
	private getLogsForInstance(
		instance: ProcessInstance,
		allLogs: LogEntry[],
		rule: ValidationRule
	): LogEntry[] {
		const startIndex = allLogs.findIndex(log =>
			log.timestamp === instance.startTime &&
			this.matchesPattern(log.message, rule.startPattern)
		);

		if (startIndex === -1) return [];

		let endIndex = allLogs.length - 1;

		// 如果有结束模式，找到结束点
		if (rule.endPattern) {
			for (let i = startIndex + 1; i < allLogs.length; i++) {
				if (this.matchesPattern(allLogs[i].message, rule.endPattern)) {
					endIndex = i;
					break;
				}
			}
		}
		// 否则使用最大时长
		else if (rule.maxDuration) {
			for (let i = startIndex + 1; i < allLogs.length; i++) {
				if (allLogs[i].timestamp - instance.startTime > rule.maxDuration) {
					endIndex = i - 1;
					break;
				}
			}
		}

		return allLogs.slice(startIndex, endIndex + 1);
	}

	// 确定流程结束时间
	private determineEndTime(
		instance: ProcessInstance,
		logs: LogEntry[],
		rule: ValidationRule
	): number {
		// 优先使用结束模式
		if (rule.endPattern) {
			const endLog = logs.reverse().find(log =>
				this.matchesPattern(log.message, rule.endPattern!)
			);
			if (endLog) return endLog.timestamp;
		}

		// 否则使用最后一个日志的时间
		return logs[logs.length - 1]?.timestamp || instance.startTime;
	}

	// 模式匹配
	private matchesPattern(message: string, pattern: string | RegExp | ((log: string) => boolean)): boolean {
		if (typeof pattern === 'string') {
			return message.includes(pattern);
		} else if (pattern instanceof RegExp) {
			return pattern.test(message);
		} else {
			return pattern(message);
		}
	}

	// 生成摘要
	private generateSummary(instances: ProcessInstance[]): ValidationResult['summary'] {
		const successInstances = instances.filter(i => i.overallStatus === 'success').length;
		const failedInstances = instances.filter(i => i.overallStatus === 'failed').length;
		const incompleteInstances = instances.filter(i => i.overallStatus === 'incomplete').length;

		return {
			totalInstances: instances.length,
			successInstances,
			failedInstances,
			incompleteInstances
		};
	}
}