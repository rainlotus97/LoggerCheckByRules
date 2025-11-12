import { ActiveTab } from "@/types/Common";

// 根据标签页类型获取对应路由路径
export const getRouteByTab = (tab: ActiveTab): string => {
  switch (tab) {
    case ActiveTab.LOGS:
      return '/logs';
    case ActiveTab.RULES:
      return '/rules';
    case ActiveTab.LOG_RULES:
      return '/logsrules'; // 假设日志规则在日志查看页进行定制
    case ActiveTab.ANALYSIS:
      return '/analysis';
    default:
      return '/logs';
  }
}

// 根据路由路径获取对应标签页类型
export const getTabByRoute = (route: string): ActiveTab => {
  switch (route) {
    case '/logs':
      return ActiveTab.LOGS;
    case '/rules':
      return ActiveTab.RULES;
    case '/logsrules':
      return ActiveTab.LOG_RULES;
    case '/analysis':
      return ActiveTab.ANALYSIS;
    default:
      return ActiveTab.LOGS;
  }
}