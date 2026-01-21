<template>
  <div class="flex flex-col h-full animate-fade-in relative">
    <!-- Header -->
    <div class="mb-4 relative text-center flex-none">
      <button
        @click="handleBack"
        class="absolute left-0 top-1 text-gray-400 hover:text-gray-600 p-2"
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
      <h1 class="text-xl font-bold text-gray-900">悄悄話</h1>

      <!-- List Mode Controls -->
      <div v-if="mode === 'list'" class="absolute right-0 top-1 flex space-x-2">
        <!-- Refresh -->
        <button
          @click="fetchWhispers"
          class="text-gray-400 hover:text-indigo-600"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
        <!-- Sort -->
        <button @click="toggleSort" class="text-gray-400 hover:text-indigo-600">
          <svg
            v-if="sortOrder === 'desc'"
            class="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 4h13M3 8h9M3 12h5m12-8v12m0 0l-4-4m4 4l4-4"
            />
          </svg>
          <svg
            v-else
            class="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 4h13M3 8h9M3 12h5m12 4v-12m0 0l-4 4m4-4l4 4"
            />
          </svg>
        </button>
      </div>

      <!-- Detail Mode Controls -->
      <button
        v-else-if="mode === 'detail' && !isSupervisor"
        @click="deleteWhisper"
        class="absolute right-0 top-1 text-red-400 hover:text-red-600"
      >
        <svg
          class="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>

    <!-- Search & Filter Controls (Sticky below header) -->
    <div v-if="mode === 'list'" class="px-4 mb-2 flex-none space-y-2">
      <!-- Search Bar -->
      <div class="relative">
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="搜尋主旨或內容..." 
          class="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-pink-500 transition-all border-none"
        >
        <svg class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      
      <!-- Category Chips -->
      <div class="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
        <button 
          v-for="cat in ['全部', ...categories]" 
          :key="cat"
          @click="selectedCategory = cat"
          class="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all border"
          :class="selectedCategory === cat 
            ? 'bg-pink-600 text-white border-pink-600 shadow-md transform scale-105' 
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <!-- List View -->
    <div v-if="mode === 'list'" class="flex-1 flex flex-col min-h-0">
      <div v-if="!isSupervisor" class="mb-4 flex-none">
        <button
          @click="startCreate"
          class="w-full bg-pink-600 hover:bg-pink-700 transition-colors text-white py-3 rounded-xl shadow-md font-bold flex items-center justify-center space-x-2"
        >
          <span>✏️</span><span>新增悄悄話</span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto space-y-3 pb-20">
        <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
           <div class="flex justify-between mb-2">
             <Skeleton width="100px" height="1rem" />
             <Skeleton width="60px" height="0.75rem" />
           </div>
           <Skeleton width="80%" height="1.25rem" />
        </div>
      </div>
        <div
          v-else-if="filteredList.length === 0"
          class="text-center text-gray-400 py-10"
        >
          {{ list.length === 0 ? '尚無訊息' : '亦無搜尋結果' }}
        </div>
        <div
          v-else
          v-for="msg in filteredList"
          :key="msg.id"
          @click="openDetail(msg)"
          class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50 relative transition-transform duration-200 active:scale-98"
        >
          <div class="flex justify-between items-start mb-1">
            <span class="font-bold text-gray-800 text-sm">
              {{ isSupervisor ? msg.senderName : "To: " + msg.recipientName }}
            </span>
            <span class="text-xs text-gray-400">{{
              msg.timestamp.split(" ")[0]
            }}</span>
          </div>
          <h4 class="font-medium text-gray-900 mb-1 truncate">
            <span class="text-xs px-1.5 py-0.5 rounded text-white mr-1" :class="getCategoryColor(msg.category)">{{ msg.category }}</span>
            {{ msg.subject }}
          </h4>
          <div
            v-if="msg.status === 'Unread' && isSupervisor"
            class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"
          ></div>
          <div
            v-if="msg.status === 'Replied'"
            class="absolute bottom-2 right-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded"
          >
            已回覆
          </div>
        </div>
      </div>
    </div>

    <!-- Create View -->
    <div
      v-else-if="mode === 'create'"
      class="flex-1 flex flex-col overflow-y-auto"
    >
      <h2 class="text-lg font-bold text-gray-700 mb-4">撰寫新訊息</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >收件對象</label
          >
          <select
            v-model="form.recipientUid"
            class="w-full rounded-lg border-gray-300 py-2 px-3 border bg-white"
          >
            <option disabled value="">請選擇督導/業負</option>
            <option v-for="r in recipients" :key="r.uid" :value="r.uid">
              {{ r.name }}
            </option>
          </select>
            <div class="mt-2 flex items-center">
            <input type="checkbox" id="anon" v-model="form.isAnonymous" class="w-4 h-4 text-pink-600 rounded border-gray-300 focus:ring-pink-500">
            <label for="anon" class="ml-2 text-sm text-gray-700 font-bold">🤫 匿名發送</label>
            </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">分類</label>
          <select v-model="form.category" class="w-full rounded-lg border-gray-300 py-2 px-3 border bg-white">
             <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >主旨</label
          >
          <input
            v-model="form.subject"
            class="w-full rounded-lg border-gray-300 py-2 px-3 border"
            placeholder="請輸入主旨"
          />
        </div>
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >內容</label
          >
          <textarea
            v-model="form.content"
            class="w-full h-40 rounded-lg border-gray-300 py-2 px-3 border resize-none"
            placeholder="請輸入內容..."
          ></textarea>
        </div>
        <button
          @click="submit"
          :disabled="submitting"
          class="w-full bg-pink-600 hover:bg-pink-700 transition-colors text-white py-3 rounded-xl font-bold disabled:opacity-50"
        >
          {{ submitting ? "傳送中..." : "送出" }}
        </button>
      </div>
    </div>

    <!-- Detail View (Threaded Chat) -->
    <div
      v-else-if="mode === 'detail' && currentMsg"
      class="flex-1 flex flex-col h-full bg-gray-50"
    >
      <div class="flex-1 overflow-y-auto p-4 space-y-6" ref="chatContainer">
        <!-- Subject Header -->
        <!-- Sticky Subject Header Removed -->
        <!-- Message History -->
        <div v-for="(msg, index) in currentMsg.history" :key="index" class="flex flex-col">
             <!-- Check alignment: If I am Supervisor, 'supervisor' role is ME (Right). 'staff' is THEM (Left). -->
             <!-- If I am Staff, 'staff' role is ME (Right). 'supervisor' is THEM (Left). -->
            <div 
                :class="[
                    'flex w-full mb-1',
                    (isSupervisor && msg.role === 'supervisor') || (!isSupervisor && msg.role === 'staff') ? 'justify-end' : 'justify-start'
                ]"
            >
                <div 
                    :class="[
                        'max-w-[80%] p-3 rounded-2xl text-sm shadow-sm relative',
                        (isSupervisor && msg.role === 'supervisor') || (!isSupervisor && msg.role === 'staff') 
                            ? 'bg-pink-600 text-white rounded-tr-none' 
                            : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                    ]"
                >
                    <p class="whitespace-pre-wrap">{{ msg.content }}</p>
                </div>
            </div>
            
            <!-- Metadata -->
             <div 
                :class="[
                    'flex text-xs text-gray-400 mb-2',
                    (isSupervisor && msg.role === 'supervisor') || (!isSupervisor && msg.role === 'staff') ? 'justify-end' : 'justify-start'
                ]"
            >
                <span class="mx-1">{{ msg.sender }}</span>
                <span>{{ msg.timestamp.split(' ')[0] }}</span> <!-- Show Date only or Time? Let's show simplified -->
            </div>
        </div>
      </div>

      <!-- Chat Input -->
      <div v-if="isSupervisor" class="px-3 pb-3 bg-white border-t-0 flex space-x-2 overflow-x-auto no-scrollbar">
          <button 
            v-for="reply in quickReplies" 
            :key="reply"
            @click="useQuickReply(reply)"
            class="flex-shrink-0 bg-pink-50 text-pink-700 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-pink-100 border border-pink-200 transition-colors whitespace-nowrap"
          >
            {{ reply }}
          </button>
      </div>

        <div class="bg-white border-t p-3 pb-10 flex items-end space-x-2">
        <textarea
          v-model="replyText"
          class="flex-1 rounded-xl border-gray-300 p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-500 resize-none h-12 max-h-32 transition-all"
          placeholder="輸入訊息..."
          rows="1"
          @focus="$event.target.rows = 3"
          @blur="$event.target.value === '' && ($event.target.rows = 1)"
        ></textarea>
        <button
          @click="sendReply"
          :disabled="submitting || !replyText.trim()"
          class="bg-pink-600 text-white p-3 rounded-xl hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
        </button>
      </div>
    </div>
    <!-- Confirm Modal -->
    <ConfirmModal
      :is-open="confirmModal.isOpen"
      :title="confirmModal.title"
      :message="confirmModal.message"
      :confirm-text="confirmModal.confirmText"
      :confirm-button-class="confirmModal.confirmClass"
      @confirm="executeConfirm"
      @cancel="closeConfirmModal"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from "vue";
