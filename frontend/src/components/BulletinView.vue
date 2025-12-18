<template>
  <div class="flex flex-col h-full animate-fade-in relative">
    <!-- Main Content (Hidden when modal is open to prevent scroll issues) -->
    <div v-show="!showCreateModal" class="flex flex-col h-full overflow-hidden">
        <!-- Header -->
        <div class="mb-4 flex items-center justify-between flex-shrink-0">
            <button
              @click="$emit('back')"
              class="text-gray-400 hover:text-gray-600 p-2"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                ></path>
              </svg>
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
                @click="showCreateModal = true"
                class="bg-lime-400 text-white p-2 rounded-full shadow-lg hover:bg-lime-500 transition-colors transform active:scale-95"
                >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                </button>
           </div>
        </div>

        <!-- Bulletin List -->
        <div class="flex-1 overflow-y-auto space-y-4 px-2 pb-20">
            <div v-if="loading" class="text-center py-8 text-gray-400">讀取中...</div>
            <div v-else-if="filteredBulletins.length === 0" class="text-center py-8 text-gray-400">目前沒有公告</div>
            
            <div 
              v-for="item in filteredBulletins"
              :key="item.id"
              class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden"
              :class="{'border-l-4 border-l-red-400': item.priority === 'High'}"
            >
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center space-x-2">
                        <span 
                          class="text-xs px-2 py-0.5 rounded text-white"
                          :class="getCategoryColor(item.category)"
                        >
                          {{ item.category }}
                        </span>
                        <span v-if="item.priority === 'High'" class="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded font-bold">重要</span>
                        <span v-if="canCreate && item.status === 'draft'" class="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-bold">草稿</span>
                        <span v-if="canCreate && item.status === 'scheduled'" class="text-xs bg-lime-100 text-lime-700 px-2 py-0.5 rounded font-bold">排程 ({{ item.scheduledTime }})</span>
                    </div>
                    <span class="text-xs text-gray-400">{{ formatDate(item.timestamp) }}</span>
                </div>
                
                <h3 class="font-bold text-gray-800 text-lg mb-1">{{ item.title }}</h3>
                <p class="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">{{ item.content }}</p>
                
                <div class="mt-3 flex justify-between items-center bg-gray-50 p-2 rounded-lg -mx-2 -mb-2">
                    <span class="text-xs text-gray-400">發布者: {{ item.author }}</span>
                    <button 
                       v-if="canCreate && item.author === user.name" 
                       @click="deleteItem(item.id)"
                       class="text-gray-300 hover:text-red-500 transition-colors"
                    >
                       <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Create Modal Overlay -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <!-- Modal Card -->
        <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div class="p-5 flex flex-col h-full">
        <h3 class="text-xl font-bold text-gray-800 mb-4 flex-shrink-0">發佈新公告</h3>
        
        <div class="space-y-4 flex-1 overflow-y-auto min-h-0 pr-1">
             <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">標題</label>
                <input v-model="form.title" class="w-full rounded-xl border border-gray-300 p-3" placeholder="輸入標題..." />
             </div>
             
             <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">內容</label>
                <textarea v-model="form.content" class="w-full rounded-xl border border-gray-300 p-3 h-32" placeholder="輸入公告內容..."></textarea>
             </div>
             
             <div class="flex space-x-4">
                 <div class="flex-1">
                     <label class="block text-sm font-bold text-gray-700 mb-1">分類</label>
                     <select v-model="form.category" class="w-full rounded-xl border border-gray-300 p-3">
                         <option value="系統">系統</option>
                         <option value="行政">行政</option>
                         <option value="活動">活動</option>
                         <option value="督導">督導</option>
                         <option value="其他">其他</option>
                     </select>
                 </div>
                 <div class="flex-1">
                     <label class="block text-sm font-bold text-gray-700 mb-1">優先級</label>
                     <select v-model="form.priority" class="w-full rounded-xl border border-gray-300 p-3">
                         <option value="Normal">一般</option>
                         <option value="High">重要</option>
                     </select>
                 </div>
             </div>

             <div class="flex space-x-4">
                 <div class="flex-1">
                    <label class="block text-sm font-bold text-gray-700 mb-1">發佈對象</label>
                    <select v-model="form.targetUnit" class="w-full rounded-xl border border-gray-300 p-3">
                         <option value="All">所有機構</option>
                         <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
                     </select>
                 </div>
                 <div class="flex-1">
                    <label class="block text-sm font-bold text-gray-700 mb-1">狀態</label>
                    <select v-model="form.status" class="w-full rounded-xl border border-gray-300 p-3">
                         <option value="published">發佈</option>
                         <option value="scheduled">排程</option>
                     </select>
                 </div>
             </div>

             <div v-if="form.status === 'scheduled'" class="mt-4">
                 <label class="block text-sm font-bold text-gray-700 mb-1">排程發佈時間</label>
                 <input type="datetime-local" v-model="form.scheduledTime" class="w-full rounded-xl border border-gray-300 p-3" />
             </div>

        </div>
        
        <div class="flex space-x-3 mt-4">
            <button @click="showCreateModal = false" class="flex-1 py-3 bg-gray-200 rounded-xl text-gray-700 font-bold">取消</button>
            <button 
              @click="submitBulletin" 
              :disabled="submitting"
              class="flex-1 py-3 bg-gradient-to-r from-teal-400 to-lime-400 text-white rounded-xl font-bold shadow-lg flex justify-center items-center"
            >
               <span v-if="submitting">發佈中...</span>
               <span v-else>確認發佈</span>
            </button>
        </div>
            </div>
        </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps(['user', 'units']);
const emit = defineEmits(['back']);

const loading = ref(true);
const bulletins = ref([]);
const activeCategory = ref('all');
const showCreateModal = ref(false);
const submitting = ref(false);
const isManagementView = ref(false); // Toggle for Admin Management View

const form = ref({
    title: '',
    content: '',
    category: '行政',
    priority: 'Normal',
    targetUnit: 'All',
    status: 'published', // published, scheduled
    scheduledTime: ''
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
    return ['督導', '業務負責人'].includes(props.user.role);
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
                uid: props.user.uid,
                role: props.user.role,
                unit: props.user.unit,
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
    if (!form.value.title || !form.value.content) return alert('請填寫完整');
    
    submitting.value = true;
    try {
        const res = await fetch('/api/bulletin/create', {
            method: 'POST',
            body: JSON.stringify({
                ...form.value,
                author: props.user.name,
                role: props.user.role 
            })
        });
        const data = await res.json();
        if (data.success) {
            alert('發佈成功');
            showCreateModal.value = false;
            form.value = { title: '', content: '', category: '行政', priority: 'Normal', targetUnit: 'All', status: 'published', scheduledTime: '' };
            fetchBulletins();
        } else {
            alert(data.message);
        }
    } catch(e) {
        alert('Error');
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
                role: props.user.role,
                userName: props.user.name // Pass user name for backend verification
            })
        });
        const data = await res.json();
        if (data.success) fetchBulletins();
        else alert(data.message);
    } catch(e) { alert('Delete Error'); }
}

function getCategoryColor(cat) {
    if (cat === '系統') return 'bg-gray-500';
    if (cat === '行政') return 'bg-blue-500';
    if (cat === '活動') return 'bg-orange-500';
    if (cat === '督導') return 'bg-purple-500';
    return 'bg-teal-500';
}

function formatDate(ts) {
    return ts.split(' ')[0]; // Simple date
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
