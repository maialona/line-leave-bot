<template>
  <div class="flex flex-col h-full animate-fade-in">
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

    <!-- List View -->
    <div v-if="mode === 'list'" class="flex-1 flex flex-col min-h-0">
      <div v-if="!isSupervisor" class="mb-4 flex-none">
        <button
          @click="startCreate"
          class="w-full btn-primary text-white py-3 rounded-xl shadow-md font-bold flex items-center justify-center space-x-2"
        >
          <span>✏️</span><span>新增悄悄話</span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto space-y-3 pb-20">
        <div v-if="loading" class="text-center py-4">
          <span
            class="animate-spin inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"
          ></span>
        </div>
        <div
          v-else-if="list.length === 0"
          class="text-center text-gray-400 py-10"
        >
          尚無訊息
        </div>
        <div
          v-else
          v-for="msg in list"
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
            <input type="checkbox" id="anon" v-model="form.isAnonymous" class="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500">
            <label for="anon" class="ml-2 text-sm text-gray-700 font-bold">🤫 匿名發送</label>
          </div>
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
          class="w-full btn-primary text-white py-3 rounded-xl font-bold disabled:opacity-50"
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
        <div class="text-center mb-4">
             <span class="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">{{ currentMsg.subject }}</span>
        </div>

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
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
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
      <div class="bg-white border-t p-3 flex items-end space-x-2">
        <textarea
          v-model="replyText"
          class="flex-1 rounded-xl border-gray-300 p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 resize-none h-12 max-h-32 transition-all"
          placeholder="輸入訊息..."
          rows="1"
          @focus="$event.target.rows = 3"
          @blur="$event.target.value === '' && ($event.target.rows = 1)"
        ></textarea>
        <button
          @click="sendReply"
          :disabled="submitting || !replyText.trim()"
          class="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from "vue";

const props = defineProps(["user"]);
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

const form = reactive({
  recipientUid: "",
  recipientName: "",
  subject: "",
  content: "",
  isAnonymous: false,
});

const isSupervisor = computed(() =>
  ["Supervisor", "督導", "Business Manager", "業務負責人"].includes(
    props.user.role
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
      body: JSON.stringify({ unit: props.user.unit }),
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
      body: JSON.stringify({ uid: props.user.uid, role: roleType }),
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
    return alert("請填寫完整");
  const r = recipients.value.find((x) => x.uid === form.recipientUid);
  form.recipientName = r ? r.name : "Unknown";

  submitting.value = true;
  try {
    const res = await fetch("/api/whisper/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        senderUid: props.user.uid,
        senderName: props.user.name,
        unit: props.user.unit,
      }),
    });
    if ((await res.json()).success) {
      alert("已送出");
      Object.assign(form, { recipientUid: "", subject: "", content: "", isAnonymous: false });
      mode.value = "list";
      fetchWhispers();
    } else alert("失敗");
  } catch (e) {
    alert("Error");
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

const scrollToBottom = () => {
    if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
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
  
  let displayName = props.user.name;
  if (!isSupervisor.value && currentMsg.value.isAnonymous) {
      displayName = '🤫 匿名';
  }

  const payload = {
      id: currentMsg.value.id,
      message: replyText.value,
      authorName: displayName,
      authorUid: props.user.uid,
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
      scrollToBottom();
    } else {
        alert("發送失敗: " + result.message);
    }
  } catch (e) {
    alert("Error: " + e.message);
  }
  submitting.value = false;
};

const deleteWhisper = async () => {
  if (!confirm("確定刪除?")) return;
  submitting.value = true;
  try {
    const res = await fetch("/api/whisper/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentMsg.value.id }),
    });
    if ((await res.json()).success) {
      alert("已刪除");
      list.value = list.value.filter((m) => m.id !== currentMsg.value.id);
      mode.value = "list";
    }
  } catch (e) {
    alert("Error");
  }
  submitting.value = false;
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
