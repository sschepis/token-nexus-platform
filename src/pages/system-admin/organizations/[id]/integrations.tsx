import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SystemAdminLayout from '@/components/system-admin/SystemAdminLayout';
import Parse from 'parse';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'; // Import Tabs components

// Interfaces for Dfns operational data
interface DfnsWallet {
  userId: string;
  username: string;
  dfnsWalletId: string;
  walletAddress: string;
}

interface DfnsTransaction {
  id: string;
  type: string;
  amount: string;
  status: string;
  date: string;
}

interface IntegrationConfigData {
  objectId?: string;
  dfnsAppId: string;
  dfnsPrivateKey: string;
  dfnsCredId: string;
  personaWebhookSecret: string;
  status: string;
}

const OrgIntegrationSettings: React.FC = () => {
  const router = useRouter();
  const { id: organizationId } = router.query;

  const [integrationConfig, setIntegrationConfig] = useState<IntegrationConfigData>({
    dfnsAppId: '',
    dfnsPrivateKey: '',
    dfnsCredId: '',
    personaWebhookSecret: '',
    status: 'Not Configured',
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('configuration'); // State for active tab

  // State for operational data
  const [dfnsWallets, setDfnsWallets] = useState([]);
  const [dfnsTransactions, setDfnsTransactions] = useState([]);
  const [isFetchingOperationalData, setIsFetchingOperationalData] = useState(false);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    const fetchIntegrationConfig = async () => {
      try {
        const OrgIntegrationConfig = Parse.Object.extend('OrgIntegrationConfig');
        const orgQuery = new Parse.Query('_Organization');
        const organization = await orgQuery.get(organizationId as string, { useMasterKey: true });

        const configQuery = new Parse.Query(OrgIntegrationConfig);
        configQuery.equalTo('organization', organization);
        const result = await configQuery.first({ useMasterKey: true });

        if (result) {
          setIntegrationConfig({
            objectId: result.id,
            dfnsAppId: result.get('dfnsAppId') || '',
            dfnsPrivateKey: result.get('dfnsPrivateKey') || '', // Decrypted automatically by hook
            dfnsCredId: result.get('dfnsCredId') || '',
            personaWebhookSecret: result.get('personaWebhookSecret') || '', // Decrypted automatically by hook
            status: result.get('status') || 'Configured',
          });
        }
      } catch (error) {
        console.error('Error fetching integration config:', error);
        toast.error('Failed to fetch integration configuration.');
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrationConfig();
  }, [organizationId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setIntegrationConfig({
      ...integrationConfig,
      [e.target.id]: e.target.value,
    });
  };

  const handleSave = async () => {
    if (!organizationId) {
      toast.error('Organization ID not found.');
      return;
    }

    setIsSaving(true);
    try {
      const OrgIntegrationConfig = Parse.Object.extend('OrgIntegrationConfig');
      let configObject: Parse.Object;

      if (integrationConfig.objectId) {
        configObject = await new OrgIntegrationConfig().set('objectId', integrationConfig.objectId).fetch({ useMasterKey: true });
      } else {
        configObject = new OrgIntegrationConfig();
        const Organization = Parse.Object.extend('_Organization');
        configObject.set('organization', Organization.createWithoutData(organizationId as string));
      }

      configObject.set('dfnsAppId', integrationConfig.dfnsAppId);
      configObject.set('dfnsPrivateKey', integrationConfig.dfnsPrivateKey);
      configObject.set('dfnsCredId', integrationConfig.dfnsCredId);
      configObject.set('personaWebhookSecret', integrationConfig.personaWebhookSecret);
      configObject.set('status', 'Configured'); // Set status explicitly on save

      await configObject.save(null, { useMasterKey: true });
      setIntegrationConfig(prev => ({ ...prev, objectId: configObject.id, status: 'Configured' }));
      toast.success('Integration configuration saved successfully!');
    } catch (error) {
      console.error('Error saving integration config:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save integration configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestDfnsConnection = async () => {
    try {
      const result = await Parse.Cloud.run('testDfnsConnection', {
        organizationId: organizationId as string,
        appId: integrationConfig.dfnsAppId,
        privateKey: integrationConfig.dfnsPrivateKey,
        credId: integrationConfig.dfnsCredId,
      });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || 'Dfns connection test failed.');
      }
    } catch (error) {
      console.error('Error testing Dfns connection:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to test Dfns connection.');
    }
  };

  const handleTestPersonaWebhook = async () => {
    try {
      const result = await Parse.Cloud.run('testPersonaWebhook', {
        personaWebhookSecret: integrationConfig.personaWebhookSecret,
      });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || 'Persona webhook test failed.');
      }
    } catch (error) {
      console.error('Error testing Persona webhook:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to test Persona webhook.');
    }
  };

  const fetchOperationalData = async (orgId: string) => {
    setIsFetchingOperationalData(true);
    try {
      // Fetch Dfns Wallets
      const walletsResult = await Parse.Cloud.run('listOrgDfnsWallets', { organizationId: orgId });
      if (walletsResult.success) {
        setDfnsWallets(walletsResult.wallets);
        toast.success(`Fetched ${walletsResult.wallets.length} Dfns wallets.`);
      } else {
        toast.error(walletsResult.message || 'Failed to fetch Dfns wallets.');
        setDfnsWallets([]);
      }

      // Fetch Dfns Transactions
      const transactionsResult = await Parse.Cloud.run('listOrgDfnsTransactions', { organizationId: orgId });
      if (transactionsResult.success) {
        setDfnsTransactions(transactionsResult.transactions);
        toast.success(`Fetched ${transactionsResult.transactions.length} Dfns transactions.`);
      } else {
        toast.error(transactionsResult.message || 'Failed to fetch Dfns transactions.');
        setDfnsTransactions([]);
      }

    } catch (error) {
      console.error('Error fetching operational data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch operational data.');
    } finally {
      setIsFetchingOperationalData(false);
    }
  };


  useEffect(() => {
    if (activeTab === 'operational' && organizationId) {
      fetchOperationalData(organizationId as string);
    }
  }, [activeTab, organizationId]);


  if (loading) {
    return (
      <SystemAdminLayout>
        <div className="flex items-center justify-center min-h-[500px]">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      </SystemAdminLayout>
    );
  }

  return (
    <SystemAdminLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Organization Integration Settings {organizationId && `for Organization ID: ${organizationId}`}</h1>
        <p className="mb-6">Manage Dfns and Persona credentials and operational settings for this organization. Current Status: <span className="font-semibold">{integrationConfig.status}</span></p>

        <Tabs defaultValue="configuration" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="operational">Operational Management</TabsTrigger>
          </TabsList>

          <TabsContent value="configuration" className="p-2">
            <section className="my-6 p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
              <h2 className="text-xl font-semibold mb-3">Dfns Configuration</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="dfnsAppId">Dfns App ID</Label>
                  <Input type="text" id="dfnsAppId" value={integrationConfig.dfnsAppId} onChange={handleChange} className="p-2 bg-zinc-700 text-white" />
                </div>
                <div>
                  <Label htmlFor="dfnsCredId">Dfns Credential ID</Label>
                  <Input type="text" id="dfnsCredId" value={integrationConfig.dfnsCredId} onChange={handleChange} className="p-2 bg-zinc-700 text-white" />
                </div>
                <div>
                  <Label htmlFor="dfnsPrivateKey">Dfns Private Key</Label>
                  <Textarea id="dfnsPrivateKey" rows={4} value={integrationConfig.dfnsPrivateKey} onChange={handleChange} className="p-2 bg-zinc-700 text-white" />
                </div>
                <Button className="w-full" onClick={handleTestDfnsConnection}>Test Dfns Connection</Button>
              </div>
            </section>

            <section className="my-6 p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
              <h2 className="text-xl font-semibold mb-3">Persona Configuration</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="personaWebhookSecret">Persona Webhook Secret</Label>
                  <Input type="text" id="personaWebhookSecret" value={integrationConfig.personaWebhookSecret} onChange={handleChange} className="p-2 bg-zinc-700 text-white" />
                </div>
                <Button className="w-full" onClick={handleTestPersonaWebhook}>Test Persona Webhook</Button>
              </div>
            </section>
            
            <div className="mt-6">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Configuration
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="operational" className="p-2">
            <section className="my-6 p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
              <h2 className="text-xl font-semibold mb-3">Operational Dfns Management</h2>
              {isFetchingOperationalData ? (
                <div className="flex items-center justify-center min-h-[100px]">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">Dfns Wallets ({dfnsWallets.length})</h3>
                    {dfnsWallets.length === 0 ? (
                      <p className="text-muted-foreground">No Dfns wallets found for this organization.</p>
                    ) : (
                      <ul className="list-disc list-inside space-y-1">
                        {dfnsWallets.map((wallet: DfnsWallet) => (
                          <li key={wallet.dfnsWalletId} className="text-sm">
                            **User ID:** {wallet.userId} - **Address:** {wallet.walletAddress}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Dfns Transactions ({dfnsTransactions.length})</h3>
                    {dfnsTransactions.length === 0 ? (
                      <p className="text-muted-foreground">No Dfns transactions found for this organization.</p>
                    ) : (
                      <ul className="list-disc list-inside space-y-1">
                        {dfnsTransactions.map((tx: DfnsTransaction) => (
                          <li key={tx.id} className="text-sm">
                            **ID:** {tx.id} - **Type:** {tx.type} - **Amount:** {tx.amount} - **Status:** {tx.status}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </SystemAdminLayout>
  );
};

export default OrgIntegrationSettings;