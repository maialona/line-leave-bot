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
    date: new Date().toISOString().split("T")[0],
    startTime: "08:00",
    endTime: "17:00",
    leaveType: "事假",
    reason: "",
    proofBase66: "",
    proofPreview: "",
    noCase: false,
    cases: [],
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
        const incompleteCase = leaveForm.cases.some(c => !c.caseName || !c.startTime || !c.endTime);
        if (incompleteCase) {
        addToast("請完整填寫受影響個案資訊 (姓名、開始時間、結束時間)", "warning");
        return false;
        }
    } else {
        // If noCase is true, ensure cases is empty to avoid confusion
        leaveForm.cases = [];
    }
    
    submitting.value = true;
    try {
      const data = await submitLeaveApi({
        ...leaveForm,
        uid: user.uid,
        name: user.name,
        unit: user.unit,
        timeSlot: `${leaveForm.startTime} ~ ${leaveForm.endTime}`,
        duration: "0",
      });
      if (data.success) {
        addToast("提交成功", "success");
        getLeaves();
        // Reset Form
        Object.assign(leaveForm, {
          date: new Date().toISOString().split("T")[0],
          startTime: "08:00",
          endTime: "17:00",
          leaveType: "事假",
          reason: "",
          proofBase66: "",
          proofPreview: "",
          cases: [],
        });
        return true;
      } else {
        addToast(data.message || "提交失敗", "error");
        return false;
      }
    } catch (e) {
      addToast("系統錯誤", "error");
      return false;
    } finally {
      submitting.value = false;
    }
  };

  const reviewLeaveApplication = async (leave, action) => {
    if (!confirm(`確定要${action === "approve" ? "核准" : "駁回"}?`)) return;
    try {
      const data = await reviewLeaveApi({
        uid: user.uid,
        targetUid: leave.uid,
        timestamp: leave.timestamp,
        action: action,
        name: leave.name,
      });
      if (data.success) {
        addToast("OK", "success");
        getLeaves();
      } else {
        addToast("Fail: " + data.message, "error");
      }
    } catch (e) {
      addToast(e.message, "error");
    }
  };

  const cancelLeaveApplication = async (leave) => {
    if (!confirm("確定撤回?")) return;
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
