<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <q-card-title class="text-h6">Task Log '{{ taskId }}''</q-card-title>
      </q-card-section>

      <q-card-section>
        <q-table
          flat
          bordered
          ref="tableRef"
          :rows="rows"
          :columns="columns"
          row-key="id"
          v-model:pagination="pagination"
          :loading="loading"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useDialogPluginComponent } from "quasar";

const props = defineProps({
  taskId: String,
});

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

function onOKClick() {
  onDialogOK();
}
</script>
