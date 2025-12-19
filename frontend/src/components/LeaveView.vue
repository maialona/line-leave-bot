<template>
  <div class="flex flex-col h-full animate-fade-in">
    <!-- Header -->
    <div class="mb-6 relative text-center flex-none">
      <button
        @click="$emit('back')"
        class="absolute left-0 top-1 text-gray-400 hover:text-gray-600"
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
      <h1 class="text-2xl font-bold text-gray-900">請假申請</h1>
      <p class="text-sm text-gray-500 mt-1">204府城大師</p>
    </div>

    <!-- Supervisor Dashboard -->
    <div v-if="isSupervisor" class="flex-1 flex flex-col min-h-0">
      <!-- User Info -->
      <div
        class="mb-4 flex items-center justify-between bg-purple-50 p-3 rounded-lg flex-none"
      >
        <div>
          <span class="text-purple-900 font-medium block"
            >👋 您好，{{ user.name }}</span
          >
        </div>
        <div class="flex space-x-1">
          <span
            class="text-xs bg-white text-purple-600 border border-purple-200 px-2 py-1 rounded-full"
            >{{ user.unit }}</span
          >
          <span
            class="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full"
            >督導</span
          >
        </div>
      </div>



      <!-- Tabs -->
      <div class="flex space-x-2 mb-4 border-b border-gray-200 flex-none">
        <button
          @click="activeTab = 'pending'"
          :class="
            activeTab === 'pending'
              ? 'border-indigo-500 text-indigo-600'
              : 'text-gray-500'
          "
          class="flex-1 py-2 text-sm font-medium border-b-2 border-transparent hover:text-gray-700"
        >
          待審核
          <span
            v-if="pendingLeaves.length > 0"
            class="ml-1 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs"
            >{{ pendingLeaves.length }}</span
          >
        </button>
        <button
          @click="activeTab = 'history'"
          :class="
            activeTab === 'history'
              ? 'border-indigo-500 text-indigo-600'
              : 'text-gray-500'
          "
          class="flex-1 py-2 text-sm font-medium border-b-2 border-transparent hover:text-gray-700"
        >
          全部紀錄
        </button>
        <button
          @click="activeTab = 'ranking'"
          :class="
            activeTab === 'ranking'
              ? 'border-indigo-500 text-indigo-600'
              : 'text-gray-500'
          "
          class="flex-1 py-2 text-sm font-medium border-b-2 border-transparent hover:text-gray-700"
        >
          排行榜
        </button>
      </div>

      <!-- Ranking Content -->
      <div v-if="activeTab === 'ranking'" class="flex-1 overflow-y-auto space-y-4 pb-20">
          <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h3 class="text-sm font-bold text-gray-700 mb-4 flex items-center">
            🏆 本月請假排行榜
            </h3>
            <div
            v-if="monthlyStats.length === 0"
            class="text-xs text-gray-400 text-center py-4"
            >
            尚無紀錄
            </div>
            <div v-else class="space-y-4">
            <div
                v-for="(stat, idx) in monthlyStats"
                :key="stat.name"
                class="relative"
            >
                <div class="flex justify-between text-sm mb-1">
                <span class="font-medium text-gray-700 flex items-center">
                    <span
                    class="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs"
                    :class="{
                        'bg-yellow-100 text-yellow-700 font-bold': idx < 3,
                        'bg-gray-100 text-gray-500': idx >= 3,
                    }"
                    >{{ idx + 1 }}</span
                    >
                    {{ stat.name }}
                </span>
                <span class="text-indigo-600 font-bold">{{ stat.days }} 天</span>
                </div>
                <div class="bg-gray-100 rounded-full h-2.5 ml-8">
                <div
                    class="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                    :style="{ width: (stat.days / maxDays) * 100 + '%' }"
                ></div>
                </div>
            </div>
            </div>
          </div>
      </div>

      <!-- List Content -->
      <div v-else class="flex-1 overflow-y-auto space-y-4 pb-20">
        <div
          v-if="displayLeaves.length === 0"
          class="text-center py-8 text-gray-400"
        >
          沒有資料
        </div>
        <div
          v-for="leave in displayLeaves"
          :key="leave.id"
          class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
        >
          <div class="flex justify-between items-start mb-2">
            <div>
              <h3 class="font-bold text-gray-900">{{ leave.name }}</h3>
              <span class="text-xs text-gray-500"
                >{{ leave.timestamp.split("T")[0] }} 申請</span
              >
            </div>
            <span
              class="text-xs px-2 py-1 rounded-full font-medium"
              :class="statusClass(leave.status)"
              >{{ leave.leaveType }}</span
            >
          </div>
          <div class="text-sm text-gray-600 space-y-1 mb-3">
            <p>
              📅 日期:
              <span class="font-medium text-gray-800">{{ leave.date }}</span>
            </p>
            <p>📝 原因: {{ leave.reason }}</p>
            <div
              v-if="leave.cases?.length"
              class="mt-2 bg-gray-50 p-2 rounded-lg"
            >
              <p class="text-xs font-bold text-gray-500">受影響個案:</p>
              <ul class="space-y-1 mt-1">
                <li
                  v-for="(c, idx) in leave.cases"
                  :key="idx"
                  class="text-xs text-gray-700 flex justify-between"
                >
                  <span>{{ c.name }}</span
                  ><span class="text-gray-500">{{ c.time }}</span>
                </li>
              </ul>
            </div>
            <div v-if="leave.proofUrl" class="mt-2">
              <a
                :href="leave.proofUrl"
                target="_blank"
                class="text-indigo-600 text-xs hover:underline"
                >📎 查看證明文件</a
              >
            </div>
          </div>
          <div
            v-if="activeTab === 'pending'"
            class="flex space-x-2 pt-2 border-t border-gray-100"
          >
            <button
              @click="reviewLeave(leave, 'approve')"
              class="flex-1 bg-green-50 text-green-700 py-2 rounded-lg text-sm font-medium"
            >
              核准
            </button>
            <button
              @click="reviewLeave(leave, 'reject')"
              class="flex-1 bg-red-50 text-red-700 py-2 rounded-lg text-sm font-medium"
            >
              駁回
            </button>
          </div>
          <div v-else class="pt-2 border-t border-gray-100 text-right">
            <span
              class="text-xs font-bold"
              :class="statusTextClass(leave.status)"
              >{{ statusText(leave.status) }}</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Staff Form View -->
    <div v-else class="flex-1 flex flex-col min-h-0">
      <div class="mb-4 bg-indigo-50 p-3 rounded-lg flex-none">
        <span class="text-indigo-900 font-medium block"
          >👋 你好，{{ user.name }}</span
        >
      </div>

      <div class="flex space-x-2 mb-4 border-b border-gray-200 flex-none">
        <button
          @click="activeTab = 'apply'"
          :class="
            activeTab === 'apply'
              ? 'border-indigo-500 text-indigo-600'
              : 'text-gray-500'
          "
          class="flex-1 py-2 text-sm font-medium border-b-2 border-transparent"
        >
          申請請假
        </button>
        <button
          @click="activeTab = 'my_records'"
          :class="
            activeTab === 'my_records'
              ? 'border-indigo-500 text-indigo-600'
              : 'text-gray-500'
          "
          class="flex-1 py-2 text-sm font-medium border-b-2 border-transparent"
        >
          我的紀錄
        </button>
      </div>

      <!-- Apply Form -->
      <form
        v-if="activeTab === 'apply'"
        @submit.prevent="submitLeave"
        class="space-y-4 flex-1 overflow-y-auto pb-20"
      >
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >請假日期</label
          >
          <input
            type="date"
            v-model="leaveForm.date"
            required
            class="w-full rounded-lg border-gray-300 py-2 px-3 border shadow-sm"
          />
        </div>
        <div class="flex space-x-4">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >開始時間</label
            >
            <input
              type="time"
              v-model="leaveForm.startTime"
              required
              class="w-full rounded-lg border-gray-300 py-2 px-3 border shadow-sm"
            />
          </div>
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >結束時間</label
            >
            <input
              type="time"
              v-model="leaveForm.endTime"
              required
              class="w-full rounded-lg border-gray-300 py-2 px-3 border shadow-sm"
            />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >假別</label
          >
          <select
            v-model="leaveForm.leaveType"
            required
            class="w-full rounded-lg border-gray-300 py-2 px-3 border shadow-sm bg-white"
          >
            <option
              v-for="t in ['病假', '事假', '特休', '喪假', '婚假']"
              :key="t"
              :value="t"
            >
              {{ t }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >請假事由</label
          >
          <textarea
            v-model="leaveForm.reason"
            rows="2"
            required
            class="w-full rounded-lg border-gray-300 py-2 px-3 border shadow-sm"
            placeholder="請簡述原因..."
          ></textarea>
        </div>

        <div v-if="['病假', '喪假', '婚假'].includes(leaveForm.leaveType)">
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >證明文件 <span class="text-red-500">*</span></label
          >
          <!-- File Input simplified -->
          <input
            type="file"
            @change="handleFileUpload"
            accept="image/*"
            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <div v-if="leaveForm.proofPreview" class="mt-2">
            <img
              :src="leaveForm.proofPreview"
              class="h-20 rounded border border-gray-200"
            />
          </div>
        </div>

        <!-- Cases -->
        <div class="pt-4 border-t border-gray-200">
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium text-gray-900"
              >受影響個案</label
            >
            <button
              type="button"
              @click="addCase"
              class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded"
            >
              + 新增
            </button>
          </div>
          <div
            v-for="(item, idx) in leaveForm.cases"
            :key="idx"
            class="bg-gray-50 p-2 rounded mb-2 border border-gray-200"
          >
            <div class="flex space-x-2 mb-2">
              <input
                v-model="item.caseName"
                placeholder="姓名"
                class="text-sm w-1/3 rounded border-gray-300 px-2 py-1"
              />
              <input
                type="time"
                v-model="item.startTime"
                class="text-sm w-1/3 rounded border-gray-300 px-1 py-1"
              />
              <input
                type="time"
                v-model="item.endTime"
                class="text-sm w-1/3 rounded border-gray-300 px-1 py-1"
              />
            </div>
            <div class="flex justify-between items-center">
              <label class="text-xs flex items-center">
                <input type="checkbox" v-model="item.substitute" class="mr-1" />
                需代班
              </label>
              <button
                type="button"
                @click="removeCase(idx)"
                class="text-xs text-red-500"
              >
                刪除
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full btn-primary text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50"
        >
          {{ submitting ? "送出中..." : "送出申請" }}
        </button>
      </form>

      <!-- Staff History -->
      <div v-else class="flex-1 overflow-y-auto space-y-3 pb-20">
        <div
          v-for="leave in allLeaves"
          :key="leave.id"
          class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
        >
          <div class="flex justify-between">
            <div>
              <h3 class="font-bold">{{ leave.leaveType }}</h3>
              <span class="text-xs text-gray-500">{{ leave.date }}</span>
            </div>
            <span
              class="inline-flex items-center justify-center text-xs font-bold px-3 py-0 rounded-full whitespace-nowrap leading-none h-5"
              :class="getStatusBadgeClass(leave.status)"
              >{{ statusText(leave.status) }}</span
            >
          </div>
          <div v-if="leave.status === 'Pending'" class="mt-2">
            <button
              @click="cancelLeave(leave)"
              class="w-full bg-red-50 text-red-600 py-1 rounded text-sm"
            >
              撤回
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";

const props = defineProps(["user"]);
const emit = defineEmits(["back"]);

const submitting = ref(false);
const activeTab = ref("pending"); // or 'apply'
const allLeaves = ref([]);

const isSupervisor = computed(() =>
  ["Supervisor", "督導", "Business Manager", "業務負責人"].includes(
    props.user.role
  )
);

// Stats for Supervisor
const monthlyStats = computed(() => {
  // Simplified stats logic - backend should provide this or calculate from allLeaves
  // For now returning empty or mocking based on allLeaves
  const stats = {};
  allLeaves.value.forEach((l) => {
    if (l.status === "Approved") {
      stats[l.name] = (stats[l.name] || 0) + 1; // Count days roughly
    }
  });
  return Object.entries(stats)
    .map(([name, days]) => ({ name, days }))
    .sort((a, b) => b.days - a.days)
    .slice(0, 5);
});
const maxDays = computed(() =>
  monthlyStats.value.length
    ? Math.max(...monthlyStats.value.map((s) => s.days))
    : 1
);

const pendingLeaves = computed(() =>
  allLeaves.value.filter((l) => l.status === "Pending")
);
const displayLeaves = computed(() => {
  if (activeTab.value === "pending") return pendingLeaves.value;
  return allLeaves.value;
});

// Form state
const leaveForm = reactive({
  date: new Date().toISOString().split("T")[0],
  startTime: "08:00",
  endTime: "17:00",
  leaveType: "事假",
  reason: "",
  proofBase66: "",
  proofPreview: "",
  cases: [],
});

// Methods
const statusClass = (s) => {
  if (s === "Approved") return "bg-green-100 text-green-800";
  if (s === "Rejected") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
};

const getStatusBadgeClass = (s) => {
  if (s === "Approved") return "bg-green-100 text-green-800";
  if (s === "Rejected") return "bg-red-100 text-red-800";
  if (s === "Pending") return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
};
const statusText = (s) => {
  const map = {
    Approved: "已核准",
    Rejected: "已駁回",
    Pending: "待審核",
    Cancelled: "已取消",
  };
  return map[s] || s;
};
const statusTextClass = (s) => {
  if (s === "Approved") return "text-green-600";
  if (s === "Rejected") return "text-red-600";
  return "text-yellow-600";
};

const addCase = () =>
  leaveForm.cases.push({
    caseName: "",
    startTime: "",
    endTime: "",
    substitute: false,
  });
const removeCase = (idx) => leaveForm.cases.splice(idx, 1);

const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    leaveForm.proofBase66 = evt.target.result.split(",")[1]; // Strip prefix
    leaveForm.proofPreview = evt.target.result;
  };
  reader.readAsDataURL(file);
};

