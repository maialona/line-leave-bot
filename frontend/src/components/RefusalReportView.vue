<template>
  <div class="flex flex-col h-full animate-fade-in">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between px-1">
      <button
        @click="$emit('back')"
        class="text-gray-400 hover:text-gray-600 p-2 -ml-2"
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
      <h2 class="text-xl font-bold text-gray-800 flex-1 text-center">拒案通報站</h2>
      <button
        @click="showInfo = true"
        class="text-gray-400 hover:text-primary-500 p-2 -mr-2 transition-colors"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex space-x-2 mb-4 px-1">
      <button
        @click="activeTab = 'form'"
        :class="['flex-1 py-2 rounded-lg text-sm font-bold transition-colors', activeTab === 'form' ? 'bg-danger-100 text-danger-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200']"
      >
        通報表單
      </button>
      <button
        @click="activeTab = 'records'"
        :class="['flex-1 py-2 rounded-lg text-sm font-bold transition-colors', activeTab === 'records' ? 'bg-danger-100 text-danger-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200']"
      >
        通報紀錄
      </button>
    </div>

    <!-- Form Content -->
    <div v-show="activeTab === 'form'" class="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
      
      <!-- Assigning Supervisor -->
      <div>
        <label class="block text-sm font-bold text-gray-700 mb-1">派案督導員</label>
        <input
          v-model="form.supervisorName"
          type="text"
          placeholder="請輸入姓名"
          class="w-full rounded-xl border-gray-300 py-3 px-4 shadow-sm border focus:ring-danger-500 focus:border-danger-500"
        />
      </div>

      <!-- Agency Selection -->
      <div>
        <label class="block text-sm font-bold text-gray-700 mb-1">居服員所屬機構</label>
        <select
          v-model="form.agency"
          class="w-full rounded-xl border-gray-300 py-3 px-4 shadow-sm border focus:ring-danger-500 focus:border-danger-500 bg-white"
        >
          <option disabled value="">請選擇機構</option>
          <option v-for="unit in units" :key="unit" :value="unit">
            {{ unit }}
          </option>
        </select>
      </div>

       <!-- Assigned Attendant -->
      <div>
        <label class="block text-sm font-bold text-gray-700 mb-1">受案服務員</label>
        <input
          v-model="form.attendantName"
          type="text"
          placeholder="請輸入服務員姓名"
          class="w-full rounded-xl border-gray-300 py-3 px-4 shadow-sm border focus:ring-danger-500 focus:border-danger-500"
        />
      </div>

      <!-- Refusal Date -->
      <div>
        <label class="block text-sm font-bold text-gray-700 mb-1">拒接案日期</label>
        <input
          v-model="form.refusalDate"
          type="date"
          class="w-full rounded-xl border-gray-300 py-3 px-4 shadow-sm border focus:ring-danger-500 focus:border-danger-500"
        />
      </div>

      <!-- Situation Assessment -->
      <div>
        <label class="block text-sm font-bold text-gray-700 mb-2">狀況評估</label>
        <div class="space-y-3">
          <label class="flex items-start space-x-3 cursor-pointer">
             <input type="checkbox" v-model="form.assessments" :value="options[0]" class="mt-1 w-5 h-5 text-danger-600 rounded border-gray-300 focus:ring-danger-500">
             <span class="text-sm text-gray-700">{{ options[0] }}</span>
          </label>
          <label class="flex items-start space-x-3 cursor-pointer">
             <input type="checkbox" v-model="form.assessments" :value="options[1]" class="mt-1 w-5 h-5 text-danger-600 rounded border-gray-300 focus:ring-danger-500">
             <span class="text-sm text-gray-700">{{ options[1] }}</span>
          </label>
          <label class="flex items-start space-x-3 cursor-pointer">
             <input type="checkbox" v-model="form.assessments" :value="options[2]" class="mt-1 w-5 h-5 text-danger-600 rounded border-gray-300 focus:ring-danger-500">
             <span class="text-sm text-gray-700">{{ options[2] }}</span>
          </label>
          <label class="flex items-start space-x-3 cursor-pointer">
             <input type="checkbox" v-model="form.assessments" :value="options[3]" class="mt-1 w-5 h-5 text-danger-600 rounded border-gray-300 focus:ring-danger-500">
             <span class="text-sm text-gray-700">{{ options[3] }}</span>
          </label>
        </div>
      </div>

      <!-- Specific Reason -->
      <div>
        <label class="block text-sm font-bold text-gray-700 mb-1">具體事由</label>
        <textarea
          v-model="form.reason"
          rows="4"
          placeholder="請詳述拒接案原因..."
          class="w-full rounded-xl border-gray-300 py-3 px-4 shadow-sm border focus:ring-danger-500 focus:border-danger-500 resize-none"
        ></textarea>
      </div>

      <!-- Footer Action Form -->
      <div class="mt-4 pt-2 border-t border-gray-100">
          <button
            @click="submit"
            :disabled="submitting"
            class="w-full bg-danger-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-danger-700 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ submitting ? "提交中..." : "送出通報" }}
          </button>
      </div>
    </div>

    <!-- Records Content -->
    <div v-show="activeTab === 'records'" class="flex-1 overflow-y-auto px-1 pb-4">
        <div v-if="loadingStats" class="space-y-3">
            <div v-for="n in 3" :key="n" class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between animate-pulse">
                <div class="space-y-2 flex-1">
                   <div class="h-4 bg-gray-200 rounded w-1/3"></div>
                   <div class="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div class="w-16 h-10 bg-gray-200 rounded-lg"></div>
            </div>
        </div>
        <div v-else-if="records.length === 0" class="text-center py-8 text-gray-400">
            尚無通報紀錄
        </div>
        <div v-else class="space-y-3">
            <div v-for="(rec, index) in records" :key="index" class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <!-- Header / Summary Row -->
                <div 
                    @click="toggleExpand(index)"
                    class="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors select-none"
                >
                    <div class="flex items-center">
                        <div class="mr-3 text-gray-400 transition-transform duration-200" :class="{ 'rotate-90': rec.expanded }">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                        </div>
                        <div>
                           <div class="text-sm text-gray-500 mb-1">{{ rec.agency }}</div>
                           <div class="font-bold text-gray-800 text-lg">{{ rec.attendant }}</div>
                        </div>
                    </div>
                    <div class="bg-danger-50 text-danger-600 font-bold px-4 py-2 rounded-lg text-lg">
                        {{ rec.count }} <span class="text-xs font-normal">次</span>
                    </div>
                </div>

                <!-- Expanded Details -->
                <div v-if="rec.expanded" class="bg-gray-50 border-t border-gray-100 p-4 space-y-3 animate-fade-in">
                    <div v-for="(detail, dIdx) in rec.details" :key="dIdx" class="bg-white p-3 rounded-lg border border-gray-200 text-sm">
                        <div class="flex justify-between items-start mb-2">
                             <span class="font-bold text-gray-700">📅 {{ detail.date }}</span>
                             <span class="text-xs text-gray-400">通報人: {{ detail.supervisor }}</span>
                        </div>
                        <div class="text-gray-600 leading-relaxed whitespace-pre-wrap">{{ detail.reason }}</div>
                    </div>
                    <div v-if="!rec.details || rec.details.length === 0" class="text-center text-gray-400 text-sm py-2">
                        無詳細資料
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Info Modal -->
    <div v-if="showInfo" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" @click.self="showInfo = false">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-scale-up">
            <button @click="showInfo = false" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <span class="text-primary-500 mr-2">ℹ️</span> 拒接案評估原則
            </h3>
            <ul class="space-y-3 text-sm text-gray-600 list-decimal pl-5 leading-relaxed bg-primary-50 p-4 rounded-lg">
                <li>督導員會依排班原則以及居服員接班空檔及需要車程來做安排。</li>
                <li>若居服員在體況、班表等評估因素下經督導評估可接班狀況而拒絕接班者。</li>
                <li>請督導員協助做相關紀錄後續以方便做居服員相關考核業務負責人會在行政會議前將數據抓出列入討論。</li>
            </ul>
             <button @click="showInfo = false" class="w-full mt-6 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">
                我瞭解了
            </button>
        </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import { useUserStore } from "../stores/user.js";
