<template>
  <div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] flex flex-col items-center space-y-3 w-full max-w-sm pointer-events-none px-4">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-center p-3 rounded-xl shadow-xl bg-white/95 backdrop-blur-sm border border-gray-100 w-full transition-all duration-300 overflow-hidden relative group"
      >
        <!-- Colored Indicator Line -->
        <div class="absolute left-0 top-0 bottom-0 w-1" :class="getToastColor(toast.type).bar"></div>

        <!-- Icon Wrapper -->
        <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3" :class="getToastColor(toast.type).bg">
             <span class="text-xl" :class="getToastColor(toast.type).text" v-html="getToastIcon(toast.type)"></span>
        </div>

        <!-- Message -->
        <div class="flex-1 min-w-0">
             <p class="text-sm font-semibold text-gray-800 leading-tight">{{ getToastTitle(toast.type) }}</p>
             <p class="text-xs text-gray-500 mt-0.5 truncate">{{ toast.message }}</p>
        </div>

        <!-- Close Button -->
        <button @click="removeToast(toast.id)" class="ml-3 text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-md hover:bg-gray-50 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToast } from '../composables/useToast.js';

const { toasts, removeToast } = useToast();

const getToastColor = (type) => {
    switch(type) {
        case 'success': 
            return { bar: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-600' };
        case 'error': 
            return { bar: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-600' };
        case 'warning': 
            return { bar: 'bg-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-600' };
        default: 
            return { bar: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' };
    }
};

const getToastTitle = (type) => {
    switch(type) {
        case 'success': return '成功';
        case 'error': return '錯誤';
        case 'warning': return '注意';
        default: return '提示';
    }
};

const getToastIcon = (type) => {
    // Simple SVGs as string or just usage of v-html for simplicity here
    // Or we can use emoji for now inside the new design if user prefers standard icons, but SVG is better.
    // Let's use simple SVG strings.
    const icons = {
        success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
        error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`,
        warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
        info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
    };
    return icons[type] || icons.info;
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
