<template>
  <view class="container">
    

    <!-- 等级多选弹窗 -->
    <view v-if="showLevelPicker" class="modal-overlay" @click="showLevelPicker = false">
      <view class="category-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择等级</text>
          <text class="clear-btn" @click="clearLevels">清空</text>
        </view>
        <scroll-view class="category-list" scroll-y>
          <view 
            v-for="level in levels" 
            :key="level"
            class="category-item"
            :class="{ selected: selectedLevels.includes(level) }"
            @click="toggleLevel(level)"
          >
            <text class="category-name">CCF {{ level }}</text>
            <!-- 去掉勾选图标以避免布局抖动；选择只使用颜色变化 -->
          </view>
        </scroll-view>
        <view class="modal-footer">
          <button class="confirm-btn" @click="showLevelPicker = false">确定</button>
        </view>
      </view>
    </view>

    <!-- 类别多选弹窗 -->
    <view v-if="showCategoryPicker" class="modal-overlay" @click="showCategoryPicker = false">
      <view class="category-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择类别</text>
          <text class="clear-btn" @click="clearCategories">清空</text>
        </view>
        <scroll-view class="category-list" scroll-y>
          <view 
            v-for="cat in categories" 
            :key="cat"
            class="category-item"
            :class="{ selected: selectedCategories.includes(cat) }"
            @click="toggleCategory(cat)"
          >
            <text class="category-name">{{ cat }}</text>
            <!-- 去掉勾选图标以避免布局抖动；选择只使用颜色变化 -->
          </view>
        </scroll-view>
        <view class="modal-footer">
          <button class="confirm-btn" @click="showCategoryPicker = false">确定</button>
        </view>
      </view>
    </view>

    <!-- 会议列表 -->
    <view class="conference-list">
      <!-- 顶部控件：搜索栏 + 筛选 -->
      <view class="top-controls">
        <!-- 搜索框 -->
        <view class="search-bar">
          <input 
            ref="searchInputRef"
            class="search-input" 
            type="text" 
            placeholder="🔍 搜索会议名称..." 
            v-model="searchQuery"
            @input="onSearch"
          />
          <view 
            v-if="searchQuery" 
            class="clear-icon" 
            @touchstart.prevent="clearSearch"
            @mousedown.prevent="clearSearch"
          >
            <text class="clear-text">✕</text>
          </view>
        </view>

        <!-- 筛选器 -->
        <view class="filters">
          <view class="filter-picker" @click="showLevelPicker = true">
            <view class="picker-label">
                <text class="picker-label-text">等级: {{ levelDisplayText }}</text>
                <text class="arrow">▼</text>
              </view>
          </view>
          <view class="filter-picker" @click="showCategoryPicker = true">
            <view class="picker-label">
                <text class="picker-label-text">类别: {{ categoryDisplayText }}</text>
                <text class="arrow">▼</text>
              </view>
          </view>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="isLoading" class="loading-state">
        <text>正在获取最新会议数据...</text>
      </view>
      <!-- 非加载状态时显示会议列表 -->
      <template v-else>
        <!-- 未过期的会议 -->
        <conference-card 
          v-for="(conf, idx) in upcomingConferences" 
          :key="conf.id" 
          :conference="conf"
          :class="{ 'first-card': idx === 0 }"
          @click="goToDetail"
        />
        
        <!-- 已截止会议的折叠区域 -->
        <view v-if="passedConferences.length > 0" class="passed-section">
          <view class="passed-header" @click="togglePassed">
            <view class="passed-header-left">
              <text class="passed-icon">📋</text>
              <text class="passed-title">已截止的会议</text>
              <text class="passed-count">{{ passedConferences.length }}</text>
            </view>
            <text class="passed-arrow" :class="{ expanded: showPassed }">▼</text>
          </view>
          
          <view v-show="showPassed" class="passed-list">
            <conference-card 
              v-for="conf in passedConferences" 
              :key="conf.id" 
              :conference="conf"
              @click="goToDetail"
            />
          </view>
        </view>
        
        <!-- 待定（TBD）的会议 -->
        <conference-card 
          v-for="conf in tbdConferences" 
          :key="conf.id" 
          :conference="conf"
          @click="goToDetail"
        />
        
        <!-- 空状态 -->
        <view v-if="totalCount === 0" class="empty-state">
          <text>没有找到相关会议</text>
          <text v-if="isNetworkError" class="network-tip">请检查网络连接</text>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { onPullDownRefresh } from '@dcloudio/uni-app';
