<template>
	<div class="log-operations-bar">
		<div class="operations-content">
			<!-- 左侧操作区域 -->
			<div class="operations-left">
				<!-- 文件上传按钮组 -->
				<div class="upload-group">
					<button class="operation-btn primary" @click="triggerFileUpload" title="选择文件">
						<span class="btn-icon">📄</span>
						<span class="btn-text">选择文件</span>
					</button>
					<button class="operation-btn secondary" @click="triggerFolderUpload" title="选择文件夹">
						<span class="btn-icon">📁</span>
						<span class="btn-text">选择文件夹</span>
					</button>

					<!-- 隐藏的文件输入 -->
					<input ref="fileInputRef" type="file" multiple accept=".txt,.log" @change="handleFileSelect"
						style="display: none" />
					<input ref="folderInputRef" type="file" multiple accept=".txt,.log" webkitdirectory
						@change="handleFolderSelect" style="display: none" />
				</div>

				<!-- 文件信息显示 -->
				<div class="file-info" v-if="logStore.logFiles.length > 0">
					<span class="file-count">
						已加载 {{ logStore.logFiles.length }} 个文件
						<span v-if="logStore.selectedLogFileIds.length > 0">
							(选中 {{ logStore.selectedLogFileIds.length }} 个)
						</span>
					</span>
				</div>
			</div>

			<!-- 右侧操作区域 -->
			<div class="operations-right">
				<!-- 规则选择器 -->
				<div class="rule-selector">
					<label for="log-rule-select">分析规则:</label>
					<select id="log-rule-select" v-model="selectedRule" class="rule-select" @change="onRuleChange">
						<option value="">请选择规则</option>
						<option v-for="rule in logRuleStore.rules" :key="rule.id" :value="rule.id">
							{{ rule.name }}
						</option>
					</select>
				</div>

				<!-- 操作按钮组 -->
				<div class="action-buttons">
					<button class="operation-btn danger" @click="deleteSelectedLogs"
						:disabled="logStore.selectedLogFileIds.length === 0" title="删除选中日志文件">
						<span class="btn-icon">🗑️</span>
						<span class="btn-text">删除选中</span>
					</button>

					<button class="operation-btn warning" @click="clearAllLogs" :disabled="logStore.logFiles.length === 0"
						title="清空所有日志文件">
						<span class="btn-icon">🧹</span>
						<span class="btn-text">清空全部</span>
					</button>
				</div>
			</div>
		</div>

		<!-- 文件列表展示 -->
		<div class="file-list" v-if="logStore.logFiles.length > 0">
			<div class="file-list-header">
				<span>已加载的文件列表:</span>
				<button class="toggle-btn" @click="showFileList = !showFileList">
					{{ showFileList ? '收起' : '展开' }}
				</button>
			</div>

			<div class="file-list-content" v-if="showFileList">
				<div v-for="file in logStore.logFiles" :key="file.id"
					:class="['file-item', { selected: isFileSelected(file.id) }]" @click="toggleFileSelection(file.id)">
					<input type="checkbox" :checked="isFileSelected(file.id)" @change="toggleFileSelection(file.id)"
						class="file-checkbox" />
					<span class="file-name" :title="file.name">{{ file.name }}</span>
					<span class="file-size">{{ formatFileSize(file.size) }}</span>
					<span class="file-lines">{{ file.lines.length }} 行</span>
					<span class="file-time">{{ formatTime(file.uploadTime) }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useLogRuleStore } from '@/stores/LogRuleStore'
import { useLogStore } from '@/stores/LogStore'
import type { LogFile } from '@/types/common'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const logStore = useLogStore()
const logRuleStore = useLogRuleStore()

// Refs
const fileInputRef = ref<HTMLInputElement>()
const folderInputRef = ref<HTMLInputElement>()
const showFileList = ref(false)
const selectedRule = ref('')

// 计算属性
const hasSelectedFiles = computed(() => logStore.selectedLogFileIds.length > 0)

// 触发文件选择
const triggerFileUpload = () => {
	fileInputRef.value?.click()
}

// 触发文件夹选择
const triggerFolderUpload = () => {
	folderInputRef.value?.click()
}

// 处理文件选择
const handleFileSelect = async (event: Event) => {
	const input = event.target as HTMLInputElement
	if (input.files && input.files.length > 0) {
		await processFiles(Array.from(input.files))
		input.value = '' // 重置input
	}
}

