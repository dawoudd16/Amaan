/**
 * Request Detail Panel Component
 * 
 * Shows detailed information about a request including:
 * - Request info
 * - Uploaded documents
 * - Notes
 * - Actions (update status, remind, reopen, review)
 */

import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/api';
import ReminderBadge from './ReminderBadge';

const DOCUMENT_TYPES = ['ID', 'LICENCE', 'PROOF_OF_ADDRESS', 'BANK_STATEMENT'];

/**
 * @param {Object} request - Request object with full details
 * @param {Function} onUpdate - Callback when request is updated
 */
function RequestDetailPanel({ request, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [rejectedDocTypes, setRejectedDocTypes] = useState([]);
  const [notes, setNotes] = useState(request.notes || '');
  const [currentRequest, setCurrentRequest] = useState(request);
  const [showCustomerLink, setShowCustomerLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Sync request prop with state when it changes
  useEffect(() => {
    setCurrentRequest(request);
    setNotes(request.notes || '');
  }, [request]);

  const handleNotesUpdate = async () => {
    setLoading(true);
    setError(null);
    try {
      await authenticatedFetch(`/api/telesales/requests/${request.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: notes })
      });
      // Reload full request details
      const details = await authenticatedFetch(`/api/telesales/requests/${request.id}`);
      setCurrentRequest(details.request);
      setNotes(details.request.notes || '');
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReminderConfirmed = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use req.id (currentRequest) which is the most up-to-date
      const requestId = req.id;
      console.log('Confirming reminder for request:', requestId);
      console.log('Current reminder level before:', req.needsReminderLevel);
      
      const response = await authenticatedFetch(`/api/telesales/requests/${requestId}/reminded`, {
        method: 'POST'
      });
      
      console.log('Reminder confirmed response:', response);
      console.log('Updated reminder level:', response.request?.needsReminderLevel);
      
      // Always reload full request details to get all fields (documents, etc.)
      const details = await authenticatedFetch(`/api/telesales/requests/${requestId}`);
      console.log('Reloaded request details:', details.request?.needsReminderLevel);
      
      // Force update the state
      setCurrentRequest({
        ...details.request,
        needsReminderLevel: details.request.needsReminderLevel || 0
      });
      
      // Show success message
      alert('Reminder confirmed! The reminder badge has been cleared.');
      
      // Refresh the list to update reminder badges in the table
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Error confirming reminder:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReopen = async () => {
    setLoading(true);
    setError(null);
    try {
      await authenticatedFetch(`/api/telesales/requests/${request.id}/reopen`, {
        method: 'POST'
      });
      // Reload full request details
      const details = await authenticatedFetch(`/api/telesales/requests/${request.id}`);
      setCurrentRequest(details.request);
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewDecision) {
      setError('Please select Approve or Reject');
      return;
    }
    if (reviewDecision === 'REJECT' && !reviewComment) {
      setError('Comment is required for rejection');
      return;
    }
    if (reviewDecision === 'REJECT' && rejectedDocTypes.length === 0) {
      setError('Please select at least one document for the customer to re-upload');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authenticatedFetch(`/api/telesales/requests/${request.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          decision: reviewDecision,
          comment: reviewComment,
          rejectedDocumentTypes: reviewDecision === 'REJECT' ? rejectedDocTypes : []
        })
      });
      setReviewDecision('');
      setReviewComment('');
      setRejectedDocTypes([]);
      // Reload full request details
      const details = await authenticatedFetch(`/api/telesales/requests/${request.id}`);
      setCurrentRequest(details.request);
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this request for ${req.customerName}? This action cannot be undone and will delete all associated documents and files.`)) {
      return;
    }

    // Double confirmation for safety
    if (!confirm('This will permanently delete the request, all uploaded documents, and all associated files. Are you absolutely sure?')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Use req.id (currentRequest) which is the most up-to-date request data
      const requestId = req.id;
      console.log('Deleting request:', requestId);
      
      const response = await authenticatedFetch(`/api/telesales/requests/${requestId}`, {
        method: 'DELETE'
      });
      
      console.log('Delete response:', response);
      
      // Navigate back to list FIRST, then show success message
      // This ensures the navigation happens immediately
      if (onUpdate) {
        onUpdate();
      }
      
      // Show success message after navigation is triggered
      setTimeout(() => {
        alert('Request deleted successfully!');
      }, 100);
      
    } catch (err) {
      console.error('Delete error:', err);
      const errorMessage = err.message || 'Failed to delete request. Please try again.';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) {
      console.log('formatDate: timestamp is null/undefined');
      return 'N/A';
    }
    try {
      let date;
      if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
        // Firestore Timestamp
        date = timestamp.toDate();
      } else if (timestamp?._seconds) {
        // Firestore Timestamp as object with _seconds
        date = new Date(timestamp._seconds * 1000);
      } else if (timestamp?.seconds) {
        // Firestore Timestamp as object with seconds
        date = new Date(timestamp.seconds * 1000);
      } else if (typeof timestamp === 'string') {
        // ISO string or other string format
        date = new Date(timestamp);
      } else if (typeof timestamp === 'number') {
        // Unix timestamp
        date = new Date(timestamp);
      } else {
        console.log('formatDate: unknown timestamp format', timestamp);
        return 'N/A';
      }
      
      if (isNaN(date.getTime())) {
        console.log('formatDate: invalid date', timestamp);
        return 'N/A';
      }
      
      return date.toLocaleString();
    } catch (e) {
      console.error('Error formatting date:', e, 'timestamp:', timestamp);
      return 'N/A';
    }
  };

  const getCustomerLink = () => {
    if (req.secureToken) {
      const baseUrl = window.location.origin;
      return `${baseUrl}/customer/${req.secureToken}`;
    }
    return null;
  };

  const handleCopyLink = async () => {
    const link = getCustomerLink();
    if (link) {
      try {
        await navigator.clipboard.writeText(link);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = link;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 2000);
        } catch (e) {
          alert('Failed to copy link. Please copy manually: ' + link);
        }
        document.body.removeChild(textArea);
      }
    }
  };

  const getDocumentUrl = (doc) => {
    // Use backend proxy via the request's secure token — streams via Admin SDK, always has access
    if (req.secureToken) {
      return `/api/customer/requests/${req.secureToken}/files/${doc.id}`;
    }
    return '';
  };

  // Use currentRequest state instead of request prop
  const req = currentRequest;

  return (
    <div style={{
      padding: '24px',
      borderRadius: '8px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h2 style={{ margin: '0 0 20px 0' }}>Request Details</h2>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          Error: {error}
        </div>
      )}

      <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #dee2e6' }}>
        <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer Information</p>
        <p><strong>Name:</strong> {req.customerName}</p>
        <p><strong>Phone:</strong> {req.customerPhone}</p>
        {req.customerEmail && <p><strong>Email:</strong> {req.customerEmail}</p>}
        {req.dealerId && <p><strong>Dealer ID:</strong> {req.dealerId}</p>}
        {req.vehicleId && <p><strong>Vehicle ID:</strong> {req.vehicleId}</p>}
        
        {/* Customer Link Section */}
        <div style={{
          marginTop: '15px',
          padding: '15px',
          backgroundColor: '#e7f3ff',
          borderRadius: '4px',
          border: '1px solid #b3d9ff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <strong style={{ color: '#004085' }}>Customer Portal Link</strong>
            <button
              onClick={() => setShowCustomerLink(!showCustomerLink)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {showCustomerLink ? 'Hide Link' : 'Show Link'}
            </button>
          </div>
          {showCustomerLink && getCustomerLink() && (
            <div>
              <div style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <input
                  type="text"
                  value={getCustomerLink()}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: '#fff'
                  }}
                />
                <button
                  onClick={handleCopyLink}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: linkCopied ? '#28a745' : '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {linkCopied ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>
              <p style={{ margin: '0', fontSize: '12px', color: '#6c757d' }}>
                Send this link to the customer so they can upload their documents.
              </p>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #dee2e6' }}>
        <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Request Information</p>
        {req.requestNumber && (
          <p><strong>Request #:</strong> <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{req.requestNumber}</span></p>
        )}
        <p><strong>Status:</strong> {req.status}</p>
        <p><strong>Completion:</strong> {req.completionPercent}%</p>
        <p><strong>Created:</strong> {formatDate(req.createdAt)}</p>
        <p><strong>Reminder:</strong> {req.needsReminderLevel !== undefined && req.needsReminderLevel !== null ? (
          <ReminderBadge needsReminderLevel={req.needsReminderLevel} />
        ) : (
          <span style={{ color: '#6c757d', fontStyle: 'italic' }}>None</span>
        )}</p>
        {req.lastReminderAt && (
          <p><strong>Last Reminder:</strong> {formatDate(req.lastReminderAt)}</p>
        )}
        <p><strong>Review Status:</strong> {req.reviewStatus || 'PENDING'}</p>
        {req.reviewComment && (
          <p><strong>Review Comment:</strong> {req.reviewComment}</p>
        )}
      </div>

      {req.documents && req.documents.length > 0 && (
        <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #dee2e6' }}>
          <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Uploaded Documents</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {req.documents.map((doc) => (
              <div key={doc.id} style={{
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                padding: '15px',
                backgroundColor: '#f8f9fa'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <p style={{ fontWeight: 'bold', margin: '0 0 5px 0', fontSize: '16px' }}>{doc.type.replace(/_/g, ' ')}</p>
                  <p style={{ fontSize: '12px', color: '#6c757d', margin: '0' }}>
                    Uploaded: {formatDate(doc.uploadedAt)}
                  </p>
                </div>
                {doc.storagePath && (
                  <div>
                    <div style={{
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      padding: '10px',
                      backgroundColor: '#fff',
                      marginBottom: '10px',
                      textAlign: 'center',
                      minHeight: '200px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{ width: '100%' }}>
                        {/* Try to show as image first */}
                        <img
                          src={getDocumentUrl(doc)}
                          alt={doc.type}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '400px',
                            borderRadius: '4px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            display: 'block',
                            margin: '0 auto'
                          }}
                          onError={(e) => {
                            // If image fails, try PDF viewer
                            e.target.style.display = 'none';
                            const parent = e.target.parentElement;
                            const docUrl = getDocumentUrl(doc);
                            
                            // Check if it's a PDF or other file type
                            const iframe = document.createElement('iframe');
                            iframe.src = docUrl;
                            iframe.style.cssText = 'width: 100%; height: 500px; border: none; border-radius: 4px;';
                            iframe.title = doc.type;
                            parent.appendChild(iframe);
                            
                            // Also add a fallback link
                            const fallback = document.createElement('div');
                            fallback.style.cssText = 'margin-top: 10px;';
                            const link = document.createElement('a');
                            link.href = docUrl;
                            link.target = '_blank';
                            link.rel = 'noopener noreferrer';
                            link.style.cssText = 'display: inline-block; padding: 8px 16px; background-color: #6c757d; color: #fff; text-decoration: none; border-radius: 4px; font-size: 14px;';
                            link.textContent = '📄 Download File';
                            fallback.appendChild(link);
                            parent.appendChild(fallback);
                          }}
                        />
                      </div>
                    </div>
                    <a
                      href={getDocumentUrl(doc)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: '#fff',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        fontSize: '14px',
                        width: '100%',
                        textAlign: 'center'
                      }}
                    >
                      Open in New Tab
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #dee2e6' }}>
        <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows="4"
          placeholder="Add notes about this request..."
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontFamily: 'inherit',
            fontSize: '14px'
          }}
        />
        <button
          onClick={handleNotesUpdate}
          disabled={loading || notes === (req.notes || '')}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: notes === (req.notes || '') ? '#6c757d' : '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: notes === (req.notes || '') ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Saving...' : 'Save Notes'}
        </button>
      </div>

      <div style={{ marginTop: '30px', borderTop: '1px solid #dee2e6', paddingTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</p>
          <button
            onClick={handleDelete}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontSize: '14px'
            }}
          >
            {loading ? 'Deleting...' : '🗑️ Delete Request'}
          </button>
        </div>

        {req.status === 'EXPIRED' ? (
          <button
            onClick={handleReopen}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginRight: '10px'
            }}
          >
            Reopen Request
          </button>
        ) : (
          <>
            {(req.needsReminderLevel === 1 || req.needsReminderLevel === 2) && (
              <button
                onClick={handleReminderConfirmed}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ffc107',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginBottom: '15px',
                  display: 'block'
                }}
              >
                I Reminded the Customer
              </button>
            )}

            {req.status === 'SUBMITTED' && req.reviewStatus === 'PENDING' && (
              <div style={{
                border: '1px solid #dee2e6',
                padding: '15px',
                borderRadius: '4px',
                marginTop: '20px'
              }}>
                <h4>Review Request</h4>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ marginRight: '20px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="reviewDecision"
                      value="APPROVE"
                      checked={reviewDecision === 'APPROVE'}
                      onChange={(e) => { setReviewDecision(e.target.value); setRejectedDocTypes([]); }}
                      style={{ marginRight: '6px' }}
                    />
                    Approve
                  </label>
                  <label style={{ cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="reviewDecision"
                      value="REJECT"
                      checked={reviewDecision === 'REJECT'}
                      onChange={(e) => setReviewDecision(e.target.value)}
                      style={{ marginRight: '6px' }}
                    />
                    Reject
                  </label>
                </div>

                {reviewDecision === 'REJECT' && (
                  <div style={{
                    marginBottom: '15px',
                    padding: '12px',
                    backgroundColor: '#fff3cd',
                    borderRadius: '4px',
                    border: '1px solid #ffc107'
                  }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      Which documents must the customer re-upload? <span style={{ color: 'red' }}>*</span>
                    </label>
                    {DOCUMENT_TYPES.map(docType => (
                      <label key={docType} style={{ display: 'block', marginBottom: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={rejectedDocTypes.includes(docType)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRejectedDocTypes(prev => [...prev, docType]);
                            } else {
                              setRejectedDocTypes(prev => prev.filter(t => t !== docType));
                            }
                          }}
                          style={{ marginRight: '8px' }}
                        />
                        {docType.replace(/_/g, ' ')}
                      </label>
                    ))}
                    {rejectedDocTypes.length === 0 && (
                      <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#856404' }}>
                        You must select at least one document.
                      </p>
                    )}
                  </div>
                )}

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>
                    Comment {reviewDecision === 'REJECT' && <span style={{ color: 'red' }}>*</span>}
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows="3"
                    placeholder={reviewDecision === 'REJECT' ? 'Explain what the customer needs to fix...' : 'Optional comment'}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px'
                    }}
                  />
                </div>
                <button
                  onClick={handleReview}
                  disabled={loading || (reviewDecision === 'REJECT' && rejectedDocTypes.length === 0)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: reviewDecision === 'REJECT' ? '#dc3545' : '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: (loading || (reviewDecision === 'REJECT' && rejectedDocTypes.length === 0)) ? 'not-allowed' : 'pointer',
                    opacity: (loading || (reviewDecision === 'REJECT' && rejectedDocTypes.length === 0)) ? 0.6 : 1
                  }}
                >
                  {reviewDecision === 'REJECT' ? 'Confirm Rejection' : reviewDecision === 'APPROVE' ? 'Confirm Approval' : 'Submit Review'}
                </button>
              </div>
            )}

            {req.status === 'SUBMITTED' && req.reviewStatus !== 'PENDING' && (
              <div style={{
                border: '1px solid #dee2e6',
                padding: '15px',
                borderRadius: '4px',
                marginTop: '20px',
                backgroundColor: req.reviewStatus === 'APPROVED' ? '#d4edda' : '#f8d7da'
              }}>
                <h4>Review Status: {req.reviewStatus}</h4>
                {req.reviewComment && (
                  <p><strong>Comment:</strong> {req.reviewComment}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default RequestDetailPanel;

