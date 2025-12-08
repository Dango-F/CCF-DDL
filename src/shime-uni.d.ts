export {}

declare module "vue" {
  type Hooks = App.AppInstance & Page.PageInstance;
  // 该文件用于扩展 UniApp 的 Vue 类型；空接口扩展是允许的
  // eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-empty-object-type
  interface ComponentCustomOptions extends Hooks {}
}