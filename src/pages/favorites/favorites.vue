<template>
  <view class="container">
    <!-- 空状态 -->
    <view v-if="favoriteConferences.length === 0" class="empty-state">
      <text class="empty-icon">⭐</text>
      <text class="empty-text">还没有收藏的会议</text>
      <text class="empty-hint">在会议列表点击星标即可收藏</text>
    </view>
    
    <!-- 收藏列表 -->
    <view v-else class="favorites-list">
      <view class="list-header">
        <text class="count-text">共 {{ favoriteConferences.length }} 个收藏</text>
        <text class="clear-all" @click="confirmClearAll">清空收藏</text>
      </view>
      
      <conference-card 
        v-for="conf in favoriteConferences" 
        :key="conf.id" 
        :conference="conf"
        @click="goToDetail"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useConferenceStore } from '@/stores/conference';
import ConferenceCard from '@/components/ConferenceCard.vue';

const store = useConferenceStore();

const favoriteConferences = computed(() => store.favoriteConferences);

onMounted(() => {
  store.loadFavorites();
});

const goToDetail = (id: string) => {
  uni.navigateTo({
    url: `/pages/detail/detail?id=${id}`
  });
};

const confirmClearAll = () => {
  uni.showModal({
    title: '确认清空',
    content: '确定要清空所有收藏吗？',
    success: (res) => {
      if (res.confirm) {
        store.setFilter(store.selectedLevels, store.selectedCategories);
        store.favorites = [];
        store.saveFavorites();
        uni.showToast({ title: '已清空', icon: 'success', duration: 1000 });
      }
    }
  });
};
</script>

<style lang="scss" scoped>
.container {
  padding: 16px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 120px;
  
  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.3;
  }
  
  .empty-text {
    font-size: 16px;
    color: #666;
    margin-bottom: 8px;
  }
  
  .empty-hint {
    font-size: 13px;
    color: #999;
  }
}

.favorites-list {
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    margin-bottom: 8px;
    
    .count-text {
      font-size: 14px;
      color: #666;
    }
    
    .clear-all {
      font-size: 13px;
      color: #d32f2f;
    }
  }
}
</style>
