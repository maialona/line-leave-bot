<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
    <div class="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-scale-in">
      <h3 class="text-lg font-bold text-gray-900 mb-2">{{ title }}</h3>
      <p class="text-sm text-gray-600 mb-6">{{ message }}</p>
      
      <div class="flex space-x-3">
        <button
          @click="$emit('cancel')"
          class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        <button
          @click="$emit('confirm')"
          class="flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          :class="confirmButtonClass || 'bg-indigo-600 hover:bg-indigo-700'"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isOpen: Boolean,
  title: {
    type: String,
    default: "確認"
  },
  message: {
    type: String,
    default: "確定要執行此動作嗎?"
  },
  confirmText: {
    type: String,
    default: "確定"
  },
  confirmButtonClass: {
    type: String,
    default: ""
  }
});

defineEmits(['confirm', 'cancel']);
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}
.animate-scale-in {
  animation: scaleIn 0.2s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
