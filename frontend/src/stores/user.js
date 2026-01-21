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
    auth: {
      uid: null,
      idToken: null,
    }
  }),
  actions: {
    getAuth() {
        return this.auth;
    },

    async initialize() {
      const { addToast } = useToast();
      
      // 1. Authenticate (Dev or LIFF)
      try {
        if (import.meta.env.DEV) {
            console.log("Dev Mode: Using Mock User");
            this.auth = {
                uid: 'MOCK_DEV_USER_001',
                idToken: null
            };
        } else {
            await liff.init({ liffId: LiquerId });
            if (!liff.isLoggedIn()) {
                liff.login();
                return;
            }
            const profile = await liff.getProfile();
            this.auth = {
                uid: profile.userId,
                idToken: liff.getIDToken()
            };
        }

        // 2. Check User Status with Backend
        const res = await fetch("/api/check-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
              uid: this.auth.uid,
              idToken: this.auth.idToken
          }),
        });

        if (res.ok) {
          const data = await res.json();
          this.units = data.units || [];

          if (data.registered) {
            this.user = {
              uid: this.auth.uid,
              name: data.profiles[0].name,
              unit: data.profiles[0].unit,
              role: data.profiles[0].role,
              profiles: data.profiles,
            };
          }
        } else {
          try {
            const errData = await res.json();
            console.error("Check User Failed:", errData);
            addToast("檢查使用者失敗: " + (errData.error || "未知錯誤"), "error");
          } catch (e) {
             addToast("檢查使用者失敗 (500)", "error");
          }
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
