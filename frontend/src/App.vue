<template>
  <div class="fixed inset-0 h-[100dvh] w-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 overflow-hidden overscroll-none">
    <ToastContainer />
    <!-- Loading State -->
    <div
      v-if="loading"
      class="absolute inset-0 flex flex-col items-center justify-center z-50 bg-white/50 backdrop-blur-sm rounded-2xl h-96"
    >
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"
      ></div>
      <p class="mt-4 text-indigo-800 font-medium">載入中...</p>
    </div>

    <!-- Main Content -->
    <transition name="fade">
      <div
        v-if="!loading"
        class="glass-card p-6 w-full max-w-md h-full flex flex-col overflow-hidden"
      >
        <LandingView
          v-if="currentView === 'landing'"
          @user-bound="handleUserBound"
          @enter="currentView = 'menu'"
          @retry="checkUserStatus"
          @switch-user="handleSwitchUser"
        />

        <MenuView
          v-else-if="currentView === 'menu'"
          @navigate="handleNavigation"
          @back="currentView = 'landing'"
        />

        <LeaveView
          v-else-if="currentView === 'leave'"
          @back="currentView = 'menu'"
        />

        <WhisperView
          v-else-if="currentView === 'whisper'"
          @back="currentView = 'menu'"
        />

        <DevApplyView
          v-else-if="currentView === 'dev_apply'"
          @back="currentView = 'menu'"
        />

        <BulletinView
          v-else-if="currentView === 'bulletin'"
          @back="currentView = 'menu'"
        />
      </div>
    </transition>
  </div>
</template>



<script setup>
import { ref, onMounted, computed } from "vue";
import LandingView from "./components/LandingView.vue";
import MenuView from "./components/MenuView.vue";
import LeaveView from "./components/LeaveView.vue";
import WhisperView from "./components/WhisperView.vue";
import DevApplyView from "./components/DevApplyView.vue";
import BulletinView from "./components/BulletinView.vue";
import ToastContainer from "./components/ToastContainer.vue";
import { useToast } from "./composables/useToast.js";
import { useUserStore } from "./stores/user.js";

const { addToast } = useToast();
const store = useUserStore();

// View State (Local UI state)
const currentView = ref("landing");

// Computed State from Store
const loading = computed(() => store.loading);
const user = computed(() => store.user); // Reactive reference to store user

// Initialize
onMounted(async () => {
    await store.initialize();
    
    // Auto-routing logic based on store state
    if (store.user) {
         // Check for deep link
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get("view");
        const validViews = ['menu', 'leave', 'whisper', 'dev_apply', 'bulletin'];

        if (viewParam && validViews.includes(viewParam)) {
            currentView.value = viewParam;
        } else {
            // Default to landing (welcome) or menu? 
            // Original logic: landing if registered is true? 
            // Original: if(data.registered)... check deep link... else `currentView.value = "landing"`.
            // Wait, original logic said "if registered... if deep link... else landing". 
            // It seems "landing" acts as a "Click to Enter" screen even for logged in users?
            // "LandingView.vue" has a "進入系統" button if user exists? I need to check LandingView.
            // Let's assume Landing is the entry point.
        }
    }
});

const handleUserBound = (userData) => {
  store.setUser(userData);
  currentView.value = "menu";
  addToast("綁定成功！歡迎使用", "success");
};

const handleSwitchUser = (profileData) => {
  store.switchUser(profileData);
  currentView.value = "landing"; 
  addToast("已切換身分", "info");
};

const handleNavigation = (view) => {
  currentView.value = view;
};

// Retry handler for LandingView
const checkUserStatus = () => store.initialize();
</script>

<style>
/* Global Styles from original index.html */
body {
  font-family: "Inter", sans-serif;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
  margin: 0;
  padding: 1rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 2.5rem;
}

.glass-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-primary {
  background: linear-gradient(90deg, #78B8A7 0%, #A8EB12 100%);
  transition: all 0.3s ease;
}
.btn-primary:active {
  transform: scale(0.98);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #f1f1f1;
}
::-webkit-scrollbar-thumb {
  background: #c7c7c7;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
