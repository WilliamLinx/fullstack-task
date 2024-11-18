<template>
  <DataCard>
    <q-card>
      <q-card-section class="text-h6">{{ currentNumber }}</q-card-section>
    </q-card>
  </DataCard>
</template>

<script setup lang="ts">
import gsap from "gsap";

const currentNumber = ref(0);

onMounted(() => {
  gsap.to(currentNumber, {
    value: 1000,
    duration: 1,
    ease: "power1.inOut",
    onUpdate: () => {
      currentNumber.value = Math.round(currentNumber.value);
    },
  });
});
</script>

<style scoped lang="sass"></style>
