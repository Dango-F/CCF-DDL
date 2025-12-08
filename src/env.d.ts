/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // Keep the typing general but avoid `{}` and `any` to satisfy linting rules
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
