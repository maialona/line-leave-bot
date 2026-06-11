import { ref, reactive, computed } from "vue";
import { fetchLeavesApi, submitLeaveApi, reviewLeaveApi, cancelLeaveApi } from "../api/leave.js";
import { LEAVE_STATUS, LEAVE_TYPES, ROLES } from "../constants/common.js";
import { useToast } from "./useToast.js";

export function useLeave(user) {
  const loading = ref(false);
  const submitting = ref(false);
  const allLeaves = ref([]);
  const { addToast } = useToast();

  const isSupervisor = computed(() =>
    ROLES.SUPERVISOR_ROLES.includes(user.role)
  );

  const pendingLeaves = computed(() =>
    allLeaves.value.filter((l) => l.status === LEAVE_STATUS.PENDING)
  );

  const leaveForm = reactive({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    startTime: "08:00",
    endTime: "17:00",
    leaveType: "事假",
    reason: "",
    proofBase66: "",
    proofPreview: "",
    noCase: false,
    cases: [], // Structure: [{ caseName: 'Name', slots: [{ startTime, endTime, substitute }] }]
  });

  const getLeaves = async () => {
    loading.value = true;
    try {
      const data = await fetchLeavesApi(user.uid);
      if (data.success) {
          allLeaves.value = data.leaves || [];
          if (allLeaves.value.length === 0 && data.debug && data.debug.comparisonLog) {
              const debugMsg = data.debug.comparisonLog.join('\n');
              console.warn("Debug Refs:", debugMsg);
          }
      }
    } catch (e) {
      console.error(e);
    } finally {
      loading.value = false;
    }
  };

  const submitLeaveApplication = async () => {
    if (
      ["病假", "喪假", "婚假"].includes(leaveForm.leaveType) &&
      !leaveForm.proofBase66
    ) {
      addToast("請上傳證明", "warning");
      return false;
    }

    // MANDATORY CASE VALIDATION
    // Bypass if noCase is checked
    if (!leaveForm.noCase) {
        if (!leaveForm.cases || leaveForm.cases.length === 0) {
            addToast("系統阻擋: 請至少填寫一個受影響個案", "warning");
            return false;
        }

        for (const c of leaveForm.cases) {
            if (!c.caseName) {
                addToast("請填寫個案姓名", "warning");
                return false;
            }
            if (!c.slots || c.slots.length === 0) {
                addToast(`請為個案 ${c.caseName} 新增至少一個時段`, "warning");
                return false;
            }
            const incompleteSlot = c.slots.some(s => !s.startTime || !s.endTime);
            if (incompleteSlot) {
                addToast(`個案 ${c.caseName} 的時段資訊不完整`, "warning");
                return false;
            }
        }
    } else {
        leaveForm.cases = [];
    }

    submitting.value = true;
    try {
      // DATE LOOP LOGIC
      const start = new Date(leaveForm.startDate);
      const end = new Date(leaveForm.endDate);
      const dates = [];
      let current = new Date(start);
      while (current <= end) {
          dates.push(new Date(current).toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
      }
      
      const payload = {
        ...leaveForm,
        // Send Array of Dates
        dates: dates,
        // Legacy date field (just first one as fallback)
        date: dates[0], 
        uid: user.uid,
        name: user.name,
        unit: user.unit,
        timeSlot: `${leaveForm.startTime} ~ ${leaveForm.endTime}`,
        duration: "0",
        cases: leaveForm.noCase ? [] : leaveForm.cases.map(c => ({
            caseName: c.caseName,
            slots: c.slots
        }))
      };

      const data = await submitLeaveApi(payload);
      
      if (data.success) {
        addToast(`成功提交請假申請 (共 ${dates.length} 天)`, "success");
        if (data.notifyWarning) {
          addToast(data.notifyWarning, "warning");
        }
        getLeaves();
        // Reset Form
        Object.assign(leaveForm, {
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date().toISOString().split("T")[0],
          startTime: "08:00",
          endTime: "17:00",
          leaveType: "事假",
          reason: "",
          proofBase66: "",
          proofPreview: "",
          noCase: false,
          cases: [],
        });
        return true;
      } else {
        addToast(data.message || data.error || "提交失敗", "error");
        return false;
      }
    } catch (e) {
      console.error(e);
      addToast("系統錯誤: " + (e.message || "未知原因"), "error");
      return false;
    } finally {
      submitting.value = false;
    }
  };

  const reviewLeaveApplication = async (leave, action, skipConfirm = false, silent = false) => {
    if (!skipConfirm && !confirm(`確定要${action === "approve" ? "核准" : "駁回"}?`)) return;
    try {
      const data = await reviewLeaveApi({
        uid: user.uid,
        targetUid: leave.uid,
        timestamp: leave.timestamp,
        action: action,
        name: leave.name,
      });
      if (data.success) {
        if (!silent) addToast("OK", "success");
        getLeaves();
      } else {
        addToast("Fail: " + data.message, "error");
      }
    } catch (e) {
      addToast(e.message, "error");
    }
  };

  const cancelLeaveApplication = async (leave, skipConfirm = false) => {
    if (!skipConfirm && !confirm("確定撤回?")) return;
    try {
      const data = await cancelLeaveApi({ uid: user.uid, timestamp: leave.timestamp });
      if (data.success) {
        addToast("已撤回", "success");
        getLeaves();
      }
    } catch (e) {
      addToast("Error", "error");
    }
  };

  return {
    loading,
    submitting,
    allLeaves,
    isSupervisor,
    pendingLeaves,
    leaveForm,
    getLeaves,
    submitLeave: submitLeaveApplication,
    reviewLeave: reviewLeaveApplication,
    cancelLeave: cancelLeaveApplication,
  };
}
