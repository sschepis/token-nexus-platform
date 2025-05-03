
import React, { useState } from 'react';
import { PageElement } from '@/types/page-builder';
import { Card, CardContent } from '@/components/ui/card';
import { Move, Copy, Trash2, ArrowUp, ArrowDown, Lock, Unlock } from 'lucide-react';
import { 
  ContextMenu, 
  ContextMenuContent, 
  ContextMenuItem, 
  ContextMenuTrigger,
  ContextMenuSeparator
} from '@/components/ui/context-menu';
import { toast } from '@/components/ui/sonner';

interface PageCanvasProps {
  elements: PageElement[];
  selectedElement: PageElement | null;
  onSelectElement: (element: PageElement | null) => void;
  onUpdateElement: (element: PageElement) => void;
  isPreviewMode: boolean;
  onDuplicateElement?: (element: PageElement) => void;
  onDeleteElement?: (elementId: string) => void;
}

const PageCanvas: React.FC<PageCanvasProps> = ({
  elements,
  selectedElement,
  onSelectElement,
  onUpdateElement,
  isPreviewMode,
  onDuplicateElement,
  onDeleteElement
}) => {
  const [dragElement, setDragElement] = useState<PageElement | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent, element: PageElement) => {
    if (isPreviewMode || element.props.locked) return;
    
    setDragElement(element);
    setStartPos({
      x: e.clientX - element.position.x,
      y: e.clientY - element.position.y
    });
    onSelectElement(element);
    e.stopPropagation();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragElement || isPreviewMode || dragElement.props.locked) return;

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

  const handleDuplicate = (element: PageElement) => {
    if (onDuplicateElement) {
      onDuplicateElement(element);
      toast.success(`Duplicated ${element.type}`);
    }
  };

  const handleDelete = (elementId: string) => {
    if (onDeleteElement) {
      onDeleteElement(elementId);
      toast.success('Element deleted');
    }
  };

  const toggleLock = (element: PageElement) => {
    onUpdateElement({
      ...element,
      props: {
        ...element.props,
        locked: !element.props.locked
      }
    });
    toast.success(element.props.locked ? 'Element unlocked' : 'Element locked');
  };

  const bringForward = (element: PageElement) => {
    // Implementation would involve reordering elements array
    // For now, just show a toast notification
    toast.info('Bring forward feature coming soon');
  };

  const sendBackward = (element: PageElement) => {
    // Implementation would involve reordering elements array
    // For now, just show a toast notification
    toast.info('Send backward feature coming soon');
  };

  return (
    <div 
      className="relative w-full h-full bg-gray-50 dark:bg-gray-900 overflow-auto p-4"
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="relative min-h-full min-w-full">
        {elements.map((element) => (
          <ContextMenu key={element.id}>
            <ContextMenuTrigger>
              <div
                className={`absolute ${selectedElement?.id === element.id && !isPreviewMode ? 'ring-2 ring-primary' : ''}
                  ${element.props.locked ? 'cursor-not-allowed' : 'cursor-default'}`}
                style={{
                  left: `${element.position.x}px`,
                  top: `${element.position.y}px`,
                  width: `${element.size.width}px`,
                  height: `${element.size.height}px`,
                  ...(element.style || {})
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {!isPreviewMode && selectedElement?.id === element.id && !element.props.locked && (
                  <div 
                    className="absolute -top-4 -left-4 bg-primary text-primary-foreground p-1 rounded cursor-move z-10"
                    onMouseDown={(e) => handleMouseDown(e, element)}
                  >
                    <Move className="h-4 w-4" />
                  </div>
                )}
                
                {!isPreviewMode && element.props.locked && (
                  <div className="absolute -top-4 -left-4 bg-muted text-muted-foreground p-1 rounded z-10">
                    <Lock className="h-4 w-4" />
                  </div>
                )}
                
                <ElementRenderer 
                  element={element} 
                  onMouseDown={(e) => handleMouseDown(e, element)}
                  isPreviewMode={isPreviewMode}
                />
              </div>
            </ContextMenuTrigger>
            {!isPreviewMode && (
              <ContextMenuContent className="w-64">
                <ContextMenuItem 
                  onClick={() => onSelectElement(element)}
                  className="flex items-center"
                >
                  <Move className="mr-2 h-4 w-4" />
                  <span>Select</span>
                </ContextMenuItem>
                
                <ContextMenuItem 
                  onClick={() => toggleLock(element)}
                  className="flex items-center"
                >
                  {element.props.locked ? (
                    <>
                      <Unlock className="mr-2 h-4 w-4" />
                      <span>Unlock</span>
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      <span>Lock</span>
                    </>
                  )}
                </ContextMenuItem>
                
                <ContextMenuSeparator />
                
                <ContextMenuItem 
                  onClick={() => handleDuplicate(element)}
                  className="flex items-center"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  <span>Duplicate</span>
                </ContextMenuItem>
                
                <ContextMenuItem
                  onClick={() => bringForward(element)}
                  className="flex items-center"
                >
                  <ArrowUp className="mr-2 h-4 w-4" />
                  <span>Bring Forward</span>
                </ContextMenuItem>
                
                <ContextMenuItem
                  onClick={() => sendBackward(element)}
                  className="flex items-center"
                >
                  <ArrowDown className="mr-2 h-4 w-4" />
                  <span>Send Backward</span>
                </ContextMenuItem>
                
                <ContextMenuSeparator />
                
                <ContextMenuItem 
                  onClick={() => handleDelete(element.id)}
                  className="flex items-center text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </ContextMenuItem>
              </ContextMenuContent>
            )}
          </ContextMenu>
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
  const elementStyles = element.style || {};
  const isLocked = element.props.locked;
  const commonProps = {
    onMouseDown: (!isPreviewMode && !isLocked) ? onMouseDown : undefined,
    style: elementStyles
  };
  
  switch (element.type) {
    case 'container':
      return (
        <div 
          {...commonProps}
          className={`w-full h-full ${!isPreviewMode ? 'border-2 border-dashed border-gray-300' : 'border-transparent'} p-2 bg-white rounded-md`}
          style={{...elementStyles, background: elementStyles.backgroundColor || 'white'}}
        >
          <div className="text-sm text-gray-500 mb-2">{element.props.label || 'Container'}</div>
          {element.children?.map(child => (
            <ElementRenderer
              key={child.id}
              element={child}
              onMouseDown={onMouseDown}
              isPreviewMode={isPreviewMode}
            />
          ))}
        </div>
      );
    case 'card':
      return (
        <Card className="w-full h-full" style={elementStyles}>
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
          {...commonProps}
        >
          <span style={elementStyles}>{element.props.label || 'Text'}</span>
          {element.props.fieldBinding && (
            <span className="text-blue-500 ml-2">{`{${element.props.fieldBinding}}`}</span>
          )}
        </div>
      );
    case 'button':
      return (
        <button 
          className={`px-4 py-2 rounded ${element.props.variant === 'outline' ? 'border border-primary' : 'bg-primary text-primary-foreground'}`}
          {...commonProps}
        >
          {element.props.label || 'Button'}
        </button>
      );
    case 'input':
      return (
        <div 
          className="w-full h-full"
          {...commonProps}
        >
          <div className="text-sm mb-1">{element.props.label || 'Input'}</div>
          <input 
            type="text" 
            className="border border-input rounded px-2 py-1 w-full"
            placeholder={element.props.placeholder || ''}
            disabled={isPreviewMode}
            style={elementStyles}
          />
        </div>
      );
    default:
      return (
        <div 
          className="w-full h-full border border-gray-300 flex items-center justify-center"
          {...commonProps}
        >
          Unknown Element: {element.type}
        </div>
      );
  }
};

export default PageCanvas;