import { useToast } from "../composables/useToast.js";

const emit = defineEmits(["back"]);
const store = useUserStore();
const { addToast } = useToast();
const user = computed(() => store.user);
const units = computed(() => store.units);

const activeTab = ref('form');
const records = ref([]);
const loadingStats = ref(false);

const submitting = ref(false);
const showInfo = ref(false);

const options = [
    "照顧服務員沒有任何會影響接案的體況限制",
    "有給予照顧服務員充足的轉場時間",
    "該服務員單趟車程，大於車程20公里以上",
    "跨區域車程時間超過20公里"
];

const form = reactive({
    supervisorName: "",
    agency: "",
    attendantName: "",
    refusalDate: new Date().toISOString().split("T")[0],
    assessments: [],
    reason: ""
});

onMounted(() => {
    if (user.value && user.value.name) {
        form.supervisorName = user.value.name;
    }
});

const submit = async () => {
    if (!form.supervisorName || !form.agency || !form.attendantName || !form.reason) {
        addToast("請填寫完整資訊", "warning");
        return;
    }

    submitting.value = true;
    try {
        const res = await fetch("/api/submit-refusal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form)
        });
        const data = await res.json();
        if (data.success) {
            addToast("通報成功", "success");
            emit("back");
        } else {
             addToast(data.message || "通報失敗", "error");
        }
    } catch (e) {
        console.error(e);
        addToast("系統錯誤", "error");
    } finally {
        submitting.value = false;
    }
};

const loadRecords = async () => {
    loadingStats.value = true;
    try {
        const res = await fetch("/api/get-refusal-stats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (data.success) {
            records.value = data.stats;
        } else {
            console.error(data.message);
        }
    } catch (e) {
        console.error("Load Stats Error", e);
    } finally {
        loadingStats.value = false;
    }
};

const toggleExpand = (index) => {
    records.value[index].expanded = !records.value[index].expanded;
};

watch(activeTab, (newTab) => {
    if (newTab === 'records') {
        loadRecords();
    }
});

</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-scale-up {
  animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleUp {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
