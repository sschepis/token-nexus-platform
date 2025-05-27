// src/pages/AIAssistantPage.tsx
import React from 'react';
import AIChatInterface from '../components/ai-assistant/AIChatInterface';
// Assuming a common layout component exists, e.g., AppLayout
// import AppLayout from '../components/layout/AppLayout'; 

const AIAssistantPage: React.FC = () => {
  return (
    // <AppLayout> {/* If you have a standard page layout wrapper */}
    <div style={{ padding: '20px' }}>
      <h1>AI Org Assistant</h1>
      <p>Ask questions or request actions related to your organization.</p>
      <div style={{ marginTop: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <AIChatInterface />
      </div>
    </div>
    // </AppLayout>
  );
};

export default AIAssistantPage;