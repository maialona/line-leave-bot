<template>
  <div class="flex-1 overflow-y-auto pb-20">
    <div v-if="leaves.length === 0" class="text-center py-8 text-gray-400">
      {{ emptyMessage || '沒有資料' }}
    </div>

    <!-- Supervisor View: Grouped by Person -->
    <div v-if="showName && leaves.length > 0" class="space-y-3">
        <div 
            v-for="group in groupedLeaves" 
            :key="group.uid"
            class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
        >
            <!-- Accordion Header -->
            <div 
                @click="toggleGroup(group.uid)"
                class="flex justify-between items-center p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
            >
                <div class="flex items-center space-x-2">
                     <span class="transform transition-transform text-gray-400" :class="{ 'rotate-90': expandedGroups.has(group.uid) }">▶</span>
                     <h3 class="font-bold text-gray-900">{{ group.name }}</h3>
                     <span class="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full font-bold">
                         {{ group.leaves.length }} 筆
                     </span>
                </div>
                <!-- Batch Actions -->
                <div v-if="actions" class="flex space-x-2">
                    <button 
                        @click.stop="$emit('batch-review', group.leaves, 'approve')"
                        class="bg-success-600 text-white text-xs px-3 py-1.5 rounded-lg shadow hover:bg-success-700"
                    >
                        全部核准
                    </button>
                </div>
            </div>

            <!-- Accordion Body -->
            <div v-show="expandedGroups.has(group.uid)" class="p-3 bg-gray-50/50 space-y-3 border-t border-gray-200">
                 <div v-for="leave in group.leaves" :key="leave.id" class="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                     <!-- Card Content (Reused Simplified) -->
                     <div class="flex justify-between items-start mb-2">
                         <div class="space-y-1">
                             <div class="flex items-center space-x-2">
                                <span class="text-xs text-gray-400 font-normal">{{ leave.timestamp.split("T")[0] }}</span>
                             </div>
                             <div class="text-sm font-medium text-gray-800">請假日期：{{ leave.date }}</div>
                         </div>
                         <span class="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 whitespace-nowrap ml-2" :class="statusClass(leave.status)">
                             {{ leave.leaveType }}
                         </span>
                     </div>
                     <div class="text-sm text-gray-600 space-y-1 mb-2">
                        <p>時間：{{ leave.timeSlot || '全天' }}</p>
                        <p v-if="leave.reason">原因：{{ leave.reason }}</p>
                        <ul v-if="leave.cases?.length" class="bg-gray-50 p-2 rounded mt-1 space-y-1">
                             <li v-for="(c, i) in leave.cases" :key="i" class="text-xs flex items-center space-x-2">
                                 <span>{{ c.name }}</span>
                                 <span v-if="c.substitute" class="text-danger-600 bg-danger-50 px-1 rounded">需代班</span>
                             </li>
                        </ul>
                        <div v-if="leave.proofUrl">
                             <a :href="leave.proofUrl" target="_blank" class="text-primary-600 text-xs hover:underline">📎 證明</a>
                        </div>
                     </div>
                     <!-- Single Action Slot -->
                     <div v-if="actions" class="flex space-x-2 pt-2 border-t border-gray-100">
                         <slot name="actions" :leave="leave"></slot>
                     </div>
                 </div>
            </div>
        </div>
    </div>
    
    <!-- Staff View: Flat List with Accordion -->
    <div v-else class="space-y-3">
        <div
        v-for="leave in filteredLeaves"
        :key="leave.timestamp"
        class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
        >
        <!-- Accordion Header -->
        <div 
            @click="toggleLeave(leave.timestamp)"
            class="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
        >
            <div class="space-y-1">
                <div class="flex items-center space-x-2">
                    <span class="transform transition-transform text-gray-400 text-xs mr-1" :class="{ 'rotate-90': expandedLeaves.has(leave.timestamp) }">▶</span>
                    <h3 class="font-bold text-gray-900 text-base m-0">{{ leave.name || leave.leaveType }}</h3>
                    <span v-if="showName && leave.timestamp" class="text-xs text-gray-400 font-normal">
                    {{ leave.timestamp.split("T")[0] }}
                    </span>
                </div>
                <div class="text-sm font-medium text-gray-800 ml-4">
                    請假日期：{{ leave.date }}
                </div>
            </div>
            <span
            class="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 whitespace-nowrap ml-2"
            :class="statusClass(leave.status)"
            >
            {{ statusText(leave.status) }}
            </span>
        </div>

        <!-- Accordion Body -->
        <div v-show="expandedLeaves.has(leave.timestamp)" class="p-4 bg-gray-50 border-t border-gray-100 space-y-3 animation-fade-in">
            <!-- Details -->
            <div class="text-sm text-gray-600 space-y-1">
                <p>時間：{{ leave.timeSlot || '全天' }}</p>
                <p v-if="leave.reason">原因：{{ leave.reason }}</p>
                <ul v-if="leave.cases?.length" class="bg-white border border-gray-100 p-3 rounded-lg mt-2 space-y-2">
                    <li v-for="(c, i) in leave.cases" :key="i" class="text-sm flex justify-between items-center">
                        <span class="font-medium text-gray-700">{{ c.name }}</span>
                        <span v-if="c.substitute" class="text-xs text-danger-600 bg-danger-50 px-2 py-0.5 rounded border border-danger-100">需代班</span>
                    </li>
                </ul>
                <a v-if="leave.proofUrl" :href="leave.proofUrl" target="_blank" class="text-primary-600 text-xs hover:underline">📎 查看證明文件</a>
            </div>
            <!-- Actions -->
            <div v-if="actions" class="flex space-x-2 pt-2 border-t border-gray-100">
                <slot name="actions" :leave="leave"></slot>
            </div>
        </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'; // Added ref
