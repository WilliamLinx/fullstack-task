<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="tasklog-card">
      <q-card-section>
        <q-card-title class="text-h6">Task Log '{{ taskId }}''</q-card-title>

        <q-toggle v-model="autoRefresh" label="Auto Refresh" class="float-right" />
      </q-card-section>

      <q-card-section class="table-section">
        <q-table
          v-model:pagination="pagination"
          class="table"
          ref="tableRef"
          row-key="id"
          flat
          bordered
          virtual-scroll
          hide-bottom
          :rows="rows"
          :columns="columns"
          :loading="loading"
          :rows-per-page-options="[0]"
          :virtual-scroll-sticky-size-start="48"
        >
          <template #body-cell-taskStatus="props">
            <q-td>
              <q-chip
                text-color="white"
                class="text-bold"
                :color="colorForStatus(props.row.taskStatus)"
                :label="TaskStatus[props.row.taskStatus  as keyof typeof TaskStatus].replaceAll('_', ' ')"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, type QTableColumn } from "quasar";
import type { TaskLog, TaskLogResponse } from "shared/src/types/response";
import { TaskStatus } from "shared/src/types/task";

const props = defineProps({
  taskId: String,
});

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();
const config = useRuntimeConfig();
const q = useQuasar();

const columns: QTableColumn[] = [
  {
    name: "taskStatus",
    label: "Status",
    align: "left",
    field: "taskStatus",
  },
  {
    name: "message",
    label: "Message",
    align: "left",
    field: "message",
  },
  {
    name: "createdAt",
    label: "Created At",
    align: "right",
    field: "createdAt",
    format: (val: string) => new Date(val).toLocaleTimeString(),
  },
];

const rows = ref<TaskLog[]>([]);
const loading = ref(false);
const autoRefresh = ref(true);
const autoRefreshInterval = ref<NodeJS.Timeout | null>(null);
const pagination = ref({ rowsPerPage: 0 });

async function refresh() {
  loading.value = true;
  try {
    const data = await $fetch<TaskLogResponse>(`${config.public.apiBase}/task/${props.taskId}`);
    rows.value = data.logs;
  } catch (error) {
    if (error instanceof Error) {
      q.notify({
        type: "negative",
        message: error.message,
      });
    }
  }
  loading.value = false;
}

onMounted(() => {
  refresh();
});

onUnmounted(() => {
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value);
  }
});

watch(
  autoRefresh,
  (value) => {
    if (value) {
      autoRefreshInterval.value = setInterval(refresh, 3000);
    } else {
      if (autoRefreshInterval.value) {
        clearInterval(autoRefreshInterval.value);
      }
    }
  },
  { immediate: true }
);
</script>

<style lang="sass">
.tasklog-card
  display: flex
  flex-direction: column
  max-width: 800px !important
  width: 100%
  max-height: 600px !important
  height: 100%

  .table-section
    flex-grow: 1

    .table
      height: 480px

      thead tr:first-child th
        background-color: white
      thead tr th
        position: sticky
        z-index: 1
      thead tr:last-child th
        top: 48px
      thead tr:first-child th
        top: 0
      tbody
        scroll-margin-top: 48px
</style>
