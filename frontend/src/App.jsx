import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home/Home';
import Register from './pages/Register/Register';
import Login from './pages/Login/Login';
import VerifyEmail from './pages/VerifyEmail/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword/ForgotPassword';
import ResetPassword from './pages/ResetPassword/ResetPassword';
import Dashboard from './pages/Dashboard/Dashboard';
import ProjectPage from './pages/ProjectPage/ProjectPage';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute/PublicOnlyRoute';
import AuthLayout from './components/AuthLayout/AuthLayout';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* Telas de entrada: mesmo card entre elas (AuthLayout); só sem sessão ativa */}
      <Route
        element={
          <PublicOnlyRoute>
            <AuthLayout />
          </PublicOnlyRoute>
        }
      >
        <Route path="/cadastro" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>
      {/* Aberta por link de e-mail: precisa funcionar mesmo com sessão ativa */}
      <Route element={<AuthLayout />}>
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route
        path="/projetos"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projetos/:id"
        element={
          <ProtectedRoute>
            <ProjectPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
