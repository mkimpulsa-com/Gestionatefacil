import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import './MainLayout.css';

export function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  return (
    <div className="app-container">
      {isMobileMenuOpen && (
        <div className="mobile-backdrop overlay-active" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <div className="main-content-wrapper">
        <Topbar toggleMobileMenu={() => setIsMobileMenuOpen(true)} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
