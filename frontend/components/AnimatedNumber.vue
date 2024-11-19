<template>
  <span>{{ currentNumber }}</span>
</template>

<script setup lang="ts">
import gsap from "gsap";

const props = defineProps({
  targetNumber: {
    type: Number,
    default: 0,
  },
});

const currentNumber = ref(0);

onMounted(() => {
  gsap.to(currentNumber, {
    value: props.targetNumber,
    duration: 1,
    ease: "power1.inOut",
    onUpdate: () => {
      currentNumber.value = Math.round(currentNumber.value);
    },
  });
});
</script>
