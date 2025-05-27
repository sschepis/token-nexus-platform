
import React from "react";
import TokenForm from "@/components/token/TokenForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

const TokenCreate = () => {
  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/tokens">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Tokens
            </Link>
          </Button>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Token</h1>
          <p className="text-muted-foreground mt-2">
            Define and deploy a new tokenized asset for your organization
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TokenForm />
          </div>
          
          <div>
            <div className="bg-muted p-6 rounded-lg">
              <h3 className="font-medium text-lg mb-4">About Token Creation</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-1">Token Types</h4>
                  <p className="text-muted-foreground">
                    Choose the right token standard for your use case:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 mt-1 text-muted-foreground">
                    <li>
                      <span className="font-medium text-foreground">ERC3643:</span> Security tokens with compliance features
                    </li>
                    <li>
                      <span className="font-medium text-foreground">ERC20:</span> Standard fungible tokens
                    </li>
                    <li>
                      <span className="font-medium text-foreground">Stellar:</span> Fast, low-cost assets on Stellar network
                    </li>
                    <li>
                      <span className="font-medium text-foreground">ERC721:</span> Non-fungible tokens (NFTs)
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Process Timeline</h4>
                  <p className="text-muted-foreground mb-2">
                    Token creation typically follows these stages:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                    <li>Initial submission (1-2 minutes)</li>
                    <li>Smart contract deployment (2-5 minutes)</li>
                    <li>Blockchain confirmation (varies by network)</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Need Help?</h4>
                  <p className="text-muted-foreground">
                    For more guidance on token creation, check our
                    <a href="/docs" className="text-primary ml-1 hover:underline">
                      documentation
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default TokenCreate;
