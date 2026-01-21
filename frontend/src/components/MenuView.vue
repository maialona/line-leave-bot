<template>
  <div class="flex flex-col h-full animate-fade-in">
    <!-- Header -->
    <div class="mb-6 relative text-center">
      <button
        @click="$emit('back')"
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
      <h2 class="text-xl font-bold text-gray-800">請選擇服務</h2>
      <p class="text-sm text-gray-500 mt-1">您今天需要什麼協助？</p>
      
      <!-- User Info (Welcome Box) -->
      <div v-if="isSupervisor" class="mt-4 flex items-center justify-between bg-purple-50 p-3 rounded-lg text-left">
        <div>
          <span class="text-purple-900 font-medium block">👋 您好，{{ user.name }}</span>
        </div>
        <div class="flex space-x-1">
          <span class="text-xs bg-white text-purple-600 border border-purple-200 px-2 py-1 rounded-full">{{ user.unit }}</span>
          <span class="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">督導</span>
        </div>
      </div>
      <div v-else class="mt-4 flex items-center justify-between bg-primary-50 p-3 rounded-lg text-left">
        <div>
          <span class="text-primary-900 font-medium block">👋 你好，{{ user.name }}</span>
        </div>
        <div class="flex space-x-1">
          <span class="text-xs bg-white text-primary-600 border border-primary-200 px-2 py-1 rounded-full">{{ user.unit }}</span>
          <span class="text-xs bg-primary-200 text-primary-800 px-2 py-1 rounded-full">{{ user.role || '居服員' }}</span>
        </div>
      </div>
    </div>

    <!-- Menu Grid -->
    <div class="space-y-4 flex-1 overflow-y-auto pb-4">
      <!-- Bulletin -->
      <div
        @click="$emit('navigate', 'bulletin')"
        class="menu-item group hover:border-blue-200"
      >
        <div
          class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300"
        >
          📢
        </div>
        <div class="text-left flex-1 min-w-0">
          <h3
            class="font-bold text-gray-800 truncate group-hover:text-blue-600 transition-colors"
          >
            佈告欄
          </h3>
          <p class="text-xs text-gray-500 truncate">查看最新公告與通知</p>
        </div>
        <div
          class="text-gray-300 group-hover:text-blue-500 transition-colors transform group-hover:translate-x-1"
        >
          →
        </div>
      </div>

      <!-- Leave Application -->
      <div
        @click="$emit('navigate', 'leave')"
        class="menu-item group hover:border-primary-200"
      >
        <div
          class="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300"
        >
          📝
        </div>
        <div class="text-left flex-1 min-w-0">
          <h3
            class="font-bold text-gray-800 truncate group-hover:text-primary-600 transition-colors"
          >
            請假申請
          </h3>
          <p class="text-xs text-gray-500 truncate">申請事假、病假</p>
        </div>
        <div
          class="text-gray-300 group-hover:text-primary-500 transition-colors transform group-hover:translate-x-1"
        >
          →
        </div>
      </div>

      <!-- Case/Dev Apply -->
      <div
        @click="$emit('navigate', 'dev_apply')"
        class="menu-item group hover:border-green-200"
      >
        <div
          class="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300"
        >
          💼
        </div>
        <div class="text-left flex-1 min-w-0">
          <h3
            class="font-bold text-gray-800 truncate group-hover:text-green-600 transition-colors"
          >
            開案／開發申請
          </h3>
          <p class="text-xs text-gray-500 truncate">新案件與業務開發申請</p>
        </div>
        <div
          class="text-gray-300 group-hover:text-green-500 transition-colors transform group-hover:translate-x-1"
        >
          →
        </div>
      </div>

      <!-- Whisper -->
      <div
        @click="$emit('navigate', 'whisper')"
        class="menu-item group hover:border-pink-200"
      >
        <div
          class="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300"
        >
          💬
        </div>
        <div class="text-left flex-1 min-w-0">
          <h3
            class="font-bold text-gray-800 truncate group-hover:text-pink-600 transition-colors"
          >
            悄悄話
          </h3>
          <p class="text-xs text-gray-500 truncate">匿名留言與申訴</p>
        </div>
        <div
          class="text-gray-300 group-hover:text-pink-500 transition-colors transform group-hover:translate-x-1"
        >
          →
        </div>
      </div>

       <!-- Refusal Report (Supervisors Only) -->
      <div
        v-if="isSupervisor"
        @click="$emit('navigate', 'refusal_report')"
        class="menu-item group hover:border-danger-200"
      >
        <div
          class="w-12 h-12 rounded-full bg-danger-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300"
        >
          🚫
        </div>
        <div class="text-left flex-1 min-w-0">
          <h3
            class="font-bold text-gray-800 truncate group-hover:text-danger-600 transition-colors"
          >
            拒案通報站
          </h3>
          <p class="text-xs text-gray-500 truncate">通報拒案居服員</p>
        </div>
        <div
          class="text-gray-300 group-hover:text-danger-500 transition-colors transform group-hover:translate-x-1"
        >
          →
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useUserStore } from "../stores/user.js";

const store = useUserStore();
const user = computed(() => store.user);
const isSupervisor = computed(() => ["Supervisor", "督導", "Business Manager", "業務負責人"].includes(user.value?.role));

// defineProps(["user"]);
defineEmits(["navigate", "back"]);
</script>

<style scoped>
.menu-item {
  @apply bg-white p-5 rounded-2xl border border-gray-100 shadow-sm 
         hover:shadow-md transition-all duration-300 cursor-pointer 
         flex items-center space-x-4 bg-opacity-80 backdrop-blur-sm;
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