import Skeleton from "./Skeleton.vue";
import { useToast } from "../composables/useToast.js";
import { useUserStore } from "../stores/user.js";
import ConfirmModal from "./ConfirmModal.vue"; // Added import

const { addToast } = useToast();
const store = useUserStore();
const user = computed(() => store.user);

// const props = defineProps(["user"]);
const emit = defineEmits(["back"]);

const mode = ref("list");
const list = ref([]);
const recipients = ref([]);
const loading = ref(false);
const submitting = ref(false);
const currentMsg = ref(null);
const replyText = ref("");
const sortOrder = ref("desc");
const chatContainer = ref(null);

const searchQuery = ref("");
const selectedCategory = ref("全部");

const filteredList = computed(() => {
    let result = list.value;
    
    // Filter by Category
    if (selectedCategory.value !== '全部') {
        result = result.filter(m => m.category === selectedCategory.value);
    }
    
    // Filter by Search Query
    if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase();
        result = result.filter(m => 
            m.subject.toLowerCase().includes(q) || 
            (m.content && m.content.toLowerCase().includes(q)) ||
            (m.history && m.history.some(h => h.content.toLowerCase().includes(q)))
        );
    }
    
    return result;
});

const form = reactive({
  recipientUid: "",
  recipientName: "",
  subject: "",
  content: "",
  isAnonymous: false,
  category: "行政", // Default
});