import { useConferenceStore } from '@/stores/conference';
import ConferenceCard from '@/components/ConferenceCard.vue';

const store = useConferenceStore();

const searchQuery = ref('');
const searchInputRef = ref<any>(null);
const showPassed = ref(true);
const showLevelPicker = ref(false);
const showCategoryPicker = ref(false);
const levels = ['A', 'B', 'C', 'N'];
const categories = ['人工智能', '网络与信息安全', '计算机网络', '软件工程', '数据库', '计算机体系结构/并行与分布计算/存储系统', '计算机体系结构', '计算机系统', '人机交互', '计算机图形学与多媒体', '计算机理论', '交叉/综合/新兴'];

const selectedLevels = computed(() => store.selectedLevels);
const selectedCategories = computed(() => store.selectedCategories);
const upcomingConferences = computed(() => store.upcomingConferences);
const passedConferences = computed(() => store.passedConferences);
const tbdConferences = computed(() => store.tbdConferences);
const totalCount = computed(() => upcomingConferences.value.length + passedConferences.value.length + tbdConferences.value.length);
const isLoading = computed(() => store.isLoading);
const isNetworkError = computed(() => store.isNetworkError);

const levelDisplayText = computed(() => {
  if (selectedLevels.value.length === 0) return '全部';
  if (selectedLevels.value.length === 1) return selectedLevels.value[0];
  // 多选时以斜杠分隔显示（例如 A/B），避免说明性文字占用过多空间
  return selectedLevels.value.join('/');
});

const categoryDisplayText = computed(() => {
  if (selectedCategories.value.length === 0) return '全部';
  if (selectedCategories.value.length === 1) {
    const s = selectedCategories.value[0] as string;
    const maxLen = 5; // 单项显示限制字符数，可根据需要调整
    return s.length > maxLen ? s.slice(0, maxLen) + '...' : s;
  }
  return `已选${selectedCategories.value.length}项`;
});

const togglePassed = () => {
  showPassed.value = !showPassed.value;
};

onMounted(async () => {
  // 加载收藏列表
  store.loadFavorites();
  // 直接获取最新远程数据，失败时会自动加载缓存
  await store.fetchRemoteConferences();
});

onPullDownRefresh(() => {
  store.fetchRemoteConferences().then(() => {
    uni.stopPullDownRefresh();
  });
});

const onSearch = () => {
  store.setSearchQuery(searchQuery.value);
};

const clearSearch = () => {
  searchQuery.value = '';
  store.setSearchQuery('');
};

const toggleLevel = (level: string) => {
  store.toggleLevel(level);
};

const clearLevels = () => {
  store.setFilter([], store.selectedCategories);
};

const toggleCategory = (category: string) => {
  store.toggleCategory(category);
};

const clearCategories = () => {
  store.setFilter(store.selectedLevels, []);
};

const goToDetail = (id: string) => {
  uni.navigateTo({
    url: `/pages/detail/detail?id=${encodeURIComponent(id)}`
  });
};
</script>

