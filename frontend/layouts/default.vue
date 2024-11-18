<template>
  <q-layout view="hHh lpR fFf">
    <q-header bordered>
      <Navbar />
    </q-header>

    <q-page-container>
      <slot />
    </q-page-container>
  </q-layout>
</template>

<script lang="ts" setup></script>

<style scoped></style>
