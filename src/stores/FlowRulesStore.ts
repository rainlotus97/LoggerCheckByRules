import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ValidationRule, FlowRuleFormData } from '@/types/FlowRuleType';

export const useFlowRulesStore = defineStore('flowRules', () => {
  const rules = ref<ValidationRule[]>([]);
  const loading = ref(false);

  // 从本地存储加载规则
  const loadRules = () => {
    loading.value = true;
    try {
      const stored = localStorage.getItem('validation-rules');
      if (stored) {
        const parsedRules = JSON.parse(stored);
        // 确保每个规则都有必需的字段
        rules.value = parsedRules.map((rule: any) => ({
          ...rule,
          createdAt: rule.createdAt || new Date().toISOString(),
          updatedAt: rule.updatedAt || new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('加载规则失败:', error);
    } finally {
      loading.value = false;
    }
  };

  // 保存到本地存储
  const saveRules = () => {
    try {
      localStorage.setItem('validation-rules', JSON.stringify(rules.value));
    } catch (error) {
      console.error('保存规则失败:', error);
    }
  };

  // 新增规则
  const addRule = (formData: FlowRuleFormData) => {
    const newRule: ValidationRule = {
      ...formData,
      id: generateId(),
      steps: formData.steps.map(step => ({
        ...step,
        id: (step as any).id ?? generateId()
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    rules.value.push(newRule);
    saveRules();
    return newRule;
  };

  // 更新规则
  const updateRule = (id: string, formData: FlowRuleFormData) => {
    const index = rules.value.findIndex(rule => rule.id === id);
    if (index !== -1) {
      rules.value[index] = {
        ...rules.value[index],
        ...formData,
        steps: formData.steps.map(step => ({
          ...step,
          id: (step as any).id ?? generateId()
        })),
        updatedAt: new Date().toISOString()
      };
      saveRules();
    }
  };

  // 删除规则
  const deleteRuleById = (id: string) => {
    const index = rules.value.findIndex(rule => rule.id === id);
    if (index !== -1) {
      rules.value.splice(index, 1);
      saveRules();
    }
  };

  // 导出规则
  const exportRules = () => {
    const dataStr = JSON.stringify(rules.value, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `validation-rules-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // 导入规则
  const importRules = (file: File, merge: boolean = true): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          let importedRules: ValidationRule[];

          // 处理导入的数据格式
          if (Array.isArray(importedData)) {
            importedRules = importedData;
          } else if (importedData && typeof importedData === 'object') {
            // 如果是单个规则对象
            importedRules = [importedData];
          } else {
            throw new Error('无效的规则文件格式');
          }

          // 验证导入的规则结构
          importedRules.forEach(rule => {
            if (!rule.id || !rule.name || !rule.steps || !Array.isArray(rule.steps)) {
              throw new Error('规则文件格式不正确');
            }
          });

          if (merge) {
            // 合并规则，避免ID冲突
            const existingIds = new Set(rules.value.map(r => r.id));
            const newRules = importedRules.filter(rule => !existingIds.has(rule.id));

            // 为可能重复的规则生成新ID
            const duplicateRules = importedRules.filter(rule => existingIds.has(rule.id))
              .map(rule => ({
                ...rule,
                id: generateId(),
                name: `${rule.name} (导入)`
              }));

            rules.value.push(...newRules, ...duplicateRules);
          } else {
            // 替换所有规则
            rules.value = importedRules.map(rule => ({
              ...rule,
              updatedAt: new Date().toISOString()
            }));
          }

          saveRules();
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  };

  // 获取规则详情
  const getRuleById = (id: string) => {
    return rules.value.find(rule => rule.id === id);
  };

  // 生成唯一ID
  const generateId = () => {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // 计算属性
  const rulesCount = computed(() => rules.value.length);
  const recentRules = computed(() =>
    [...rules.value]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
  );

  return {
    rules,
    loading,
    rulesCount,
    recentRules,
    loadRules,
    addRule,
    updateRule,
    deleteRuleById,
    exportRules,
    importRules,
    getRuleById
  };
});