import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import Logo from "./components/Logo";
import WalletButton from "./components/WalletButton";
import { GenKitProvider } from "./context/GenKitContext";
import { CONTRACT_ADDRESS, EXPLORER_URL, NETWORK } from "./config";
import Home from "./pages/Home";
import Registry from "./pages/Registry";
import EntryDetail from "./pages/EntryDetail";
import Publish from "./pages/Publish";
import About from "./pages/About";
import "./styles.css";

export default function App() {
  return (
    <GenKitProvider>
      <BrowserRouter>
        <header className="nav">
          <Link to="/" className="brand">
            <Logo />
            <span>
              Gen<span className="brand-accent">Kit</span>
            </span>
          </Link>
          <nav className="nav-links">
            <NavLink to="/registry" className={({ isActive }) => (isActive ? "active" : "")}>
              Registry
            </NavLink>
            <NavLink to="/publish" className={({ isActive }) => (isActive ? "active" : "")}>
              Publish
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => (isActive ? "active" : "")}>
              About
            </NavLink>
          </nav>
          <WalletButton />
        </header>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/registry" element={<Registry />} />
          <Route path="/registry/:id" element={<EntryDetail />} />
          <Route path="/publish" element={<Publish />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Home />} />
        </Routes>

        <footer className="footer">
          <span>
            GenKit · {NETWORK} ·{" "}
            <a className="contract-link" href={EXPLORER_URL} target="_blank" rel="noreferrer">
              {CONTRACT_ADDRESS.slice(0, 10)}…{CONTRACT_ADDRESS.slice(-6)}
            </a>
          </span>
          <span>Schema-to-SDK for GenLayer</span>
        </footer>
      </BrowserRouter>
    </GenKitProvider>
  );
}
