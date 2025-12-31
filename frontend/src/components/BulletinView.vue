<template>
  <div class="flex flex-col h-full animate-fade-in relative bg-gray-50">
    
    <!-- VIEW: CREATE PAGE -->
    <div v-if="isCreating" class="flex flex-col h-full bg-white">
        <!-- Header -->
        <div class="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <button @click="isCreating = false" class="text-gray-500 hover:text-gray-700">
                取消
            </button>
            <h2 class="text-lg font-bold text-gray-800">發佈新公告</h2>
            <div class="w-8"></div> <!-- Spacer -->
        </div>

        <!-- Form Content -->
        <div class="flex-1 overflow-y-auto p-5 space-y-6">
             <div class="space-y-1">
                <label class="block text-sm font-bold text-gray-700">標題</label>
                <input v-model="form.title" class="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="請輸入標題" />
             </div>
             
             <div class="space-y-1">
                <label class="block text-sm font-bold text-gray-700">內容</label>
                <textarea v-model="form.content" class="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 h-32 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all leading-relaxed" placeholder="請輸入公告完整內容..."></textarea>
             </div>
             
             <div class="grid grid-cols-2 gap-4">
                 <div class="space-y-1">
                     <label class="block text-sm font-bold text-gray-700">分類</label>
                     <div class="relative">
                        <select v-model="form.category" class="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 appearance-none">
                             <option value="系統">系統</option>
                             <option value="行政">行政</option>
                             <option value="活動">活動</option>
                             <option value="督導">督導</option>
                             <option value="其他">其他</option>
                        </select>
                        <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                     </div>
                 </div>
                 <div class="space-y-1">
                     <label class="block text-sm font-bold text-gray-700">優先級</label>
                     <div class="relative">
                        <select v-model="form.priority" class="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 appearance-none">
                             <option value="Normal">一般</option>
                             <option value="High">重要</option>
                        </select>
                         <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                     </div>
                 </div>
             </div>

             <div class="grid grid-cols-2 gap-4">
                 <div class="space-y-1">
                    <label class="block text-sm font-bold text-gray-700">發佈對象</label>
                    <div class="relative">
                        <select v-model="form.targetUnit" class="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 appearance-none">
                             <option value="All">所有機構</option>
                             <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
                        </select>
                        <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                 </div>
                 <div class="space-y-1">
                    <label class="block text-sm font-bold text-gray-700">狀態</label>
                     <div class="relative">
                        <select v-model="form.status" class="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 appearance-none">
                             <option :value="BULLETIN_STATUS.PUBLISHED">立即發佈</option>
                             <option :value="BULLETIN_STATUS.SCHEDULED">排程發佈</option>
                        </select>
                         <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                 </div>
             </div>

             <div v-if="form.status === BULLETIN_STATUS.SCHEDULED" class="mt-2 animate-fade-in">
                 <label class="block text-sm font-bold text-gray-700 mb-1">設定發佈時間</label>
                 <input type="datetime-local" v-model="form.scheduledTime" class="w-full rounded-xl border border-gray-200 bg-gray-50 p-3" />
             </div>

             <!-- Push Notification Checkbox -->
             <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start space-x-3">
                 <div class="flex items-center h-5">
                    <input type="checkbox" id="notify" v-model="form.notify" class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300" />
                 </div>
                 <div class="flex flex-col">
                    <label for="notify" class="text-sm font-bold text-indigo-900">
                        發送 LINE 推播通知
                    </label>
                    <span class="text-xs text-indigo-600 mt-1">
                        勾選後將會消耗 LINE 官方帳號的訊息額度。<br>建議僅在「重要/緊急」公告時使用。
                    </span>
                 </div>
             </div>
        </div>

        <!-- Sticky Footer Action -->
        <div class="p-4 border-t border-gray-100 bg-white pb-6">
            <button 
              @click="submitBulletin" 
              :disabled="submitting"
              class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 active:scale-95 transition-all flex justify-center items-center text-lg"
            >
               <svg v-if="!submitting" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
               <span v-if="submitting">處理中...</span>
               <span v-else>確認發佈</span>
            </button>
        </div>
    </div>

    <!-- VIEW: LIST -->
    <div v-else class="flex flex-col h-full overflow-hidden">
        <!-- Header -->
        <div class="mb-4 flex items-center justify-between flex-shrink-0">
            <button
              @click="$emit('back')"
              class="text-gray-400 hover:text-gray-600 p-2"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h2 class="text-xl font-bold text-gray-800">佈告欄</h2>
            <div class="w-10"></div> <!-- Spacer -->
        </div>

        <!-- Toolbar (Filter & Create) -->
        <div class="flex items-center justify-between mb-4 px-2 gap-4 flex-shrink-0">
           <div class="flex space-x-2 overflow-x-auto no-scrollbar">
               <button 
                 v-for="cat in categories" 
                 :key="cat.id"
                 @click="activeCategory = cat.id"
                 class="px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors"
                 :class="activeCategory === cat.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
               >
                 {{ cat.label }}
               </button>
           </div>
           
           <div class="flex space-x-2">
                <button 
                    v-if="canCreate"
                    @click="toggleManagementView"
                    class="bg-gray-100 text-gray-600 p-2 rounded-full shadow hover:bg-gray-200 transition-colors"
                    :class="{ 'bg-indigo-100 text-indigo-600': isManagementView }"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                </button>
                <button 
                v-if="canCreate"
                @click="isCreating = true"
                class="bg-lime-400 text-white p-2 rounded-full shadow-lg hover:bg-lime-500 transition-colors transform active:scale-95"
                >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                </button>
           </div>
        </div>

        <!-- Bulletin List -->
        <div class="flex-1 overflow-y-auto space-y-4 px-2 pb-20">
            <div v-if="loading" class="space-y-4">
                <div v-for="i in 3" :key="i" class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                   <div class="flex space-x-2 mb-2">
                      <Skeleton width="40px" height="1.25rem" />
                      <Skeleton width="40px" height="1.25rem" />
                      <div class="flex-1"></div>
                      <Skeleton width="60px" height="0.75rem" />
                   </div>
                   <Skeleton width="80%" height="1.5rem" />
                </div>
            </div>
            <div v-else-if="filteredBulletins.length === 0" class="text-center py-8 text-gray-400">目前沒有公告</div>
            
            <div 
              v-for="item in filteredBulletins"
              :key="item.id"
              class="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden"
              :class="{'border-l-4 border-l-red-400': item.priority === 'High'}"
            >
                <!-- Clickable Header (Always Visible) -->
                <div 
                    @click="toggleItem(item.id)"
                    class="p-4 cursor-pointer flex justify-between items-start transition-colors hover:bg-gray-50 bg-white"
                >
                    <div class="flex-1 min-w-0 pr-4">
                         <!-- Tags & Time Row -->
                         <div class="flex items-center space-x-2 mb-1.5 flex-wrap gap-y-1">
                            <span 
                              class="text-[10px] px-2 py-0.5 rounded text-white shadow-sm font-bold flex-shrink-0"
                              :class="getCategoryColor(item.category)"
                            >
                              {{ item.category }}
                            </span>
                            <span v-if="item.priority === 'High'" class="text-[10px] bg-red-100 text-red-500 px-2 py-0.5 rounded font-bold flex-shrink-0">重要</span>
                            <span v-if="canCreate && item.status === BULLETIN_STATUS.DRAFT" class="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-bold flex-shrink-0">草稿</span>
                            <span v-if="canCreate && item.status === BULLETIN_STATUS.SCHEDULED" class="text-[10px] bg-lime-100 text-lime-700 px-2 py-0.5 rounded font-bold flex-shrink-0">排程 ({{ item.scheduledTime }})</span>
                            <span class="text-[10px] text-gray-400 flex-shrink-0">{{ formatDate(item.timestamp) }}</span>
                         </div>
                         <!-- Title -->
                         <h3 
                           class="font-bold text-gray-800 text-base transition-all duration-200"
                           :class="{ 'truncate': !expandedItems.has(item.id) }"
                         >
                           {{ item.title }}
                         </h3>
                    </div>
                    
                    <!-- Expand Icon -->
                    <div class="mt-1 transition-transform duration-300" :class="{ 'rotate-180': expandedItems.has(item.id) }">
                         <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
                
                <!-- Expanded Content -->
                <div v-show="expandedItems.has(item.id)" class="px-4 pb-4 pt-0 text-sm animate-fade-in">
                    <div class="border-t border-gray-50 my-2"></div>
                    <p class="text-gray-600 whitespace-pre-wrap leading-relaxed">{{ item.content }}</p>
                    
                    <div class="mt-4 flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <span class="text-xs text-gray-400">發布者: {{ item.author }}</span>
                        <div class="flex items-center space-x-2">
                            <!-- Sign/Read Button -->
                            <button 
                                v-if="!isRead(item)"
                                @click.stop="signBulletin(item)"
                                class="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center font-bold"
                            >
                                <span>我已閱讀</span>
                            </button>
                            <span v-else class="text-xs text-green-600 flex items-center bg-green-50 px-2 py-0.5 rounded-full font-bold">
                                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                已讀
                            </span>

                            
                            <button 
                            v-if="canCreate && item.author === user.name" 
                            @click.stop="deleteItem(item.id)"
                            class="text-gray-300 hover:text-red-500 transition-colors ml-2"
                            >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>

                    <!-- Supervisor: View Unread Stats Button -->
                    <div v-if="canCreate && item.status !== BULLETIN_STATUS.DRAFT" class="mt-3 pt-3 border-t border-gray-100">
                         <button 
                           @click.stop="showStats(item)"
                           class="w-full flex items-center justify-center space-x-2 text-indigo-600 hover:bg-indigo-50 py-2 rounded-lg transition-colors font-bold text-sm"
                         >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                            <span>查看已讀狀況</span>
                         </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Stats Modal -->
    <div v-if="statsModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" @click.self="closeStats">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-scale-up max-h-[80vh] flex flex-col">
            <button @click="closeStats" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h3 class="text-lg font-bold text-gray-800 mb-1 flex items-center">
                📊 公告已讀統計
            </h3>
            <p class="text-xs text-gray-500 mb-4">{{ statsModal.bulletinTitle }}</p>

            <div v-if="statsModal.loading" class="flex flex-col items-center justify-center py-8 space-y-3">
                 <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                 <span class="text-gray-400 text-sm">統計中...</span>
            </div>

            <div v-else class="flex-1 overflow-hidden flex flex-col">
                 <!-- Summary Cards -->
                 <div class="grid grid-cols-2 gap-3 mb-4 flex-shrink-0">
                     <div class="bg-green-50 p-3 rounded-xl border border-green-100 flex flex-col items-center">
                         <span class="text-green-600 text-xs font-bold">已讀人數</span>
                         <span class="text-2xl font-bold text-green-700">{{ statsModal.data.read }}</span>
                     </div>
                     <div class="bg-red-50 p-3 rounded-xl border border-red-100 flex flex-col items-center">
                         <span class="text-red-600 text-xs font-bold">未讀人數</span>
                         <span class="text-2xl font-bold text-red-700">{{ statsModal.data.unread }}</span>
                         <span class="text-[10px] text-gray-400">/ 總共 {{ statsModal.data.total }}</span>
                     </div>
                 </div>

                 <!-- Unread List -->
                 <div class="flex items-center justify-between mb-2">
                     <h4 class="text-sm font-bold text-gray-700">未讀名單 ({{ statsModal.data.unread }})</h4>
                 </div>
                 
                 <div class="flex-1 overflow-y-auto bg-gray-50 rounded-xl p-3 border border-gray-100">
                     <div v-if="statsModal.data.unreadList.length === 0" class="flex flex-col items-center justify-center h-full text-green-500 space-y-2">
                         <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                         <span class="font-bold">太棒了！全員已讀</span>
                     </div>
                     <div v-else class="grid grid-cols-2 gap-2">
                         <div v-for="name in statsModal.data.unreadList" :key="name" class="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm justify-center">
                             <span class="text-sm text-gray-700 font-medium">{{ name }}</span>
                         </div>
                     </div>
                 </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Skeleton from "./Skeleton.vue";