import { LEAVE_STATUS } from '../constants/common.js';

const props = defineProps({
  leaves: Array,
  showName: Boolean, // True for Supervisor view (Detailed), False for Staff view (Simple)
  actions: Boolean,
  emptyMessage: String
});

const emit = defineEmits(['batch-review']);

const expandedGroups = ref(new Set());

const filteredLeaves = computed(() => {
    return props.leaves ? props.leaves.filter(l => l.status !== LEAVE_STATUS.CANCELLED) : [];
});

const toggleGroup = (uid) => {
    if (expandedGroups.value.has(uid)) {
        expandedGroups.value.delete(uid);
    } else {
        expandedGroups.value.add(uid);
    }
};

const expandedLeaves = ref(new Set());

const toggleLeave = (key) => {
    if (expandedLeaves.value.has(key)) {
        expandedLeaves.value.delete(key);
    } else {
        expandedLeaves.value.add(key);
    }
};

const groupedLeaves = computed(() => {
    if (!props.showName) return [];
    
    const groups = {};
    filteredLeaves.value.forEach(l => {
        // Use UID as key, but fall back to Name if UID invalid (though backend sends UID)
        const key = l.uid || l.name; 
        if (!groups[key]) {
            groups[key] = {
                uid: key,
                name: l.name,
                leaves: []
            };
        }
        groups[key].leaves.push(l);
    });
    
    // Sort by Number of Leaves (Descending)
    return Object.values(groups).sort((a, b) => b.leaves.length - a.leaves.length);
});

const statusClass = (s) => {
  if (s === LEAVE_STATUS.APPROVED) return "bg-success-100 text-success-800";
  if (s === LEAVE_STATUS.REJECTED) return "bg-danger-100 text-danger-800";
  return "bg-warning-100 text-warning-800";
};

const statusTextClass = (s) => {
  if (s === LEAVE_STATUS.APPROVED) return "text-success-600";
  if (s === LEAVE_STATUS.REJECTED) return "text-danger-600";
  return "text-warning-600";
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
