<template>
  <div class="flex flex-col h-full animate-fade-in">
    <!-- Header -->
    <div class="mb-6 relative text-center">
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
      <h1 class="text-2xl font-bold text-gray-900">開案/開發申請</h1>
      <button
        @click="showHelp = true"
        class="absolute right-0 top-1 text-gray-400 hover:text-indigo-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </div>

    <!-- Supervisor Dashboard (Tabs) -->
    <div v-if="isSupervisor" class="mb-4">
      <div class="flex items-center justify-center space-x-2 mb-2">
        <span
          class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
          >{{ user.role }}</span
        >
        <span
          class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full"
          >{{ user.unit }}</span
        >
      </div>
      <div class="flex space-x-2 bg-gray-100 p-1 rounded-lg">
        <button
          @click="activeTab = 'apply'"
          :class="
            activeTab === 'apply'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-500'
          "
          class="flex-1 py-2 text-sm font-medium rounded-md transition"
        >
          📝 填寫申請
        </button>
        <button
          @click="
            activeTab = 'review';
            fetchCases();
          "
          :class="
            activeTab === 'review'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-500'
          "
          class="flex-1 py-2 text-sm font-medium rounded-md transition relative"
        >
          📋 審核案件
          <span
            v-if="pendingCases.length > 0"
            class="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"
          ></span>
        </button>
      </div>
    </div>

    <!-- Review View (Supervisor) -->
    <div
      v-if="activeTab === 'review'"
      class="flex-1 overflow-y-auto space-y-4 pb-10"
    >
      <div
        v-if="pendingCases.length === 0"
        class="text-center py-8 text-gray-400"
      >
        沒有待審核案件
      </div>
      <div
        v-for="c in pendingCases"
        :key="c.timestamp"
        class="bg-white border border-green-100 rounded-xl p-4 shadow-sm relative overflow-hidden"
      >
        <div class="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
        <div class="flex justify-between items-start mb-2 pl-2">
          <div>
            <h3 class="font-bold text-gray-900 text-lg">{{ c.applicant }}</h3>
            <span class="text-xs text-gray-500 block"
              >{{ c.timestamp.split("T")[0] }} • {{ c.agency }}</span
            >
          </div>
          <span
            class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium"
            >{{ c.applyTypes }}</span
          >
        </div>

        <div class="pl-2 mb-3 space-y-1 text-sm text-gray-700">
          <p>
            <span class="font-bold text-gray-500 text-xs uppercase">個案</span>
            {{ c.caseName }} ({{ c.gender }})
          </p>
          <p>
            <span class="font-bold text-gray-500 text-xs uppercase">區域</span>
            {{ c.area }}
          </p>
        </div>

        <div class="flex space-x-2 pt-2 border-t border-gray-100 pl-2">
          <button
            @click="reviewCase(c, 'approve')"
            class="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium shadow"
          >
            核准
          </button>
          <button
            @click="reviewCase(c, 'reject')"
            class="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium"
          >
            駁回
          </button>
        </div>
      </div>
    </div>

    <!-- Application Form -->
    <form
      v-else
      @submit.prevent="submit"
      class="space-y-4 flex-1 overflow-y-auto pb-10"
    >
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >申請人</label
          >
          <input
            type="text"
            :value="user.name"
            disabled
            class="w-full bg-gray-100 rounded-lg border-gray-300 py-2 px-3 border text-gray-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >員工編號 <span class="text-red-500">*</span></label
          >
          <input
            type="text"
            v-model="form.staffId"
            required
            class="w-full rounded-lg border-gray-300 py-2 px-3 border"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >所屬機構 <span class="text-red-500">*</span></label
          >
          <select
            v-model="form.agency"
            required
            class="w-full rounded-lg border-gray-300 py-2 px-3 border bg-white"
          >
            <option
              v-for="opt in ['府城', '鴻康', '謙益', '寬澤']"
              :key="opt"
              :value="opt"
            >
              {{ opt }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >個案區域 <span class="text-red-500">*</span></label
          >
          <select
            v-model="form.area"
            required
            class="w-full rounded-lg border-gray-300 py-2 px-3 border bg-white"
          >
            <option
              v-for="opt in [
                '東區',
                '南區',
                '中西區',
                '北區',
                '安平區',
                '安南區',
                '安定區',
                '永康區',
                '新市區',
                '新化區',
                '歸仁區',
                '仁德區',
              ]"
              :key="opt"
              :value="opt"
            >
              {{ opt }}
            </option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1"
          >個案姓名 <span class="text-red-500">*</span></label
        >
        <input
          type="text"
          v-model="form.caseName"
          required
          class="w-full rounded-lg border-gray-300 py-2 px-3 border"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2"
          >性別 <span class="text-red-500">*</span></label
        >
        <div class="flex space-x-6">
          <label class="flex items-center"
            ><input
              type="radio"
              v-model="form.gender"
              value="男"
              class="text-green-600 mr-2"
            />
            男</label
          >
          <label class="flex items-center"
            ><input
              type="radio"
              v-model="form.gender"
              value="女"
              class="text-green-600 mr-2"
            />
            女</label
          >
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2"
          >申請類別 <span class="text-red-500">*</span></label
        >
        <div class="flex space-x-6">
          <label class="flex items-center"
            ><input
              type="radio"
              v-model="form.applyType"
              value="開案"
              class="text-green-600 mr-2"
            />
            開案</label
          >
          <label class="flex items-center"
            ><input
              type="radio"
              v-model="form.applyType"
              value="開發"
              class="text-green-600 mr-2"
            />
            開發</label
          >
        </div>
      </div>

      <button
        type="submit"
        :disabled="submitting"
        class="w-full btn-primary !bg-gradient-to-r !from-green-500 !to-teal-600 text-white font-bold py-3 rounded-xl shadow-lg mt-4 disabled:opacity-50"
      >
        {{ submitting ? "送出中..." : "送出申請" }}
      </button>
    </form>

    <!-- Help Modal -->
    <div
      v-if="showHelp"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-white w-full max-w-sm rounded-xl p-5 shadow-2xl relative max-h-[80vh] overflow-y-auto"
      >
        <button
          @click="showHelp = false"
          class="absolute top-3 right-3 text-gray-400"
        >
          ✕
        </button>
        <h3 class="font-bold text-lg mb-4 text-center">獎金說明</h3>
        <div class="space-y-4 text-sm text-gray-600">
          <div class="bg-green-50 p-3 rounded-lg border border-green-100">
            <h4 class="font-bold text-green-800 mb-2">💰 開案獎金</h4>
            <ul class="list-disc pl-4 space-y-1">
              <li>滿一年結算：</li>
              <li>1案: $3,000</li>
              <li>2案: $3,500</li>
              <li>3案: $4,000</li>
              <li>4案: $4,500</li>
              <li>5案+: $5,000/案</li>
            </ul>
          </div>
          <div class="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <h4 class="font-bold text-blue-800 mb-2">📈 開發獎金</h4>
            <p>(變更後 - 初始) × 8% × 實際月數 (Max 3)</p>
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

