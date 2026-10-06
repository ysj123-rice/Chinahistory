<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_PATHS } from '@/constants/routePaths'

const router = useRouter()

const username = ref('')
const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'admin123'
const AUTH_TOKEN_KEY = 'auth_token'

const handleSubmit = async () => {
  isSubmitting.value = true
  errorMessage.value = ''

  try {
    if (username.value !== ADMIN_USERNAME || password.value !== ADMIN_PASSWORD) {
      errorMessage.value = '账号或密码不正确，请使用 admin / admin123。'
      return
    }

    localStorage.setItem(AUTH_TOKEN_KEY, ADMIN_USERNAME)
    await router.push(ROUTE_PATHS.home)
  } catch (error) {
    console.error('登录跳转失败', error)
    errorMessage.value = '登录失败，请稍后重试。'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-badge">AUTH GATEWAY</div>
      <div class="login-title">中华姓氏时空溯源与迁徙推演系统</div>
      <div class="login-subtitle">登录后进入姓氏时空溯源与迁徙推演平台</div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <label class="field">
          <span>用户名</span>
          <input v-model="username" type="text" autocomplete="username" placeholder="请输入用户名" />
        </label>

        <label class="field">
          <span>密码</span>
          <input v-model="password" type="password" autocomplete="current-password" placeholder="请输入密码" />
        </label>

        <button class="submit" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? '正在进入...' : '进入系统' }}
        </button>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </form>

      <div class="login-footer">
        <span>AUTH: admin / admin123</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  background: radial-gradient(circle at 15% 20%, rgba(0, 196, 255, 0.2), transparent 45%),
    radial-gradient(circle at 85% 10%, rgba(0, 255, 214, 0.18), transparent 45%),
    radial-gradient(circle at 50% 80%, rgba(0, 92, 255, 0.2), transparent 50%),
    linear-gradient(160deg, #07121c 0%, #0c1d2b 45%, #0a1522 100%);
}

.login-card {
  width: min(420px, 92vw);
  background: rgba(9, 20, 30, 0.9);
  border: 1px solid rgba(0, 214, 255, 0.2);
  border-radius: 24px;
  padding: 36px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(16px);
  position: relative;
  overflow: hidden;
}

.login-card::before {
  content: '';
  position: absolute;
  inset: -40% 30% auto -40%;
  height: 140px;
  background: linear-gradient(120deg, rgba(0, 214, 255, 0.25), transparent 70%);
  filter: blur(12px);
}

.login-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(0, 214, 255, 0.35);
  color: rgba(202, 250, 255, 0.9);
  font-size: 11px;
  letter-spacing: 1.4px;
  background: rgba(0, 214, 255, 0.08);
}

.login-title {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #e3f7ff;
}

.login-subtitle {
  margin-top: 8px;
  color: rgba(208, 235, 255, 0.7);
  font-size: 14px;
}

.login-form {
  margin-top: 28px;
  display: grid;
  gap: 18px;
}

.field {
  display: grid;
  gap: 8px;
  color: rgba(208, 235, 255, 0.7);
  font-size: 13px;
}

.field input {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0, 214, 255, 0.25);
  background: rgba(8, 20, 32, 0.9);
  color: #e6f7ff;
}

.submit {
  margin-top: 6px;
  padding: 12px 16px;
  border-radius: 14px;
  background: linear-gradient(120deg, #00d6ff, #00ffa3);
  color: #06131d;
  font-weight: 600;
  box-shadow: 0 12px 24px rgba(0, 214, 255, 0.3);
}

.submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error {
  margin: 0;
  color: #ff8b8b;
  font-size: 12px;
}

.login-footer {
  margin-top: 24px;
  color: rgba(208, 235, 255, 0.6);
  font-size: 12px;
  text-align: center;
}
</style>