import { BULLETIN_STATUS, ROLES } from "../constants/common.js";
import { useToast } from "../composables/useToast.js";
import { useUserStore } from "../stores/user.js";

const { addToast } = useToast();
const store = useUserStore();
const user = computed(() => store.user);
const units = computed(() => store.units);

// const props = defineProps(['user', 'units']);
const emit = defineEmits(['back']);

const loading = ref(true);
const bulletins = ref([]);
const activeCategory = ref('all');
const isCreating = ref(false); // Mode switch: List vs Create Form
const submitting = ref(false);
const isManagementView = ref(false);
const expandedItems = ref(new Set());

// Stats Modal
const statsModal = ref({
    show: false,
    loading: false,
    bulletinTitle: '',
    data: { total: 0, read: 0, unread: 0, unreadList: [] }
});

function toggleItem(id) {
    if (expandedItems.value.has(id)) {
        expandedItems.value.delete(id);
    } else {
        expandedItems.value.add(id);
    }
}

const form = ref({
    title: '',
    content: '',
    category: '行政',
    priority: 'Normal',
    targetUnit: 'All',
    status: BULLETIN_STATUS.PUBLISHED,
    scheduledTime: '',
    notify: false
});

const categories = [
    { id: 'all', label: '全部' },
    { id: '系統', label: '系統' },
    { id: '行政', label: '行政' },
    { id: '活動', label: '活動' },
    { id: '督導', label: '督導' },
    { id: '其他', label: '其他' }
];