// 处理文件夹选择
const handleFolderSelect = async (event: Event) => {
	const input = event.target as HTMLInputElement
	if (input.files && input.files.length > 0) {
		await processFiles(Array.from(input.files))
		input.value = '' // 重置input
	}
}

// 处理文件读取和解析
const processFiles = async (files: File[]) => {
	const txtFiles = files.filter(file =>
		file.type === 'text/plain' ||
		file.name.endsWith('.txt') ||
		file.name.endsWith('.log')
	)

	if (txtFiles.length === 0) {
		logStore.setGlobalMessage({
			type: 'warning',
			text: '请选择.txt或.log文件',
			duration: 3000
		})
		return
	}

	try {
		const logFiles: LogFile[] = []

		for (const file of txtFiles) {
			const content = await readFileAsText(file)
			const lines = content.split('\n')
				.map(line => line.trim())
				.filter(line => line.length > 0) // 过滤空行

			const logFile: LogFile = {
				id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				name: file.name,
				size: file.size,
				type: file.type,
				lastModified: file.lastModified,
				lines: lines,
				uploadTime: new Date()
			}

			logFiles.push(logFile)
		}

		logStore.addLogFiles(logFiles)

		logStore.setGlobalMessage({
			type: 'success',
			text: `成功加载 ${logFiles.length} 个文件，共 ${logFiles.reduce((total, file) => total + file.lines.length, 0)} 行日志`,
			duration: 5000
		})

	} catch (error) {
		console.error('文件处理失败:', error)
		logStore.setGlobalMessage({
			type: 'error',
			text: '文件处理失败，请重试',
			duration: 5000
		})
	}
}

// 读取文件内容
const readFileAsText = (file: File): Promise<string> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = (e) => {
			resolve(e.target?.result as string)
		}
		reader.onerror = () => {
			reject(new Error(`无法读取文件: ${file.name}`))
		}
		reader.readAsText(file, 'UTF-8')
	})
}

// 删除选中的日志文件
const deleteSelectedLogs = () => {
	if (hasSelectedFiles.value) {
		logStore.deleteSelectedLogFiles()
		logStore.setGlobalMessage({
			type: 'success',
			text: '已删除选中的日志文件',
			duration: 3000
		})
	}
}

// 清空所有日志文件
const clearAllLogs = () => {
	logStore.clearAllLogFiles()
	logStore.setGlobalMessage({
		type: 'info',
		text: '已清空所有日志文件',
		duration: 3000
	})
}

// 规则变更处理
const onRuleChange = () => {
	if (selectedRule.value) {
		logStore.setSelectedRuleId(selectedRule.value)
	}
}

// 跳转到日志规则页面
const navigateToLogRules = () => {
	router.push('/logsrules')
}

// 文件选择状态管理
const isFileSelected = (fileId: string) => {
	return logStore.selectedLogFileIds.includes(fileId)
}

const toggleFileSelection = (fileId: string) => {
	const currentSelected = [...logStore.selectedLogFileIds]
	const index = currentSelected.indexOf(fileId)

	if (index > -1) {
		currentSelected.splice(index, 1)
	} else {
		currentSelected.push(fileId)
	}

	logStore.setSelectedLogFileIds(currentSelected)
}

// 工具函数
const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatTime = (date: Date): string => {
	return new Date(date).toLocaleTimeString('zh-CN', {
		hour: '2-digit',
		minute: '2-digit'
	})
}

// 初始化选中的规则
onMounted(() => {
	selectedRule.value = logStore.selectedRuleId
})
</script>

<style scoped lang="less">
.log-operations-bar {
	background: white;
	border-bottom: 1px solid #e9ecef;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.operations-content {
	max-width: 1400px;
	margin: 0 auto;
	padding: 12px 20px;
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 20px;
}

.operations-left,
.operations-right {
	display: flex;
	align-items: center;
	gap: 16px;
}

.upload-group {
	display: flex;
	gap: 8px;
}

