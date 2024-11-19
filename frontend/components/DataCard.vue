<template>
  <q-card>
    <q-card-section>
      <div v-if="title" class="text-h6">{{ title }}</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <slot />
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
const props = defineProps({
  title: String,
});
</script>
