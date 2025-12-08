<template>
  <view class="container" v-if="conference">
    <view class="header-card">
      <view class="row">
        <text class="label">会议等级</text>
        <text class="value">CCF {{ conference.ccfLevel }}</text>
      </view>
      <view class="row">
        <text class="label">会议类型</text>
        <text class="value">{{ conference.category }}</text>
      </view>
      <view class="row title-row">
        <text class="label">会议全称</text>
        <text class="value title">{{ conference.fullTitle }}</text>
      </view>
    </view>

    <view class="info-card">
      <view class="row">
        <text class="label">举办地点</text>
        <text class="value">{{ conference.location }}</text>
      </view>
      <view class="row">
        <text class="label">举办日期</text>
        <text class="value">{{ conference.conferenceDate }}</text>
      </view>
      <view class="row link-row" v-if="conference.website">
        <text class="label">官网链接</text>
        <text class="value link" @click="openLink(conference.website)">{{ conference.website }}</text>
      </view>
    </view>

    <view class="countdown-card">
      <view class="row">
        <text class="label">摘要截止</text>
        <text class="value deadline">{{ conference.abstractDeadline && conference.abstractDeadline !== '暂无' ? (conference.abstractDeadline + ' (北京时间)') : '暂无' }} </text>
      </view>
      <view class="row">
        <text class="label">全文截止</text>
        <text class="value deadline">{{ conference.deadline && conference.deadline !== 'TBD' ? (conference.deadline + ' (北京时间)') : conference.deadline }}</text>
      </view>
      <view class="row countdown-row">
        <text class="label">倒计时</text>
        <text class="value countdown">{{ countdownText }}</text>
      </view>
    </view>

    <view class="info-card">
      <view class="row">
        <text class="label">录用率</text>
        <text class="value">{{ conference.acceptanceRate || '暂无' }}</text>
      </view>
    </view>

    <button class="add-calendar-btn" @click="addToCalendar">
      加入日程
    </button>
  </view>
  <view v-else class="loading">
    <text>加载中...</text>
  </view>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useConferenceStore } from '@/stores/conference';
// 构建时导入的静态录用率索引
import acceptRateIndex from '@/static/accept_rates/index.json';
import type { Conference } from '@/stores/conference';
import logger from '@/utils/logger';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

const store = useConferenceStore();
// 给组件命名（script setup）以避免单词名 lint 报警
// Vue 3 SFC 的 script setup 支持 defineOptions
// defineOptions 宏被 Vue SFC 识别；某些工具链下可添加 TypeScript 抑制指令
defineOptions({ name: 'detail-page' });
const conference = ref<Conference | undefined>(undefined);
const countdownText = ref('');
let timer: any = null;

// #ifdef APP-PLUS
// Android 本地对象缓存
let mainActivity: any = null;
let IntentClass: any = null;
let CalendarContractClass: any = null;
// #endif

onLoad(async (options: any) => {
    if (options.id) {
    conference.value = store.getConferenceById(options.id);
    if (!conference.value) {
      // 如果 store 为空（例如通过直接链接进入），则回退从缓存加载
      store.loadFromCache();
      conference.value = store.getConferenceById(options.id);
      if (!conference.value) {
        // 仅在网络可用时尝试远程抓取；离线时仅显示空状态
        if (!store.isNetworkError) {
          await store.fetchRemoteConferences();
          conference.value = store.getConferenceById(options.id);
        }
      }
    } else {
      // 若 store 已有缓存会议，且之前判断网络不可用，则避免触发网络请求
      // 只有在没有设置 lastUpdated 且在线时才从网络刷新
      if (!store.lastUpdated && !store.isNetworkError) {
        await store.fetchRemoteConferences();
        conference.value = store.getConferenceById(options.id);
      }
    }
    startCountdown();
    // index.json 为静态文件并在构建时导入；无需在 store 中预先加载
    // 尝试直接加载合并 JSON 索引（如果未通过 store 设置录用率）
    try {
      if (conference.value && (!conference.value.acceptanceRate || conference.value.acceptanceRate === '暂无')) {
        // 先尝试从 store 中使用预加载的索引，若无再回退到索引文件获取
        if (!conference.value.acceptanceRate || conference.value.acceptanceRate === '暂无') {
          // 如果 loadLocalAcceptRates 填充了索引，则从 store 刷新
          conference.value = store.getConferenceById(options.id) || conference.value;
        }
        if (!conference.value.acceptanceRate || conference.value.acceptanceRate === '暂无') {
          // 使用构建时的 acceptRateIndex 来渲染录用率
          await loadAcceptRateFromIndex(conference.value);
        }
      }
    } catch (e) {
      logger.warn('loadAcceptRateFromIndex failed', e);
    }
  }
});