.operation-btn {
	padding: 8px 16px;
	border: 1px solid #ddd;
	border-radius: 6px;
	background: white;
	color: #333;
	cursor: pointer;
	font-size: 14px;
	font-weight: 500;
	transition: all 0.2s;
	display: flex;
	align-items: center;
	gap: 6px;
	white-space: nowrap;

	&:hover:not(:disabled) {
		background: #f0f0f0;
		border-color: #ccc;
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	&.primary {
		background: #007bff;
		color: white;
		border-color: #007bff;

		&:hover:not(:disabled) {
			background: #0056b3;
			border-color: #0056b3;
		}
	}

	&.secondary {
		background: #6c757d;
		color: white;
		border-color: #6c757d;

		&:hover:not(:disabled) {
			background: #545b62;
			border-color: #545b62;
		}
	}

	&.danger {
		background: #dc3545;
		color: white;
		border-color: #dc3545;

		&:hover:not(:disabled) {
			background: #c82333;
			border-color: #c82333;
		}
	}

	&.warning {
		background: #ffc107;
		color: #212529;
		border-color: #ffc107;

		&:hover:not(:disabled) {
			background: #e0a800;
			border-color: #e0a800;
		}
	}
}

.btn-icon {
	font-size: 14px;
}

.btn-text {
	font-size: 13px;
}

.file-info {
	font-size: 13px;
	color: #666;
}

.rule-selector {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;
	color: #333;
}

.rule-select {
	padding: 6px 12px;
	border: 1px solid #ddd;
	border-radius: 4px;
	background: white;
	font-size: 13px;
	min-width: 150px;

	&:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
	}
}

.action-buttons {
	display: flex;
	gap: 8px;
}

.file-list {
	border-top: 1px solid #f0f0f0;
	background: #fafafa;
}

.file-list-header {
	max-width: 1400px;
	margin: 0 auto;
	padding: 8px 20px;
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 13px;
	color: #666;
}

.toggle-btn {
	background: none;
	border: none;
	color: #007bff;
	cursor: pointer;
	font-size: 12px;
	padding: 4px 8px;

	&:hover {
		text-decoration: underline;
	}
}

.file-list-content {
	max-width: 1400px;
	margin: 0 auto;
	padding: 0 20px 12px;
	display: grid;
	gap: 4px;
	max-height: 200px;
	overflow-y: auto;
}

.file-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 12px;
	background: white;
	border: 1px solid #e9ecef;
	border-radius: 4px;
	cursor: pointer;
	transition: all 0.2s;
	font-size: 13px;

	&:hover {
		background: #f8f9fa;
		border-color: #007bff;
	}

	&.selected {
		background: #e7f3ff;
		border-color: #007bff;
	}
}

.file-checkbox {
	margin: 0;
}

.file-name {
	flex: 1;
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.file-size,
.file-lines,
.file-time {
	color: #666;
	font-size: 12px;
	white-space: nowrap;
}

.file-size {
	min-width: 60px;
}

.file-lines {
	min-width: 60px;
}

.file-time {
	min-width: 50px;
}

/* 响应式设计 */
@media (max-width: 1024px) {
	.operations-content {
		padding: 10px 16px;
		gap: 16px;
	}

	.operations-left,
	.operations-right {
		gap: 12px;
	}

	.operation-btn {
		padding: 6px 12px;
		font-size: 13px;
	}

	.rule-select {
		min-width: 120px;
		font-size: 12px;
	}
}

@media (max-width: 768px) {
	.operations-content {
		flex-direction: column;
		gap: 12px;
		align-items: stretch;
	}

	.operations-left,
	.operations-right {
		justify-content: center;
		flex-wrap: wrap;
	}

	.upload-group {
		width: 100%;
		justify-content: center;
	}

	.action-buttons {
		width: 100%;
		justify-content: center;
	}

	.btn-text {
		display: none;
	}

	.operation-btn {
		padding: 8px;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		justify-content: center;
	}

	.rule-selector {
		flex: 1;
		justify-content: center;

		label {
			display: none;
		}
	}

	.rule-select {
		min-width: 100px;
		flex: 1;
	}

	.file-list-header,
	.file-list-content {
		padding-left: 16px;
		padding-right: 16px;
	}
}

@media (max-width: 480px) {
	.operations-content {
		padding: 8px 12px;
	}

	.file-list-header,
	.file-list-content {
		padding-left: 12px;
		padding-right: 12px;
	}

	.file-item {
		flex-wrap: wrap;
		gap: 8px;
	}

	.file-name {
		flex-basis: 100%;
	}
}
</style>