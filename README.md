# Task Execution Service

## Architecture

Task Execution Service is a yarn [workspace](https://yarnpkg.com/features/workspaces) (monorepo) that contains the following parts:

### Customer

Customer is controller for the task execution service. Express.js based web server with connection to RabbitMQ for communication with Executors and LibSQL DB (SQLite).

### Executor

Executor is a worker for the task execution service. It is a Node.js application that listens to RabbitMQ for tasks to execute and notify the Customer about the task status with RabbitMQ.

### Frontend

Frontend is a display for the task execution service. It is a Nuxt.js application that communicate with Customer via HTTP requests.

### Shared

Shared is a repo that contains types for project.

## Data Model

### Communication

![Communication Model](/assets/Service%20Model.png))

#### RabbitMQ Components

- command_exchane - is for sending commands to the Executor with routing key and temporary queue.
- task_exchange - is for sending task to the Executor.
- report_queue - is for sending reports from the Executor to the Customer.

### DB Model

![Database Model](/assets/DB%20model.png)

## Prerequsities

- Node.js (v18+)
- Yarn

## Development

- clone repository
- run `yarn install`
- run `yarn workspace customer dev`, `yarn workspace executor dev`, `yarn workspace frontend dev`
- open `http://localhost:3000` in your browser

## Debian Packege Build

- run Github Action `Build Debian Package for Task Service`
