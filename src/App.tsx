import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RoadmapProvider } from "./RoadmapContext";
import { Layout } from "./pages/Layout";
import { PlanPage } from "./pages/PlanPage";
import { ClonedRoadmapPage } from "./pages/ClonedRoadmapPage";

export default function App() {
  return (
    <BrowserRouter>
      <RoadmapProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<PlanPage />} />
            <Route path="system-design" element={<Navigate to="/roadmaps/system-design" replace />} />
            <Route path="roadmaps/:slug" element={<ClonedRoadmapPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </RoadmapProvider>
    </BrowserRouter>
  );
}
