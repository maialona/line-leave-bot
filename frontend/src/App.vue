<template>
  <div class="fixed inset-0 h-[100dvh] w-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 overflow-hidden overscroll-none">
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
          :units="units"
          :user="user"
          @user-bound="handleUserBound"
          @enter="currentView = 'menu'"
          @retry="checkUserStatus"
          @switch-user="handleSwitchUser"
        />

        <MenuView
          v-else-if="currentView === 'menu'"
          :user="user"
          @navigate="handleNavigation"
          @back="currentView = 'landing'"
        />

        <LeaveView
          v-else-if="currentView === 'leave'"
          :user="user"
          @back="currentView = 'menu'"
        />

        <WhisperView
          v-else-if="currentView === 'whisper'"
          :user="user"
          @back="currentView = 'menu'"
        />

        <DevApplyView
          v-else-if="currentView === 'dev_apply'"
          :user="user"
          @back="currentView = 'menu'"
        />

        <BulletinView
          v-else-if="currentView === 'bulletin'"
          :user="user"
          :units="units"
          @back="currentView = 'menu'"
        />
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import liff from "@line/liff";
import LandingView from "./components/LandingView.vue";
import MenuView from "./components/MenuView.vue";
import LeaveView from "./components/LeaveView.vue";
import WhisperView from "./components/WhisperView.vue";
import DevApplyView from "./components/DevApplyView.vue";
import BulletinView from "./components/BulletinView.vue";

// State
const loading = ref(true);
const currentView = ref("landing");
const user = ref(null);

// LIFF ID (From project context)
const LIFF_ID = "2008645610-0MezRE9Z";

const units = ref([]);

// Initialize
onMounted(async () => {
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    await checkUserStatus();
  } catch (err) {
    console.error("LIFF Init Error:", err);
  }
});

const checkUserStatus = async () => {
  try {
    const profile = await liff.getProfile();
    
    // Use the correct API endpoint '/api/check-user'
    const res = await fetch("/api/check-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: profile.userId }),
    });

    if (res.ok) {
      const data = await res.json();
      
      // Store units whether bound or not
      units.value = data.units || [];

      if (data.registered) {
         // Construct user object
        user.value = { 
            uid: profile.userId,
            name: data.profiles[0].name,
            unit: data.profiles[0].unit,
            role: data.profiles[0].role,
            profiles: data.profiles
        };

        // Check for deep link
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get("view");
        const validViews = ['menu', 'leave', 'whisper', 'dev_apply', 'bulletin'];

        if (viewParam && validViews.includes(viewParam)) {
            currentView.value = viewParam;
        } else {
            currentView.value = "landing";
        }
      } else {
        currentView.value = "landing";
      }
    } else {
      console.error("Check status failed");
      currentView.value = "landing"; 
    }
  } catch (e) {
    console.error("API Error:", e);
    currentView.value = "landing";
  } finally {
    loading.value = false;
  }
};

const handleUserBound = (userData) => {
  user.value = userData;
  // After binding, go to menu or stay on landing? 
  // UX: Go to menu immediately after binding is fine, OR show welcome. 
  // Let's go to menu to save a click for new users.
  currentView.value = "menu";
};

const handleSwitchUser = (profileData) => {
  user.value = {
    ...profileData,
    uid: user.value.uid, // Preserve valid UID
    profiles: user.value.profiles
  };
  currentView.value = "landing"; // Ensure we stay on landing or go to menu? Let's stay on landing (welcome screen) to confirm.
  // Actually, usually user wants to go to menu. But Welcome screen is safer.
};

const handleNavigation = (view) => {
  currentView.value = view;
};
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
