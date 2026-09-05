import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home/Home';
import Register from './pages/Register/Register';
import Login from './pages/Login/Login';
import Canvas from './components/Canvas/Canvas';
import VerifyEmail from './pages/VerifyEmail/VerifyEmail';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cadastro" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/canvas-test" element={<Canvas />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
    </Routes>
  );
}

export default App;