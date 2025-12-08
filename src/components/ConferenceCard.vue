<template>
  <view class="conference-card">
    <view class="card-content" @click="onClick">
      <view class="card-header">
        <text class="title">{{ conference.title }}</text>
        <view class="tags">
          <text class="tag level-tag" :class="getLevelClass(conference.ccfLevel)">CCF {{ conference.ccfLevel || 'N' }}</text>
          <text class="tag category-tag">{{ conference.category || '未知' }}</text>
        </view>
      </view>
      
      <view class="full-title">{{ conference.fullTitle || '暂无会议全称' }}</view>
      
      <view class="info-row">
        <text class="label">截稿日期：</text>
        <text class="value deadline" :class="{ 'tbd': isDeadlineTBD }">{{ displayDeadline }}</text>
        <text v-if="!isDeadlineTBD" class="remaining" :class="{ urgent: isUrgent, relaxed: isRelaxed, passed: isPassed }">{{ remainingText }}</text>
      </view>
      
      <view class="info-row">
        <text class="label">会议日期：</text>
        <text class="value" :class="{ 'tbd': isConferenceDateTBD }">{{ displayConferenceDate }}</text>
      </view>
      
      <view class="info-row">
        <text class="label">举办地点：</text>
        <text class="value" :class="{ 'tbd': isLocationTBD }">{{ displayLocation }}</text>
      </view>
    </view>
    
    <!-- 收藏按钮 -->
    <view class="favorite-btn" @click.stop="onToggleFavorite">
      <text class="favorite-icon" :class="{ active: isFavorite }">{{ isFavorite ? '★' : '☆' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Conference } from '@/stores/conference';
import { useConferenceStore } from '@/stores/conference';
import dayjs from 'dayjs';

const props = defineProps<{
  conference: Conference;
}>();

const emit = defineEmits(['click']);
const store = useConferenceStore();

const onClick = () => {
  emit('click', props.conference.id);
};

const isFavorite = computed(() => store.isFavorite(props.conference.id));

const onToggleFavorite = () => {
  store.toggleFavorite(props.conference.id);
};

// 检查是否为 TBD 或空值
const isTBD = (value: string | undefined | null) => {
  if (!value) return true;
  const v = value.toLowerCase().trim();
  return v === 'tbd' || v === '' || v === 'null' || v === 'undefined';
};

const isDeadlineTBD = computed(() => isTBD(props.conference.deadline));
const isConferenceDateTBD = computed(() => isTBD(props.conference.conferenceDate));
const isLocationTBD = computed(() => isTBD(props.conference.location));

// 格式化显示
const displayDeadline = computed(() => {
  if (isDeadlineTBD.value) return '待定';
  return formatDate(props.conference.deadline);
});

const displayConferenceDate = computed(() => {
  if (isConferenceDateTBD.value) return '待定';
  return props.conference.conferenceDate;
});

const displayLocation = computed(() => {
  if (isLocationTBD.value) return '待定';
  return props.conference.location;
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return '待定';
  const date = dayjs(dateStr);
  if (!date.isValid()) return dateStr;
  return date.format('YYYY-MM-DD HH:mm:ss');
};

const remainingDays = computed(() => {
  if (isDeadlineTBD.value) return Infinity;
  const now = dayjs();
  const deadline = dayjs(props.conference.deadline);
  if (!deadline.isValid()) return Infinity;
  // 使用 diff 计算天数差，向下取整
  return deadline.diff(now, 'day');
});

// 判断是否是今天截止（同一天）
const isTodayDeadline = computed(() => {
  if (isDeadlineTBD.value) return false;
  const now = dayjs();
  const deadline = dayjs(props.conference.deadline);
  if (!deadline.isValid()) return false;
  return deadline.isSame(now, 'day');
});

// 判断是否已过截止日期（精确到时间）
const isPassedDeadline = computed(() => {
  if (isDeadlineTBD.value) return false;
  const now = dayjs();
  const deadline = dayjs(props.conference.deadline);
  if (!deadline.isValid()) return false;
  return now.isAfter(deadline);
});

const remainingText = computed(() => {
  if (isDeadlineTBD.value) return '';
  // 先判断是否已过截止时间
  if (isPassedDeadline.value) return '已截止';
  // 判断是否是今天截止
  if (isTodayDeadline.value) {
    const deadline = dayjs(props.conference.deadline);
    return `今天${deadline.format('HH:mm')}截止`;
  }
  const days = remainingDays.value;
  if (days === Infinity) return '';
  
  // 如果是明天或后天（小于2天），显示小时数
  if (days <= 1) {
    const now = dayjs();
    const deadline = dayjs(props.conference.deadline);
    const hours = deadline.diff(now, 'hour');
    if (hours <= 0) return '即将截止';
    return `剩余${hours}小时`;
  }
  
  return `剩余${days}天`;
});

const isUrgent = computed(() => {
  if (isDeadlineTBD.value) return false;
  if (isPassedDeadline.value) return false;
  return remainingDays.value <= 7 && remainingDays.value >= 0;
});

// 截止日期较长（超过30天）
const isRelaxed = computed(() => {
  if (isDeadlineTBD.value) return false;
  if (isPassedDeadline.value) return false;
  return remainingDays.value > 30;
});

// 已截止
const isPassed = computed(() => {
  if (isDeadlineTBD.value) return false;
  return isPassedDeadline.value;
});

const getLevelClass = (level: string) => {
  switch (level) {
    case 'A': return 'level-a';
    case 'B': return 'level-b';
    case 'C': return 'level-c';
    default: return 'level-n';
  }
};
</script>

<style lang="scss" scoped>
.conference-card {
  background-color: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
  padding: 14px;
  
  .card-content {
    padding: 0;
  }
  
  .card-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 8px;
    
    .title {
      font-size: 17px;
      font-weight: bold;
      color: #333;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      
      .tag {
        font-size: 12px;
        padding: 3px 8px;
        border-radius: 4px;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 22px;
        line-height: 22px;
        box-sizing: border-box;
      }
      
      .level-tag {
        color: #fff;
        flex-shrink: 0;
        font-weight: 500;
        &.level-a { background-color: #d32f2f; }
        &.level-b { background-color: #f57c00; }
        &.level-c { background-color: #388e3c; }
        &.level-n { background-color: #757575; }
      }
      
      .category-tag {
        font-size: 12px;
        background-color: #e3f2fd;
        color: #1976d2;
        font-weight: 500;
        height: 22px;
        line-height: 22px;
        box-sizing: border-box;
      }       
    }
  }
  
  .full-title {
    font-size: 13px;
    color: #666;
    margin-bottom: 12px;
    line-height: 1.4;
  }
  
  .info-row {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
    font-size: 13px;
    flex-wrap: nowrap;
    
    .label {
      color: #888;
      width: 70px;
      flex-shrink: 0;
    }
    
    .value {
      color: #333;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      
      &.tbd {
        color: #999;
        font-style: italic;
      }
    }
    
    .deadline {
      color: #d32f2f;
      font-weight: 500;
      font-size: 12px;
      
      &.tbd {
        color: #999;
        font-weight: normal;
        font-style: italic;
      }
    }
    
    .remaining {
      font-size: 12px;
      padding: 3px 8px;
      border-radius: 4px;
      background-color: #fff3e0;
      color: #f57c00;
      font-weight: 500;
      margin-left: 6px;
      white-space: nowrap;
      
      &.urgent {
        background-color: #ffebee;
        color: #d32f2f;
      }
      
      &.relaxed {
        background-color: #e8f5e9;
        color: #388e3c;
      }
      
      &.passed {
        background-color: #f5f5f5;
        color: #999;
      }
    }
  }
  
  .favorite-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    
    .favorite-icon {
      font-size: 30px;
      color: #000;
      transition: color 0.2s ease; /* only animate color, no transform */
      
      &.active {
        color: #ff9800;
        /* remove transform scaling; only color changes */
      }
    }
  }
}
</style>

