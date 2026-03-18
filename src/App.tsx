import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout';
import {
  Dashboard,
  Servers,
  Applications,
  Deployments,
  Monitoring,
  Pipelines,
  Webhooks,
  ActivityPage,
  SettingsPage,
} from '@/pages';
import { GitHubDeploy } from '@/pages/GitHubDeploy';
import { useAppStore } from '@/stores';

function App() {
  const initializeDemoData = useAppStore((state) => state.initializeDemoData);
  const servers = useAppStore((state) => state.servers);

  useEffect(() => {
    if (servers.length === 0) {
      initializeDemoData();
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="servers" element={<Servers />} />
          <Route path="applications" element={<Applications />} />
          <Route path="deployments" element={<Deployments />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="pipelines" element={<Pipelines />} />
          <Route path="webhooks" element={<Webhooks />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="github-deploy" element={<GitHubDeploy />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
