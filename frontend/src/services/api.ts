import axios from 'axios';
import type { DashboardSnapshot, TaskItem, NodeItem, ArtifactFile, TaskTemplate, ScheduledTaskItem } from '../types';
import { showToast } from './toast';

const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      const msg = error.response.data?.message || `Error ${error.response.status}`;
      showToast('error', msg);
    } else if (error.request) {
      showToast('error', 'CONNECTION LOST');
    }
    return Promise.reject(error);
  }
);

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

export async function uploadTaskPackage(
  file: File,
  name?: string,
  onUploadProgress?: (e: { loaded: number; total?: number }) => void,
) {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);
  const { data } = await api.post('/transfer/upload', formData, {
    timeout: 300000,
    maxContentLength: 500 * 1024 * 1024,
    transformRequest: [(d) => d],
    onUploadProgress,
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

export async function downloadArtifacts(taskId: string): Promise<Blob> {
  const { data } = await api.get(`/tasks/${taskId}/artifacts/download`, { responseType: 'blob' });
  return data;
}

export async function fetchArtifactList(taskId: string): Promise<{ taskId: string; files: ArtifactFile[] }> {
  const { data } = await api.get(`/tasks/${taskId}/artifacts/list`);
  return data.data;
}

export async function downloadArtifactFile(taskId: string, filePath: string): Promise<Blob> {
  const { data } = await api.get(`/tasks/${taskId}/artifacts/file`, {
    params: { path: filePath },
    responseType: 'blob',
  });
  return data;
}

export async function downloadTaskLogs(taskId: string): Promise<Blob> {
  const resp = await fetchTaskLogs(taskId);
  return new Blob([resp.logs || ''], { type: 'text/plain' });
}

export async function fetchTemplates(): Promise<TaskTemplate[]> {
  const { data } = await api.get('/templates');
  return data.data;
}

export async function fetchTemplate(id: string): Promise<TaskTemplate> {
  const { data } = await api.get(`/templates/${id}`);
  return data.data;
}

export async function createTemplate(payload: Record<string, unknown>) {
  const { data } = await api.post('/templates', payload);
  return data.data;
}

export async function updateTemplate(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put(`/templates/${id}`, payload);
  return data.data;
}

export async function deleteTemplate(id: string) {
  const { data } = await api.delete(`/templates/${id}`);
  return data;
}

export async function batchCancelTasks(taskIds: string[]) {
  const { data } = await api.post('/tasks/batch/cancel', { taskIds });
  return data.data;
}

export async function batchRetryTasks(taskIds: string[]) {
  const { data } = await api.post('/tasks/batch/retry', { taskIds });
  return data.data;
}

export async function cloneTask(taskId: string) {
  const { data } = await api.post(`/tasks/${taskId}/clone`);
  return data.data;
}

export async function compareTasks(ids: string[]) {
  const { data } = await api.get('/tasks/compare', { params: { ids: ids.join(',') } });
  return data.data;
}

export async function login(username: string, password: string) {
  const { data } = await api.post('/auth/login', { username, password });
  return data.data;
}

export async function register(username: string, password: string) {
  const { data } = await api.post('/auth/register', { username, password });
  return data.data;
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data.data;
}

export async function fetchSchedules(): Promise<ScheduledTaskItem[]> {
  const { data } = await api.get('/schedules');
  return data.data;
}

export async function createSchedule(payload: { templateId: string; taskName?: string; cronExpression: string }) {
  const { data } = await api.post('/schedules', payload);
  return data.data;
}

export async function updateSchedule(id: string, payload: Record<string, string>) {
  const { data } = await api.put(`/schedules/${id}`, payload);
  return data.data;
}

export async function deleteSchedule(id: string) {
  const { data } = await api.delete(`/schedules/${id}`);
  return data;
}

export async function toggleSchedule(id: string) {
  const { data } = await api.post(`/schedules/${id}/toggle`);
  return data.data;
}
