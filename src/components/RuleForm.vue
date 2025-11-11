<template>
	<div class="rule-form">
		<div class="form-content">
			<!-- 基础信息 -->
			<div class="form-section">
				<h3 class="section-title">基础信息</h3>
				<div class="input-grid">
					<div class="input-group">
						<label class="input-label">规则名称 *</label>
						<input v-model="formData.name" type="text" placeholder="输入规则名称" class="text-input">
					</div>

					<div class="input-group">
						<label class="input-label">规则描述</label>
						<textarea v-model="formData.description" placeholder="描述规则用途" rows="3" class="text-area"></textarea>
					</div>
				</div>
			</div>

			<!-- 流程配置 -->
			<div class="form-section">
				<h3 class="section-title">流程配置</h3>
				<div class="input-grid">
					<div class="input-group">
						<label class="input-label">开始模式 *</label>
						<input v-model="formData.startPattern" type="text" placeholder="如: 开始打开阅读器" class="text-input">
						<div class="input-hint">用于识别流程开始的日志模式</div>
					</div>

					<div class="input-group">
						<label class="input-label">结束模式</label>
						<input v-model="formData.endPattern" type="text" placeholder="如: 阅读器打开完成" class="text-input">
						<div class="input-hint">用于识别流程结束的日志模式（可选）</div>
					</div>

					<div class="input-group">
						<label class="input-label">最大时长（毫秒）</label>
						<input v-model.number="formData.maxDuration" type="number" placeholder="30000" class="text-input">
						<div class="input-hint">流程最大执行时长，用于推断结束</div>
					</div>
				</div>
			</div>

			<!-- 流程步骤 -->
			<div class="form-section steps-section">
				<div class="section-header">
					<h3 class="section-title">流程步骤</h3>
					<button @click="addStep" class="add-step-btn">
						<span class="btn-icon">+</span>
						添加步骤
					</button>
				</div>

				<div class="steps-list">
					<div v-for="(step, index) in formData.steps" :key="index" class="step-item">
						<div class="step-header">
							<div class="step-title">
								<span class="step-number">步骤 {{ index + 1 }}</span>
								<div class="step-badges">
									<span v-if="step.required" class="badge required">必需</span>
									<span v-if="step.isInferencePoint" class="badge inference">推断点</span>
								</div>
							</div>
							<button @click="removeStep(index)" class="delete-step-btn" :disabled="formData.steps.length <= 1">
								<span class="btn-icon">×</span>
								删除
							</button>
						</div>

						<div class="step-content">
							<div class="step-inputs">
								<div class="input-group">
									<label class="input-label">步骤名称 *</label>
									<input v-model="step.name" type="text" placeholder="如: 请求书籍数据" class="text-input">
								</div>

								<div class="input-group">
									<label class="input-label">匹配模式 *</label>
									<input v-model="step.pattern" type="text" placeholder="如: 请求书籍数据" class="text-input">
								</div>

								<div class="input-group">
									<label class="input-label">超时时间（毫秒）</label>
									<input v-model.number="step.timeout" type="number" placeholder="5000" class="text-input">
								</div>
							</div>

							<div class="step-options">
								<label class="option-item">
									<input v-model="step.required" type="checkbox" class="option-checkbox">
									<span class="option-label">必需步骤</span>
									<div class="option-hint">如果缺失且无法推断，则流程失败</div>
								</label>

								<label class="option-item">
									<input v-model="step.isInferencePoint" type="checkbox" class="option-checkbox">
									<span class="option-label">推断起点</span>
									<div class="option-hint">用于识别新的流程实例</div>
								</label>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- 操作按钮 -->
			<div class="form-actions">
				<button @click="handleCancel" class="cancel-btn">
					取消
				</button>
				<button @click="handleSubmit" class="submit-btn" :disabled="!isFormValid">
					{{ mode === 'edit' ? '更新规则' : '创建规则' }}
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import type { RuleFormData, ValidationRule } from '@/types/rule';

