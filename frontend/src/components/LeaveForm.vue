<template>
  <form @submit.prevent="handleSubmit" class="space-y-4 flex-1 overflow-y-auto pb-20">
    <div class="flex space-x-4">
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
        <input
          type="date"
          v-model="form.startDate"
          required
          class="w-full rounded-lg border-gray-300 py-2 px-3 border shadow-sm"
        />
      </div>
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700 mb-1">結束日期</label>
        <input
          type="date"
          v-model="form.endDate"
          required
          class="w-full rounded-lg border-gray-300 py-2 px-3 border shadow-sm"
        />
      </div>
    </div>
    
    <div class="flex space-x-4">
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700 mb-1">開始時間</label>
        <input
          type="time"
          v-model="form.startTime"
          required
          class="w-full rounded-lg border-gray-300 py-2 px-3 border shadow-sm"
        />
      </div>
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700 mb-1">結束時間</label>
        <input
          type="time"
          v-model="form.endTime"
          required
          class="w-full rounded-lg border-gray-300 py-2 px-3 border shadow-sm"
        />
      </div>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">假別</label>
      <select
        v-model="form.leaveType"
        required
        class="w-full rounded-lg border-gray-300 py-2 px-3 border shadow-sm bg-white"
      >
        <option v-for="t in leaveTypes" :key="t" :value="t">{{ t }}</option>
      </select>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">請假事由</label>
      <textarea
        v-model="form.reason"
        rows="2"
        required
        class="w-full rounded-lg border-gray-300 py-2 px-3 border shadow-sm"
        placeholder="請簡述原因..."
      ></textarea>
    </div>

    <!-- Proof Upload -->
    <div v-if="['病假', '喪假', '婚假'].includes(form.leaveType)">
      <label class="block text-sm font-medium text-gray-700 mb-1">
        證明文件 <span class="text-red-500">*</span>
      </label>
      <input
        type="file"
        @change="handleFileUpload"
        accept="image/*"
        class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
      />
      <div v-if="form.proofPreview" class="mt-2">
        <img :src="form.proofPreview" class="h-20 rounded border border-gray-200" />
      </div>
    </div>

    <!-- Cases (Nested) -->
    <div class="pt-4 border-t border-gray-200">
      <div class="flex justify-between items-center mb-2">
        <label class="block text-sm font-medium text-gray-900">受影響個案 <span class="text-red-500">*</span></label>
        <button
          v-if="!form.noCase"
          type="button"
          @click="addCase"
          class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded"
        >
          + 新增個案
        </button>
      </div>

      <!-- Option A: No Case Checkbox -->
      <div class="mb-3 flex items-center">
          <input 
            type="checkbox" 
            id="noCase" 
            v-model="form.noCase" 
            class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          >
          <label for="noCase" class="ml-2 text-sm text-gray-600 font-medium">此時段無排定服務個案</label>
      </div>

      <div v-if="!form.noCase" class="space-y-4">
        <div
            v-for="(caseItem, cIdx) in form.cases"
            :key="cIdx"
            class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
            <!-- Case Header -->
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1 mr-4">
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">個案姓名</label>
                    <input
                        v-model="caseItem.caseName"
                        placeholder="請輸入姓名"
                        class="w-full text-lg font-bold text-gray-800 border-b-2 border-gray-100 focus:border-primary-500 transition-colors bg-transparent px-1 py-1 placeholder:font-normal placeholder:text-gray-300 outline-none"
                    />
                </div>
                <button type="button" @click="removeCase(cIdx)" class="text-gray-300 hover:text-danger-500 transition-colors p-2 rounded-full hover:bg-danger-50" title="移除此個案">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
            
            <!-- Time Slots -->
            <div class="space-y-3">
                <div v-for="(slot, sIdx) in caseItem.slots" :key="sIdx" class="grid grid-cols-[1fr_auto_auto] items-center gap-3 bg-gray-50 pl-3 py-3 pr-5 rounded-xl border border-gray-100 group">
                    <!-- Time Range Inputs -->
                    <div class="flex items-center gap-2 min-w-0 overflow-hidden">
                         <div class="relative flex-1 min-w-0">
                            <input
                                type="time"
                                v-model="slot.startTime"
                                class="w-full bg-white rounded-lg border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-transparent py-2 pl-1 shadow-sm"
                            />
                         </div>
                         <div class="relative flex-1 min-w-0">
                            <input
                                type="time"
                                v-model="slot.endTime"
                                class="w-full bg-white rounded-lg border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-transparent py-2 pl-1 shadow-sm"
                            />
                         </div>
                    </div>

                    <!-- Substitute Toggle Badge -->
                    <label 
                        class="cursor-pointer flex items-center justify-center w-10 h-9 rounded-lg border transition-all select-none flex-shrink-0"
                        :class="slot.substitute ? 'bg-danger-50 border-danger-200 text-danger-600' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:bg-gray-50'"
                        title="切換代班狀態"
                    >
                        <input type="checkbox" v-model="slot.substitute" class="hidden" />
                        <span class="text-sm font-bold leading-none">代</span>
                    </label>
                    
                    <!-- Remove Slot Button -->
                    <button type="button" @click="removeSlot(cIdx, sIdx)" class="flex-shrink-0 text-gray-300 hover:text-danger-500 transition-colors p-2 rounded-full hover:bg-danger-50">
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <!-- Add Slot Button -->
                <button
                    type="button"
                    @click="addSlot(cIdx)"
                    class="w-full py-2.5 border-2 border-dashed border-primary-100 text-primary-500 rounded-xl hover:bg-primary-50 hover:border-primary-200 transition-all text-sm font-bold flex items-center justify-center group"
                >
                    <svg class="w-4 h-4 mr-1 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    新增時段
                </button>
            </div>
        </div>
      </div>
    </div>

    <button
      type="submit"
      :disabled="submitting"
      class="w-full bg-primary-600 hover:bg-primary-700 transition-colors text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50"
    >
      {{ submitting ? "送出中..." : "送出申請" }}
    </button>
  </form>
