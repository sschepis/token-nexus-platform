import React, { useState, useRef, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Terminal as TerminalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const JSConsole = () => {
  const { toast } = useToast();
  const [code, setCode] = useState(`// Write your JavaScript code here
function example() {
  const greeting = "Hello, world!";
  console.log(greeting);
  return greeting;
}

// Call the function
example();

// You can also try different JavaScript features:
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log("Doubled numbers:", doubled);`);

  const [output, setOutput] = useState<Array<{type: string, content: string}>>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of output when new content is added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleExecute = () => {
    setIsExecuting(true);
    setOutput([]);
    
    // Capture console output
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    };

    const capturedOutput: Array<{type: string, content: string}> = [];
    
    // Override console methods
    console.log = (...args) => {
      originalConsole.log(...args);
      capturedOutput.push({
        type: "log", 
        content: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(" ")
      });
    };
    
    console.error = (...args) => {
      originalConsole.error(...args);
      capturedOutput.push({
        type: "error", 
        content: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(" ")
      });
    };
    
    console.warn = (...args) => {
      originalConsole.warn(...args);
      capturedOutput.push({
        type: "warn", 
        content: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(" ")
      });
    };
    
    console.info = (...args) => {
      originalConsole.info(...args);
      capturedOutput.push({
        type: "info", 
        content: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(" ")
      });
    };
    
    // Execute code in try/catch block
    try {
      // Add return value to output if there is one
      const result = new Function(code)();
      if (result !== undefined) {
        capturedOutput.push({
          type: "result", 
          content: typeof result === 'object' 
            ? JSON.stringify(result, null, 2) 
            : String(result)
        });
      }
      
      // Update output state with all captured logs
      setOutput(capturedOutput);
      
      toast({
        title: "Code executed successfully",
        description: "Execution completed with no errors",
      });
    } catch (error) {
      // Add error to output
      capturedOutput.push({
        type: "error", 
        content: error.toString()
      });
      
      setOutput(capturedOutput);
      
      toast({
        title: "Error executing code",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      // Restore original console methods
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
      
      setIsExecuting(false);
    }
  };
  
  const handleClear = () => {
    setOutput([]);
  };
  
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">JavaScript Console</h1>
            <p className="text-muted-foreground mt-2">
              Execute and test JavaScript code snippets
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Code Editor</CardTitle>
              <CardDescription>
                Write your JavaScript code here
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Textarea 
                className="font-mono h-[400px] resize-none"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="// Write your JavaScript code here"
                spellCheck={false}
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleExecute} 
                  className="flex-1"
                  disabled={isExecuting}
                >
                  <TerminalIcon className="h-4 w-4 mr-2" />
                  {isExecuting ? "Executing..." : "Run Code"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClear}
                  disabled={output.length === 0}
                >
                  Clear Console
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Console Output</CardTitle>
              <CardDescription>
                View execution results and console logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                ref={outputRef}
                className="font-mono p-4 rounded-md bg-muted h-[460px] overflow-auto whitespace-pre-wrap"
              >
                {output.length === 0 ? (
                  <div className="text-muted-foreground text-center py-4">
                    Console output will appear here after execution
                  </div>
                ) : (
                  output.map((item, index) => (
                    <div 
                      key={index} 
                      className={cn(
                        "py-1 border-b border-border last:border-0",
                        item.type === "error" && "text-destructive",
                        item.type === "warn" && "text-yellow-500",
                        item.type === "info" && "text-blue-500",
                        item.type === "result" && "text-green-500 font-bold"
                      )}
                    >
                      {item.type === "result" ? "▶ " : ""}
                      {item.content}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default JSConsole;
