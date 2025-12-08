<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import logger from '@/utils/logger';
import { useConferenceStore } from '@/stores/conference';
onLaunch(() => {
  logger.debug("App Launch");
  // 首次启动时触发一次远端更新（如果网络正常）
  try {
    const store = useConferenceStore();
    store.fetchRemoteConferences();
  } catch (e) {
    logger.warn('App launch fetchRemoteConferences failed', e);
  }
});
onShow(() => {
  logger.debug("App Show");
});
onHide(() => {
  logger.debug("App Hide");
});
</script>
<style>
</style>
