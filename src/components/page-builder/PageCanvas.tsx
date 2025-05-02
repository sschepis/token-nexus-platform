
import React, { useState } from 'react';
import { PageElement } from '@/types/page-builder';
import { Card, CardContent } from '@/components/ui/card';
import { Move } from 'lucide-react';

interface PageCanvasProps {
  elements: PageElement[];
  selectedElement: PageElement | null;
  onSelectElement: (element: PageElement | null) => void;
  onUpdateElement: (element: PageElement) => void;
  isPreviewMode: boolean;
}

const PageCanvas: React.FC<PageCanvasProps> = ({
  elements,
  selectedElement,
  onSelectElement,
  onUpdateElement,
  isPreviewMode
}) => {
  const [dragElement, setDragElement] = useState<PageElement | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent, element: PageElement) => {
    if (isPreviewMode) return;
    
    setDragElement(element);
    setStartPos({
      x: e.clientX - element.position.x,
      y: e.clientY - element.position.y
    });
    onSelectElement(element);
    e.stopPropagation();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragElement || isPreviewMode) return;

    const updatedElement = {
      ...dragElement,
      position: {
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y
      }
    };
    onUpdateElement(updatedElement);
  };

  const handleMouseUp = () => {
    setDragElement(null);
  };

  const handleCanvasClick = () => {
    if (!isPreviewMode) {
      onSelectElement(null);
    }
  };

  return (
    <div 
      className="relative w-full h-full bg-gray-50 overflow-auto p-4"
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="relative min-h-full min-w-full">
        {elements.map((element) => (
          <div
            key={element.id}
            className={`absolute ${selectedElement?.id === element.id && !isPreviewMode ? 'ring-2 ring-primary' : ''}`}
            style={{
              left: `${element.position.x}px`,
              top: `${element.position.y}px`,
              width: `${element.size.width}px`,
              height: `${element.size.height}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {!isPreviewMode && selectedElement?.id === element.id && (
              <div 
                className="absolute -top-4 -left-4 bg-primary text-primary-foreground p-1 rounded cursor-move z-10"
                onMouseDown={(e) => handleMouseDown(e, element)}
              >
                <Move className="h-4 w-4" />
              </div>
            )}
            
            <ElementRenderer 
              element={element} 
              onMouseDown={(e) => handleMouseDown(e, element)}
              isPreviewMode={isPreviewMode}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

interface ElementRendererProps {
  element: PageElement;
  onMouseDown: (e: React.MouseEvent) => void;
  isPreviewMode: boolean;
}

const ElementRenderer: React.FC<ElementRendererProps> = ({ element, onMouseDown, isPreviewMode }) => {
  switch (element.type) {
    case 'container':
      return (
        <div 
          className={`w-full h-full border-2 ${!isPreviewMode ? 'border-dashed border-gray-300' : 'border-transparent'} p-2 bg-white rounded-md`}
          onMouseDown={!isPreviewMode ? onMouseDown : undefined}
        >
          <div className="text-sm text-gray-500 mb-2">{element.props.label || 'Container'}</div>
        </div>
      );
    case 'card':
      return (
        <Card className="w-full h-full">
          <CardContent className="p-4">
            <h3 className="font-medium">{element.props.label || 'Card'}</h3>
            {element.props.content && <p className="text-sm text-gray-500">{element.props.content}</p>}
          </CardContent>
        </Card>
      );
    case 'text':
      return (
        <div 
          className="w-full h-full flex items-center"
          onMouseDown={!isPreviewMode ? onMouseDown : undefined}
        >
          <span>{element.props.label || 'Text'}</span>
          {element.props.fieldBinding && (
            <span className="text-blue-500 ml-2">{`{${element.props.fieldBinding}}`}</span>
          )}
        </div>
      );
    case 'button':
      return (
        <button 
          className="bg-primary text-primary-foreground px-4 py-2 rounded"
          onMouseDown={!isPreviewMode ? onMouseDown : undefined}
        >
          {element.props.label || 'Button'}
        </button>
      );
    case 'input':
      return (
        <div 
          className="w-full h-full"
          onMouseDown={!isPreviewMode ? onMouseDown : undefined}
        >
          <div className="text-sm mb-1">{element.props.label || 'Input'}</div>
          <input 
            type="text" 
            className="border border-input rounded px-2 py-1 w-full"
            placeholder={element.props.placeholder || ''}
            disabled={isPreviewMode}
          />
        </div>
      );
    default:
      return (
        <div 
          className="w-full h-full border border-gray-300 flex items-center justify-center"
          onMouseDown={!isPreviewMode ? onMouseDown : undefined}
        >
          Unknown Element: {element.type}
        </div>
      );
  }
};

export default PageCanvas;
