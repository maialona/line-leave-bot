<template>
  <form @submit.prevent="handleSubmit" class="space-y-4 flex-1 overflow-y-auto pb-20">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">請假日期</label>
      <input
        type="date"
        v-model="form.date"
        required
        class="w-full rounded-lg border-gray-300 py-2 px-3 border shadow-sm"
      />
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

    <!-- Cases -->
    <div class="pt-4 border-t border-gray-200">
      <div class="flex justify-between items-center mb-2">
        <label class="block text-sm font-medium text-gray-900">受影響個案 <span class="text-red-500">*</span></label>
        <button
          v-if="!form.noCase"
          type="button"
          @click="addCase"
          class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded"
        >
          + 新增
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

      <div
        v-if="!form.noCase"
        v-for="(item, idx) in form.cases"
        :key="idx"
        class="bg-gray-50 p-2 rounded mb-2 border border-gray-200"
      >
        <div class="flex space-x-2 mb-2">
          <input
            v-model="item.caseName"
            placeholder="姓名"
            class="text-sm w-1/3 rounded border-gray-300 px-2 py-1"
          />
          <input
            type="time"
            v-model="item.startTime"
            class="text-sm w-1/3 rounded border-gray-300 px-1 py-1"
          />
          <input
            type="time"
            v-model="item.endTime"
            class="text-sm w-1/3 rounded border-gray-300 px-1 py-1"
          />
        </div>
        <div class="flex justify-between items-center">
          <label class="text-xs flex items-center">
            <input type="checkbox" v-model="item.substitute" class="mr-1" />
            需代班
          </label>
          <button type="button" @click="removeCase(idx)" class="text-xs text-red-500">
            刪除
          </button>
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
      const incompleteCase = props.form.cases.some(c => !c.caseName || !c.startTime || !c.endTime);
      if (incompleteCase) {
        addToast('請完整填寫受影響個案資訊 (姓名、開始時間、結束時間)', 'warning');
        return;
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
    props.form.cases.push({
        caseName: "", startTime: "", endTime: "", substitute: false
    });
};

const removeCase = (idx) => {
    props.form.cases.splice(idx, 1);
};
</script>
