export interface UserInfo {
  id: number;
  username: string;
  role: 'ADMIN' | 'USER';
}

export type TaskType = 'TRAIN' | 'FINETUNE' | 'EVAL' | 'FULL';
export type TaskStatus = 'PENDING' | 'DISPATCHING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type NodeStatus = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'ERROR';

export interface TaskItem {
  taskId: string;
  name: string;
  type: TaskType;
  status: TaskStatus;
  modelName: string;
  nodeId: string | null;
  progress: { percent: number; currentStep: number; totalSteps: number } | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMsg: string | null;
  packageId: string | null;
  metrics: Record<string, unknown> | null;
  packageFileSize: number | null;
}

export interface ArtifactFile {
  path: string;
  name: string;
  size: number;
  dir: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  type: TaskType;
  description: string;
  defaultParams: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NodeItem {
  nodeId: string;
  name: string;
  status: NodeStatus;
  publicIp: string;
  apiPort: number;
  gpuModel: string;
  gpuCount: number;
  vramTotalMb: number;
  resources: {
    gpuUtilization: number;
    memoryUtil: number;
    vramUsedMb: number;
    activeTasks: number;
    gpuTemp: number;
  };
  lastHeartbeat: string;
}

export interface DashboardSnapshot {
  totalTasks: Record<string, number>;
  nodes: NodeItem[];
  clusterUtilization: number;
}

export interface ScheduledTaskItem {
  id: string;
  templateId: string;
  userId: number | null;
  taskName: string | null;
  cronExpression: string;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

export interface WsMessage {
  type: 'TASK_STATUS_CHANGE' | 'NODE_RESOURCE_UPDATE' | 'DASHBOARD_SNAPSHOT';
  payload: Record<string, unknown>;
}
