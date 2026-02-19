/**
 * Main App Component
 * 
 * Sets up React Router and route definitions
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseClient';

import LoginPage from './pages/LoginPage';
import CustomerPortal from './pages/CustomerPortal';
import TeleSalesDashboard from './pages/TeleSalesDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import ActivityLog from './pages/ActivityLog';

function App() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/customer/:token" element={<CustomerPortal />} />
        
        {/* Login route */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/telesales" /> : <LoginPage />} 
        />
        
        {/* Protected routes */}
        <Route 
          path="/telesales" 
          element={user ? <TeleSalesDashboard /> : <Navigate to="/login" />} 
        />
        <Route
          path="/manager"
          element={user ? <ManagerDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/manager/activity"
          element={user ? <ActivityLog /> : <Navigate to="/login" />}
        />
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

