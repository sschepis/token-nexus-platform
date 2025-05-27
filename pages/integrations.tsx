import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Link as LinkIcon, WebhookIcon, Database, Lock } from "lucide-react"; // Renamed Link to LinkIcon to avoid conflict with NextLink
import NextLink from "next/link"; // Import Next.js Link
import { useToast } from "@/hooks/use-toast"; // Assuming this path is correct

const IntegrationsPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("services");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const thirdPartyServices = [
    {
      id: "service-1",
      name: "Salesforce",
      status: "connected",
      lastSynced: "2023-06-10T14:30:00Z",
      icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/2560px-Salesforce.com_logo.svg.png"
    },
    {
      id: "service-2",
      name: "Stripe",
      status: "connected",
      lastSynced: "2023-06-09T11:45:00Z",
      icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/2560px-Stripe_Logo%2C_revised_2016.svg.png"
    },
    {
      id: "service-3",
      name: "Slack",
      status: "disconnected",
      lastSynced: null,
      icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Slack_icon_2019.svg/2048px-Slack_icon_2019.svg.png"
    },
    {
      id: "service-4",
      name: "Google Workspace",
      status: "connected",
      lastSynced: "2023-06-08T09:15:00Z",
      icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/2048px-Google_%22G%22_Logo.svg.png"
    }
  ];

  const webhooks = [
    {
      id: "webhook-1",
      name: "Notification Webhook",
      endpoint: "https://example.com/webhook/notifications",
      events: ["user.created", "user.updated"],
      active: true
    },
    {
      id: "webhook-2",
      name: "Transaction Webhook",
      endpoint: "https://example.com/webhook/transactions",
      events: ["transaction.created", "transaction.completed"],
      active: true
    },
    {
      id: "webhook-3",
      name: "Audit Log Webhook",
      endpoint: "https://example.com/webhook/audit",
      events: ["audit.log.created"],
      active: false
    }
  ];

  const oauthApps = [
    {
      id: "oauth-1",
      name: "Mobile App",
      clientId: "client-id-xxxxx-1",
      clientSecret: "••••••••••••••••",
      redirectUris: ["https://example.com/callback"],
      created: "2023-05-01T10:00:00Z"
    },
    {
      id: "oauth-2",
      name: "Partner Portal",
      clientId: "client-id-xxxxx-2",
      clientSecret: "••••••••••••••••",
      redirectUris: ["https://partner.example.com/auth/callback"],
      created: "2023-05-15T14:30:00Z"
    }
  ];

  const handleWebhookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Please enter a webhook URL",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setWebhookUrl("");
      toast({
        title: "Webhook created",
        description: "Your webhook has been created successfully",
      });
    }, 1000);
  };

  const handleToggleWebhook = (id: string, currentStatus: boolean) => {
    toast({
      title: `Webhook ${currentStatus ? "disabled" : "enabled"}`,
      description: `Webhook has been ${currentStatus ? "disabled" : "enabled"} successfully`,
    });
  };

  const handleConnect = (serviceName: string) => {
    toast({
      title: "Connecting to service",
      description: `Redirecting to ${serviceName} for authentication...`,
    });
  };

  const handleDisconnect = (serviceName: string) => {
    toast({
      title: "Service disconnected",
      description: `${serviceName} has been disconnected successfully`,
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Manage your third-party integrations, webhooks, and OAuth applications
        </p>
      </div>

      <Tabs defaultValue="services" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-[400px]">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="oauth">OAuth Apps</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {thirdPartyServices.map((service) => (
              <Card key={service.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center space-x-2">
                    <img
                      src={service.icon}
                      alt={service.name}
                      className="h-8 w-8 object-contain"
                    />
                    <div>
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs ${
                    service.status === "connected" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}>
                    {service.status === "connected" ? "Connected" : "Disconnected"}
                  </div>
                </CardHeader>
                <CardContent>
                  {service.status === "connected" && (
                    <div className="text-sm text-muted-foreground mb-4">
                      Last synced: {formatDate(service.lastSynced)}
                    </div>
                  )}
                  {service.status === "connected" ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleDisconnect(service.name)}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleConnect(service.name)}
                    >
                      Connect
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Add new integration card */}
            <Card className="border-dashed">
              <CardHeader className="flex items-center justify-center h-[100px]">
                <CardTitle className="text-lg text-muted-foreground">Connect New Service</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button variant="outline" className="w-full">
                  <LinkIcon className="h-4 w-4 mr-2" /> {/* Changed from Link to LinkIcon */}
                  Browse Services
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Endpoints</CardTitle>
              <CardDescription>
                Webhooks allow external services to be notified when certain events happen in your application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell className="font-medium">{webhook.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {webhook.endpoint}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {webhook.events.map((event) => (
                            <span key={event} className="bg-muted text-xs rounded-full px-2 py-1">
                              {event}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={webhook.active}
                          onCheckedChange={() => handleToggleWebhook(webhook.id, webhook.active)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Test
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Add New Webhook</h3>
                <form onSubmit={handleWebhookSubmit} className="space-y-4">
                  <div>
                    <Input
                      placeholder="https://example.com/webhook"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="mb-2"
                    />
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Webhook"}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oauth" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>OAuth Applications</CardTitle>
              <CardDescription>
                Applications that can access your account data using OAuth authentication protocol.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Client ID</TableHead>
                    <TableHead>Secret</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oauthApps.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.name}</TableCell>
                      <TableCell>{app.clientId}</TableCell>
                      <TableCell>{app.clientSecret}</TableCell>
                      <TableCell>{formatDate(app.created)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="mr-2">Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive">Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="mt-6">
                <Button>
                  <Lock className="h-4 w-4 mr-2" />
                  Create New OAuth App
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegrationsPage;