
import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Organization } from "@/store/slices/orgSlice";
import { CreditCard, Shield, Check, ArrowRight, Zap } from "lucide-react";

interface BillingSettingsProps {
  organization: Organization;
}

interface Plan {
  name: string;
  id: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}

const plans: Plan[] = [
  {
    name: "Free",
    id: "free",
    price: "$0/month",
    features: [
      "5 API tokens",
      "1,000 requests/month",
      "Basic analytics",
      "Email support",
    ],
  },
  {
    name: "Standard",
    id: "standard",
    price: "$49/month",
    highlighted: true,
    features: [
      "25 API tokens",
      "100,000 requests/month",
      "Advanced analytics",
      "Priority support",
      "Custom token policies",
      "Webhooks",
    ],
  },
  {
    name: "Enterprise",
    id: "enterprise",
    price: "$199/month",
    features: [
      "Unlimited API tokens",
      "Unlimited requests",
      "Full analytics suite",
      "Dedicated support",
      "SSO integration",
      "Custom rate limiting",
      "SLA guarantee",
    ],
  },
];

const BillingSettings = ({ organization }: BillingSettingsProps) => {
  const currentPlan = organization.plan;
  
  const form = useForm({
    defaultValues: {
      cardNumber: "•••• •••• •••• 4242",
      expiryDate: "12/24",
      cardholderName: "John Smith",
    },
  });

  const handleUpgrade = (planId: string) => {
    toast({
      title: "Plan Change Requested",
      description: `You have requested to upgrade to the ${planId} plan. This would be processed through a payment gateway in a real app.`,
    });
  };

  const handleUpdatePaymentMethod = (data: any) => {
    toast({
      title: "Payment Method Updated",
      description: "Your payment method has been updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plan</CardTitle>
          <CardDescription>
            Manage your subscription plan and billing cycle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm mb-4">
            Current Plan: 
            <Badge variant="outline" className="ml-2 font-semibold capitalize">
              {organization.plan}
            </Badge>
          </div>
          
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3 mt-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`overflow-hidden ${plan.highlighted ? 'border-primary shadow-md' : ''}`}
              >
                <CardHeader className="pb-3">
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="text-2xl font-bold mt-1">{plan.price}</div>
                </CardHeader>
                <CardContent className="pb-2">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" /> {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {currentPlan === plan.id ? (
                    <Button variant="outline" disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      variant={plan.highlighted ? "default" : "outline"}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {plan.id === "free" ? "Downgrade" : "Upgrade"}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
          
          <div className="mt-6 text-sm text-muted-foreground">
            <p>
              Plan changes will be applied immediately. Downgrading may result in loss of features.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center">
          <div className="flex-1">
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>
              Update your payment information and billing details.
            </CardDescription>
          </div>
          <CreditCard className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <form onSubmit={form.handleSubmit(handleUpdatePaymentMethod)}>
          <CardContent className="space-y-4">
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Card Number</label>
                <div className="flex items-center p-2 border rounded-md bg-muted/50">
                  <CreditCard className="h-4 w-4 text-muted-foreground mr-2" />
                  <span className="text-sm">{form.getValues().cardNumber}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Expiry Date</label>
                <div className="p-2 border rounded-md bg-muted/50 text-sm">
                  {form.getValues().expiryDate}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Cardholder Name</label>
                <div className="p-2 border rounded-md bg-muted/50 text-sm">
                  {form.getValues().cardholderName}
                </div>
              </div>
            </div>
            
            <div className="rounded-md bg-muted p-4 flex items-center gap-3 mt-4">
              <Zap className="h-5 w-5 text-blue-500" />
              <div className="text-sm">
                Next billing date: <span className="font-medium">June 1, 2025</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <Button type="button" variant="outline" onClick={() => {
              toast({
                title: "Billing History",
                description: "This would display billing history in a real app.",
              });
            }}>
              Billing History
            </Button>
            <Button type="submit">
              Update Payment Method
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default BillingSettings;
