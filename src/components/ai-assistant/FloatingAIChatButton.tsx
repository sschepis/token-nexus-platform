// src/components/ai-assistant/FloatingAIChatButton.tsx
import React from 'react';
import { MessageCircle } from 'lucide-react'; // Using lucide-react for icons

interface FloatingAIChatButtonProps {
  onClick: () => void;
}

const FloatingAIChatButton: React.FC<FloatingAIChatButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: '#007bff', // Primary blue, adjust as per theme
        color: 'white',
        border: 'none',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000, // Ensure it's above other content
      }}
      aria-label="Open AI Assistant Chat"
    >
      <MessageCircle size={28} />
    </button>
  );
};

export default FloatingAIChatButton;