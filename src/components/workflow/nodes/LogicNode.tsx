import React from 'react';
import { BaseNode, BaseNodeProps } from './BaseNode';
import { Badge } from '@/components/ui/badge';
import { 
  GitBranch, 
  RotateCcw, 
  Shuffle, 
  Clock, 
  Layers,
  Filter,
  Code2,
  Split,
  Merge,
  Calculator,
  CheckCircle,
  XCircle
} from 'lucide-react';

const getLogicIcon = (logicType: string) => {
  switch (logicType) {
    case 'condition':
    case 'condition-logic':
      return <GitBranch className="h-4 w-4" />;
    case 'loop':
    case 'loop-logic':
      return <RotateCcw className="h-4 w-4" />;
    case 'transform':
    case 'transform-logic':
      return <Shuffle className="h-4 w-4" />;
    case 'delay':
    case 'delay-logic':
      return <Clock className="h-4 w-4" />;
    case 'parallel':
    case 'parallel-logic':
      return <Layers className="h-4 w-4" />;
    case 'filter':
      return <Filter className="h-4 w-4" />;
    case 'script':
      return <Code2 className="h-4 w-4" />;
    case 'split':
      return <Split className="h-4 w-4" />;
    case 'merge':
      return <Merge className="h-4 w-4" />;
    case 'calculate':
      return <Calculator className="h-4 w-4" />;
    default:
      return <GitBranch className="h-4 w-4" />;
  }
};

const getLogicTypeLabel = (logicType: string) => {
  switch (logicType) {
    case 'condition':
    case 'condition-logic':
      return 'Condition';
    case 'loop':
    case 'loop-logic':
      return 'Loop';
    case 'transform':
    case 'transform-logic':
      return 'Transform';
    case 'delay':
    case 'delay-logic':
      return 'Delay';
    case 'parallel':
    case 'parallel-logic':
      return 'Parallel';
    case 'filter':
      return 'Filter';
    case 'script':
      return 'Script';
    case 'split':
      return 'Split';
    case 'merge':
      return 'Merge';
    case 'calculate':
      return 'Calculate';
    default:
      return 'Logic';
  }
};

const getLogicDescription = (config: Record<string, any>) => {
  if (config.condition) {
    return `If: ${config.condition.substring(0, 30)}...`;
  }
  
  if (config.loopCount) {
    return `Loop ${config.loopCount} times`;
  }
  
  if (config.transformScript) {
    return `Transform: ${config.transformScript.substring(0, 30)}...`;
  }
  
  if (config.delayMs) {
    const seconds = config.delayMs / 1000;
    return `Delay ${seconds}s`;
  }
  
  if (config.branches) {
    return `${config.branches} parallel branches`;
  }
  
  if (config.filterExpression) {
    return `Filter: ${config.filterExpression.substring(0, 30)}...`;
  }
  
  if (config.script) {
    return `Script: ${config.script.substring(0, 30)}...`;
  }
  
  return 'Logic configuration';
};

const getLogicComplexity = (config: Record<string, any>) => {
  let complexity = 'simple';
  
  if (config.condition && config.condition.includes('&&') || config.condition?.includes('||')) {
    complexity = 'complex';
  } else if (config.loopCount && config.loopCount > 10) {
    complexity = 'complex';
  } else if (config.branches && config.branches > 3) {
    complexity = 'complex';
  } else if (config.transformScript && config.transformScript.length > 100) {
    complexity = 'moderate';
  }
  
  return complexity;
};

export const LogicNode: React.FC<BaseNodeProps> = (props) => {
  const { data } = props;
  const logicType = data.config.logicType || props.type;
  const logicIcon = getLogicIcon(logicType);
  const logicTypeLabel = getLogicTypeLabel(logicType);
  const logicDescription = getLogicDescription(data.config);
  const complexity = getLogicComplexity(data.config);

  // Data with logic-specific information
  const nodeData = {
    ...data,
    description: logicDescription,
  };

  return (
    <div className="relative">
      <BaseNode {...props} data={nodeData} />
      
      {/* Logic-specific overlay */}
      <div className="absolute top-2 left-2 flex items-center gap-1">
        {logicIcon}
        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
          {logicTypeLabel}
        </Badge>
      </div>

      {/* Configuration indicators */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1">
        {complexity !== 'simple' && (
          <Badge 
            variant="outline" 
            className={`text-xs ${
              complexity === 'complex' 
                ? 'bg-red-50 text-red-700' 
                : 'bg-yellow-50 text-yellow-700'
            }`}
          >
            {complexity}
          </Badge>
        )}
        
        {data.config.async && (
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
            Async
          </Badge>
        )}
      </div>

      {/* Conditional output indicators for condition nodes */}
      {(logicType === 'condition' || logicType === 'condition-logic') && (
        <>
          <div className="absolute bottom-1 left-1/4 flex items-center">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span className="text-xs text-green-600 ml-1">True</span>
          </div>
          <div className="absolute bottom-1 right-1/4 flex items-center">
            <XCircle className="h-3 w-3 text-red-500" />
            <span className="text-xs text-red-600 ml-1">False</span>
          </div>
        </>
      )}

      {/* Loop indicator */}
      {(logicType === 'loop' || logicType === 'loop-logic') && data.config.loopCount && (
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="text-xs">
            ×{data.config.loopCount}
          </Badge>
        </div>
      )}

      {/* Parallel branches indicator */}
      {(logicType === 'parallel' || logicType === 'parallel-logic') && data.config.branches && (
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="text-xs">
            {data.config.branches} branches
          </Badge>
        </div>
      )}
    </div>
  );
};

export default LogicNode;