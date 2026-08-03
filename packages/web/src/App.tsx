import { BrowserRouter, Routes, Route } from "react-router-dom";
import Shopping from "./pages/Shopping.js";
import CrossFit from "./pages/CrossFit.js";
import Login from "./pages/Login.js";
import Dashboard from "./pages/Dashboard.js";
import ActivityDetail from "./pages/ActivityDetail.js";
import CrossfitDetail from "./pages/CrossfitDetail.js";
import { AuthProvider } from "./context/AuthContext.js";
import ProtectedRoute from "./components/ProtectedRoute.js";
import Nav from "./components/Nav.js";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Shopping />} />
            <Route path="/crossfit" element={<CrossFit />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/activity/:id" element={<ActivityDetail />} />
            <Route path="/crossfit/:id" element={<CrossfitDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
