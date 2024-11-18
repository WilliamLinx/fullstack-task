<template>
  <DataCard title="Task Control">
    <q-table
      flat
      bordered
      ref="tableRef"
      :rows="rows"
      :columns="columns"
      row-key="id"
      v-model:pagination="pagination"
      :loading="loading"
      @request="onRequest"
    >
      <template v-slot:body-cell-status="props">
        <q-td>
          <q-chip
            :color="colorForStatus(props.row.status)"
            :label="TaskStatus[props.row.status].replaceAll('_', ' ')"
            text-color="white"
          />
        </q-td>
      </template>

      <template v-slot:body-cell-progress="props">
        <q-td>
          <q-linear-progress size="32px" :value="props.row.progress" stripe>
            <div class="absolute-full flex flex-center">
              <q-badge color="secondary" :label="`${props.row.progress}%`" />
            </div>
          </q-linear-progress>
        </q-td>
      </template>

      <template v-slot:body-cell-control="props">
        <q-td>
          <div class="float-right">
            <q-btn color="primary" label="Pause" flat @click="onPauseClick(props.row)" />
            <q-btn color="primary" label="Resume" flat @click="onResumeClick(props.row)" />
            <q-btn color="primary" label="Cancel" flat @click="onCancelClick(props.row)" />
            <q-btn color="primary" label="Restart" flat @click="onRetryClick(props.row)" />
            <q-btn color="primary" label="Log" flat @click="onLogClick(props.row)" />
          </div>
        </q-td>
      </template>
    </q-table>
  </DataCard>
</template>

<script setup lang="ts">
import type { QTableColumn } from "quasar";

import { TaskStatus } from "shared/types/task";

const config = useRuntimeConfig();

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
    align: "right",
    field: "status",
    format: (val: TaskStatus) => TaskStatus[val],
  },
  {
    name: "progress",
    label: "Progress",
    align: "right",
    field: "progress",
  },
  {
    name: "createdAt",
    label: "Created At",
    align: "right",
    field: "created_at",
    format: (val: string) => new Date(val).toLocaleString(),
  },
  {
    name: "control",
    label: "Control",
    field: "id",
  },
];

const tableRef = ref();
const rows = ref([]);
const loading = ref(false);
const pagination = ref({
  page: 1,
  rowsPerPage: 20,
  rowsNumber: 10,
});

async function onRequest(props: any) {
  const { page, rowsPerPage } = props.pagination;

  loading.value = true;

  let data;
  try {
    data = await $fetch(`${config.public.apiBase}/task/all`, {
      query: {
        limit: rowsPerPage === 0 ? pagination.value.rowsNumber : rowsPerPage,
        offset: (page - 1) * rowsPerPage,
      },
    });
  } catch (error) {
    console.error(error);
    loading.value = false;
  }

  rows.value.splice(0, rows.value.length, ...data.tasks);

  pagination.value.rowsNumber = data.total;
  pagination.value.page = page;
  pagination.value.rowsPerPage = rowsPerPage;

  loading.value = false;
}

function colorForStatus(status: TaskStatus) {
  switch (status) {
    case TaskStatus.ERROR:
      return "negative";
    case TaskStatus.DONE:
      return "positive";
    case TaskStatus.PENDING:
      return "secondary";
    case TaskStatus.IN_PROGRESS:
      return "primary";
    case TaskStatus.CANCELLED:
      return "warning";
    case TaskStatus.PAUSED:
      return "warning";
    default:
      return "secondary";
  }
}

onMounted(() => {
  tableRef.value.requestServerInteraction();
});
</script>

<style scoped lang="sass"></style>
