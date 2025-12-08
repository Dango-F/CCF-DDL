/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // 保持类型定义足够宽泛，同时避免使用 `{}` 和 `any` 来满足 lint 规则
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
