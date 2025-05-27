import React, { useState, useEffect } from "react";
import { useRouter } from "next/router"; // Changed from react-router-dom
import {
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast as useShadcnToast } from "@/hooks/use-toast"; // Renamed to avoid conflict with sonner
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { 
  addFunction, 
  deleteFunction, 
  updateFunction, 
  setSelectedFunction 
} from "@/store/slices/cloudFunctionSlice"; // Assuming this path is correct
import FunctionDetail from "@/components/cloud-functions/FunctionDetail"; // Assuming this path is correct
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code, Trash2, Activity } from "lucide-react";
import { CloudFunction, FunctionLanguage, FunctionRuntime } from "@/types/cloud-functions"; // Assuming this path is correct
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StyledCard } from "@/components/ui/styled-card"; // Assuming this path is correct
import { toast as sonnerToast } from "sonner"; // Using sonner directly

const CloudFunctionsPage = () => {
  const { toast } = useShadcnToast(); // Using shadcn toast for consistency if needed, or pick one
  const dispatch = useAppDispatch();
  const router = useRouter(); // Changed
  const { functions, selectedFunctionId } = useAppSelector((state) => state.cloudFunction); // Added selectedFunctionId
  const [activeTab, setActiveTab] = useState("all");
  const [newFunctionOpen, setNewFunctionOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLanguage, setNewLanguage] = useState<FunctionLanguage>("javascript");
  const [newRuntime, setNewRuntime] = useState<FunctionRuntime>("nodejs18.x");
  const [newCode, setNewCode] = useState("export default function myFunction(req, res) {\n  // Your function code here\n  return { message: 'Hello world!' };\n}");

  const selectedFunction = selectedFunctionId 
    ? functions.find(f => f.id === selectedFunctionId)
    : null;

  const filteredFunctions = functions.filter((func) => {
    const matchesTab = 
      activeTab === "all" || 
      (activeTab === "active" && func.status === "active") || 
      (activeTab === "disabled" && func.status === "disabled") ||
      (activeTab === "error" && func.status === "error");

    const matchesSearch = 
      searchTerm === "" ||
      func.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      func.description?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const handleAddFunction = () => {
    if (!newName) {
      sonnerToast.error("Missing function name", { description: "Please provide a name for the function" });
      return;
    }

    if (!newCode || !newCode.includes("export default function")) {
      sonnerToast.error("Invalid function code", { description: "Function must export a default function" });
      return;
    }

    dispatch(addFunction({
      name: newName,
      description: newDescription,
      code: newCode,
      language: newLanguage,
      runtime: newRuntime,
    }));
    
    sonnerToast.success("Function created", { description: `Added function ${newName}` });
    
    setNewFunctionOpen(false);
    setNewName("");
    setNewDescription("");
    setNewCode("export default function myFunction(req, res) {\n  // Your function code here\n  return { message: 'Hello world!' };\n}");
  };

  const handleToggleActive = (functionId: string, currentStatus: string) => {
    dispatch(updateFunction({
      id: functionId,
      updates: { 
        status: currentStatus === "active" ? "disabled" : "active" 
      }
    }));
    
    sonnerToast.info(`Function ${currentStatus === "active" ? "disabled" : "activated"}`, {
      description: `The function has been ${currentStatus === "active" ? "disabled" : "activated"}`,
    });
  };

  const handleViewFunction = (functionId: string) => {
    dispatch(setSelectedFunction(functionId));
    setActiveTab("detail");
    // router.push(`/functions?detail=${functionId}`); // Optional
  };

  const handleDeleteFunction = (functionId: string, name: string) => {
    if (confirm(`Are you sure you want to delete the function ${name}?`)) {
      dispatch(deleteFunction(functionId));
      sonnerToast.success("Function deleted", { description: `Function ${name} has been deleted` });
      if (selectedFunctionId === functionId) {
        dispatch(setSelectedFunction(null));
        setActiveTab("all");
      }
    }
  };
  
  const handleBackFromDetail = () => {
    dispatch(setSelectedFunction(null));
    setActiveTab("all");
    // router.push('/functions'); // Optional
  };


  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cloud Functions</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage serverless functions that can be called via API or bound to routes
            </p>
          </div>
          
          <Dialog open={newFunctionOpen} onOpenChange={setNewFunctionOpen}>
            <DialogTrigger asChild>
              <Button>
                <Code className="h-4 w-4 mr-2" />
                Create Function
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Function</DialogTitle>
                <DialogDescription>
                  Define a new serverless function
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Function Name</Label>
                    <Input
                      id="name"
                      placeholder="getUserData"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Retrieves user data from database"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="language">Language</Label>
                    <Select 
                      value={newLanguage} 
                      onValueChange={(value) => setNewLanguage(value as FunctionLanguage)}
                    >
                      <SelectTrigger id="language">
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="runtime">Runtime</Label>
                    <Select 
                      value={newRuntime} 
                      onValueChange={(value) => setNewRuntime(value as FunctionRuntime)}
                    >
                      <SelectTrigger id="runtime">
                        <SelectValue placeholder="Runtime" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nodejs18.x">Node.js 18.x</SelectItem>
                        <SelectItem value="nodejs20.x">Node.js 20.x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="code">Function Code</Label>
                  <Textarea
                    id="code"
                    className="font-mono h-48"
                    placeholder="export default function myFunction(req, res) {\n  // Your code here\n  return { message: 'Hello World!' };\n}"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleAddFunction}>Create Function</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search functions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Functions</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="disabled">Disabled</TabsTrigger>
            <TabsTrigger value="error">Error</TabsTrigger>
            {selectedFunction && ( // Only show detail tab if a function is selected
              <TabsTrigger value="detail">Function Detail</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <FunctionTable 
              functions={filteredFunctions} 
              handleToggleActive={handleToggleActive} 
              handleViewFunction={handleViewFunction}
              handleDeleteFunction={handleDeleteFunction}
            />
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <FunctionTable 
              functions={filteredFunctions} 
              handleToggleActive={handleToggleActive} 
              handleViewFunction={handleViewFunction}
              handleDeleteFunction={handleDeleteFunction}
            />
          </TabsContent>

          <TabsContent value="disabled" className="space-y-4">
            <FunctionTable 
              functions={filteredFunctions} 
              handleToggleActive={handleToggleActive} 
              handleViewFunction={handleViewFunction}
              handleDeleteFunction={handleDeleteFunction}
            />
          </TabsContent>

          <TabsContent value="error" className="space-y-4">
            <FunctionTable 
              functions={filteredFunctions} 
              handleToggleActive={handleToggleActive} 
              handleViewFunction={handleViewFunction}
              handleDeleteFunction={handleDeleteFunction}
            />
          </TabsContent>

          <TabsContent value="detail" className="space-y-4">
            {/* Pass selectedFunction to FunctionDetail if it expects it, or ensure it uses Redux state */}
            <FunctionDetail onBack={handleBackFromDetail} />
          </TabsContent>
        </Tabs>
    </div>
  );
};

interface FunctionTableProps {
  functions: CloudFunction[]; // Updated type
  handleToggleActive: (id: string, status: string) => void;
  handleViewFunction: (id: string) => void;
  handleDeleteFunction: (id: string, name: string) => void;
}

const FunctionTable = ({ functions, handleToggleActive, handleViewFunction, handleDeleteFunction }: FunctionTableProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Functions List</CardTitle>
        <CardDescription>
          All cloud functions in your application
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Runtime</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {functions.length > 0 ? (
              functions.map((func) => (
                <TableRow key={func.id}>
                  <TableCell className="font-medium">{func.name}</TableCell>
                  <TableCell>{func.description || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{func.language}</Badge>
                  </TableCell>
                  <TableCell>{func.runtime}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Switch
                        checked={func.status === "active"}
                        onCheckedChange={() => handleToggleActive(func.id, func.status)}
                        className="mr-2"
                      />
                      <Badge
                        variant={
                          func.status === "active"
                            ? "default"
                            : func.status === "error"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {func.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewFunction(func.id)}
                      className="mr-2"
                    >
                      <Code className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDeleteFunction(func.id, func.name)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  No functions found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CloudFunctionsPage;