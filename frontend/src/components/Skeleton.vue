<template>
  <div
    class="animate-pulse bg-gray-200 rounded"
    :style="{ width: width, height: height, borderRadius: borderRadius }"
  ></div>
</template>

<script setup>
defineProps({
  width: {
    type: String,
    default: "100%",
  },
  height: {
    type: String,
    default: "1rem",
  },
  borderRadius: {
    type: String,
    default: "0.5rem",
  },
});
</script>