interface Props {
	rule?: ValidationRule;
	mode?: 'create' | 'edit';
}

const props = withDefaults(defineProps<Props>(), {
	mode: 'create'
});

const emit = defineEmits<{
	submit: [data: RuleFormData];
	cancel: [];
}>();

const defaultFormData: RuleFormData = {
	name: '',
	description: '',
	startPattern: '',
	endPattern: '',
	maxDuration: 30000,
	steps: [
		{
			name: '开始步骤',
			pattern: '',
			required: true,
			isInferencePoint: true,
			timeout: 5000
		}
	]
};

const formData = ref<RuleFormData>({ ...defaultFormData });

// 表单验证
const isFormValid = computed(() => {
	const hasBasicInfo = formData.value.name.trim() !== '' &&
		formData.value.startPattern.trim() !== '';

	const allStepsValid = formData.value.steps.every(step =>
		step.name.trim() !== '' && step.pattern.trim() !== ''
	);

	return hasBasicInfo && allStepsValid;
});

// 添加步骤
const addStep = async () => {
	formData.value.steps.push({
		name: `步骤 ${formData.value.steps.length + 1}`,
		pattern: '',
		required: true,
		isInferencePoint: false,
		timeout: 5000
	});

	// 等待DOM更新后滚动到底部
	await nextTick();
	const container = document.querySelector('.steps-list');
	if (container) {
		container.scrollTop = container.scrollHeight;
	}
};

// 删除步骤
const removeStep = (index: number) => {
	if (formData.value.steps.length > 1) {
		formData.value.steps.splice(index, 1);
	}
};

// 提交
const handleSubmit = () => {
	if (isFormValid.value) {
		emit('submit', { ...formData.value });
	}
};

// 取消
const handleCancel = () => {
	emit('cancel');
};

// 初始化表单数据
onMounted(() => {
	if (props.mode === 'edit' && props.rule) {
		formData.value = {
			name: props.rule.name,
			description: props.rule.description,
			startPattern: props.rule.startPattern,
			endPattern: props.rule.endPattern || '',
			maxDuration: props.rule.maxDuration || 30000,
			steps: props.rule.steps.map(step => ({
				name: step.name,
				pattern: step.pattern,
				required: step.required,
				isInferencePoint: step.isInferencePoint || false,
				timeout: step.timeout || 5000
			}))
		};
	}
});
</script>

<style scoped lang="less">
.rule-form {
	height: 100%;
	display: flex;
	flex-direction: column;
}

.form-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.form-section {
	padding: 24px;
	border-bottom: 1px solid #e5e7eb;
}

.form-section:last-child {
	border-bottom: none;
}

.steps-section {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
	padding-bottom: 0;
}

.section-title {
	margin: 0 0 20px 0;
	font-size: 1.2em;
	font-weight: 600;
	color: #1f2937;
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}

.input-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	gap: 20px;
}

.input-group {
	display: flex;
	flex-direction: column;
}

.input-label {
	font-weight: 500;
	margin-bottom: 8px;
	color: #374151;
	font-size: 0.95em;
}

.text-input,
.text-area {
	padding: 12px;
	border: 1px solid #d1d5db;
	border-radius: 6px;
	font-size: 0.95em;
	transition: all 0.2s;
	background: white;
	font-family: inherit;
}