const categories = ["行政", "薪資", "排班", "申訴", "系統", "其他"];

function getCategoryColor(cat) {
    if (cat === '系統') return 'bg-gray-500';
    if (cat === '行政') return 'bg-blue-500';
    if (cat === '薪資') return 'bg-green-500';
    if (cat === '排班') return 'bg-orange-500';
    if (cat === '申訴') return 'bg-red-500';
    return 'bg-teal-500';
}

const quickReplies = [
    "收到，我們會盡快處理",
    "已處理完畢",
    "請提供更多詳細資訊",
    "好的，沒問題",
    "需請您稍候",
    "感謝回報"
];

const useQuickReply = (text) => {
    replyText.value = text;
    // Auto-focus logic if needed? 
    // Or just send? Let's just fill for safety so they can edit.
};

const isSupervisor = computed(() =>
  ["Supervisor", "督導", "Business Manager", "業務負責人"].includes(
    user.value.role
  )
);

const handleBack = () => {
  if (mode.value === "list") emit("back");
  else mode.value = "list";
};

const fetchRecipients = async () => {
  try {
    const res = await fetch("/api/whisper/recipients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unit: user.value.unit }),
    });
    recipients.value = (await res.json()).recipients || [];
  } catch (e) {
    console.error(e);
  }
};

