# API Documentation for Task Management

## Endpoints

### Create Task

**POST** `/task/create`

- **Request Body**:

  - `priority` (optional): `number` (1-5, default is 1)

- **Response**:
  - **200**:
    ```json
    {
      "taskId": "string"
    }
    ```

---

### Get All Tasks

**GET** `/task/all`

- **Query Parameters**:

  - `limit`: `string` (required)
  - `offset`: `string` (required)

- **Response**:
  - **200**:
    ```json
    {
      "total": "number",
      "tasks": [
        {
          "id": "string",
          "status": "string",
          "progress": "number",
          "createdAt": "string | null",
          "updatedAt": "string | null"
        }
      ]
    }
    ```

---

### Get Task Stats

**GET** `/task/stats`

- **Query Parameters**:

  - `from`: `string` (timestamp in ms, required)
  - `to`: `string` (timestamp in ms, required)

- **Response**:
  - **200**:
    ```json
    {
      "pending": "number",
      "in_progress": "number",
      "successful": "number",
      "failed": "number",
      "total": "number",
      "average_duration": "number",
      "max_duration": "number"
    }
    ```

---

### Get Task Logs

**GET** `/task/:id`

- **Path Parameters**:

  - `id`: `string` (Task ID, required)

- **Response**:
  - **200**:
    ```json
    {
      "logs": [
        {
          "id": "string",
          "taskId": "string",
          "taskStatus": "string",
          "message": "string",
          "createdAt": "string"
        }
      ]
    }
    ```
  - **404**: Task logs not found.

---

### Delete Task

**DELETE** `/task/:id`

- **Path Parameters**:

  - `id`: `string` (Task ID, required)

- **Response**:
  - **200**:
    ```json
    {
      "message": "Task deleted"
    }
    ```
  - **404**: Task not found.

---

### Cancel Task

**POST** `/task/:id/cancel`

- **Path Parameters**:

  - `id`: `string` (Task ID, required)

- **Response**:
  - **200**:
    ```json
    {
      "message": "Task cancellation command sent"
    }
    ```
  - **400**: Task already completed.
  - **404**: Task not found.

---

### Pause Task

**POST** `/task/:id/pause`

- **Path Parameters**:

  - `id`: `string` (Task ID, required)

- **Response**:
  - **200**:
    ```json
    {
      "message": "Task pause command sent"
    }
    ```
  - **400**: Task not in progress.
  - **404**: Task not found.

---

### Resume Task

**POST** `/task/:id/resume`

- **Path Parameters**:

  - `id`: `string` (Task ID, required)

- **Response**:
  - **200**:
    ```json
    {
      "message": "Task resume command sent"
    }
    ```
  - **400**: Task is not paused.
  - **404**: Task not found.

---

### Restart Task

**POST** `/task/:id/restart`

- **Path Parameters**:

  - `id`: `string` (Task ID, required)

- **Response**:
  - **200**:
    ```json
    {
      "message": "Task restart command sent"
    }
    ```
  - **400**: Task cannot be restarted.
  - **404**: Task not found.