const loadAcceptRateFromIndex = (conf: any) => {
  return new Promise<void>((resolve) => {
    if (!conf || !conf.sub || !conf.dblp) return resolve();
    const data = acceptRateIndex as any;
    const subKey = conf.sub || '';
    const dblpKey = conf.dblp || '';
    const altKeys = [
      `${subKey}/${dblpKey}`,
      `${subKey}/${dblpKey.toLowerCase()}`,
      `${subKey.toLowerCase()}/${dblpKey}`,
      `${subKey.toLowerCase()}/${dblpKey.toLowerCase()}`
    ];
    let entry: any = null;
    for (const k of altKeys) {
      if (data[k]) { entry = data[k]; break; }
    }
    if (!entry) {
      if (data[subKey] && data[subKey][dblpKey]) entry = data[subKey][dblpKey];
    }
    if (!entry) return resolve();
    let e = entry;
    if (Array.isArray(entry) && entry.length > 0) e = entry[0];
    if (e.accept_rates && Array.isArray(e.accept_rates) && e.accept_rates.length > 0) {
      const latest = e.accept_rates.reduce((acc: any, cur: any) => (!acc || !acc.year || (cur && cur.year && cur.year > acc.year)) ? cur : acc, null);
      if (latest && latest.str) { conf.acceptanceRate = String(latest.str); return resolve(); }
      if (latest && latest.rate !== undefined && latest.rate !== null) {
        const v = String(latest.rate).replace(/,/g, '.');
        const n = Number(v);
        if (!Number.isNaN(n)) { conf.acceptanceRate = (n * 100).toFixed(1) + '%'; return resolve(); }
      }
    }
    if (e.str) { conf.acceptanceRate = String(e.str); return resolve(); }
    if (e.rate !== undefined && e.rate !== null) { const v = String(e.rate).replace(/,/g, '.'); const n = Number(v); if (!Number.isNaN(n)) { conf.acceptanceRate = (n * 100).toFixed(1) + '%'; return resolve(); } }
    return resolve();
  });
};

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

const startCountdown = () => {
  updateCountdown();
  timer = setInterval(updateCountdown, 1000);
};

const updateCountdown = () => {
  if (!conference.value) return;
  
  // 检查是否为 TBD
  if (conference.value.deadline === 'TBD' || !conference.value.deadline) {
    countdownText.value = '截稿日期待定';
    if (timer) clearInterval(timer);
    return;
  }
  
  const now = dayjs();
  const deadline = dayjs(conference.value.deadline);
  
  // 检查日期是否有效
  if (!deadline.isValid()) {
    countdownText.value = '日期无效';
    if (timer) clearInterval(timer);
    return;
  }
  
  const diff = deadline.diff(now);
  
  if (diff <= 0) {
    countdownText.value = '已截止';
    if (timer) clearInterval(timer);
    return;
  }
  
  const dur = dayjs.duration(diff);
  const days = Math.floor(dur.asDays());
  const hours = dur.hours();
  const minutes = dur.minutes();
  const seconds = dur.seconds();
  
  countdownText.value = `${days}天 ${hours}小时 ${minutes}分 ${seconds}秒`;
};

const openLink = (url: string) => {
  // #ifdef APP-PLUS
  plus.runtime.openURL(url);
  // #endif
  // #ifdef H5
  window.open(url, '_blank');
  // #endif
};

