/**
 * Tele-Sales Dashboard Page
 * 
 * Main dashboard for Tele-Sales agents to:
 * - View their assigned requests
 * - Create new requests
 * - View and manage request details
 */

import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebaseClient';
import { authenticatedFetch } from '../utils/api';
import RequestTable from '../components/RequestTable';
import CreateRequestForm from '../components/CreateRequestForm';
import RequestDetailPanel from '../components/RequestDetailPanel';

function TeleSalesDashboard() {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadRequests();
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const data = await authenticatedFetch('/api/telesales/me');
      console.log('User info response:', data);
      const name = data.user?.name || data.user?.email || 'Agent';
      console.log('Setting user name to:', name);
      setUserName(name);
    } catch (err) {
      console.error('Error loading user info:', err);
      // Try to get name from Firebase Auth as fallback
      if (auth.currentUser) {
        setUserName(auth.currentUser.displayName || auth.currentUser.email || 'Agent');
      }
    }
  };

  const loadRequests = async () => {
    try {
      const data = await authenticatedFetch('/api/telesales/requests');
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error loading requests:', err);
      if (err.message.includes('Unauthorized') || err.message.includes('token')) {
        // Token expired or invalid, redirect to login
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleRequestClick = async (request) => {
    try {
      const data = await authenticatedFetch(`/api/telesales/requests/${request.id}`);
      setSelectedRequest(data.request);
    } catch (err) {
      console.error('Error loading request details:', err);
      alert('Failed to load request details');
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    loadRequests(); // Reload list
  };

  const handleBackToList = () => {
    setSelectedRequest(null);
    loadRequests(); // Reload to get updated data
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (selectedRequest) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleBackToList}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ← Back to List
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
        <RequestDetailPanel request={selectedRequest} onUpdate={handleBackToList} />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Amaan — Tele-Sales</h1>
          <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
            Welcome, <strong>{userName || 'Loading...'}</strong>
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      {showCreateForm ? (
        <div>
          <button
            onClick={() => setShowCreateForm(false)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            ← Back to List
          </button>
          <CreateRequestForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowCreateForm(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                flexShrink: 0
              }}
            >
              + New Request
            </button>
            <input
              type="text"
              placeholder="Search by name, phone or REQ-XXXX…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                flex: '1 1 240px',
                padding: '9px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
            <span style={{ fontSize: '13px', color: '#6c757d', flexShrink: 0 }}>
              {(() => {
                const term = searchTerm.toLowerCase();
                const count = term
                  ? requests.filter(r =>
                      r.customerName?.toLowerCase().includes(term) ||
                      r.customerPhone?.toLowerCase().includes(term) ||
                      r.requestNumber?.toLowerCase().includes(term)
                    ).length
                  : requests.length;
                return `${count} request${count !== 1 ? 's' : ''}`;
              })()}
            </span>
          </div>

          <RequestTable
            requests={searchTerm
              ? requests.filter(r => {
                  const term = searchTerm.toLowerCase();
                  return (
                    r.customerName?.toLowerCase().includes(term) ||
                    r.customerPhone?.toLowerCase().includes(term) ||
                    r.requestNumber?.toLowerCase().includes(term)
                  );
                })
              : requests
            }
            onRowClick={handleRequestClick}
          />
        </>
      )}
    </div>
  );
}

export default TeleSalesDashboard;