const activeTab = ref("apply");
const submitting = ref(false);
const showHelp = ref(false);
const pendingCases = ref([]);

const isSupervisor = computed(() =>
  ["Supervisor", "督導", "Business Manager", "業務負責人"].includes(
    props.user.role
  )
);

const form = reactive({
  staffId: "",
  agency: "",
  area: "",
  caseName: "",
  gender: "",
  applyType: "",
});

const submit = async () => {
  if (
    !form.staffId ||
    !form.agency ||
    !form.area ||
    !form.caseName ||
    !form.gender ||
    !form.applyType
  ) {
    return alert("請填寫完整");
  }
  submitting.value = true;
  try {
    const res = await fetch("/api/submit-case", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        uid: props.user.uid,
        applicant: props.user.name,
        applyTypes: form.applyType,
      }),
    });
    if ((await res.json()).success) {
      alert("申請已送出");
      Object.assign(form, {
        agency: "",
        area: "",
        caseName: "",
        gender: "",
        applyType: "",
      });
    } else alert("失敗");
  } catch (e) {
    alert("Error");
  }
  submitting.value = false;
};

const fetchCases = async () => {
  try {
    const res = await fetch("/api/get-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: props.user.uid, unit: props.user.unit }),
    });
    const data = await res.json();
    pendingCases.value = data.cases
      ? data.cases.filter((c) => c.status === "Pending")
      : [];
  } catch (e) {
    console.error(e);
  }
};

const reviewCase = async (c, action) => {
  if (!confirm(`確定${action === "approve" ? "核准" : "駁回"}?`)) return;
  try {
    const res = await fetch("/api/review-case", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: props.user.uid,
        reviewerName: props.user.name,
        timestamp: c.timestamp,
        action: action,
      }),
    });
    if ((await res.json()).success) {
      alert("已更新");
      fetchCases();
    } else alert("失敗");
  } catch (e) {
    alert("Error");
  }
};

onMounted(() => {
  if (isSupervisor.value) {
    // activeTab.value = 'review';
    fetchCases();
  }
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