// API
const fetchLeaves = async () => {
  try {
    const res = await fetch("/api/get-leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: props.user.uid }),
    });
    const data = await res.json();
    if (data.success) allLeaves.value = data.leaves || [];
  } catch (e) {
    console.error(e);
  }
};

const submitLeave = async () => {
  if (
    ["病假", "喪假", "婚假"].includes(leaveForm.leaveType) &&
    !leaveForm.proofBase66
  ) {
    alert("請上傳證明");
    return;
  }
  submitting.value = true;
  try {
    const res = await fetch("/api/submit-leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...leaveForm,
        uid: props.user.uid,
        name: props.user.name,
        unit: props.user.unit,
        timeSlot: `${leaveForm.startTime} ~ ${leaveForm.endTime}`,
        duration: "0", // Calc duration if needed
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert("提交成功");
      fetchLeaves();
      activeTab.value = "my_records"; // switch to records
    } else {
      alert(data.message || "提交失敗");
    }
  } catch (e) {
    alert("系統錯誤");
  }
  submitting.value = false;
};

const reviewLeave = async (leave, action) => {
  if (!confirm(`確定要${action === "approve" ? "核准" : "駁回"}?`)) return;
  try {
    const res = await fetch("/api/review-leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: props.user.uid,
        targetUid: leave.uid,
        timestamp: leave.timestamp,
        action: action,
        name: leave.name,
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert("OK");
      fetchLeaves();
    } else {
      alert("Fail: " + data.message);
    }
  } catch (e) {
    alert(e.message);
  }
};

const cancelLeave = async (leave) => {
  if (!confirm("確定撤回?")) return;
  try {
    const res = await fetch("/api/cancel-leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: props.user.uid, timestamp: leave.timestamp }),
    });
    if ((await res.json()).success) {
      alert("已撤回");
      fetchLeaves();
    }
  } catch (e) {
    alert("Error");
  }
};

onMounted(() => {
  if (!isSupervisor.value) activeTab.value = "apply";
  fetchLeaves();
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
