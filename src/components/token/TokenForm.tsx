
import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { toast } from "@/hooks/use-toast";
import { mockApis } from "@/services/api";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TokenForm = () => {
  const { orgId, permissions } = useAppSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    type: "ERC3643",
    blockchain: "Ethereum",
    supply: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);

  // Check if user has permission to create tokens
  const canCreateTokens = permissions.includes("tokens:write");

  // This would connect to the WebSocket in a real app
  useEffect(() => {
    // Mock WebSocket connection
    const mockSocketConnection = () => {
      const statuses = ["Pending", "Deploying Contract", "Confirmed"];
      let statusIndex = 0;

      const interval = setInterval(() => {
        if (transactionStatus === "Pending") {
          statusIndex++;
          if (statusIndex < statuses.length) {
            setTransactionStatus(statuses[statusIndex]);
          } else {
            clearInterval(interval);
          }
        }
      }, 2000);

      return () => clearInterval(interval);
    };

    if (transactionStatus === "Pending") {
      mockSocketConnection();
    }
  }, [transactionStatus]);

  const handleChange = (field: string, value: string | number) => {
    setFormData({ ...formData, [field]: value });
    
    // Auto-generate symbol from name
    if (field === 'name' && typeof value === 'string' && !formData.symbol) {
      const symbol = value
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase();
      
      setFormData(prev => ({ ...prev, symbol }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateTokens) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to create tokens.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.name) {
      setError("Token name is required");
      return;
    }
    
    if (formData.supply <= 0) {
      setError("Supply must be greater than 0");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // In a real app, we would call the actual API endpoint
      await mockApis.createToken({ ...formData, orgId });
      
      setTransactionStatus("Pending");
      toast({
        title: "Token Creation Started",
        description: "Your token is being processed. You'll be notified when it's ready.",
      });
      
      // Reset form after successful submission
      setFormData({
        name: "",
        symbol: "",
        type: "ERC3643",
        blockchain: "Ethereum",
        supply: 0,
      });
    } catch (err) {
      setError("Failed to create token. Please try again.");
      toast({
        title: "Error",
        description: "Failed to create token. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Create New Token</CardTitle>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          
          {transactionStatus && (
            <div className="bg-primary/10 text-primary text-sm p-3 rounded-md flex items-center justify-between">
              <div>
                <p className="font-medium">Transaction Status</p>
                <p>{transactionStatus}</p>
              </div>
              <Badge variant="outline" className="ml-2">
                {transactionStatus === "Confirmed" ? "✓" : <Loader2 className="h-3 w-3 animate-spin" />}
              </Badge>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Token Name</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g., Acme Security Token"
              disabled={loading || !!transactionStatus}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="symbol">Token Symbol</Label>
            <Input
              id="symbol"
              type="text"
              value={formData.symbol}
              onChange={(e) => handleChange("symbol", e.target.value)}
              placeholder="e.g., AST"
              disabled={loading || !!transactionStatus}
              required
            />
            <p className="text-xs text-muted-foreground">
              Symbol is auto-generated from the token name, but can be customized
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Token Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleChange("type", value)}
              disabled={loading || !!transactionStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select token type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ERC3643">ERC3643 (Permissioned)</SelectItem>
                <SelectItem value="ERC20">ERC20 (Standard)</SelectItem>
                <SelectItem value="Stellar">Stellar Asset</SelectItem>
                <SelectItem value="ERC721">ERC721 (NFT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="blockchain">Blockchain</Label>
            <Select
              value={formData.blockchain}
              onValueChange={(value) => handleChange("blockchain", value)}
              disabled={loading || !!transactionStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select blockchain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ethereum">Ethereum</SelectItem>
                <SelectItem value="Polygon">Polygon</SelectItem>
                <SelectItem value="Stellar">Stellar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="supply">Initial Supply</Label>
            <Input
              id="supply"
              type="number"
              value={formData.supply || ""}
              onChange={(e) => handleChange("supply", parseInt(e.target.value) || 0)}
              placeholder="1000000"
              disabled={loading || !!transactionStatus}
              required
            />
          </div>
        </CardContent>
        
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !!transactionStatus || !canCreateTokens}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Token"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default TokenForm;
