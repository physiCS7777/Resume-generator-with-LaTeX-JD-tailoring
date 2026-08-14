import { NavLink, Route, Routes } from "react-router-dom";
import AdminPage from "./pages/Admin";
import MatchPage from "./pages/Match";
import ResumePage from "./pages/Resume";

export default function App() {
  return (
    <div className="layout">
      <header className="topbar">
        <strong>Resume Agent</strong>
        <nav>
          <NavLink to="/" end>
            Admin
          </NavLink>
          <NavLink to="/resume">Resume</NavLink>
          <NavLink to="/match">Job match</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<AdminPage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="/match" element={<MatchPage />} />
        </Routes>
      </main>
    </div>
  );
}
