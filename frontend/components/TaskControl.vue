<template>
  <DataCard title="Task Control">
    <q-table
      v-model:pagination="pagination"
      flat
      bordered
      ref="tableRef"
      row-key="id"
      :rows="rows"
      :columns="columns"
      :loading="loading"
      @request="onRequest"
    >
      <template #top>
        <q-btn icon="add_circle" label="Create New Task" no-caps push @click="createNewTask" />
        <q-select
          v-model="taskPriority"
          label="priority"
          class="q-ml-sm"
          style="width: 100px"
          outlined
          dense
          :options="priorityOptions"
        />
        <q-space />
        <q-toggle v-model="autoRefresh" label="Auto Refresh" />
        <q-btn icon="refresh" flat no-caps @click="tableRef?.requestServerInteraction()" />
      </template>

      <template #body-cell-status="props">
        <q-td auto-width>
          <q-chip
            text-color="white"
            class="text-bold"
            :color="colorForStatus(props.row.status)"
            :label="TaskStatus[props.row.status as keyof typeof TaskStatus].replaceAll('_', ' ')"
          />
        </q-td>
      </template>

      <template #body-cell-progress="props">
        <q-td>
          <q-linear-progress size="32px" stripe rounded :value="props.row.progress / 100" max>
            <div class="absolute-full flex flex-center">
              <q-badge color="secondary" class="text-bold" :label="`${props.row.progress}%`" />
            </div>
          </q-linear-progress>
        </q-td>
      </template>

      <template #body-cell-control="props">
        <q-td auto-width>
          <div class="float-right">
            <q-btn
              v-if="props.row.status === TaskStatus.IN_PROGRESS"
              color="primary"
              icon="pause"
              flat
              @click="pauseTask(props.row.id)"
            />
            <q-btn
              v-if="props.row.status === TaskStatus.PAUSED"
              color="primary"
              icon="play_arrow"
              flat
              @click="resumeTask(props.row.id)"
            />
            <q-btn
              v-if="props.row.status === TaskStatus.IN_PROGRESS"
              color="primary"
              icon="close"
              flat
              @click="cancelTask(props.row.id)"
            />
            <q-btn
              v-if="
                props.row.status !== TaskStatus.DONE &&
                props.row.status !== TaskStatus.ERROR &&
                props.row.status !== TaskStatus.CANCELLED &&
                props.row.status !== TaskStatus.PENDING
              "
              color="primary"
              icon="restart_alt"
              flat
              @click="retryTask(props.row.id)"
            />
            <q-btn
              color="primary"
              icon="list_alt"
              flat
              @click="q.dialog({ component: TaskLog, componentProps: { taskId: props.row.id } })"
            />
            <q-btn
              color="primary"
              icon="delete"
              flat
              @click="
                q.dialog({ title: 'Delete Task', message: 'Are you sure?', cancel: true, persistent: true }).onOk(() =>
                  deleteTask(props.row.id)
                )
              "
            />
          </div>
        </q-td>
      </template>
    </q-table>
  </DataCard>
</template>

<script setup lang="ts">
import TaskLog from "./Dialog/TaskLog.vue";

import type { QTable, QTableColumn } from "quasar";
import type { GetAllTasksResponse, Task } from "shared/types/response";

import { TaskStatus } from "shared/types/task";

const config = useRuntimeConfig();
const q = useQuasar();

const columns: QTableColumn[] = [
  {
    name: "id",
    label: "ID",
    align: "left",
    field: "id",
  },
  {
    name: "status",
    label: "Status",
    align: "center",
    field: "status",
    format: (val: TaskStatus) => TaskStatus[val],
  },
  {
    name: "progress",
    label: "Progress",
    align: "center",
    field: "progress",
  },
  {
    name: "createdAt",
    label: "Created At",
    align: "center",
    field: "createdAt",
    format: (val: string) => new Date(val).toLocaleString(),
  },
  {
    name: "control",
    align: "center",
    label: "Control",
    field: "id",
  },
];
const priorityOptions = [
  { label: "Lowest", value: 1 },
  { label: "Low", value: 2 },
  { label: "Medium", value: 3 },
  { label: "High", value: 4 },
  { label: "Urgent", value: 5 },
];

