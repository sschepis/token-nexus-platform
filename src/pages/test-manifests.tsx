import React, { useEffect, useState } from 'react';
import { validateAllManifests, testManifestLoading, getStandardAppsSummary, logValidationResults } from '../utils/validateManifests';

interface ValidationResult {
  valid: boolean;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    apps: Array<{
      id: string;
      name: string;
      version: string;
      valid: boolean;
      errors: string[];
    }>;
  };
}

export default function TestManifests() {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loadingTest, setLoadingTest] = useState<boolean | null>(null);
  const [summary, setSummary] = useState<any[]>([]);

  useEffect(() => {
    // Run validation when component mounts
    try {
      // Test manifest loading
      const loadingSuccess = testManifestLoading();
      setLoadingTest(loadingSuccess);

      // Validate manifests
      const validation = validateAllManifests();
      setValidationResult(validation);

      // Get summary
      const appSummary = getStandardAppsSummary();
      setSummary(appSummary);

      // Log results to console
      logValidationResults();
    } catch (error) {
      console.error('Error during validation:', error);
    }
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Standard Applications Manifest Validation</h1>
      
      {/* Loading Test Results */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Manifest Loading Test</h2>
        <div className={`p-4 rounded-lg ${loadingTest ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {loadingTest === null ? (
            'Testing...'
          ) : loadingTest ? (
            '✅ All manifests loaded successfully'
          ) : (
            '❌ Failed to load manifests'
          )}
        </div>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Validation Results</h2>
          <div className={`p-4 rounded-lg mb-4 ${validationResult.valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div className="font-semibold">
              {validationResult.valid ? '✅ All manifests are valid' : '❌ Some manifests have errors'}
            </div>
            <div className="mt-2">
              Total: {validationResult.summary.total} | 
              Valid: {validationResult.summary.valid} | 
              Invalid: {validationResult.summary.invalid}
            </div>
          </div>

          {/* Individual App Results */}
          <div className="space-y-4">
            {validationResult.summary.apps.map(app => (
              <div key={app.id} className={`p-4 border rounded-lg ${app.valid ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{app.name}</h3>
                    <p className="text-sm text-gray-600">{app.id} - v{app.version}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm ${app.valid ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                    {app.valid ? 'Valid' : 'Invalid'}
                  </div>
                </div>
                {app.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-red-700">Errors:</p>
                    <ul className="mt-1 text-sm text-red-600">
                      {app.errors.map((error, index) => (
                        <li key={index} className="ml-4">• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Applications Summary */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Applications Summary</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {summary.map(app => (
            <div key={app.id} className="p-4 border rounded-lg bg-white shadow-sm">
              <h3 className="font-semibold text-lg">{app.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{app.id} - v{app.version}</p>
              <p className="text-sm text-gray-700 mb-3">{app.description}</p>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Admin Routes:</span>
                  <span className="font-medium">{app.adminRoutes}</span>
                </div>
                <div className="flex justify-between">
                  <span>User Routes:</span>
                  <span className="font-medium">{app.userRoutes}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cloud Functions:</span>
                  <span className="font-medium">{app.cloudFunctions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Schemas:</span>
                  <span className="font-medium">{app.schemas}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dependencies:</span>
                  <span className="font-medium">{app.dependencies}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Console Output Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800">
          📝 <strong>Note:</strong> Detailed validation results have been logged to the browser console. 
          Open Developer Tools (F12) and check the Console tab for complete output.
        </p>
      </div>
    </div>
  );
}