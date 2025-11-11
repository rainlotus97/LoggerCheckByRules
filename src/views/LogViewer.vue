<template>
	LogViewer
</template>

<script setup lang='ts'>
import { generateTestLogs } from '@/example/TestLogs';
import { LogValidator } from '@/utils/LogValidator';
import { bookReaderRule } from '@/example/BookReaderRule';

// 初始化校验器
const validator = new LogValidator();
validator.addRule(bookReaderRule);

// 获取测试日志
const testLogs = generateTestLogs();

// 执行校验
const result = validator.validate(testLogs, 'book_reader_open_flow');

// 输出结果
console.log('=== 校验摘要 ===');
console.log(`总实例数: ${result.summary.totalInstances}`);
console.log(`成功: ${result.summary.successInstances}`);
console.log(`失败: ${result.summary.failedInstances}`);
console.log(`未完成: ${result.summary.incompleteInstances}`);

console.log('\n=== 详细结果 ===');
result.instances.forEach((instance, index) => {
	console.log(`\n实例 ${index + 1} (${instance.sessionId}): ${instance.overallStatus}`);

	if (instance.issues.length > 0) {
		console.log('问题:');
		instance.issues.forEach(issue => console.log(`  - ${issue}`));
	}

	console.log('步骤执行情况:');
	instance.steps.forEach(stepExec => {
		const statusMap = {
			'success': '✅ 成功',
			'inferred_success': '🔍 推断成功',
			'missing': '❌ 缺失',
			'failed': '💥 失败',
			'timeout': '⏰ 超时'
		};

		console.log(`  ${stepExec.step.name}: ${statusMap[stepExec.status]}`);
		if (stepExec.message) {
			console.log(`      ${stepExec.message}`);
		}
	});
});

// 找到有问题的实例进行详细分析
const problematicInstances = result.instances.filter(inst =>
	inst.overallStatus === 'failed' || inst.issues.length > 0
);

console.log('\n=== 问题分析 ===');
problematicInstances.forEach(instance => {
	console.log(`\n分析实例 ${instance.sessionId}:`);

	// 找出第一个缺失的必需步骤
	const firstMissingRequired = instance.steps.find(step =>
		step.step.required && step.status === 'missing'
	);

	if (firstMissingRequired) {
		console.log(`首要问题: 必需步骤 "${firstMissingRequired.step.name}" 缺失`);

		// 分析缺失步骤前后的时间窗口
		const stepIndex = instance.steps.findIndex(s => s.step.id === firstMissingRequired.step.id);
		const prevStep = stepIndex > 0 ? instance.steps[stepIndex - 1] : null;
		const nextStep = stepIndex < instance.steps.length - 1 ? instance.steps[stepIndex + 1] : null;

		if (prevStep && nextStep) {
			const timeGap = nextStep.timestamp - prevStep.timestamp;
			console.log(`时间分析: 在步骤 "${prevStep.step.name}" 和 "${nextStep.step.name}" 之间有 ${timeGap}ms 间隔`);
		}
	}
});
</script>

<style></style>