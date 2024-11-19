<template>
  <div class="task-stats">
    <q-card v-for="(value, key) in data" class="status-card">
      <q-card-section>{{ key.replaceAll("_", " ") }}</q-card-section>
      <q-card-section><AnimatedNumber :target-number="value" /></q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import type { TaskStatsResponse } from "shared/types/response";

const config = useRuntimeConfig();

const { data } = await useFetch<TaskStatsResponse>(`${config.public.apiBase}/task/stats`, {
  query: {
    // Today
    from: new Date(new Date().setHours(0, 0, 0, 0)).getTime(),
    to: new Date().getTime(),
  },
});
</script>

<style lang="sass">
.task-stats
  display: flex
  justify-content: center
  flex-direction: row

  .status-card
    width: 150px
    height: 80px
    display: flex
    flex-direction: column
    justify-content: center
    align-items: center
    font-weight: bold
    wrap: no-wrap
    overflow: hidden
    margin-left: 16px

    .q-card__section
      padding: 0
      margin: 0

    .q-card__section:first-child
      font-size: 1.1em
      margin-bottom: 8px
</style>
