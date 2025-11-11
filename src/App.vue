<script setup lang="ts">
import GlobalTips from '@/components/container/GlobalTips.vue';
import Header from '@/components/container/Header.vue';
import LogOperationsBar from '@/components/container/LogOperationsBar.vue';
import { useLogReader } from '@/composables/useLogReader';
import { ActiveTab } from '@/types/common';
import { getRouteByTab, getTabByRoute } from '@/utils/CommonUtils';
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
// 日志读取功能
const logReader = useLogReader();
const { state } = logReader;

// 当前活动标签页
const activeTab = ref<ActiveTab>(getTabByRoute(location.pathname));

// 监听日志数据变化，自动清除分析结果
watch(() => activeTab.value, (newType, oldType) => {
  if (newType !== oldType) {
    router.push(getRouteByTab(newType));
  }
});

</script>

<template>
  <div class="log-analyzer-app">
    <!-- 头部导航 -->
    <Header :state="state" v-model:active-tab="activeTab" />

    <!-- 主体内容区域 -->
    <div class="app-main">
      <div class="tab-content mb10">
        <!-- 常驻操作栏 -->
        <LogOperationsBar />
      </div>
      <div class="tab-content">
        <RouterView />
      </div>
    </div>

    <!-- 全局状态提示 -->
    <GlobalTips />
  </div>
</template>

<style>
.log-analyzer-app {
  min-height: 100vh;
  background: #f8f9fa;
}

.app-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.tab-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
</style>