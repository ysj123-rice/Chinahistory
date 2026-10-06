<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import ThematicMap from '@/modules/thematic/components/ThematicMap.vue'
</script>

<template>
  <div class="thematic-page">
    <AppHeader />
    <div class="thematic-body">
      <aside class="tips">
        <section class="tip-card">
          <h3>专题制图流程</h3>
          <ol>
            <li>选择颜色与标注样式</li>
            <li>使用绘制工具补充说明</li>
            <li>导出图片并嵌入报告</li>
          </ol>
        </section>
        <section class="tip-card">
          <h3>样式建议</h3>
          <p>保持颜色统一，突出重点区域与关键事件。</p>
        </section>
        <section class="tip-card">
          <h3>图例说明</h3>
          <p>图例可帮助读者理解不同符号与含义。</p>
        </section>
      </aside>

      <section class="map-area">
        <ThematicMap />
      </section>

      <aside class="summary">
        <section class="summary-card">
          <h4>输出示例</h4>
          <div class="summary-item">
            <span>专题主题</span>
            <strong>姓氏活动分布</strong>
          </div>
          <div class="summary-item">
            <span>输出格式</span>
            <strong>PNG / 报告嵌入</strong>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.thematic-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.thematic-body {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 220px;
  gap: 20px;
  padding: 24px;
}

.tips,
.summary {
  display: grid;
  gap: 16px;
}

.map-area {
  min-height: 640px;
}

.tip-card,
.summary-card {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-soft);
}

.tip-card h3,
.summary-card h4 {
  margin: 0 0 8px;
  font-size: 15px;
}

.tip-card p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.tip-card ol {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--text-muted);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted);
}

.summary-item strong {
  color: var(--text-strong);
}

@media (max-width: 1200px) {
  .thematic-body {
    grid-template-columns: 1fr;
  }
}
</style>
