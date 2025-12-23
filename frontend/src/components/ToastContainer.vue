<template>
  <div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] flex flex-col items-center space-y-2 w-full max-w-sm pointer-events-none">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-center px-4 py-3 rounded-lg shadow-lg text-white font-medium text-sm w-fit max-w-[90%] transition-all duration-300"
        :class="typeClasses[toast.type] || typeClasses.info"
      >
        <!-- Icon -->
        <span class="mr-2 text-lg">
            {{ icons[toast.type] }}
        </span>
        <span>{{ toast.message }}</span>
        <!-- Close Button (Optional, simple click to dismiss can be added to container) -->
        <button @click="removeToast(toast.id)" class="ml-4 opacity-70 hover:opacity-100 focus:outline-none">
           ✕
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToast } from '../composables/useToast.js';

const { toasts, removeToast } = useToast();

const typeClasses = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  warning: 'bg-yellow-600',
  info: 'bg-gray-700',
};

const icons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};
</script>

<style scoped>
.toast-move,
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-leave-active {
  position: absolute;
}
</style>
