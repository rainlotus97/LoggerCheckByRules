// examples/bookReaderRuleNoEnd.ts
import type { ValidationRule } from '@/types/logRules';

// 定义阅读器打开流程规则
export const bookReaderRule: ValidationRule = {
  id: 'book_reader_open_flow',
  name: '电子书阅读器打开流程',
  description: '验证电子书阅读器完整打开流程',
  startPattern: '开始打开阅读器',
  endPattern: '阅读器打开完成',
  maxDuration: 30000, // 30秒超时
  steps: [
    {
      id: 'start',
      name: '开始打开',
      pattern: '开始打开阅读器',
      required: true,
      isInferencePoint: true
    },
    {
      id: 'api_request',
      name: '请求书籍数据',
      pattern: /请求书籍数据|book data request/i,
      required: true,
      timeout: 5000 // 5秒内应该有响应
    },
    {
      id: 'api_response',
      name: '接收API响应',
      pattern: /收到书籍数据|book data received/i,
      required: true
    },
    {
      id: 'parse_data',
      name: '解析书籍数据',
      pattern: /解析书籍数据|parsing book data/i,
      required: true
    },
    {
      id: 'init_render',
      name: '初始化渲染',
      pattern: /初始化渲染|initializing render/i,
      required: false // 非必需，可能被优化掉
    },
    {
      id: 'layout',
      name: '排版计算',
      pattern: /排版计算|calculating layout/i,
      required: true
    },
    {
      id: 'render',
      name: '渲染页面',
      pattern: /渲染页面|rendering page/i,
      required: true
    },
    {
      id: 'complete',
      name: '完成打开',
      pattern: '阅读器打开完成',
      required: true
    }
  ]
};