// pages/ai-assistant.tsx
import React from 'react';
import AIChatInterface from '@/components/ai-assistant/AIChatInterface'; // Changed path

const AIAssistantPage: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>AI Org Assistant</h1>
      <p>Ask questions or request actions related to your organization.</p>
      <div style={{ marginTop: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <AIChatInterface />
      </div>
    </div>
  );
};

export default AIAssistantPage;