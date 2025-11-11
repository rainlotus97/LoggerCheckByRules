import type { LogEntry } from '@/types/logRules';

// 生成测试日志（包含成功的、失败的和日志丢失的场景）
export const generateTestLogs = (): LogEntry[] => {
  const baseTime = Date.now() - 1000000; // 从过去某个时间开始
  const logs: LogEntry[] = [];
  let currentTime = baseTime;

  const addLog = (message: string, timeOffset: number = 0) => {
    currentTime += timeOffset;
    logs.push({
      timestamp: currentTime,
      message,
      sessionId: `session_${Math.floor(logs.length / 10) + 1}`
    });
  };

  // 第一次成功流程
  addLog('开始打开阅读器', 1000);
  addLog('请求书籍数据', 200);
  addLog('收到书籍数据', 300);
  addLog('解析书籍数据', 150);
  addLog('排版计算', 200);
  addLog('渲染页面', 250);
  addLog('阅读器打开完成', 100);

  // 第二次流程 - API响应丢失（应该推断成功）
  addLog('开始打开阅读器', 5000);
  addLog('请求书籍数据', 200);
  // 故意丢失: '收到书籍数据' 日志
  addLog('解析书籍数据', 400); // 这个出现说明API响应成功了
  addLog('排版计算', 200);
  addLog('渲染页面', 250);
  addLog('阅读器打开完成', 100);

  // 第三次流程 - 必需步骤缺失导致失败
  addLog('开始打开阅读器', 5000);
  addLog('请求书籍数据', 200);
  addLog('收到书籍数据', 300);
  // 故意丢失: '解析书籍数据' 和 '排版计算'
  addLog('渲染页面', 600); // 直接跳到渲染，但前面必需步骤缺失
  addLog('阅读器打开完成', 100);

  // 第四次流程 - 完全失败（渲染缺失）
  addLog('开始打开阅读器', 5000);
  addLog('请求书籍数据', 200);
  addLog('收到书籍数据', 300);
  addLog('解析书籍数据', 150);
  addLog('排版计算', 200);
  // 故意丢失: '渲染页面'
  addLog('阅读器打开完成', 100);

  return logs;
};