<style lang="scss" scoped>
.container {
  padding: 0 16px 16px 16px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

  .top-controls {
    /* 保持在滚动区域顶部（H5 支持 position:sticky），App 端通常也可用 */
    position: -webkit-sticky;
    position: sticky;
    top: 0;
    z-index: 120;
    background-color: #f5f7fa;
    /* 在刘海屏上避免被遮挡 */
    padding-top: env(safe-area-inset-top, 0);
    /* 轻微阴影分隔内容 */
    box-shadow: 0 1px 0 rgba(0,0,0,0.04);
    // border-bottom: 2px solid rgba(0,0,0,0.04); /* 底部边框（已注释） */
    padding-bottom: 8px;

    .search-bar {
      margin: 0 0 8px 0;
      position: relative;
      
      .search-input {
        background-color: #fff;
        height: 40px;
        border-radius: 18px;
        padding: 0 44px 0 16px; // 右侧留出空间给清除按钮
        font-size: 14px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      
      .clear-icon {
        position: absolute;
        right: 12px;
        top: 10px; // (40px - 20px) / 2 = 10px，避免 transform 导致的亚像素渲染问题
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10;
        transition: background-color 0.2s;
        
        &:active {
          background-color: rgba(0, 0, 0, 0.25);
        }
        
        .clear-text {
          color: #fff;
          font-size: 10px;
          line-height: 1;
          font-weight: bold;
        }
      }
    }

    .filters {
      display: flex;
      gap: 12px;
      margin: 0 0 4px 0;
      
      .filter-picker {
        flex: 1;
        
        .picker-label {
          background-color: #fff;
          height: 36px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          /* 多文字时不要撑开控件，使用 ellipsis 隐藏溢出文本 */
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 14px;
          color: #555;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          
          .picker-label-text {
            display: inline-block;
            padding: 0 6px 0 6px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 120px; /* 保证在窄屏时不会撑开过滤按钮 */
          }

          .arrow {
            font-size: 10px;
            margin-left: 4px;
            color: #999;
          }
        }
      }
    }
  }

/* ConferenceCard.vue 的局部样式 */
:deep(.first-card) {
  margin-top: 10px;
}

.conference-list {
  .loading-state {
    text-align: center;
    color: #007aff;
    margin-top: 40px;
    font-size: 14px;
    padding: 20px;
  }
  
  .empty-state {
    text-align: center;
    color: #999;
    margin-top: 40px;
    font-size: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    
    .network-tip {
      font-size: 12px;
      color: #f57c00;
    }
  }
}

.passed-section {
  margin-top: 16px;
  
  .passed-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    padding: 12px 16px;
    border-radius: 12px;
    margin-bottom: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    
    .passed-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .passed-icon {
        font-size: 16px;
      }
      
      .passed-title {
        font-size: 14px;
        font-weight: 500;
        color: #666;
      }
      
      .passed-count {
        background-color: #adb5bd;
        color: #fff;
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 10px;
        font-weight: 500;
      }
    }
    
      .passed-arrow {
      font-size: 12px;
      color: #999;
      /* 移除旋转变换；仅保留颜色变化 */
      transition: none;
    }
  }
  
  .passed-list {
    /* 让外观变化保持最小：仅淡入（不移动） */
    animation: fadeIn 0.2s ease;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.category-modal {
  background-color: #fff;
  width: 80%;
  max-width: 400px;
  max-height: 70vh;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #eee;
    
    .modal-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    
    .clear-btn {
      font-size: 14px;
      color: #007aff;
    }
  }
  
  .category-list {
    flex: 1;
    overflow-y: auto;
  }
  
  .category-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px 14px 16px;
    // padding-right: 44px; /* 保留勾选图标空间，避免切换时布局抖动（已注释） */
    border-bottom: 1px solid #f5f5f5;
    
    &.selected {
      background-color: #e3f2fd;
    }
    
    .category-name {
      font-size: 13px;
      color: #333;
    }
    
    /* 去掉勾选图标的视觉（无勾选符号），选择状态仅用背景色变化 */
  }
  
  .modal-footer {
    padding: 12px 16px;
    border-top: 1px solid #eee;
    
    .confirm-btn {
      background-color: #007aff;
      color: #fff;
      border-radius: 8px;
      height: 40px;
      line-height: 40px;
      font-size: 15px;
      
      &:active {
        background-color: #0056b3;
      }
    }
  }
}
</style>

