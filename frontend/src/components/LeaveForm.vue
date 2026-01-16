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

      <div v-if="!form.noCase" class="space-y-3">
        <div
            v-for="(caseItem, cIdx) in form.cases"
            :key="cIdx"
            class="bg-white p-3 rounded-lg border border-gray-200 shadow-sm"
        >
            <div class="flex justify-between items-center mb-2">
                <input
                    v-model="caseItem.caseName"
                    placeholder="個案姓名"
                    class="font-bold text-gray-800 w-2/3 border-b border-gray-300 focus:border-indigo-500 px-1 py-1"
                />
                <button type="button" @click="removeCase(cIdx)" class="text-xs text-red-500">移除個案</button>
            </div>
            
            <!-- Time Slots -->
            <div class="space-y-2 pl-2 border-l-2 border-indigo-100">
                <div v-for="(slot, sIdx) in caseItem.slots" :key="sIdx" class="flex items-center space-x-2">
                    <input
                        type="time"
                        v-model="slot.startTime"
                        class="text-sm w-24 rounded border-gray-300 px-1 py-1"
                    />
                    <span class="text-gray-400">-</span>
                    <input
                        type="time"
                        v-model="slot.endTime"
                        class="text-sm w-24 rounded border-gray-300 px-1 py-1"
                    />
                    <label class="flex items-center cursor-pointer">
                        <input type="checkbox" v-model="slot.substitute" class="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 mr-1" />
                        <span class="text-xs text-gray-600">代</span>
                    </label>
                    <button type="button" @click="removeSlot(cIdx, sIdx)" class="text-gray-400 hover:text-red-500">
                        ×
                    </button>
                </div>
                <button
                    type="button"
                    @click="addSlot(cIdx)"
                    class="text-xs text-indigo-600 hover:text-indigo-800 mt-1 flex items-center"
                >
                    + 新增時段
                </button>
            </div>
        </div>
      </div>
    </div>

    <button
      type="submit"
      :disabled="submitting"
      class="w-full btn-primary text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50"
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
  const reader = new FileReader();
  reader.onload = (evt) => {
    props.form.proofBase66 = evt.target.result.split(",")[1];
    props.form.proofPreview = evt.target.result;
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
