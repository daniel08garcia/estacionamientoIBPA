import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from '../../shared/components/Layout';
import { GenerateLabelPage } from '../../features/generate-label/components/GenerateLabelPage';
import { ScanLabelPage } from '../../features/scan-label/components/ScanLabelPage';
import { SettingsPage } from '../../features/settings/components/SettingsPage';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <GenerateLabelPage /> },
      { path: '/leer', element: <ScanLabelPage /> },
      { path: '/configuracion', element: <SettingsPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
