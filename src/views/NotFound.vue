<template>
  <div class="not-found-page">
    <div class="not-found-container">
      <!-- 背景装饰元素 -->
      <div class="background-elements">
        <div class="floating-shape shape-1"></div>
        <div class="floating-shape shape-2"></div>
        <div class="floating-shape shape-3"></div>
        <div class="floating-shape shape-4"></div>
        <div class="floating-shape shape-5"></div>
      </div>

      <!-- 主要内容 -->
      <div class="error-content">
        <div class="error-illustration">
          <div class="error-graphic">
            <div class="magnifying-glass">
              <div class="glass">
                <div class="handle"></div>
              </div>
              <div class="floating-text">404</div>
            </div>
          </div>
        </div>

        <div class="error-text">
          <h1 class="error-title">页面似乎迷路了</h1>
          <p class="error-description">
            我们仔细搜寻了每个角落，但就是找不到您要访问的页面。
            可能是链接有误，或者页面已被移至别处。
          </p>

          <div class="action-buttons">
            <router-link to="/" class="btn btn-primary">
              <span class="btn-icon">🏠</span>
              返回首页
            </router-link>
            <button @click="goBack" class="btn btn-secondary">
              <span class="btn-icon">↩️</span>
              返回上一页
            </button>
            <button @click="refreshPage" class="btn btn-outline">
              <span class="btn-icon">🔄</span>
              刷新页面
            </button>
          </div>
        </div>
      </div>

      <!-- 底部装饰 -->
      <div class="bottom-decoration">
        <div class="floating-dots">
          <div v-for="n in 15" :key="n" class="dot" :style="getDotStyle(n)"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const refreshPage = () => {
  window.location.reload()
}

const getDotStyle = (_index: number) => {
  const size = Math.random() * 8 + 4
  const opacity = Math.random() * 0.4 + 0.1
  const animationDelay = Math.random() * 5
  const left = Math.random() * 100
  const animationDuration = Math.random() * 10 + 10

  return {
    width: `${size}px`,
    height: `${size}px`,
    opacity: opacity.toString(),
    left: `${left}%`,
    animationDelay: `${animationDelay}s`,
    animationDuration: `${animationDuration}s`
  }
}
</script>

<style scoped lang="less">
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 50%, #d8e7f3 100%);
  color: #2d3748;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.not-found-container {
  max-width: 1000px;
  width: 100%;
  position: relative;
  z-index: 2;
}

.background-elements {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;

  .floating-shape {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.7);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
    animation: float 20s infinite ease-in-out;

    &.shape-1 {
      width: 120px;
      height: 120px;
      top: 10%;
      left: 5%;
      background: rgba(255, 241, 242, 0.8);
      animation-delay: 0s;
    }

    &.shape-2 {
      width: 80px;
      height: 80px;
      top: 70%;
      left: 80%;
      background: rgba(237, 242, 255, 0.8);
      animation-delay: 5s;
    }

    &.shape-3 {
      width: 100px;
      height: 100px;
      top: 20%;
      left: 85%;
      background: rgba(240, 253, 250, 0.8);
      animation-delay: 10s;
    }

    &.shape-4 {
      width: 60px;
      height: 60px;
      top: 80%;
      left: 15%;
      background: rgba(255, 247, 237, 0.8);
      animation-delay: 3s;
    }

    &.shape-5 {
      width: 90px;
      height: 90px;
      top: 15%;
      left: 70%;
      background: rgba(245, 243, 255, 0.8);
      animation-delay: 7s;
    }
  }
}

@keyframes float {

  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }

  33% {
    transform: translateY(-20px) rotate(5deg);
  }

  66% {
    transform: translateY(10px) rotate(-5deg);
  }
}

.error-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 60px;
  margin-bottom: 80px;
}

.error-illustration {
  flex: 1;
  display: flex;
  justify-content: center;
}

.error-graphic {
  position: relative;
  width: 300px;
  height: 300px;

  .magnifying-glass {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    .glass {
      width: 180px;
      height: 180px;
      border: 8px solid #4f46e5;
      border-radius: 50%;
      position: relative;
      background: rgba(255, 255, 255, 0.3);
      box-shadow:
        0 10px 25px rgba(79, 70, 229, 0.15),
        inset 0 0 20px rgba(79, 70, 229, 0.1);

      &::after {
        content: '';
        position: absolute;
        width: 90%;
        height: 90%;
        border: 2px dashed #4f46e5;
        border-radius: 50%;
        top: 5%;
        left: 5%;
        opacity: 0.3;
      }

      .handle {
        position: absolute;
        width: 120px;
        height: 20px;
        background: #4f46e5;
        border-radius: 10px;
        bottom: -40px;
        right: -40px;
        transform: rotate(45deg);
        box-shadow: 0 5px 15px rgba(79, 70, 229, 0.2);
      }
    }

    .floating-text {
      position: absolute;
      font-size: 80px;
      font-weight: 900;
      color: #4f46e5;
      opacity: 0.1;
      animation: float-text 8s infinite ease-in-out;
    }
  }
}

@keyframes float-text {

  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  25% {
    transform: translate(20px, -20px) rotate(5deg);
  }

  50% {
    transform: translate(-15px, 15px) rotate(-5deg);
  }

  75% {
    transform: translate(10px, 20px) rotate(3deg);
  }
}

