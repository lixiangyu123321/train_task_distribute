export type TaskType = 'TRAIN' | 'FINETUNE' | 'EVAL';
export type TaskStatus = 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
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

export interface WsMessage {
  type: 'TASK_STATUS_CHANGE' | 'NODE_RESOURCE_UPDATE' | 'DASHBOARD_SNAPSHOT';
  payload: Record<string, unknown>;
}