// #ifdef APP-PLUS
const addToCalendarApp = (title: string, deadline: string) => {
  if (plus.os.name === 'Android') {
    addToCalendarAndroid(title, deadline);
  } else if (plus.os.name === 'iOS') {
    addToCalendarIOS(title, deadline);
  } else {
    uni.showToast({ title: '暂不支持此设备', icon: 'none', duration: 1000 });
  }
};

const addToCalendarIOS = (title: string, deadline: string) => {
  const h5Dtstart = dayjs(deadline).format('YYYYMMDDTHHmmss');
  const h5Dtend = dayjs(deadline).add(1, 'hour').format('YYYYMMDDTHHmmss');
  
  // 构建 .ics 内容
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CCF-DDL//Conference Deadline//CN',
    'BEGIN:VEVENT',
    `DTSTART:${h5Dtstart}`,
    `DTEND:${h5Dtend}`,
    `SUMMARY:${title} 截稿`,
    `DESCRIPTION:会议：${conference.value?.fullTitle || title}\\n地点：${conference.value?.location || 'TBD'}\\n会议日期：${conference.value?.conferenceDate || 'TBD'}`,
    `LOCATION:${conference.value?.location || ''}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:会议截稿提醒',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  // 写入文件并打开
  // 使用 _doc 目录
  const fileName = '_doc/event.ics';
  
  plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fs) => {
    if (!fs || !fs.root) return;
    fs.root.getFile('event.ics', { create: true }, (fileEntry) => {
      fileEntry.createWriter((writer) => {
          writer.onwrite = () => {
          // 写入成功后，调用系统打开
          // iOS 上调用 openFile 会自动识别 .ics 并弹出添加日历的界面
            plus.runtime.openFile(fileName, {}, (e) => {
            logger.error('打开文件失败', e);
            uni.showToast({ title: '打开日历失败', icon: 'none', duration: 1000 });
          });
        };
          writer.onerror = (e) => {
            logger.error('写入文件失败', e);
           uni.showToast({ title: '生成日程失败', icon: 'none', duration: 1000 });
        };
        writer.write(icsContent);
      }, (e) => {
        logger.error('创建写入器失败', e);
      });
    }, (e) => {
      logger.error('获取文件失败', e);
    });
  }, (e) => {
    logger.error('请求文件系统失败', e);
  });
};

const addToCalendarAndroid = (title: string, deadline: string) => {
  // 显示加载提示，避免用户感觉卡顿
  uni.showLoading({ title: '正在启动日历...', mask: true });
  
  // 使用 setTimeout 将任务推入下一个事件循环,确保 loading 能够先渲染出来
  // 50ms 足够让 UI 线程完成渲染,同时用户几乎无感知
  setTimeout(() => {
    try {
      if (!mainActivity) mainActivity = plus.android.runtimeMainActivity();
      if (!IntentClass) IntentClass = plus.android.importClass("android.content.Intent");
      if (!CalendarContractClass) CalendarContractClass = plus.android.importClass("android.provider.CalendarContract");
      
      const intent = new IntentClass(IntentClass.ACTION_INSERT);
      intent.setData(CalendarContractClass.Events.CONTENT_URI);
      
      const startMs = dayjs(deadline).valueOf();
      const endMs = dayjs(deadline).add(1, 'hour').valueOf();
      
      intent.putExtra(CalendarContractClass.Events.TITLE, `${title} 截稿`);
      intent.putExtra(CalendarContractClass.Events.DESCRIPTION, `会议：${conference.value?.fullTitle || title}\n地点：${conference.value?.location || 'TBD'}\n会议日期：${conference.value?.conferenceDate || 'TBD'}`,);
      intent.putExtra(CalendarContractClass.Events.EVENT_LOCATION, conference.value?.location || '');
      intent.putExtra(CalendarContractClass.EXTRA_EVENT_BEGIN_TIME, startMs);
      intent.putExtra(CalendarContractClass.EXTRA_EVENT_END_TIME, endMs);
      
      mainActivity.startActivity(intent);
    } catch (e: any) {
      logger.error('Native.js 调用失败', e);
      uni.showToast({ title: '调起日历失败', icon: 'none', duration: 1000 });
    } finally {
      uni.hideLoading();
    }
  }, 50);
};
// #endif

const addToCalendar = () => {
  if (!conference.value) return;
  
  const title = conference.value.title;
  const deadline = conference.value.deadline;
  
  if (deadline === 'TBD') {
    uni.showToast({
      title: '截稿日期待定，无法添加日程',
      icon: 'none',
      duration: 1000
    });
    return;
  }
  
  // #ifdef APP-PLUS
  addToCalendarApp(title, deadline);
  // #endif
  
  // #ifdef H5
  // H5 端：生成 .ics 文件并触发下载
  const h5Dtstart = dayjs(deadline).format('YYYYMMDDTHHmmss');
  const h5Dtend = dayjs(deadline).add(1, 'hour').format('YYYYMMDDTHHmmss');
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CCF-DDL//Conference Deadline//CN',
    'BEGIN:VEVENT',
    `DTSTART:${h5Dtstart}`,
    `DTEND:${h5Dtend}`,
    `SUMMARY:${title} 截稿`,
    `DESCRIPTION:会议：${conference.value?.fullTitle || title}\\n地点：${conference.value?.location || 'TBD'}\\n会议日期：${conference.value?.conferenceDate || 'TBD'}`,
    `LOCATION:${conference.value?.location || ''}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:会议截稿提醒',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${title}-deadline.ics`;
  link.click();
  URL.revokeObjectURL(link.href);
  
  uni.showToast({ 
    title: '日历文件已下载，请打开添加', 
    icon: 'success',
    duration: 1000
  });
  // #endif
  
  // #ifdef MP-WEIXIN
  // 微信小程序：提示用户手动添加
  uni.showModal({
    title: '添加日程',
    content: `会议：${title}\n截稿：${dayjs(deadline).format('YYYY-MM-DD HH:mm')}\n\n请在手机日历中手动添加`,
    showCancel: false,
    confirmText: '我知道了'
  });
  // #endif
};
</script>