const canCreate = computed(() => {
    return ROLES.SUPERVISOR_ROLES.includes(user.value.role);
});

const filteredBulletins = computed(() => {
    if (activeCategory.value === 'all') return bulletins.value;
    return bulletins.value.filter(b => b.category === activeCategory.value);
});

async function toggleManagementView() {
    isManagementView.value = !isManagementView.value;
    await fetchBulletins();
}

onMounted(fetchBulletins);

async function fetchBulletins() {
    loading.value = true;
    try {
        const res = await fetch('/api/bulletin/get', { 
            method: 'POST', 
            body: JSON.stringify({ 
                uid: user.value.uid,
                role: user.value.role,
                unit: user.value.unit,
                mode: isManagementView.value ? 'manage' : 'view' 
            }) 
        });
        const data = await res.json();
        bulletins.value = data.bulletins || [];
    } catch(e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
}

async function submitBulletin() {
    if (!form.value.title || !form.value.content) return addToast('請填寫完整', 'warning');
    
    submitting.value = true;
    try {
        const res = await fetch('/api/bulletin/create', {
            method: 'POST',
            body: JSON.stringify({
                ...form.value,
                author: user.value.name,
                role: user.value.role 
            })
        });
        const data = await res.json();
        if (data.success) {
            addToast('發佈成功', 'success');
            isCreating.value = false; // Go back to list
            form.value = { title: '', content: '', category: '行政', priority: 'Normal', targetUnit: 'All', status: BULLETIN_STATUS.PUBLISHED, scheduledTime: '', notify: false };
            fetchBulletins();
        } else {
            addToast(data.message, 'error');
        }
    } catch(e) {
        addToast('Error', 'error');
    } finally {
        submitting.value = false;
    }
}

async function deleteItem(id) {
    if (!confirm('確定刪除此公告？')) return;
    try {
        const res = await fetch('/api/bulletin/delete', {
            method: 'POST',
            body: JSON.stringify({ 
                id, 
                role: user.value.role,
                userName: user.value.name 
            })
        });
        const data = await res.json();
        if (data.success) fetchBulletins();
        else addToast(data.message, 'error');
    } catch(e) { addToast('Delete Error', 'error'); }
}

function getCategoryColor(cat) {
    if (cat === '系統') return 'bg-gray-500';
    if (cat === '行政') return 'bg-blue-500';
    if (cat === '活動') return 'bg-orange-500';
    if (cat === '督導') return 'bg-purple-500';
    return 'bg-teal-500';
}

function formatDate(ts) {
    return ts.split(' ')[0]; 
}

function isRead(item) {
    return item.readBy && item.readBy.some(val => val && val.includes(user.value.uid));
}

async function signBulletin(item) {
    const signature = `${user.value.name} (${user.value.uid})`;
    
    // Optimistic Update
    if (!item.readBy) item.readBy = [];
    if (!item.readBy.some(val => val && val.includes(user.value.uid))) {
        item.readBy.push(signature);
    }

    try {
        await fetch('/api/bulletin/sign', {
            method: 'POST',
            body: JSON.stringify({ 
                id: item.id, 
                uid: user.value.uid,
                name: user.value.name 
            })
        });
    } catch(e) {
        console.error('Sign error', e);
    }
}

// Stats Modal Logic
async function showStats(bulletin) {
    statsModal.value.show = true;
    statsModal.value.loading = true;
    statsModal.value.bulletinTitle = bulletin.title;
    
    try {
        const res = await fetch('/api/bulletin/stats', {
            method: 'POST',
            body: JSON.stringify({
                id: bulletin.id,
                requestorUnit: user.value.unit,
                requestorRole: user.value.role
            })
        });
        const data = await res.json();
        if (data.success) {
            statsModal.value.data = data.stats;
        } else {
            addToast(data.message, 'error');
            closeStats();
        }
    } catch (e) {
        addToast('無法載入統計', 'error');
        closeStats();
    } finally {
        statsModal.value.loading = false;
    }
}

function closeStats() {
    statsModal.value.show = false;
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
