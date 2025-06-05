
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

interface AIWorkerConfig {
  id: string;
  name: string;
  isActive: boolean;
  capabilities: string[];
  maxConcurrentTasks: number;
  autoScale: boolean;
  estimationConfidence: number;
}

const defaultWorkers: AIWorkerConfig[] = [
  {
    id: 'worker-1',
    name: 'Task Analyzer',
    isActive: true,
    capabilities: ['task_analysis', 'estimation', 'planning'],
    maxConcurrentTasks: 3,
    autoScale: true,
    estimationConfidence: 75,
  },
  {
    id: 'worker-2',
    name: 'Code Generator',
    isActive: false,
    capabilities: ['code_generation', 'refactoring', 'testing'],
    maxConcurrentTasks: 2,
    autoScale: false,
    estimationConfidence: 60,
  },
];

const AIWorkersConfig = () => {
  const { toast } = useToast();
  const [workers, setWorkers] = useState<AIWorkerConfig[]>(defaultWorkers);
  const [isLoading, setIsLoading] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);

  const capabilities = [
    { id: 'task_analysis', label: 'Task Analysis' },
    { id: 'estimation', label: 'Time Estimation' },
    { id: 'planning', label: 'Project Planning' },
    { id: 'code_generation', label: 'Code Generation' },
    { id: 'refactoring', label: 'Code Refactoring' },
    { id: 'testing', label: 'Automated Testing' },
    { id: 'documentation', label: 'Documentation' },
    { id: 'review', label: 'Code Review' },
  ];

  const handleToggleWorker = (workerId: string) => {
    setWorkers(workers.map(worker => 
      worker.id === workerId 
        ? { ...worker, isActive: !worker.isActive } 
        : worker
    ));
    
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
      toast({
        title: worker.isActive ? "Worker Disabled" : "Worker Enabled",
        description: `${worker.name} has been ${worker.isActive ? "disabled" : "enabled"}`,
      });
    }
  };

  const handleMaxTasksChange = (workerId: string, value: number[]) => {
    setWorkers(workers.map(worker => 
      worker.id === workerId 
        ? { ...worker, maxConcurrentTasks: value[0] } 
        : worker
    ));
  };

  const handleConfidenceChange = (workerId: string, value: number[]) => {
    setWorkers(workers.map(worker => 
      worker.id === workerId 
        ? { ...worker, estimationConfidence: value[0] } 
        : worker
    ));
  };

  const handleToggleAutoScale = (workerId: string) => {
    setWorkers(workers.map(worker => 
      worker.id === workerId 
        ? { ...worker, autoScale: !worker.autoScale } 
        : worker
    ));
  };

  const handleCapabilityToggle = (capability: string) => {
    setSelectedCapabilities(prev => 
      prev.includes(capability)
        ? prev.filter(c => c !== capability)
        : [...prev, capability]
    );
  };

  const handleCreateWorker = () => {
    if (!newWorkerName) {
      toast({
        title: "Worker name required",
        description: "Please provide a name for the new AI worker",
        variant: "destructive",
      });
      return;
    }

    if (selectedCapabilities.length === 0) {
      toast({
        title: "Capabilities required",
        description: "Please select at least one capability for the AI worker",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const newWorker: AIWorkerConfig = {
        id: `worker-${workers.length + 1}`,
        name: newWorkerName,
        isActive: true,
        capabilities: selectedCapabilities,
        maxConcurrentTasks: 2,
        autoScale: true,
        estimationConfidence: 70,
      };

      setWorkers([...workers, newWorker]);
      setNewWorkerName('');
      setSelectedCapabilities([]);
      setIsLoading(false);

      toast({
        title: "AI Worker Created",
        description: `${newWorkerName} has been created and activated`,
      });
    }, 1500);
  };

  const handleTestEstimation = (workerId: string) => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      
      toast({
        title: "Estimation Test Complete",
        description: "AI worker analyzed 5 sample tasks with 72% accuracy",
      });
    }, 2000);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI Workers Configuration</CardTitle>
        <CardDescription>
          Configure virtual AI workers for project analysis and task completion
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="existing">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Existing Workers</TabsTrigger>
            <TabsTrigger value="create">Create New Worker</TabsTrigger>
          </TabsList>
          
          <TabsContent value="existing" className="space-y-4 pt-4">
            {workers.map(worker => (
              <Card key={worker.id} className={`border ${worker.isActive ? 'border-blue-200 bg-blue-50' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{worker.name}</CardTitle>
                    <Switch 
                      checked={worker.isActive}
                      onCheckedChange={() => handleToggleWorker(worker.id)}
                    />
                  </div>
                  <CardDescription>
                    Capabilities: {worker.capabilities.map(c => 
                      capabilities.find(cap => cap.id === c)?.label
                    ).join(', ')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`maxTasks-${worker.id}`}>Max Concurrent Tasks: {worker.maxConcurrentTasks}</Label>
                    </div>
                    <Slider
                      id={`maxTasks-${worker.id}`}
                      min={1}
                      max={10}
                      step={1}
                      value={[worker.maxConcurrentTasks]}
                      onValueChange={(value) => handleMaxTasksChange(worker.id, value)}
                      disabled={!worker.isActive}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`confidence-${worker.id}`}>Estimation Confidence: {worker.estimationConfidence}%</Label>
                    </div>
                    <Slider
                      id={`confidence-${worker.id}`}
                      min={50}
                      max={95}
                      step={5}
                      value={[worker.estimationConfidence]}
                      onValueChange={(value) => handleConfidenceChange(worker.id, value)}
                      disabled={!worker.isActive}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`autoScale-${worker.id}`}
                      checked={worker.autoScale}
                      onCheckedChange={() => handleToggleAutoScale(worker.id)}
                      disabled={!worker.isActive}
                    />
                    <label 
                      htmlFor={`autoScale-${worker.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Auto-scale with project workload
                    </label>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleTestEstimation(worker.id)}
                      disabled={!worker.isActive || isLoading}
                    >
                      Test Estimation
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={!worker.isActive}
                    >
                      View History
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
            
            {workers.length === 0 && (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No AI workers configured yet</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="create" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="workerName">Worker Name</Label>
                <Input 
                  id="workerName"
                  placeholder="e.g. Project Analyzer"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-base">Capabilities</Label>
                <div className="grid grid-cols-2 gap-2">
                  {capabilities.map(capability => (
                    <div key={capability.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={capability.id} 
                        checked={selectedCapabilities.includes(capability.id)}
                        onCheckedChange={() => handleCapabilityToggle(capability.id)}
                      />
                      <label 
                        htmlFor={capability.id} 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {capability.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button 
                onClick={handleCreateWorker}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Creating..." : "Create AI Worker"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" disabled={isLoading}>
          Documentation
        </Button>
        <Button variant="outline" disabled={isLoading}>
          Advanced Settings
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AIWorkersConfig;
