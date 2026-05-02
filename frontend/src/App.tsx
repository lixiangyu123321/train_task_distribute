import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TaskList from './pages/TaskList';
import TaskDetail from './pages/TaskDetail';
import NodeMonitor from './pages/NodeMonitor';
import SubmitTask from './pages/SubmitTask';
import Tutorial from './pages/Tutorial';
import TemplateManager from './pages/TemplateManager';
import TaskCompare from './pages/TaskCompare';
import Login from './pages/Login';
import ScheduleManager from './pages/ScheduleManager';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tasks" element={<TaskList />} />
              <Route path="/tasks/:taskId" element={<TaskDetail />} />
              <Route path="/nodes" element={<NodeMonitor />} />
              <Route path="/submit" element={<SubmitTask />} />
              <Route path="/templates" element={<TemplateManager />} />
              <Route path="/compare" element={<TaskCompare />} />
              <Route path="/schedules" element={<ScheduleManager />} />
              <Route path="/tutorial" element={<Tutorial />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}
