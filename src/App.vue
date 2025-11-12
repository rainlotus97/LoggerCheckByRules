<script setup lang="ts">
import GlobalTips from '@/components/container/GlobalTips.vue';
import Header from '@/components/container/Header.vue';
import OperationsBar from '@/components/container/OperationsBar.vue';
import { ActiveTab } from '@/types/Common';
import { getRouteByTab, getTabByRoute } from '@/utils/CommonUtils';
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

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
    <Header v-model:active-tab="activeTab" />

    <!-- 主体内容区域 -->
    <div class="app-main">
      <!-- 操作栏 -->
      <div class="tab-content mb10">
        <OperationsBar />
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