import { defineStore } from 'pinia';
import dayjs from 'dayjs';
import logger from '@/utils/logger';
// build-time import of index (static)
import acceptRateIndexStatic from '@/static/accept_rates/index.json';
import yaml from 'js-yaml';

export interface Conference {
  id: string;
  title: string;
  fullTitle: string;
  ccfLevel: string;
  category: string;
  deadline: string;
  conferenceDate: string;
  location: string;
  website?: string;
  acceptanceRate?: string;
  abstractDeadline?: string;
  dblp?: string;
  sub?: string;
  year?: number;
}

// Accept rate JSON structure (loose typing to support variety of YAML-derived shapes)
export interface AcceptRateEntry {
  str?: string;
  rate?: number | string;
  year?: number;
  accept_rates?: AcceptRateEntry[];
  [k: string]: unknown;
}

export type AcceptRateIndex = Record<string, AcceptRateEntry | AcceptRateEntry[]>;

// Parsed YAML shapes for conference list
export interface RawTimelineItem { deadline?: string; abstract_deadline?: string; [k: string]: unknown }
export interface RawConf { id?: string; year?: number; timeline?: RawTimelineItem[]; timezone?: string; date?: string; place?: string; link?: string; [k: string]: unknown }
export interface RawParsedItem { title: string; description?: string; sub?: string; rank?: string | { ccf?: string }; dblp?: string; confs?: RawConf[]; [k: string]: unknown }

const CATEGORY_MAP: Record<string, string> = {
  // AI 相关
  'AI': '人工智能',
  // 安全相关
  'Sec': '网络与信息安全',
  'SC': '网络与信息安全',
  // 网络相关
  'CN': '计算机网络',
  'NW': '计算机网络',
  // 软件工程
  'SE': '软件工程',
  'PL': '软件工程',
  // 数据库
  'DB': '数据库',
  'DM': '数据库',
  // 系统
  'OS': '计算机系统',
  'DS': '计算机体系结构/并行与分布计算/存储系统',
  // 体系结构
  'Arch': '计算机体系结构',
  'AR': '计算机体系结构',
  // 人机交互
  'HCI': '人机交互',
  'HI': '人机交互',
  // 多媒体与图形学
  'Multimedia': '计算机图形学与多媒体',
  'CG': '计算机图形学与多媒体',
  'MX': '交叉/综合/新兴',
  // 理论
  'Theory': '计算机理论',
  'CT': '计算机理论',
  // Web
  'Web': '交叉/综合/新兴'
};

