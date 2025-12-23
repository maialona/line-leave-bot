<template>
  <div
    class="flex flex-col items-center justify-center text-center space-y-8 py-8 animate-fade-in relative"
  >
    <!-- Back Button for Rebinding -->
    <button
      v-if="isRebinding"
      @click="isRebinding = false"
      class="absolute left-0 top-0 text-gray-400 hover:text-gray-600 p-2 transition-colors"
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
    <!-- Logo Area -->
    <div class="space-y-4">
      <div
        class="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto shadow-lg overflow-hidden"
      >
        <img src="/images/app_logo.png" alt="Logo" class="w-full h-full object-cover" />
      </div>

      
      <!-- Welcome Mode -->
      <div v-if="user && !isRebinding" class="animate-fade-in">
         <p class="text-xl text-gray-700 font-medium">歡迎回來，{{ user.name }}</p>
         <p class="text-gray-500 mt-2">{{ user.unit }} ({{ user.role }})</p>
         
         <div class="mt-8 space-y-4">
            <button
            @click="$emit('enter')"
            class="w-full btn-primary text-white font-bold py-4 px-10 rounded-xl shadow-lg hover:shadow-xl transform active:scale-95 transition-all duration-200"
            >
            進入系統
            </button>
            
            <button
            @click="isRebinding = true"
            class="text-sm text-indigo-500 font-medium hover:text-indigo-700 py-2"
            >
            ＋ 綁定其他身份 / 重新綁定
            </button>
         </div>
      </div>
      
      <!-- Binding Mode -->
      <p v-else class="text-gray-500">請填寫基本資料以完成綁定</p>
    </div>

    <!-- Binding Form -->
    <div v-if="!user || isRebinding" class="w-full max-w-xs space-y-5">
      <div class="text-left">
        <label class="block text-sm font-bold text-gray-700 mb-1"
          >所屬單位</label
        >
        <select
          v-model="regForm.unit"
          class="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 px-4 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-md"
        >
          <option disabled value="">請選擇單位</option>
          <option
            v-for="unit in props.units"
            :key="unit"
            :value="unit"
          >
            {{ unit }}
          </option>
        </select>
      </div>

      <div class="text-left">
        <label class="block text-sm font-bold text-gray-700 mb-1">姓名</label>
        <input
          v-model="regForm.name"
          type="text"
          placeholder="請輸入真實姓名"
          class="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 px-4 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-md"
        />
      </div>

      <div class="text-left">
        <label class="block text-sm font-bold text-gray-700 mb-1"
          >員工編號</label
        >
        <input
          v-model="regForm.staffId"
          type="text"
          class="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 px-4 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-md"
        />
      </div>

      <button
        @click="bindUser"
        :disabled="submitting"
        class="w-full btn-primary text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transform active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        <span v-if="submitting" class="animate-spin mr-2">⏳</span>
        {{ submitting ? "綁定中..." : "開始使用" }}
      </button>

      <button
        v-if="user && user.profiles && user.profiles.length > 1"
        @click="showRoleSelector = true"
        class="w-full text-indigo-600 font-bold hover:text-indigo-800 text-sm py-3 mt-2"
      >
        切換角色 ({{ user.profiles.length }})
      </button>


    </div>

    <!-- Role Selector Modal -->
    <div
      v-if="showRoleSelector"
      class="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in"
    >
      <h3 class="text-xl font-bold text-gray-800 mb-6">請選擇角色</h3>
      <div class="w-full space-y-3">
        <button
          v-for="p in user.profiles"
          :key="p.unit + p.name"
          @click="selectProfile(p)"
          class="w-full p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left bg-white"
          :class="{'border-indigo-500 ring-2 ring-indigo-200': user.unit === p.unit && user.name === p.name}"
        >
          <div class="font-bold text-gray-800">{{ p.name }}</div>
          <div class="text-sm text-gray-500">{{ p.unit }} - {{ p.role }}</div>
        </button>
      </div>
      <button
        @click="showRoleSelector = false"
        class="mt-8 text-gray-500 hover:text-gray-700"
      >
        取消
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import liff from "@line/liff";
import { useToast } from "../composables/useToast.js";

const { addToast } = useToast();

const props = defineProps(["user", "units"]); 
const emit = defineEmits(["user-bound", "enter", "retry", "switch-user"]);

const showRoleSelector = ref(false);
const isRebinding = ref(false);
const submitting = ref(false);

const selectProfile = (p) => {
  emit("switch-user", p);
  showRoleSelector.value = false;
  isRebinding.value = false; // Close rebind mode if open
};
const regForm = ref({
  unit: "",
  name: "",
  staffId: "",
});

const bindUser = async () => {
  if (!regForm.value.unit || !regForm.value.name || !regForm.value.staffId) {
    addToast("請填寫完整資料", "warning");
    return;
  }

  submitting.value = true;
  try {
    const profile = await liff.getProfile();
    const res = await fetch("/api/bind-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: profile.userId,
        unit: regForm.value.unit,
        name: regForm.value.name,
        staffId: regForm.value.staffId,
      }),
    });

    const data = await res.json();
    if (data.success) {
      addToast("綁定成功！歡迎使用", "success");
      emit("user-bound", {
        uid: profile.userId,
        name: regForm.value.name,
        unit: regForm.value.unit,
        role: data.role || "居服員", 
      });
    } else {
      addToast(data.message || "綁定失敗", "error");
    }
  } catch (e) {
    console.error("Bind Error:", e);
    addToast("發生錯誤，請稍後再試", "error");
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
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
