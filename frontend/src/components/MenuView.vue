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
        class="menu-item group hover:border-indigo-200"
      >
        <div
          class="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300"
        >
          📝
        </div>
        <div class="text-left flex-1 min-w-0">
          <h3
            class="font-bold text-gray-800 truncate group-hover:text-indigo-600 transition-colors"
          >
            請假申請
          </h3>
          <p class="text-xs text-gray-500 truncate">申請事假、病假</p>
        </div>
        <div
          class="text-gray-300 group-hover:text-indigo-500 transition-colors transform group-hover:translate-x-1"
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
    </div>
  </div>
</template>

<script setup>
defineProps(["user"]);
defineEmits(["navigate", "back"]);

const alert = (msg) => window.alert(msg);
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