.error-text {
  flex: 1;

  .error-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 20px;
    color: #1e293b;
    line-height: 1.2;
  }

  .error-description {
    font-size: 1.2rem;
    line-height: 1.6;
    margin-bottom: 40px;
    color: #64748b;
    max-width: 500px;
  }
}

.action-buttons {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  position: relative;
  z-index: 2;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

  &.btn-primary {
    background: linear-gradient(135deg, #4f46e5, #7c73e6);
    color: white;

    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(79, 70, 229, 0.3);
    }
  }

  &.btn-secondary {
    background: white;
    color: #4f46e5;
    border: 1px solid #e2e8f0;

    &:hover {
      background: #f8fafc;
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
    }
  }

  &.btn-outline {
    background: transparent;
    color: #64748b;
    border: 1px solid #e2e8f0;

    &:hover {
      background: white;
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
    }
  }

  .btn-icon {
    font-size: 1.2rem;
  }
}

.bottom-decoration {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100px;

  .floating-dots {
    position: relative;
    width: 100%;
    height: 100%;

    .dot {
      position: absolute;
      background: #cbd5e1;
      border-radius: 50%;
      animation: float-dot 15s infinite ease-in-out;
      bottom: 0;

      @keyframes float-dot {

        0%,
        100% {
          transform: translateY(0) scale(1);
          opacity: 0.1;
        }

        50% {
          transform: translateY(-80px) scale(1.2);
          opacity: 0.3;
        }
      }
    }
  }
}

/* 平板设备 (768px - 1024px) */
@media (max-width: 1024px) {
  .error-content {
    gap: 40px;
  }

  .error-graphic {
    width: 250px;
    height: 250px;

    .magnifying-glass .glass {
      width: 150px;
      height: 150px;
    }

    .floating-text {
      font-size: 70px;
    }
  }

  .error-text .error-title {
    font-size: 2.2rem;
  }
}

/* 手机设备 (480px - 768px) */
@media (max-width: 768px) {
  .not-found-page {
    padding: 15px;
  }

  .error-content {
    flex-direction: column;
    text-align: center;
    gap: 40px;
    margin-bottom: 60px;
  }

  .error-graphic {
    width: 220px;
    height: 220px;

    .magnifying-glass .glass {
      width: 130px;
      height: 130px;
    }

    .floating-text {
      font-size: 60px;
    }
  }

  .error-text .error-title {
    font-size: 2rem;
  }

  .error-text .error-description {
    font-size: 1.1rem;
  }

  .action-buttons {
    justify-content: center;
  }

  .btn {
    padding: 12px 24px;
  }

  .background-elements {
    .floating-shape {
      opacity: 0.5;
    }
  }
}

/* 小手机设备 (< 480px) */
@media (max-width: 480px) {
  .not-found-page {
    padding: 10px;
  }

  .error-graphic {
    width: 180px;
    height: 180px;

    .magnifying-glass .glass {
      width: 110px;
      height: 110px;
      border-width: 6px;
    }

    .magnifying-glass .handle {
      width: 80px;
      height: 16px;
      bottom: -30px;
      right: -30px;
    }

    .floating-text {
      font-size: 50px;
    }
  }

  .error-text .error-title {
    font-size: 1.7rem;
  }

  .error-text .error-description {
    font-size: 1rem;
  }

  .action-buttons {
    flex-direction: column;
    align-items: center;
  }

  .btn {
    width: 100%;
    max-width: 250px;
    justify-content: center;
  }
}

/* 横屏手机优化 */
@media (max-height: 500px) and (orientation: landscape) {
  .not-found-page {
    padding: 10px;
    min-height: 120vh;
  }

  .error-content {
    margin-bottom: 40px;
  }

  .error-graphic {
    width: 180px;
    height: 180px;
  }

  .error-text .error-title {
    font-size: 1.8rem;
  }

  .error-text .error-description {
    font-size: 1rem;
    margin-bottom: 20px;
  }
}

/* 高DPI屏幕优化 */
@media (-webkit-min-device-pixel-ratio: 2),
(min-resolution: 192dpi) {
  .error-graphic .magnifying-glass .glass {
    box-shadow:
      0 10px 30px rgba(79, 70, 229, 0.2),
      inset 0 0 25px rgba(79, 70, 229, 0.15);
  }
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {

  .floating-shape,
  .floating-text,
  .dot {
    animation: none !important;
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .not-found-page {
    background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%);
    color: #f1f5f9;
  }

  .background-elements .floating-shape {
    background: rgba(255, 255, 255, 0.1);
  }

  .error-text .error-title {
    color: #f8fafc;
  }

  .error-text .error-description {
    color: #cbd5e1;
  }

  .btn.btn-secondary {
    background: #374151;
    color: #e5e7eb;
    border-color: #4b5563;

    &:hover {
      background: #4b5563;
    }
  }

  .btn.btn-outline {
    background: transparent;
    color: #cbd5e1;
    border-color: #4b5563;

    &:hover {
      background: #374151;
    }
  }

  .bottom-decoration .floating-dots .dot {
    background: #6b7280;
  }
}
</style>