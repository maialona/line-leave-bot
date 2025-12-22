import { ref, reactive, computed } from "vue";
import { fetchLeavesApi, submitLeaveApi, reviewLeaveApi, cancelLeaveApi } from "../api/leave.js";
import { LEAVE_STATUS, LEAVE_TYPES, ROLES } from "../constants/common.js";

export function useLeave(user) {
  const loading = ref(false);
  const submitting = ref(false);
  const allLeaves = ref([]);

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
    cases: [],
  });

  const getLeaves = async () => {
    loading.value = true;
    try {
      const data = await fetchLeavesApi(user.uid);
      if (data.success) allLeaves.value = data.leaves || [];
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
      alert("請上傳證明");
      return false;
    }

    // MANDATORY CASE VALIDATION
    console.log("Inside useLeave submit. Cases:", leaveForm.cases);
    if (!leaveForm.cases || leaveForm.cases.length === 0) {
      alert("系統阻擋: 請至少填寫一個受影響個案");
      return false;
    }
    const incompleteCase = leaveForm.cases.some(c => !c.caseName || !c.startTime || !c.endTime);
    if (incompleteCase) {
      alert("請完整填寫受影響個案資訊 (姓名、開始時間、結束時間)");
      return false;
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
        alert("提交成功");
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
        alert(data.message || "提交失敗");
        return false;
      }
    } catch (e) {
      alert("系統錯誤");
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
        alert("OK");
        getLeaves();
      } else {
        alert("Fail: " + data.message);
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const cancelLeaveApplication = async (leave) => {
    if (!confirm("確定撤回?")) return;
    try {
      const data = await cancelLeaveApi({ uid: user.uid, timestamp: leave.timestamp });
      if (data.success) {
        alert("已撤回");
        getLeaves();
      }
    } catch (e) {
      alert("Error");
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