const tableRef = ref<QTable | null>(null);
const rows = ref<Task[]>([]);
const loading = ref(false);
const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 10,
});
const autoRefresh = ref(true);
const autoRefreshInterval = ref<NodeJS.Timeout | null>(null);
const taskPriority = ref(priorityOptions[0]);

async function onRequest(props: any) {
  const { page, rowsPerPage } = props.pagination;

  loading.value = true;

  let data;
  try {
    data = await $fetch<GetAllTasksResponse>(`${config.public.apiBase}/task/all`, {
      query: {
        limit: rowsPerPage === 0 ? pagination.value.rowsNumber : rowsPerPage,
        offset: (page - 1) * rowsPerPage,
      },
    });
  } catch (error) {
    console.error(error);
    loading.value = false;
  }

  if (!data) return;

  rows.value.splice(0, rows.value.length, ...data.tasks);

  pagination.value.rowsNumber = data.total;
  pagination.value.page = page;
  pagination.value.rowsPerPage = rowsPerPage;

  loading.value = false;
}

async function createNewTask() {
  try {
    await $fetch(`${config.public.apiBase}/task/create`, {
      method: "POST",
      body: JSON.stringify({
        priority: taskPriority.value.value,
      }),
    });
    q.notify({
      type: "positive",
      message: "New task created",
    });
  } catch (error) {
    q.notify({
      type: "negative",
      message: "Failed to create new task",
    });
  }
}

async function pauseTask(taskId: string) {
  try {
    await $fetch(`${config.public.apiBase}/task/${taskId}/pause`, {
      method: "POST",
    });
    q.notify({
      type: "positive",
      message: "Task paused",
    });
  } catch (error) {
    q.notify({
      type: "negative",
      message: "Failed to pause task",
    });
  }
}

async function resumeTask(taskId: string) {
  try {
    await $fetch(`${config.public.apiBase}/task/${taskId}/resume`, {
      method: "POST",
    });
    q.notify({
      type: "positive",
      message: "Task resumed",
    });
  } catch (error) {
    q.notify({
      type: "negative",
      message: "Failed to resume task",
    });
  }
}

async function cancelTask(taskId: string) {
  try {
    await $fetch(`${config.public.apiBase}/task/${taskId}/cancel`, {
      method: "POST",
    });
    q.notify({
      type: "positive",
      message: "Task canceled",
    });
  } catch (error) {
    q.notify({
      type: "negative",
      message: "Failed to cancel task",
    });
  }
}

async function retryTask(taskId: string) {
  try {
    await $fetch(`${config.public.apiBase}/task/${taskId}/restart`, {
      method: "POST",
    });
    q.notify({
      type: "positive",
      message: "Task retried",
    });
  } catch (error) {
    q.notify({
      type: "negative",
      message: "Failed to retry task",
    });
  }
}

async function deleteTask(taskId: string) {
  try {
    await $fetch(`${config.public.apiBase}/task/${taskId}`, {
      method: "DELETE",
    });
    q.notify({
      type: "positive",
      message: "Task deleted",
    });
  } catch (error) {
    q.notify({
      type: "negative",
      message: "Failed to delete task",
    });
  }
}

onMounted(() => {
  tableRef.value?.requestServerInteraction();

  watch(
    autoRefresh,
    (value) => {
      if (value) {
        autoRefreshInterval.value = setInterval(() => tableRef.value?.requestServerInteraction(), 3000);
      } else {
        if (autoRefreshInterval.value) {
          clearInterval(autoRefreshInterval.value);
        }
      }
    },
    { immediate: true }
  );
});

onUnmounted(() => {
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value);
  }
});
</script>

<style scoped lang="sass"></style>