</template>

<script setup>
import { computed } from 'vue';
import { LEAVE_TYPES } from '../constants/common.js';
import { useToast } from '../composables/useToast.js';

const { addToast } = useToast();

const props = defineProps({
  form: Object,
  submitting: Boolean
});

const emit = defineEmits(['submit']);

const leaveTypes = LEAVE_TYPES;

const handleSubmit = () => {
  // If noCase is checked, skip validation
  if (!props.form.noCase) {
      if (!props.form.cases || props.form.cases.length === 0) {
        addToast('無法送出: 請至少新增一個受影響個案 (按 + 新增)', 'warning');
        return;
      }
      
      for (const c of props.form.cases) {
          if (!c.caseName) {
            addToast('請填寫個案姓名', 'warning');
            return;
          }
          if (!c.slots || c.slots.length === 0) {
            addToast(`請為個案 ${c.caseName} 新增至少一個時段`, 'warning');
            return;
          }
           const incompleteSlot = c.slots.some(s => !s.startTime || !s.endTime);
           if (incompleteSlot) {
               addToast(`個案 ${c.caseName} 的時段資訊不完整`, 'warning');
               return;
           }
      }
  }
  emit('submit');
};

const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Compression Logic
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Max Dimension 1024px
      const MAX_SIZE = 1024;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Compress to JPEG 0.7
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      
      // Store FULL Data URL (Backend utils will parse it)
      props.form.proofBase66 = dataUrl; 
      props.form.proofPreview = dataUrl;
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
};

const addCase = () => {
    // Nested Structure
    props.form.cases.push({
        caseName: "",
        slots: [{ startTime: "", endTime: "", substitute: false }]
    });
};

const removeCase = (idx) => {
    props.form.cases.splice(idx, 1);
};

const addSlot = (caseIdx) => {
    props.form.cases[caseIdx].slots.push({ startTime: "", endTime: "", substitute: false });
};

const removeSlot = (caseIdx, slotIdx) => {
    props.form.cases[caseIdx].slots.splice(slotIdx, 1);
};
</script>
