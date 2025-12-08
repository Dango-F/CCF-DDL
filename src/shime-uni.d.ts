export {}

declare module "vue" {
  type Hooks = App.AppInstance & Page.PageInstance;
  // This file intentionally augments Vue types for UniApp; empty extension is valid
  // eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-empty-object-type
  interface ComponentCustomOptions extends Hooks {}
}