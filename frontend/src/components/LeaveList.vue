<template>
  <div class="flex-1 overflow-y-auto space-y-4 pb-20">
    <div v-if="leaves.length === 0" class="text-center py-8 text-gray-400">
      {{ emptyMessage || '沒有資料' }}
    </div>
    
    <div
      v-for="leave in leaves"
      :key="leave.id"
      class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
    >
      <!-- Header -->
      <div class="flex justify-between items-start mb-2">
        <div class="space-y-1">
          <div class="flex items-center space-x-2">
             <h3 class="font-bold text-gray-900 text-base m-0">{{ leave.name || leave.leaveType }}</h3>
             <span v-if="showName && leave.timestamp" class="text-xs text-gray-400 font-normal">
               {{ leave.timestamp.split("T")[0] }}
             </span>
          </div>
          
          <div class="flex flex-col space-y-1">
             <span class="text-sm font-medium text-gray-800">
               請假日期：{{ leave.date }}
             </span>
          </div>
        </div>
        <span
          class="text-xs px-2 py-1 rounded-full font-medium"
          :class="statusClass(leave.status)"
        >
          {{ showName ? leave.leaveType : statusText(leave.status) }}
        </span>
      </div>

      <!-- Details -->
      <div class="text-sm text-gray-600 space-y-1 mb-3">
         <div class="mb-1">
             <p class="text-gray-700">
                時間：{{ leave.timeSlot || '全天' }}
             </p>
         </div>
         <div v-if="showName && leave.reason">
             <p>原因：{{ leave.reason }}</p>
         </div>
         <div v-if="leave.cases?.length" class="mt-2 bg-gray-50 p-2 rounded-lg">
             <p class="text-xs font-bold text-gray-500 mb-1">受影響個案:</p>
             <ul class="space-y-1">
                 <li v-for="(c, idx) in leave.cases" :key="idx" class="text-xs text-gray-700 flex justify-between items-center">
                     <div class="flex items-center space-x-2">
                        <span>{{ c.name }}</span>
                        <span v-if="c.substitute" class="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold">需代班</span>
                     </div>
                     <span class="text-gray-500 font-mono">{{ c.time }}</span>
                 </li>
             </ul>
         </div>
         <div v-if="leave.proofUrl" class="mt-2">
              <a :href="leave.proofUrl" target="_blank" class="text-indigo-600 text-xs hover:underline">📎 查看證明文件</a>
         </div>
      </div>

      <!-- Actions -->
      <div v-if="actions" class="flex space-x-2 pt-2 border-t border-gray-100">
          <slot name="actions" :leave="leave"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { LEAVE_STATUS } from '../constants/common.js';

defineProps({
  leaves: Array,
  showName: Boolean, // True for Supervisor view (Detailed), False for Staff view (Simple)
  actions: Boolean,
  emptyMessage: String
});

const statusClass = (s) => {
  if (s === LEAVE_STATUS.APPROVED) return "bg-green-100 text-green-800";
  if (s === LEAVE_STATUS.REJECTED) return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
};

const statusTextClass = (s) => {
  if (s === LEAVE_STATUS.APPROVED) return "text-green-600";
  if (s === LEAVE_STATUS.REJECTED) return "text-red-600";
  return "text-yellow-600";
};

const statusText = (s) => {
  const map = {
    [LEAVE_STATUS.APPROVED]: "已核准",
    [LEAVE_STATUS.REJECTED]: "已駁回",
    [LEAVE_STATUS.PENDING]: "待審核",
    [LEAVE_STATUS.CANCELLED]: "已取消",
  };
  return map[s] || s;
};
</script>