<style lang="scss" scoped>
.container {
  padding: 16px;
  background-color: #f5f7fa;
  min-height: 100vh;
  padding-bottom: 80px;
}

.header-card, .info-card, .countdown-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

  .row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .label {
    color: #888;
    width: 80px;
    flex-shrink: 0;
  }
  
  .value {
    color: #333;
    flex: 1;
    display: flex;
    align-items: center;
    /* 更温和的换行策略，避免在手机端把短文本异常拆分 */
    word-break: normal;
    overflow-wrap: anywhere;
  }
  
  .title {
    font-weight: bold;
    font-size: 16px;
  }
  
  .link {
    color: #1976d2;
    text-decoration: underline;
    word-break:break-all;
  }
  
  .deadline {
    color: #d32f2f;
    font-weight: 500;
  }
  
  .countdown {
    color: #d32f2f;
    font-weight: bold;
    font-size: 16px;
  }

  /* 顶端对齐的特殊行（会议全称、官网链接） */
  &.title-row,
  &.link-row {
    align-items: flex-start;
  }

  &.title-row .value,
  &.link-row .value {
    align-items: flex-start;
  }
}

.add-calendar-btn {
  position: fixed;
  bottom: 20px;
  bottom: calc(20px + constant(safe-area-inset-bottom)); /* iOS 11.0-11.2 兼容 */
  bottom: calc(20px + env(safe-area-inset-bottom)); /* iOS 11.2 及以上 */
  left: 16px;
  right: 16px;
  background-color: #4caf50;
  color: #fff;
  border-radius: 24px;
  font-size: 16px;
  height: 48px;
  line-height: 48px;
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
  
  &:active {
    background-color: #43a047;
  }
}

.loading {
  display: flex;
  justify-content: center;
  padding-top: 100px;
  color: #999;
}
</style>
