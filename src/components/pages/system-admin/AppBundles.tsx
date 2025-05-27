import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchAllAppDefinitionsAdmin,
  fetchAppVersionsAdmin,
  // Thunks for actions will be passed to VersionManagement
} from '@/store/slices/appSlice';
import { AppDefinitionForMarketplace, AppVersionForMarketplace } from '@/types/app-marketplace';
import SystemAdminLayout from '@/components/system-admin/SystemAdminLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Package, UploadCloud, Loader2 } from 'lucide-react';
import { VersionManagement } from '@/components/system-admin/bundles/VersionManagement'; // Corrected to named import
// import BundleUpload from '@/components/system-admin/bundles/BundleUpload'; // For later

const AppBundles = () => {
  const dispatch = useAppDispatch();
  const {
    allAppDefinitionsAdmin,
    selectedAppVersionsAdmin,
    isAdminLoadingApps,
    adminAppsError
  } = useAppSelector((state) => state.app);

  const [selectedAppDefinition, setSelectedAppDefinition] = useState<AppDefinitionForMarketplace | null>(null);
  // const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    dispatch(fetchAllAppDefinitionsAdmin());
  }, [dispatch]);

  useEffect(() => {
    if (selectedAppDefinition?.id) {
      dispatch(fetchAppVersionsAdmin(selectedAppDefinition.id));
    } else {
      // Clear versions if no app is selected (or handle in slice)
    }
  }, [dispatch, selectedAppDefinition?.id]);

  const handleSelectApp = (app: AppDefinitionForMarketplace) => {
    setSelectedAppDefinition(app);
  };

  if (isAdminLoadingApps && allAppDefinitionsAdmin.length === 0 && !selectedAppDefinition) {
    return (
      <SystemAdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-2">Loading app definitions...</p>
        </div>
      </SystemAdminLayout>
    );
  }

  if (adminAppsError && allAppDefinitionsAdmin.length === 0) {
     return (
      <SystemAdminLayout>
        <p className="text-destructive">Error loading app definitions: {adminAppsError}</p>
      </SystemAdminLayout>
    );
  }

  return (
    <SystemAdminLayout>
      <div className="grid gap-6 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_350px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>App Definitions</CardTitle>
                <CardDescription>Manage all application definitions available in the marketplace.</CardDescription>
              </div>
              {/* <Button size="sm" onClick={() => setShowUploadDialog(true)}>
                <UploadCloud className="mr-2 h-4 w-4" /> Submit New App
              </Button> */}
            </CardHeader>
            <CardContent>
              {allAppDefinitionsAdmin.length === 0 && !isAdminLoadingApps ? (
                <p>No app definitions found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Publisher</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isAdminLoadingApps && allAppDefinitionsAdmin.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : (
                        allAppDefinitionsAdmin.map((app) => (
                        <TableRow
                            key={app.id}
                            onClick={() => handleSelectApp(app)}
                            className={`cursor-pointer hover:bg-muted/50 ${selectedAppDefinition?.id === app.id ? 'bg-muted' : ''}`}
                        >
                            <TableCell className="font-medium">{app.name}</TableCell>
                            <TableCell>{app.publisherName}</TableCell>
                            <TableCell><Badge variant="outline">{app.category}</Badge></TableCell>
                            <TableCell><Badge variant={app.status === 'published' ? 'success' : 'secondary'}>{app.status || 'Draft'}</Badge></TableCell>
                            <TableCell><ChevronRight className="h-4 w-4" /></TableCell>
                        </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {selectedAppDefinition ? (
            <VersionManagement
              appDefinition={selectedAppDefinition}
              versions={selectedAppVersionsAdmin}
              isLoading={isAdminLoadingApps && !!selectedAppDefinition?.id} // Loading versions for this app
              // Pass action dispatchers here later
            />
          ) : (
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Select an App</CardTitle>
                <CardDescription>Select an application from the list to view and manage its versions.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center text-center h-64">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No application selected.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {/* TODO: Add BundleUploadDialog triggered by setShowUploadDialog */}
      {/* <BundleUploadDialog open={showUploadDialog} onOpenChange={setShowUploadDialog} /> */}
    </SystemAdminLayout>
  );
};

export default AppBundles;