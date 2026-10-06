<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'

defineProps<{ title: string; subtitle: string }>()
</script>

<template>
  <div class="page-shell">
    <AppHeader />
    <section class="page-body">
      <header class="page-hero">
        <h1>{{ title }}</h1>
        <p>{{ subtitle }}</p>
      </header>
      <div class="page-content">
        <slot />
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-body {
  padding: 28px;
  display: grid;
  gap: 24px;
}

.page-hero {
  padding: 22px 24px;
  border-radius: var(--radius-lg);
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.9), rgba(239, 246, 252, 0.9));
  border: 1px solid var(--panel-border);
  box-shadow: var(--shadow-soft);
}

.page-hero h1 {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: 22px;
}

.page-hero p {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
}

.page-content {
  padding: 20px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--panel-border);
  background: var(--panel-bg);
  min-height: 280px;
}
</style>
