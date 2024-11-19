<template>
  <q-page>
    <div class="dashboard">
      <TaskStats />
      <TaskControl class="task-control" />
    </div>
  </q-page>
</template>

<script setup lang="ts"></script>

<style lang="sass">
.dashboard
  display: flex
  flex-direction: column
  margin: 16px
  gap: 16px

  .task-control
    flex-grow: 1
</style>
