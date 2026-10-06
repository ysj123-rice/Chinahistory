<script setup lang="ts">
import PageShell from '@/components/layout/PageShell.vue'
import EvolutionScene from '@/modules/migration/EvolutionScene.vue'
</script>

<template>
  <PageShell title="姓氏演变" subtitle="三维动态箭头展示迁徙演化路径">
    <div class="evolution-body">
      <aside class="evolution-info">
        <section class="info-card">
          <h3>两类真实迁徙数据</h3>
          <p>宏观事件 38 起（秦汉至当代），姓氏路线 49 条（25 姓）。</p>
          <ul>
            <li>弧线高度表示事件迁徙强度</li>
            <li>绿点为迁出地，红色箭头指向迁入地</li>
            <li>点击线条或右侧列表可查看史料详情</li>
          </ul>
        </section>
        <section class="info-card">
          <h3>时间切换</h3>
          <p>宏观事件可按历史时期筛选，姓氏路线可按姓筛选，均支持自动播放。</p>
          <ul>
            <li>时期按钮按事件真实年份划分</li>
            <li>播放模式按时间顺序连览</li>
          </ul>
        </section>
      </aside>

      <section class="evolution-map">
        <EvolutionScene />
      </section>

      <aside class="evolution-summary">
        <section class="summary-card">
          <h4>解读提示</h4>
          <div class="summary-item">
            <span>宏观主线</span>
            <strong>中原 → 江南岭南</strong>
          </div>
          <div class="summary-item">
            <span>数据出处</span>
            <strong>CSV 史料 / SHP 路线</strong>
          </div>
        </section>
        <section class="summary-card">
          <h4>应用场景</h4>
          <p>用于展示姓氏迁徙叙事、人口结构演变与区域传播路径。</p>
        </section>
      </aside>
    </div>
  </PageShell>
</template>

<style scoped>
.evolution-body {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 220px;
  gap: 20px;
}

.evolution-info,
.evolution-summary {
  display: grid;
  gap: 16px;
}

.evolution-map {
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

.info-card p,
.summary-card p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.info-card ul {
  margin: 0;
  padding-left: 16px;
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
  .evolution-body {
    grid-template-columns: 1fr;
  }
}
</style>
