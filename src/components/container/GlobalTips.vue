<template>
  <transition name="message-slide">
    <div v-if="globalMessage" class="global-message" :class="globalMessage.type">
      <div class="message-content">
        <span class="message-icon">{{ getMessageIcon(globalMessage.type) }}</span>
        <span class="message-text">{{ globalMessage.text }}</span>
      </div>
      <button @click="closeMessage" class="close-btn" aria-label="关闭消息">
        <span class="close-icon">×</span>
      </button>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useLogStore } from '@/stores/LogStore';
import { MessageType } from '@/types/common';
import { computed } from 'vue';
const logStore = useLogStore();
let globalMessage = computed(() => logStore.globalMessage);

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const closeMessage = () => {
  logStore.setGlobalMessage(null);
  emit('close');
};

const getMessageIcon = (type: MessageType) => {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  return icons[type as keyof typeof icons] || 'ℹ️';
};
</script>

<style scoped lang="less">
.global-message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 16px 20px;
  border-radius: 8px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  z-index: 10000;
  max-width: 400px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);

  // 消息类型样式
  &.success {
    background: linear-gradient(135deg, #28a745, #20c997);
    border-left: 4px solid #1e7e34;
  }

  &.error {
    background: linear-gradient(135deg, #dc3545, #e83e8c);
    border-left: 4px solid #c82333;
  }

  &.warning {
    background: linear-gradient(135deg, #ffc107, #fd7e14);
    border-left: 4px solid #e0a800;
    color: #212529;
  }

  &.info {
    background: linear-gradient(135deg, #17a2b8, #6f42c1);
    border-left: 4px solid #138496;
  }

  .message-content {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  .message-icon {
    font-size: 18px;
    flex-shrink: 0;
  }

  .message-text {
    flex: 1;
    font-weight: 500;
    line-height: 1.4;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  color: inherit;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
  backdrop-filter: blur(5px);

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }

  .close-icon {
    line-height: 1;
    font-weight: bold;
  }
}

// 动画效果
.message-slide-enter-active,
.message-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.message-slide-enter-from {
  opacity: 0;
  transform: translateX(100%) translateY(-20px);
}

.message-slide-leave-to {
  opacity: 0;
  transform: translateX(100%) translateY(20px);
}

.message-slide-enter-to,
.message-slide-leave-from {
  opacity: 1;
  transform: translateX(0) translateY(0);
}

/* 平板设备 (768px - 1024px) */
@media (max-width: 1024px) {
  .global-message {
    right: 16px;
    top: 16px;
    max-width: 380px;
    padding: 14px 18px;

    .message-icon {
      font-size: 16px;
    }

    .message-text {
      font-size: 14px;
    }
  }

  .close-btn {
    width: 26px;
    height: 26px;
    font-size: 16px;
  }
}

/* 手机设备 (480px - 768px) */
@media (max-width: 768px) {
  .global-message {
    left: 16px;
    right: 16px;
    top: 16px;
    max-width: none;
    margin: 0 auto;
    padding: 12px 16px;

    .message-content {
      gap: 10px;
    }

    .message-icon {
      font-size: 16px;
    }

    .message-text {
      font-size: 14px;
    }
  }

  .close-btn {
    width: 24px;
    height: 24px;
    font-size: 16px;
  }

  // 移动端调整动画
  .message-slide-enter-from {
    transform: translateY(-100%);
  }

  .message-slide-leave-to {
    transform: translateY(-100%);
  }
}

/* 小手机设备 (< 480px) */
@media (max-width: 480px) {
  .global-message {
    left: 12px;
    right: 12px;
    top: 12px;
    padding: 10px 14px;
    border-radius: 6px;

    .message-content {
      gap: 8px;
    }

    .message-icon {
      font-size: 14px;
    }

    .message-text {
      font-size: 13px;
    }
  }

  .close-btn {
    width: 22px;
    height: 22px;
    font-size: 14px;
  }
}

/* 横屏手机优化 */
@media (max-height: 500px) and (orientation: landscape) {
  .global-message {
    top: 8px;
    padding: 8px 12px;

    .message-icon {
      font-size: 14px;
    }

    .message-text {
      font-size: 13px;
    }
  }

  .close-btn {
    width: 20px;
    height: 20px;
    font-size: 14px;
  }
}

/* 高DPI屏幕优化 */
@media (-webkit-min-device-pixel-ratio: 2),
(min-resolution: 192dpi) {
  .global-message {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {

  .message-slide-enter-active,
  .message-slide-leave-active {
    transition: opacity 0.3s ease;
  }

  .message-slide-enter-from,
  .message-slide-leave-to {
    transform: none;
  }

  .close-btn {
    transition: none;

    &:hover,
    &:active {
      transform: none;
    }
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .global-message {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);

    &.warning {
      background: linear-gradient(135deg, #ffc107, #fd7e14);
      color: #000;
    }
  }
}
</style>