const fetchWhispers = async () => {
  loading.value = true;
  try {
    const roleType = isSupervisor.value ? "supervisor" : "staff";
    const res = await fetch("/api/whisper/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: user.value.uid, role: roleType }),
    });
    const data = await res.json();
    list.value = data.messages || [];
    sortList();
  } catch (e) {
    console.error(e);
  }
  loading.value = false;
};

const sortList = () => {
  list.value.sort((a, b) => {
    const da = new Date(a.timestamp);
    const db = new Date(b.timestamp);
    return sortOrder.value === "desc" ? db - da : da - db;
  });
};

const toggleSort = () => {
  sortOrder.value = sortOrder.value === "desc" ? "asc" : "desc";
  sortList();
};

const startCreate = async () => {
  await fetchRecipients();
  mode.value = "create";
};

const submit = async () => {
  if (!form.recipientUid || !form.subject || !form.content)
    return addToast("請填寫完整", "warning");
  const r = recipients.value.find((x) => x.uid === form.recipientUid);
  form.recipientName = r ? r.name : "Unknown";

  submitting.value = true;
  try {
    const res = await fetch("/api/whisper/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        senderUid: user.value.uid,
        senderName: user.value.name,
        unit: user.value.unit,
      }),
    });
    const result = await res.json();
    if (result.success) {
      addToast("已送出", "success");
      Object.assign(form, { recipientUid: "", subject: "", content: "", isAnonymous: false, category: "行政" });
      mode.value = "list";
      fetchWhispers();
    } else addToast("失敗", "error");
  } catch (e) {
    addToast("Error", "error");
  }
  submitting.value = false;
};

const openDetail = async (msg) => {
  currentMsg.value = msg;
  mode.value = "detail";
  
  // Mark as Read if Supervisor and Unread
  if (isSupervisor.value && msg.status === 'Unread') {
      try {
          // Optimistic UI update
          msg.status = 'Read'; 
          
          await fetch('/api/whisper/read', {
              method: 'POST',
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: msg.id })
          });
      } catch (e) {
          console.error('Mark read failed', e);
      }
  }

  // Scroll to bottom
  await nextTick();
  scrollToBottom();
};

const scrollToBottom = async () => {
    await nextTick();
    if (chatContainer.value) {
        chatContainer.value.scrollTo({
            top: chatContainer.value.scrollHeight,
            behavior: "smooth"
        });
    }
};

const sendReply = async () => {
  if (!replyText.value.trim()) return;
  submitting.value = true;
  
  // Determine role and display name
  // If I am supervisor, my role is 'supervisor'. Name is my name.
  // If I am staff, my role is 'staff'. 
  // For anonymous staff replying to their OWN thread? 
  // This logic is tricky. If I am the Creator (role=staff), I might want to continue being anonymous?
  // Check if the original thread was anonymous.
  
  let displayName = user.value.name;
  if (!isSupervisor.value && currentMsg.value.isAnonymous) {
      displayName = '🤫 匿名';
  }

  const payload = {
      id: currentMsg.value.id,
      message: replyText.value,
      authorName: displayName,
      authorUid: user.value.uid,
      authorRole: isSupervisor.value ? 'supervisor' : 'staff'
  };

  try {
    const res = await fetch("/api/whisper/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (result.success) {
      // Optimistic update
      const newMsg = {
          role: payload.authorRole,
          content: payload.message,
          sender: payload.authorName,
          timestamp: new Date().toLocaleTimeString('zh-TW', {hour: '2-digit', minute:'2-digit'}),
          uid: payload.authorUid
      };
      
      currentMsg.value.history.push(newMsg);
      replyText.value = "";
      await scrollToBottom();
    } else {
        addToast("發送失敗: " + result.message, "error");
    }
  } catch (e) {
    addToast("Error: " + e.message, "error");
  }
  submitting.value = false;
};

const confirmModal = reactive({
    isOpen: false,
    title: '確認',
    message: '',
    confirmText: '確定',
    confirmClass: 'bg-primary-600',
    onConfirm: null
});