.text-input:focus,
.text-area:focus {
	outline: none;
	border-color: #3b82f6;
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.text-area {
	resize: vertical;
	min-height: 80px;
	line-height: 1.5;
}

.input-hint {
	color: #6b7280;
	font-size: 0.85em;
	margin-top: 6px;
}

.add-step-btn {
	padding: 10px 16px;
	background: #10b981;
	color: white;
	border: none;
	border-radius: 6px;
	font-size: 0.9em;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s;
	display: flex;
	align-items: center;
	gap: 6px;
}

.add-step-btn:hover {
	background: #059669;
}

.steps-list {
	flex: 1;
	overflow-y: auto;
	padding-right: 8px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	max-height: 400px;
}

/* 滚动条样式 */
.steps-list::-webkit-scrollbar {
	width: 6px;
}

.steps-list::-webkit-scrollbar-track {
	background: #f3f4f6;
	border-radius: 3px;
}

.steps-list::-webkit-scrollbar-thumb {
	background: #d1d5db;
	border-radius: 3px;
}

.steps-list::-webkit-scrollbar-thumb:hover {
	background: #9ca3af;
}

.step-item {
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	padding: 16px;
	background: #f9fafb;
}

.step-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16px;
	padding-bottom: 12px;
	border-bottom: 1px solid #e5e7eb;
}

.step-title {
	display: flex;
	align-items: center;
	gap: 12px;
}

.step-number {
	font-weight: 600;
	color: #374151;
	font-size: 1em;
}

.step-badges {
	display: flex;
	gap: 6px;
}

.badge {
	padding: 4px 8px;
	border-radius: 12px;
	font-size: 0.75em;
	font-weight: 500;
}

.badge.required {
	background: #fef2f2;
	color: #dc2626;
}

.badge.inference {
	background: #f0f9ff;
	color: #0369a1;
}

.delete-step-btn {
	padding: 6px 12px;
	background: #ef4444;
	color: white;
	border: none;
	border-radius: 4px;
	font-size: 0.85em;
	cursor: pointer;
	transition: all 0.2s;
	display: flex;
	align-items: center;
	gap: 4px;
}

.delete-step-btn:hover:not(:disabled) {
	background: #dc2626;
}

.delete-step-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.step-content {
	display: grid;
	grid-template-columns: 2fr 1fr;
	gap: 20px;
}

.step-inputs {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.step-options {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.option-item {
	display: flex;
	flex-direction: column;
	gap: 4px;
	cursor: pointer;
	padding: 12px;
	border-radius: 6px;
	background: white;
	border: 1px solid #e5e7eb;
	transition: all 0.2s;
}

.option-item:hover {
	border-color: #3b82f6;
	background: #f0f9ff;
}

.option-checkbox {
	margin-right: 8px;
	transform: scale(1.1);
}

.option-label {
	font-weight: 500;
	color: #374151;
	font-size: 0.9em;
}

.option-hint {
	color: #6b7280;
	font-size: 0.8em;
}

.form-actions {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
	padding: 20px 24px;
	background: #f9fafb;
	border-top: 1px solid #e5e7eb;
	margin-top: auto;
}

.cancel-btn {
	padding: 10px 20px;
	background: transparent;
	color: #374151;
	border: 1px solid #d1d5db;
	border-radius: 6px;
	font-size: 0.9em;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s;
}

.cancel-btn:hover {
	background: #f3f4f6;
}

.submit-btn {
	padding: 10px 20px;
	background: #3b82f6;
	color: white;
	border: none;
	border-radius: 6px;
	font-size: 0.9em;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
	background: #2563eb;
}

.submit-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-icon {
	font-weight: bold;
	font-size: 1.1em;
}

/* 响应式设计 */
@media (max-width: 1024px) {
	.step-content {
		grid-template-columns: 1fr;
		gap: 16px;
	}

	.input-grid {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 768px) {
	.form-section {
		padding: 20px;
	}

	.form-actions {
		padding: 16px 20px;
		flex-direction: column;
	}

	.section-header {
		flex-direction: column;
		align-items: stretch;
		gap: 12px;
	}

	.step-header {
		flex-direction: column;
		align-items: stretch;
		gap: 12px;
	}

	.step-title {
		justify-content: space-between;
	}

	.steps-list {
		max-height: 300px;
	}
}

@media (max-width: 480px) {
	.form-section {
		padding: 16px;
	}

	.step-item {
		padding: 12px;
	}

	.cancel-btn,
	.submit-btn {
		width: 100%;
		justify-content: center;
	}
}
</style>