<script setup lang='ts'>
import { useCommonStore } from '@/stores/LogStore';
import { ActiveTab } from '@/types/Common';

const logStore = useCommonStore();
defineProps<{
  activeTab: ActiveTab;
}>();

const emit = defineEmits<{
  (e: 'update:activeTab', tab: ActiveTab): void;
}>();


// 切换到日志查看标签页
const switchToLogs = () => {
  emit('update:activeTab', ActiveTab.LOGS);
};

// 切换到规则管理标签页
const switchToRules = () => {
  emit('update:activeTab', ActiveTab.RULES);
};

// 切换到日志规则标签页
const switchToLogRules = () => {
  emit('update:activeTab', ActiveTab.LOG_RULES);
};

// 切换到规则分析标签页
const switchToAnalysis = () => {
  if (logStore.logFiles.length === 0) {
    logStore.setGlobalMessage({
      type: 'error',
      text: '请先在日志查看页面加载日志文件'
    });
    return;
  }
  emit('update:activeTab', ActiveTab.ANALYSIS);
};
</script>

<template>
  <header class="app-header">
    <div class="header-content">
      <h1 class="header-title">📊 智能日志分析工具</h1>
      <nav class="main-nav">
        <button :class="['nav-btn', { active: activeTab === ActiveTab.LOGS }]" @click="switchToLogs">
          <span class="nav-icon">📋</span>
          <span class="nav-text">日志查看</span>
        </button>
        <button :class="['nav-btn', { active: activeTab === ActiveTab.RULES }]" @click="switchToRules">
          <span class="nav-icon">⚙️</span>
          <span class="nav-text">流程规则</span>
        </button>
        <button :class="['nav-btn', { active: activeTab === ActiveTab.LOG_RULES }]" @click="switchToLogRules">
          <span class="nav-icon">📝</span>
          <span class="nav-text">日志规则</span>
        </button>
        <button :class="['nav-btn', { active: activeTab === ActiveTab.ANALYSIS }]" @click="switchToAnalysis">
          <span class="nav-icon">🔍</span>
          <span class="nav-text">规则分析</span>
        </button>
      </nav>
    </div>
  </header>
</template>

<style scoped lang="less">
.app-header {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 70px;
    gap: 20px;
  }

  .header-title {
    margin: 0;
    color: #333;
    font-size: 1.5rem;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .main-nav {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
    flex: 1;
  }

  .nav-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #666;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    flex-shrink: 0;

    &:hover {
      background: #f0f0f0;
      color: #333;
    }

    &.active {
      background: #007bff;
      color: white;
    }
  }

  .nav-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .nav-text {
    flex-shrink: 0;
  }
}

/* 平板设备 (768px - 1024px) */
@media (max-width: 1024px) {
  .app-header {
    .header-content {
      padding: 0 16px;
      height: 60px;
    }

    .header-title {
      font-size: 1.3rem;
    }

    .nav-btn {
      padding: 8px 16px;
      font-size: 13px;
    }
  }
}

/* 小平板设备 (600px - 768px) */
@media (max-width: 768px) {
  .app-header {
    .header-content {
      flex-direction: column;
      height: auto;
      padding: 12px 16px;
      gap: 12px;
    }

    .header-title {
      font-size: 1.2rem;
      text-align: center;
      width: 100%;
    }

    .main-nav {
      width: 100%;
      justify-content: center;
      gap: 6px;
    }

    .nav-btn {
      flex: 1;
      min-width: 0;
      justify-content: center;
      padding: 8px 12px;
      font-size: 12px;
    }
  }
}

/* 手机设备 (480px - 600px) */
@media (max-width: 600px) {
  .app-header {
    .header-content {
      padding: 10px 12px;
      gap: 10px;
    }

    .header-title {
      font-size: 1.1rem;
    }

    .main-nav {
      gap: 4px;
    }

    .nav-btn {
      padding: 8px 10px;
      font-size: 11px;

      .nav-text {
        display: none;
        /* 在小手机上隐藏文字 */
      }

      .nav-icon {
        font-size: 14px;
        margin: 0 auto;
      }
    }
  }
}

/* 超小手机设备 (< 480px) */
@media (max-width: 480px) {
  .app-header {
    .header-content {
      padding: 8px 10px;
    }

    .header-title {
      font-size: 1rem;
    }

    .main-nav {
      gap: 2px;
    }

    .nav-btn {
      padding: 6px 8px;
      border-radius: 4px;

      .nav-icon {
        font-size: 12px;
      }
    }
  }
}

/* 防止在极窄屏幕上布局崩溃 */
@media (max-width: 360px) {
  .app-header {
    .header-content {
      padding: 6px 8px;
    }

    .main-nav {
      flex-wrap: nowrap;
      overflow-x: auto;
      justify-content: flex-start;
      padding-bottom: 4px;

      /* 隐藏滚动条但保持滚动功能 */
      &::-webkit-scrollbar {
        display: none;
      }

      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .nav-btn {
      flex: 0 0 auto;
      min-width: 60px;
    }
  }
}

/* 横屏手机优化 */
@media (max-height: 500px) and (orientation: landscape) {
  .app-header {
    .header-content {
      height: 50px;
      padding: 0 12px;
    }

    .header-title {
      font-size: 1.1rem;
    }

    .nav-btn {
      padding: 6px 12px;
    }
  }
}

/* 高DPI屏幕优化 */
@media (-webkit-min-device-pixel-ratio: 2),
(min-resolution: 192dpi) {
  .app-header {
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }
}
</style>