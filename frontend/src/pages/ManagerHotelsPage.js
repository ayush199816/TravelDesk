import React from 'react';

const ManagerHotelsPage = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2>Hotels Management</h2>
        <p>Hotels management interface for managers will be implemented here.</p>
        <p>Features will include:</p>
        <ul>
          <li>View all hotels</li>
          <li>Add/Edit/Delete hotels</li>
          <li>Manage room categories</li>
          <li>View hotel performance metrics</li>
          <li>Supplier assignments</li>
        </ul>
      </div>
    </div>
  );
};

export default ManagerHotelsPage;
