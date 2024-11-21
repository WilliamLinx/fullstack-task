import { TaskStatus } from "shared/src/types/task";

export function colorForStatus(status: TaskStatus) {
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
