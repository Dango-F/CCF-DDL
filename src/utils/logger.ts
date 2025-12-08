// 简易 logger 封装
// 目标：
// - 在开发环境中保留 debug/info 打印
// - 在生产环境中去除 debug/info 打印（warn/error 保留）
const isProd = import.meta.env?.PROD === true;

export const debug = (...args: Parameters<typeof console.log>) => {
  if (!isProd) console.log(...args);
};

export const info = (...args: Parameters<typeof console.info>) => {
  if (!isProd) console.info(...args);
};

export const warn = (...args: Parameters<typeof console.warn>) => {
  console.warn(...args);
};

export const error = (...args: Parameters<typeof console.error>) => {
  console.error(...args);
};

export default {
  debug,
  info,
  warn,
  error,
};
