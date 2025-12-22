
export async function fetchLeavesApi(uid) {
  const res = await fetch("/api/get-leaves", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid }),
  });
  return await res.json();
}

export async function submitLeaveApi(payload) {
  const res = await fetch("/api/submit-leave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

export async function reviewLeaveApi(payload) {
  const res = await fetch("/api/review-leave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

export async function cancelLeaveApi(payload) {
  const res = await fetch("/api/cancel-leave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}
