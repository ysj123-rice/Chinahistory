<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import AnalysisMap from '@/modules/analysis/components/AnalysisMap.vue'
</script>

<template>
  <div class="analysis-page">
    <AppHeader />
    <div class="analysis-body">
      <aside class="analysis-info">
        <section class="info-card">
          <h3>冷热点分析</h3>
          <p>用于识别历史事件的高发区域与冷点区域。</p>
          <ul>
            <li>密集区域以暖色突出</li>
            <li>低活跃区域以冷色示意</li>
          </ul>
        </section>
        <section class="info-card">
          <h3>核密度分析</h3>
          <p>更平滑地描绘人物活动强度与连续分布。</p>
          <ul>
            <li>适合观察空间聚集趋势</li>
            <li>支持跨时期对比</li>
          </ul>
        </section>
        <section class="info-card">
          <h3>标准差椭圆</h3>
          <p>展示活动中心与方向性，用于分析迁移趋势。</p>
          <ul>
            <li>椭圆大小代表离散程度</li>
            <li>椭圆方向代表主扩散轴</li>
          </ul>
        </section>
      </aside>

      <section class="analysis-map">
        <AnalysisMap />
      </section>

      <aside class="analysis-summary">
        <section class="summary-card">
          <h4>分析摘要</h4>
          <div class="summary-item">
            <span>热点区域</span>
            <strong>中原-江淮</strong>
          </div>
          <div class="summary-item">
            <span>冷点区域</span>
            <strong>河西北部</strong>
          </div>
          <div class="summary-item">
            <span>中心迁移</span>
            <strong>东南偏移</strong>
          </div>
        </section>
        <section class="summary-card">
          <h4>分析步骤</h4>
          <ol>
            <li>选择点图层与分析模式</li>
            <li>执行分析并查看地图结果</li>
            <li>记录热点与迁移趋势</li>
          </ol>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.analysis-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.analysis-body {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 240px;
  gap: 20px;
  padding: 24px;
}

.analysis-info,
.analysis-summary {
  display: grid;
  gap: 16px;
}

.analysis-map {
  min-height: 640px;
}

.info-card,
.summary-card {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-soft);
  display: grid;
  gap: 8px;
}

.info-card h3,
.summary-card h4 {
  margin: 0;
  font-size: 15px;
}

.info-card p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.info-card ul {
  margin: 0;
  padding-left: 16px;
  color: var(--text-muted);
  font-size: 12px;
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

.summary-card ol {
  margin: 0;
  padding-left: 18px;
  color: var(--text-muted);
  font-size: 12px;
}

@media (max-width: 1200px) {
  .analysis-body {
    grid-template-columns: 1fr;
  }

  .analysis-summary {
    order: 3;
  }
}
</style>