export const useConferenceStore = defineStore('conference', {
  state: () => ({
    conferences: [] as Conference[],
    searchQuery: '',
    selectedLevels: [] as string[],  // 改为数组支持多选
    selectedCategories: [] as string[],  // 改为数组支持多选
    isLoading: false,
    isNetworkError: false,
    lastUpdated: 0,
    favorites: [] as string[],  // 收藏的会议 ID 列表
    // accept rate index & session flags
    acceptRateIndex: null as AcceptRateIndex | null,
    acceptRatesLoadedThisSession: false as boolean,
    // concurrent fetch guard
    fetchConferencesPromise: null as Promise<void> | null,
    acceptRateIndexLoadPromise: null as Promise<void> | null
  }),
  getters: {
    // 内部辅助函数
    _categorizedConferences: (state) => {
      const now = dayjs();
      
      // Helper for CCF Level ranking
      const getLevelRank = (level: string) => {
        const map: Record<string, number> = { 'A': 1, 'B': 2, 'C': 3 };
        return map[level] || 4;
      };

      // Filter conferences
      const filtered = state.conferences.filter((conf) => {
        const matchesSearch = conf.title.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
                              conf.fullTitle.toLowerCase().includes(state.searchQuery.toLowerCase());
        const matchesLevel = state.selectedLevels.length === 0 || state.selectedLevels.includes(conf.ccfLevel);
        const matchesCategory = state.selectedCategories.length === 0 || state.selectedCategories.includes(conf.category);
        return matchesSearch && matchesLevel && matchesCategory;
      });

      // Partition into upcoming, passed, and TBD
      const upcoming: typeof filtered = [];
      const passed: typeof filtered = [];
      const tbd: typeof filtered = [];

      filtered.forEach(conf => {
        if (conf.deadline === 'TBD') {
          tbd.push(conf);
        } else if (dayjs(conf.deadline).isAfter(now)) {
          upcoming.push(conf);
        } else {
          passed.push(conf);
        }
      });

      // Sort upcoming: ascending (soonest first), then by CCF Level
      upcoming.sort((a, b) => {
        const diff = dayjs(a.deadline).valueOf() - dayjs(b.deadline).valueOf();
        if (diff !== 0) return diff;
        return getLevelRank(a.ccfLevel) - getLevelRank(b.ccfLevel);
      });
      
      // Sort passed: descending (most recently passed first), then by CCF Level
      passed.sort((a, b) => {
        const diff = dayjs(b.deadline).valueOf() - dayjs(a.deadline).valueOf();
        if (diff !== 0) return diff;
        return getLevelRank(a.ccfLevel) - getLevelRank(b.ccfLevel);
      });
      
      // Sort TBD: by CCF Level
      tbd.sort((a, b) => getLevelRank(a.ccfLevel) - getLevelRank(b.ccfLevel));

      return { upcoming, passed, tbd };
    },
    
    // 未过期的会议
    upcomingConferences(): Conference[] {
      return this._categorizedConferences.upcoming;
    },
    
    // 已过期的会议
    passedConferences(): Conference[] {
      return this._categorizedConferences.passed;
    },
    
    // TBD 的会议
    tbdConferences(): Conference[] {
      return this._categorizedConferences.tbd;
    },
    
    // 所有过滤后的会议（保持兼容）
    filteredConferences(): Conference[] {
      const { upcoming, passed, tbd } = this._categorizedConferences;
      return [...upcoming, ...passed, ...tbd];
    },
    
    getConferenceById: (state) => (id: string) => {
      return state.conferences.find((conf) => conf.id === id);
    },
    
    // 收藏的会议列表
    favoriteConferences(): Conference[] {
      return this.conferences.filter(conf => this.favorites.includes(conf.id));
    },
    
    // 判断是否已收藏
    isFavorite: (state) => (id: string) => {
      return state.favorites.includes(id);
    }
  },
  actions: {
    // 从缓存加载数据（仅在网络失败时调用）
    loadFromCache() {
      try {
        const cachedData = uni.getStorageSync('conferences_cache');
        const cachedTime = uni.getStorageSync('conferences_cache_time');
        
          if (cachedData && cachedData.length > 0) {
            this.conferences = cachedData;
            this.lastUpdated = cachedTime || 0;
            logger.debug('从本地缓存加载数据，共', cachedData.length, '条');
          return true;
        }
      } catch (e) {
        logger.warn('读取缓存失败:', e);
      }
      return false;
    },
    
    // 保存数据到本地缓存
    // 返回 boolean 表示是否成功写入（用于上层判断）
    saveToCache(data: Conference[]): boolean {
      try {
        // 不接受空数组写入：避免把主缓存覆盖为空数据
        if (!Array.isArray(data) || data.length === 0) {
          logger.debug('saveToCache: 无有效数据，保持旧缓存');
          return false;
        }
        // Write new cache to temp keys first to reduce downtime
        try {
          uni.setStorageSync('conferences_cache_tmp', data);
          uni.setStorageSync('conferences_cache_time_tmp', Date.now());
        } catch (e) {
          logger.warn('写入临时缓存失败，尝试直接写入主缓存', e);
        }
        // Promote temp to main cache
        try {
          const tmp = uni.getStorageSync('conferences_cache_tmp');
          const tmpTime = uni.getStorageSync('conferences_cache_time_tmp');
          // 仅在 tmp 是非空数组时提升 tmp
          const tmpIsValid = tmp && Array.isArray(tmp) && tmp.length > 0;
          if (tmpIsValid) {
            uni.setStorageSync('conferences_cache', tmp);
            uni.setStorageSync('conferences_cache_time', tmpTime || Date.now());
            logger.debug('已写入新缓存（主键）');
          } else {
            // fallback: write main directly
            uni.setStorageSync('conferences_cache', data);
            uni.setStorageSync('conferences_cache_time', Date.now());
            logger.debug('已写入新缓存（直接写入）');
          }
        } catch (e) {
          logger.warn('提升临时缓存到主缓存失败，尝试直接写入', e);
          uni.setStorageSync('conferences_cache', data);
          uni.setStorageSync('conferences_cache_time', Date.now());
        }
        // Clean up temp and any old keys, then log deletion
        let cleaned = false;
        try {
          const tmpExists = uni.getStorageSync('conferences_cache_tmp');
          if (tmpExists) {
            uni.removeStorageSync('conferences_cache_tmp');
            cleaned = true;
          }
        } catch { /* ignore */ }
        try {
          const tmpTimeExists = uni.getStorageSync('conferences_cache_time_tmp');
          if (tmpTimeExists) {
            uni.removeStorageSync('conferences_cache_time_tmp');
            cleaned = true;
          }
        } catch { /* ignore */ }
        if (cleaned) logger.debug('已删除所有旧缓存');
        logger.debug('数据已缓存到本地，共', data.length, '条');
        return true;
      } catch (e) {
        logger.warn('保存缓存失败:', e);
        return false;
      }
    },
    async loadLocalAcceptRates(force = false) {
      if (this.acceptRatesLoadedThisSession && !force) return;
      if (this.acceptRateIndexLoadPromise) return await this.acceptRateIndexLoadPromise;
      this.acceptRateIndexLoadPromise = (async () => {
        try {
          // Try to load the index JSON
          // Use the build-time static index instead of runtime fetching
          this.acceptRateIndex = acceptRateIndexStatic as AcceptRateIndex;

          const basePaths = ['/static/accept_rates', './static/accept_rates', '/accept_rates', './accept_rates'];
          const updateAcceptanceRate = async (conf: Conference) => {
            if (!conf.sub || !conf.dblp) return;
            if (this.acceptRateIndex) {
              const key = `${conf.sub}/${conf.dblp}`;
              // try multiple key forms
              const candidates = [key, key.toLowerCase(), `${conf.sub}/${conf.dblp.replace(/\./g, '')}`, `${conf.sub}/${conf.dblp.replace(/\./g, '-').toLowerCase()}`];
              let idxData: AcceptRateEntry | AcceptRateEntry[] | null = null;
              for (const c of candidates) {
                if (this.acceptRateIndex[c]) { idxData = this.acceptRateIndex[c]; break; }
              }
              if (idxData) {
                // normalize `idxData` to a single AcceptRateEntry for easier property access
                let data: AcceptRateEntry;
                if (Array.isArray(idxData) && idxData.length > 0) data = idxData[0] as AcceptRateEntry;
                else data = idxData as AcceptRateEntry;
                if (Array.isArray(data.accept_rates) && data.accept_rates.length > 0) {
                    const latest = data.accept_rates.reduce((acc: AcceptRateEntry | null, cur: AcceptRateEntry) => {
                    if (!acc || !acc.year || (cur && cur.year && cur.year > acc.year)) return cur;
                    return acc;
                  }, null as AcceptRateEntry | null);
                  if (latest && latest.str) { conf.acceptanceRate = String(latest.str); logger.debug('Loaded acceptanceRate (index) for', conf.id, conf.sub, conf.dblp, conf.acceptanceRate); return; }
                    if (latest && latest.rate !== undefined && latest.rate !== null) {
                    const v = String(latest.rate).replace(',', '.');
                    const n = Number(v);
                    if (!Number.isNaN(n)) { conf.acceptanceRate = (n * 100).toFixed(1) + '%'; return; }
                  }
                }
                if (typeof data === 'object' && data !== null && 'str' in data && (data as AcceptRateEntry).str) { conf.acceptanceRate = String((data as AcceptRateEntry).str); logger.debug('Loaded acceptanceRate (index top-level) for', conf.id, conf.sub, conf.dblp, conf.acceptanceRate); return; }
                if (typeof data === 'object' && data !== null && 'rate' in data && (data as AcceptRateEntry).rate !== undefined && (data as AcceptRateEntry).rate !== null) { const v = String((data as AcceptRateEntry).rate).replace(',', '.'); const n = Number(v); if (!Number.isNaN(n)) { conf.acceptanceRate = (n * 100).toFixed(1) + '%'; logger.debug('Loaded acceptanceRate (index top-level numeric) for', conf.id, conf.sub, conf.dblp, conf.acceptanceRate); return; } }
              }
            }

            for (const base of basePaths) {
              try {
                const url = `${base}/${conf.sub}/${conf.dblp}.json`;
                const resp = await new Promise((resolve, reject) => {
                  uni.request({ url, method: 'GET', timeout: 5000, success: resolve, fail: reject });
                }) as unknown as UniApp.RequestSuccessCallbackResult;
                if (resp && resp.statusCode === 200 && resp.data) {
                  const rawData = resp.data as unknown;
                  let data: AcceptRateEntry | AcceptRateEntry[] | string | null = null;
                  if (Array.isArray(rawData)) data = rawData as AcceptRateEntry[];
                  else if (typeof rawData === 'object' && rawData !== null) data = rawData as AcceptRateEntry;
                  else data = String(rawData || '');
                  let rateStr: string | undefined;
                  let arr: AcceptRateEntry[] | null = null;
                  if (Array.isArray(data)) {
                    if (data.length > 0 && data[0] && Array.isArray((data[0] as AcceptRateEntry).accept_rates)) {
                      arr = (data[0] as AcceptRateEntry).accept_rates as AcceptRateEntry[];
                    } else {
                      arr = data as AcceptRateEntry[];
                    }
                  } else if (typeof data === 'object' && data !== null && Array.isArray((data as AcceptRateEntry).accept_rates)) {
                    arr = (data as AcceptRateEntry).accept_rates as AcceptRateEntry[];
                  }
                  if (arr && arr.length > 0) {
                    const valid = arr.reduce((acc: AcceptRateEntry | null, cur: AcceptRateEntry) => {
                      if (!acc || !acc.year || (cur && cur.year && cur.year > acc.year)) return cur;
                      return acc;
                    }, null as AcceptRateEntry | null);
                    if (valid) {
                      const parseNumber = (v: unknown): number => {
                        if (v === undefined || v === null) return NaN;
                        if (typeof v === 'number') return v as number;
                        if (typeof v === 'string') {
                          const s = v.trim().replace(/,/g, '.').match(/[0-9]*\.?[0-9]+/);
                          if (s) return Number(s[0]);
                        }
                        return NaN;
                      };
                      if (valid.str) {
                        rateStr = String(valid.str);
                      } else {
                        const tryRate = parseNumber(valid.rate);
                        if (!isNaN(tryRate)) { rateStr = (tryRate * 100).toFixed(1) + '%'; }
                      }
                    }
                  }
                  if (!rateStr) {
                    const parseNumber = (v: unknown): number => {
                      if (v === undefined || v === null) return NaN;
                      if (typeof v === 'number') return v as number;
                      if (typeof v === 'string') {
                        const s = v.trim().replace(/,/g, '.').match(/[0-9]*\.?[0-9]+/);
                        if (s) return Number(s[0]);
                      }
                      return NaN;
                    };
                      if (typeof data === 'object' && data !== null && (data as AcceptRateEntry).str) { rateStr = String((data as AcceptRateEntry).str); }
                      else { const tryRate2 = parseNumber((typeof data === 'object' && data !== null) ? (data as AcceptRateEntry).rate : (typeof data === 'string' ? data : undefined)); if (!isNaN(tryRate2)) rateStr = (tryRate2 * 100).toFixed(1) + '%'; }
                  }
                  if (rateStr) { conf.acceptanceRate = rateStr; logger.debug('Loaded acceptanceRate (file) for', conf.id, conf.sub, conf.dblp, conf.acceptanceRate); return; }
                }
                } catch {
                  // try next base
                }
            }
          };

          const jobs: Promise<void>[] = [];
          for (const conf of this.conferences) jobs.push(updateAcceptanceRate(conf));
          await Promise.allSettled(jobs);
          this.acceptRatesLoadedThisSession = true;
        } catch (e) {
          logger.warn('load local acceptance rates failed', e);
        } finally {
          this.acceptRateIndexLoadPromise = null;
        }
      })();
      return await this.acceptRateIndexLoadPromise;
    },
    async fetchRemoteConferences() {
      // Prevent concurrent fetches — reuse the same promise if already fetching
      if (this.fetchConferencesPromise) {
        return await this.fetchConferencesPromise;
      }
      this.fetchConferencesPromise = (async () => {
        this.isLoading = true;
      
      // 检测网络状态
      let isOnline = true;
      
      // #ifdef APP-PLUS
      // App 端使用 uni.getNetworkType，更可靠
      try {
        const networkInfo = await new Promise<UniApp.GetNetworkTypeSuccess>((resolve, reject) => {
          uni.getNetworkType({
            success: resolve,
            fail: reject
          });
        });
        isOnline = networkInfo.networkType !== 'none';
        logger.debug('网络检测 (App):', networkInfo.networkType, '在线:', isOnline);
      } catch (e) {
        logger.warn('获取网络状态失败:', e);
      }
      // #endif
      
      // #ifdef H5
      // H5 端通过实际请求检测
      try {
        const testUrl = 'https://www.baidu.com/favicon.ico?_=' + Date.now();
        if (typeof fetch !== 'undefined') {
          await Promise.race([
            fetch(testUrl, { method: 'HEAD', cache: 'no-store', mode: 'no-cors' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
          ]);
          logger.debug('网络检测 (H5): 在线');
        }
      } catch (e) {
        isOnline = false;
        logger.debug('网络检测 (H5): 离线', e);
      }
      // #endif
      
      try {
        // Only use the official ccfddl.com source
        const urls = [
          'https://ccfddl.com/conference/allconf.yml'
        ];
        
        let response = '';
        let fetchSuccess = false;

        for (const url of urls) {
          try {
            logger.debug(`Trying to fetch from: ${url}`);
            response = await new Promise<string>((resolve, reject) => {
              uni.request({
                url: url,
                method: 'GET',
                timeout: 8000, // Increased timeout
                success: (res) => {
                  if (res.statusCode === 200) {
                    resolve(res.data as string);
                  } else {
                    // Some proxies return 404 if file not found or repo private (unlikely here)
                    reject(new Error(`Request failed with status ${res.statusCode}`));
                  }
                },
                fail: (err) => reject(err)
              });
            });
            
            // Basic validation to ensure we got YAML and not an HTML error page
            if (response && (response.startsWith('-') || response.includes('title:'))) {
                fetchSuccess = true;
                logger.debug(`Successfully fetched from: ${url}`);
                break; // Stop if successful
            } else {
                logger.warn(`Invalid response format from ${url}`);
            }
          } catch (e) {
            logger.warn(`Failed to fetch from ${url}`, e);
            // Continue to next mirror
          }
        }

        if (!fetchSuccess) {
          throw new Error('All mirrors failed');
        }

        const parsedData = yaml.load(response) as RawParsedItem[];
        const newConferences: Conference[] = [];
        const now = dayjs();
        const currentYear = now.year();

        parsedData.forEach((item: RawParsedItem) => {
          if (!item.confs || !Array.isArray(item.confs)) return;

          // 查找所有符合条件的会议实例（当前年份及之后）
          const relevantConfs = (item.confs || []).filter((c: RawConf) => (c.year ?? 0) >= currentYear);
          
          for (const conf of relevantConfs) {
            if (!conf.timeline || conf.timeline.length === 0) continue;

            // 找到最近的未过期截止日期，或者 TBD
            let bestDeadline: RawTimelineItem | null = null;
            let bestDeadlineDate: dayjs.Dayjs | null = null;
            let isTBD = false;
            let abstractDeadlineItem: RawTimelineItem | null = null;

            for (const tl of conf.timeline) {
              // 检查是否是 TBD
              if (!tl.deadline || tl.deadline === 'TBD' || tl.deadline.includes('TBD')) {
                // 如果还没有找到有效截止日期，记录 TBD
                if (!bestDeadline) {
                  bestDeadline = tl;
                  isTBD = true;
                }
                continue;
              }
              
              const dlDate = dayjs(tl.deadline);
              if (!dlDate.isValid()) continue;
              
              // 只要截止日期在今天之后或30天之内过期的都显示
              if (dlDate.isAfter(now.subtract(30, 'day'))) {
                if (!bestDeadlineDate || dlDate.isBefore(bestDeadlineDate)) {
                  bestDeadline = tl;
                  bestDeadlineDate = dlDate;
                  isTBD = false;
                }
              }
              // 抽象截止处理（寻找 abstract_deadline 字段）
              if (!abstractDeadlineItem && tl.abstract_deadline) {
                const adt = dayjs(tl.abstract_deadline);
                if (adt.isValid()) {
                  abstractDeadlineItem = tl;
                }
              }
            }

            // 如果没有找到任何截止日期信息，跳过
            if (!bestDeadline) continue;

            // 处理 sub 类别
            let category = item.sub || '未知';
            if (typeof category === 'object') {
              category = '未知';
            }
            const categoryName = CATEGORY_MAP[category] || category;

            // 处理 rank
            let rank = 'N';
            if (typeof item.rank === 'object' && item.rank.ccf) {
              rank = item.rank.ccf;
            } else if (typeof item.rank === 'string') {
              rank = item.rank.replace(/CCF-/, '');
            }

            // 处理时区，转换为本地时间（仅对有效日期）
            let deadlineStr = 'TBD';
            if (!isTBD && bestDeadlineDate) {
              deadlineStr = bestDeadline.deadline ?? deadlineStr;
              const timezone = conf.timezone || 'UTC-12';
              
              // 简单处理时区偏移
              if (timezone === 'AoE' || timezone === 'UTC-12') {
                // AoE (Anywhere on Earth) = UTC-12，加12小时转换为UTC，再加8小时转换为北京时间
                const dlDate = dayjs(deadlineStr).add(20, 'hour');
                deadlineStr = dlDate.format('YYYY-MM-DD HH:mm:ss');
              } else if (timezone.startsWith('UTC')) {
                const offset = parseInt(timezone.replace('UTC', '').replace('+', '') || '0');
                const dlDate = dayjs(deadlineStr).subtract(offset, 'hour').add(8, 'hour');
                deadlineStr = dlDate.format('YYYY-MM-DD HH:mm:ss');
              }
            }

            // 处理 abstract_deadline
            let abstractDeadlineStr = '暂无';
            if (abstractDeadlineItem && abstractDeadlineItem.abstract_deadline) {
              abstractDeadlineStr = abstractDeadlineItem.abstract_deadline;
              const timezone = conf.timezone || 'UTC-12';
              if (timezone === 'AoE' || timezone === 'UTC-12') {
                const adDate = dayjs(abstractDeadlineStr).add(20, 'hour');
                abstractDeadlineStr = adDate.format('YYYY-MM-DD HH:mm:ss');
              } else if (timezone.startsWith('UTC')) {
                const offset = parseInt(timezone.replace('UTC', '').replace('+', '') || '0');
                const adDate = dayjs(abstractDeadlineStr).subtract(offset, 'hour').add(8, 'hour');
                abstractDeadlineStr = adDate.format('YYYY-MM-DD HH:mm:ss');
              }
            }

            const confId = conf.id || `${item.title.toLowerCase().replace(/\s+/g, '')}${conf.year}`;
            
            // 检查是否已存在相同 ID 的会议
            const existingIndex = newConferences.findIndex(c => c.id === confId);
            if (existingIndex >= 0) {
              const existingConf = newConferences[existingIndex]!;
              // 如果已存在，有效日期优先于 TBD
              const existingIsTBD = existingConf.deadline === 'TBD';
              if (existingIsTBD && !isTBD) {
                // 用有效日期替换 TBD
                existingConf.deadline = deadlineStr;
              } else if (!existingIsTBD && !isTBD && bestDeadlineDate) {
                // 两个都是有效日期，保留更近的
                const existingDeadline = dayjs(existingConf.deadline);
                if (bestDeadlineDate.isBefore(existingDeadline)) {
                  existingConf.deadline = deadlineStr;
                }
              }
              continue;
            }

            newConferences.push({
              id: confId,
              title: `${item.title}-${conf.year}`,
              fullTitle: item.description || item.title,
              ccfLevel: rank,
              category: categoryName,
              deadline: deadlineStr,
              year: conf.year,
              conferenceDate: conf.date || 'TBD',
              location: conf.place || 'TBD',
              website: conf.link,
              acceptanceRate: '暂无',
              abstractDeadline: abstractDeadlineStr,
              dblp: item.dblp,
              sub: item.sub
            });
          }
        });


        if (newConferences.length > 0) {
          this.conferences = newConferences;
          // Attempt to load bundled index JSON at `/static/accept_rates/index.json` first (works in H5 and App bundles)
          // do not auto-load accept_rates index at global fetch stage; index is static and detail page will use it for rendering
          try {
            const basePaths = ['/static/accept_rates', './static/accept_rates', '/accept_rates', './accept_rates'];
            const updateAcceptanceRate = async (conf: Conference) => {
              if (!conf.sub || !conf.dblp) return;
              // check index first
              if (this.acceptRateIndex) {
                const key = `${conf.sub}/${conf.dblp}`;
                const idxData = this.acceptRateIndex[key];
                if (idxData) {
                  // idxData may be an array or an object; normalize to `AcceptRateEntry`
                  let data: AcceptRateEntry;
                  if (Array.isArray(idxData) && idxData.length > 0) data = idxData[0] as AcceptRateEntry;
                  else data = idxData as AcceptRateEntry;
                  // try accept_rates array inside
                  if (Array.isArray(data.accept_rates) && data.accept_rates.length > 0) {
                    const latest = data.accept_rates.reduce((acc: AcceptRateEntry | null, cur: AcceptRateEntry) => {
                      if (!acc || !acc.year || (cur && cur.year && cur.year > acc.year)) return cur;
                      return acc;
                    }, null as AcceptRateEntry | null);
                    if (latest && latest.str) {
                      conf.acceptanceRate = String(latest.str);
                      return;
                    }
                    if (latest && latest.rate !== undefined && latest.rate !== null) {
                      const v = String(latest.rate).replace(',', '.');
                      const n = Number(v);
                      if (!Number.isNaN(n)) {
                        conf.acceptanceRate = (n * 100).toFixed(1) + '%';
                        return;
                      }
                    }
                  }
                  // top-level fallback
                  if (data.str) { conf.acceptanceRate = String(data.str); return; }
                  if (data.rate !== undefined && data.rate !== null) { const v = String(data.rate).replace(',', '.'); const n = Number(v); if (!Number.isNaN(n)) { conf.acceptanceRate = (n * 100).toFixed(1) + '%'; return; } }
                }
              }
              for (const base of basePaths) {
                try {
                  const url = `${base}/${conf.sub}/${conf.dblp}.json`;
                  const resp = await new Promise((resolve, reject) => {
                    uni.request({ url, method: 'GET', timeout: 5000, success: resolve, fail: reject });
                  }) as unknown as UniApp.RequestSuccessCallbackResult;
                  if (resp && resp.statusCode === 200 && resp.data) {
                    const rawData = resp.data as unknown;
                    let data: AcceptRateEntry | AcceptRateEntry[] | string | null = null;
                    if (Array.isArray(rawData)) data = rawData as AcceptRateEntry[];
                    else if (typeof rawData === 'object' && rawData !== null) data = rawData as AcceptRateEntry;
                    else data = String(rawData || '');
                      // Prefer `accept_rates` array – support multiple JSON layouts
                      let rateStr: string | undefined;
                      // Determine array of rate entries
                      let arr: AcceptRateEntry[] | null = null;
                      if (Array.isArray(data)) {
                        // Some YAMLs are parsed to an array that contains an object whose `accept_rates` is an array
                        if (data.length > 0 && data[0] && Array.isArray((data[0] as AcceptRateEntry).accept_rates)) {
                          arr = (data[0] as AcceptRateEntry).accept_rates as AcceptRateEntry[];
                        } else {
                          arr = data as AcceptRateEntry[];
                        }
                      } else if (typeof data === 'object' && data !== null && Array.isArray((data as AcceptRateEntry).accept_rates)) {
                        arr = (data as AcceptRateEntry).accept_rates as AcceptRateEntry[];
                      }
                      if (arr && arr.length > 0) {
                        const valid = arr.reduce((acc: AcceptRateEntry | null, cur: AcceptRateEntry) => {
                          if (!acc || !acc.year || (cur && cur.year && cur.year > acc.year)) return cur;
                          return acc;
                        }, null as AcceptRateEntry | null);
                      if (valid) {
                          // support string rates with comma decimal, numeric value or a `str` display
                          const parseNumber = (v: unknown): number => {
                            if (v === undefined || v === null) return NaN;
                            if (typeof v === 'number') return v as number;
                            if (typeof v === 'string') {
                              // normalize comma decimal
                              const s = v.trim().replace(/,/g, '.').match(/[0-9]*\.?[0-9]+/);
                              if (s) return Number(s[0]);
                            }
                            return NaN;
                          };
                          // Prefer full `str` value (e.g. "22.1%(2878/13008 25')") if present
                          if (valid.str) {
                            rateStr = String(valid.str);
                          } else {
                            const tryRate = parseNumber(valid.rate);
                            if (!isNaN(tryRate)) {
                              rateStr = (tryRate * 100).toFixed(1) + '%';
                            }
                          }
                      }
                    }
                    if (!rateStr) {
                      // support rate as string/number
                      const parseNumber = (v: unknown): number => {
                        if (v === undefined || v === null) return NaN;
                        if (typeof v === 'number') return v as number;
                        if (typeof v === 'string') {
                          const s = v.trim().replace(/,/g, '.').match(/[0-9]*\.?[0-9]+/);
                          if (s) return Number(s[0]);
                        }
                        return NaN;
                      };
                      // Prefer `str` string first, then numeric `rate` (with comma support)
                      if (typeof data === 'object' && data !== null && (data as AcceptRateEntry).str) {
                        rateStr = String((data as AcceptRateEntry).str);
                      } else {
                        const tryRate2 = parseNumber((typeof data === 'object' && data !== null) ? (data as AcceptRateEntry).rate : (typeof data === 'string' ? data : undefined));
                        if (!isNaN(tryRate2)) {
                          rateStr = (tryRate2 * 100).toFixed(1) + '%';
                        }
                      }
                    }
                    if (rateStr) {
                      conf.acceptanceRate = rateStr;
                      logger.debug('Loaded acceptanceRate for', conf.id, conf.sub, conf.dblp, rateStr);
                      return;
                    }
                  }
                } catch {
                // try next base
              }
              }
            };
            const jobs: Promise<void>[] = [];
            for (const conf of newConferences) jobs.push(updateAcceptanceRate(conf));
            // Wait for all updates to finish
            await Promise.allSettled(jobs);
          } catch (e) {
            logger.warn('load local acceptance rates failed', e);
          }
          this.lastUpdated = Date.now();
          this.isNetworkError = false;
          // 保存到本地缓存（仅当非空数组且写入成功时覆盖）
          const saved = this.saveToCache(newConferences);
          if (!saved) {
            logger.warn('未写入本地缓存：数据为空或写入失败，保留旧缓存');
          }

          // 根据网络状态显示不同提示
          if (isOnline) {
            uni.showToast({ title: '数据已实时更新', icon: 'success', duration: 1000 });
          } else {
            // 离线但请求成功，说明使用了 HTTP 缓存
            uni.showToast({ title: '已使用HTTP缓存数据', icon: 'none', duration: 1000 });
          }
        }

      } catch (error) {
        logger.error('Failed to fetch remote conferences:', error);
        this.isNetworkError = true;
        // 网络失败时尝试从缓存加载
        const loadedFromCache = this.loadFromCache();
        if (loadedFromCache) {
          const cacheTime = dayjs(this.lastUpdated).format('YYYY年M月D日');
          uni.showToast({ title: `已使用${cacheTime}的本地缓存`, icon: 'none', duration: 1000 });
        } else {
          uni.showToast({ title: '更新失败，请检查网络', icon: 'none', duration: 1000 });
        }
      } finally {
        this.isLoading = false;
        // release fetch guard
        this.fetchConferencesPromise = null;
      }
      return;
      })();
      return await this.fetchConferencesPromise;
    },
    setSearchQuery(query: string) {
      this.searchQuery = query;
    },
    setFilter(levels: string[], categories: string[]) {
      this.selectedLevels = levels;
      this.selectedCategories = categories;
    },
    toggleLevel(level: string) {
      const index = this.selectedLevels.indexOf(level);
      if (index > -1) {
        this.selectedLevels.splice(index, 1);
      } else {
        this.selectedLevels.push(level);
      }
    },
    toggleCategory(category: string) {
      const index = this.selectedCategories.indexOf(category);
      if (index > -1) {
        this.selectedCategories.splice(index, 1);
      } else {
        this.selectedCategories.push(category);
      }
    },
    
    // 切换收藏状态
    toggleFavorite(id: string) {
      const index = this.favorites.indexOf(id);
      if (index > -1) {
        this.favorites.splice(index, 1);
        uni.showToast({ title: '已取消收藏', icon: 'none', duration: 1000 });
      } else {
        this.favorites.push(id);
        uni.showToast({ title: '已收藏', icon: 'success', duration: 1000 });
      }
      // 保存收藏到本地存储
      this.saveFavorites();
    },
    
    // 保存收藏列表
    saveFavorites() {
      try {
        uni.setStorageSync('favorites', this.favorites);
      } catch (e) {
        logger.warn('保存收藏失败:', e);
      }
    },
    
    // 加载收藏列表
    loadFavorites() {
      try {
        const favorites = uni.getStorageSync('favorites');
        if (favorites && Array.isArray(favorites)) {
          this.favorites = favorites;
        }
      } catch (e) {
        logger.warn('加载收藏失败:', e);
      }
    }
  },
});
