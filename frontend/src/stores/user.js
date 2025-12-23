import { defineStore } from "pinia";
import liff from "@line/liff";
import { useToast } from "../composables/useToast.js";

const LiquerId = import.meta.env.VITE_LIFF_ID;

export const useUserStore = defineStore("user", {
  state: () => ({
    user: null,
    units: [],
    loading: true,
    initialized: false,
  }),
  actions: {
    async initialize() {
      const { addToast } = useToast();
      try {
        await liff.init({ liffId: LiquerId });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        const idToken = liff.getIDToken();

        const res = await fetch("/api/check-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
              uid: profile.userId,
              idToken: idToken
          }),
        });

        if (res.ok) {
          const data = await res.json();
          this.units = data.units || [];

          if (data.registered) {
            this.user = {
              uid: profile.userId,
              name: data.profiles[0].name,
              unit: data.profiles[0].unit,
              role: data.profiles[0].role,
              profiles: data.profiles,
            };
          }
        } else {
          addToast("檢查使用者狀態失敗", "error");
        }
      } catch (e) {
        console.error("Init Error:", e);
        addToast("初始化失敗: " + e.message, "error");
      } finally {
        this.loading = false;
        this.initialized = true;
      }
    },

    setUser(userData) {
      this.user = userData;
    },

    switchUser(profileData) {
        if (!this.user) return;
        this.user = {
            ...profileData,
            uid: this.user.uid,
            profiles: this.user.profiles
        };
    }
  },
});
