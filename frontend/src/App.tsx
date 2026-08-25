import "./App.css";
import Home from "./pages/Home";
import { BrowserRouter, Routes, Route } from "react-router";
import RedirectPage from "./pages/RedirectPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Home />} />
        <Route path="/r/:shortCode" element={<RedirectPage />} />
      </Routes>
    </BrowserRouter>
  );
}
