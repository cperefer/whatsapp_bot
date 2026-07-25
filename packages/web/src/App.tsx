import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Shopping from "./pages/Shopping.js";
import CrossFit from "./pages/CrossFit.js";

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <NavLink to="/">Lista de la compra</NavLink>
        <NavLink to="/crossfit">CrossFit</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Shopping />} />
        <Route path="/crossfit" element={<CrossFit />} />
      </Routes>
    </BrowserRouter>
  );
}
