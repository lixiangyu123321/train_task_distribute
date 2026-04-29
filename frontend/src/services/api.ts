import axios from 'axios';
import type { DashboardSnapshot, TaskItem, NodeItem } from '../types';

const api = axios.create({ baseURL: '/api/v1' });

export async function fetchDashboard(): Promise<DashboardSnapshot> {
  const { data } = await api.get('/monitor/dashboard');
  return data.data;
}

export async function fetchTasks(status?: string, page = 1, size = 20) {
  const { data } = await api.get('/tasks', { params: { status, page, size } });
  return data.data;
}

export async function fetchTask(taskId: string): Promise<TaskItem> {
  const { data } = await api.get(`/tasks/${taskId}`);
  return data.data;
}

export async function fetchNodes(): Promise<NodeItem[]> {
  const { data } = await api.get('/nodes');
  return data.data;
}

export async function offlineNode(nodeId: string) {
  const { data } = await api.post(`/nodes/${nodeId}/offline`);
  return data;
}

export async function deleteNode(nodeId: string) {
  const { data } = await api.delete(`/nodes/${nodeId}`);
  return data;
}

export async function purgeAllTasks() {
  const { data } = await api.delete('/tasks');
  return data;
}

export async function submitTask(payload: Record<string, unknown>) {
  const { data } = await api.post('/tasks', payload);
  return data;
}

export async function cancelTask(taskId: string) {
  const { data } = await api.delete(`/tasks/${taskId}`);
  return data;
}

export async function uploadTaskPackage(file: File, name?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);
  const { data } = await api.post('/transfer/upload', formData, {
    timeout: 120000,
    maxContentLength: 500 * 1024 * 1024,
    transformRequest: [(d) => d],
  });
  return data;
}

export async function submitFromPackage(packageId: string, taskName: string, priority = 0) {
  const { data } = await api.post('/tasks/submit-package', {
    packageId, name: taskName, priority,
  });
  return data;
}

export async function fetchTaskLogs(taskId: string): Promise<{taskId: string; logs: string}> {
  const { data } = await api.get(`/tasks/${taskId}/logs`);
  return data.data;
}

export async function fetchTaskLogsTail(taskId: string, lines = 100): Promise<{taskId: string; logs: string}> {
  const { data } = await api.get(`/tasks/${taskId}/logs/tail`, { params: { lines } });
  return data.data;
}

export async function fetchMetricsHistory(taskId: string): Promise<{taskId: string; history: Record<string,unknown>[]}> {
  const { data } = await api.get(`/tasks/${taskId}/metrics/history`);
  return data.data;
}

export async function fetchQueueStatus(taskId?: string): Promise<{pendingCount:number; queuedCount:number; runningCount:number; queuePosition?:number}> {
  const { data } = await api.get('/tasks/queue/status', { params: taskId ? { taskId } : {} });
  return data.data;
}
