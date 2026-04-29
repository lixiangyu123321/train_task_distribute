import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TaskList from './pages/TaskList';
import TaskDetail from './pages/TaskDetail';
import NodeMonitor from './pages/NodeMonitor';
import SubmitTask from './pages/SubmitTask';
import Tutorial from './pages/Tutorial';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<TaskList />} />
        <Route path="/tasks/:taskId" element={<TaskDetail />} />
        <Route path="/nodes" element={<NodeMonitor />} />
        <Route path="/submit" element={<SubmitTask />} />
        <Route path="/tutorial" element={<Tutorial />} />
      </Routes>
    </Layout>
  );
}