const closeConfirmModal = () => {
    confirmModal.isOpen = false;
    confirmModal.onConfirm = null;
};

const executeConfirm = async () => {
    if (confirmModal.onConfirm) {
        await confirmModal.onConfirm();
    }
    closeConfirmModal();
};

const deleteWhisper = () => {
    confirmModal.title = '確認刪除';
    confirmModal.message = '確定要刪除這則悄悄話嗎?';
    confirmModal.confirmText = '確定刪除';
    confirmModal.confirmClass = 'bg-pink-600 hover:bg-pink-700';
    
    confirmModal.onConfirm = async () => {
        submitting.value = true;
        try {
            const res = await fetch("/api/whisper/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: currentMsg.value.id }),
            });
            if ((await res.json()).success) {
            addToast("已刪除", "success");
            list.value = list.value.filter((m) => m.id !== currentMsg.value.id);
            mode.value = "list";
            }
        } catch (e) {
            addToast("Error", "error");
        }
        submitting.value = false;
    };
    confirmModal.isOpen = true;
};

onMounted(() => {
  fetchWhispers();
});
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>

<!-- Add Modal to Template (must be at root or safe place) -->
<!-- Actually it should be inside the root div, so we need to find where the root div closes. -->
<!-- Warning: The view_file output was truncated so checking End of file might be risky if </template> was not shown.-->
<!-- Let's check line 142/143 where template seemingly ended in previous view? No that was script. -->
<!-- Wait, the template starts at line 1. Code is single file component. -->
<!-- I need to insert the Modal at the end of the template. -->
<!-- Let's verify where </template> is. -->
<!-- Ah, I can insert it just before the closing </div> of the main container. -->
<!-- Or just put it at the very end of template if there is one root element. -->
<!-- The root element is at line 2. Closing div is missing from my view. -->
<!-- I will assume standard structure and add it before script setup if I can find the end of template. -->
<!-- Actually, line 146 in previous view was </script>. So template is lines 1 to ~140? -->
<!-- No, the first view file call showed template from 1 to 142? No. -->
<!-- Wait, line 134-142 in `view_file` output from step 2925/2926: -->
<!-- It seems script setup starts at 150 (in file view 2822? No different file). -->
<!-- In step 2925, `WhisperView.vue`: line 1 <template>, line 2 <div ...> -->
<!-- The script setup must be further down. -->
<!-- Ah, the previous view_file (Step 2931) showed script setup content at 615! -->
<!-- So template is LONG. -->
<!-- I will look for `</template>` or add to the end of the root div. -->
<!-- I'll insert the modal code at the very end of the template section. -->
<!-- Instead of guessing, let me just add it to the top of the file, inside the first div. -->
<!-- Or better, I'll search for the end of the template or use `Layout` component if available? -->
<!-- No, I will insert it after the header (line 99) temporarily or just verify the end. -->
<!-- Looking at the file content from 2931, line 350 is script. -->
<!-- So template ends before 350. -->
<!-- Let's search for `</template>`. -->
<!-- Wait, I can just insert it at the end of the root `div`. -->
<!-- I see `list.value` is used, so it's a list. -->
<!-- I will replace `</div>` at the very end of the template with the modal + </div>. -->
<!-- But I don't know where the closing div is. -->
<!-- Safe bet: Insert it right after `<div class="flex flex-col h-full animate-fade-in">`? No, that puts it at top. -->
<!-- Modal uses fixed position (z-50), so placement in DOM matters less for visual, but good for structure. -->
<!-- Let's just put it at the top of the template, inside the root div. -->
<!-- Line 2: `<div class="flex flex-col h-full animate-fade-in">` -->
<!-- Replaced line 2 to allow me to close it properly? No. -->
<!-- I will just append the modal markup after line 2. -->
<!-- Wait, that might block interaction if not handled right? `ConfirmModal` usually has `v-if`. -->
<!-- Correct. `v-if="isOpen"`. So it's safe to put anywhere. -->
<!-- I will put it right after the root div opening tag. -->

