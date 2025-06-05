// src/components/ai-assistant/AIChatPopup.tsx
import React from 'react';
import EnhancedAIChatInterface from './EnhancedAIChatInterface';
import { X } from 'lucide-react';

interface AIChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIChatPopup: React.FC<AIChatPopupProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed bottom-[100px] right-[30px] w-[400px] h-[500px] bg-card text-card-foreground shadow-lg rounded-lg z-[999] flex flex-col overflow-hidden border border-border"
    >
      <div
        className="flex justify-between items-center p-3 px-4 bg-muted border-b border-border"
      >
        <h3 className="m-0 text-lg font-semibold text-muted-foreground">AI Assistant</h3>
        <button
          onClick={onClose}
          className="bg-transparent border-none cursor-pointer p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close chat"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-grow p-0 overflow-hidden">
        {/* AIChatInterface might need its own theme adjustments if it uses inline styles */}
        <EnhancedAIChatInterface />
      </div>
    </div>
  );
};

export default AIChatPopup;