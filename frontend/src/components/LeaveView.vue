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
                    class="bg-indigo-500 h-2.5 rounded-full animate-bar"
                    :style="{ width: (stat.days / maxDays) * 100 + '%' }"
                ></div>
                </div>
            </div>
            </div>
          </div>
      </div>

      <!-- Leave List Content -->
      <LeaveList 
         v-else 
         :leaves="displayLeaves" 
         :showName="true" 
         :actions="activeTab === 'pending'"
         emptyMessage="沒有資料"
      >
         <template #actions="{ leave }">
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
         </template>
      </LeaveList>
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
      <LeaveForm 
         v-if="activeTab === 'apply'" 
         :form="leaveForm" 
         :submitting="submitting" 
         @submit="handleFormSubmit" 
      />

      <!-- Staff History (Loading & List) -->
      <div v-else class="flex-1 overflow-y-auto space-y-3 pb-20">
        <!-- Loading Skeleton -->
        <div v-if="loading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div class="flex justify-between mb-2">
               <div class="space-y-2">
                 <Skeleton width="80px" height="1.25rem" />
                 <Skeleton width="120px" height="0.75rem" />
               </div>
               <Skeleton width="60px" height="1.5rem" borderRadius="9999px" />
            </div>
          </div>
        </div>

        <!-- List Content -->
        <LeaveList 
           v-else 
           :leaves="allLeaves" 
           :showName="false" 
           :actions="true"
           emptyMessage="尚無紀錄"
        >
            <template #actions="{ leave }">
                <button
                   v-if="leave.status === 'Pending'"
                   @click="cancelLeave(leave)"
                   class="w-full bg-red-50 text-red-600 py-1 rounded text-sm"
                 >
                   撤回
                 </button>
            </template>
        </LeaveList>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import Skeleton from "./Skeleton.vue";
import LeaveForm from "./LeaveForm.vue";
import LeaveList from "./LeaveList.vue";
import { useLeave } from "../composables/useLeave.js";
import { useUserStore } from "../stores/user.js";

const store = useUserStore();
// const props = defineProps(["user"]);
const emit = defineEmits(["back"]);

const user = computed(() => store.user); // Added for template usage

const activeTab = ref("pending"); // or 'apply'

const {
    loading, submitting, allLeaves, isSupervisor, pendingLeaves, leaveForm,
    getLeaves, submitLeave, reviewLeave, cancelLeave
} = useLeave(store.user);

const handleFormSubmit = async () => {
    const success = await submitLeave();
    if (success) {
        activeTab.value = 'my_records';
    }
};

const displayLeaves = computed(() => {
  if (activeTab.value === "pending") return pendingLeaves.value;
  return allLeaves.value;
});

// Stats for Supervisor (Keep local for now, could be extracted too)
const monthlyStats = computed(() => {
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

onMounted(() => {
  if (!isSupervisor.value) activeTab.value = "apply";
  getLeaves();
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
@keyframes grow-bar {
  from {
    width: 0;
  }
}
.animate-bar {
  animation: grow-bar 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
</style>
