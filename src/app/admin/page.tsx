'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [folderId, setFolderId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string; details?: string } | null>(null);
  const [folderIdInput, setFolderIdInput] = useState('');
  const [isLoadingDriveStatus, setIsLoadingDriveStatus] = useState(false);
  const [driveStatus, setDriveStatus] = useState<any>(null);
  const [configStatus, setConfigStatus] = useState<{
    googleDrive: boolean;
    openai: boolean;
    qdrant: boolean;
  }>({ googleDrive: false, openai: false, qdrant: false });
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [qdrantStatus, setQdrantStatus] = useState<any>(null);
  const [isLoadingQdrantStatus, setIsLoadingQdrantStatus] = useState(false);

  // Check configuration status on load
  useEffect(() => {
    async function checkConfig() {
      try {
        const response = await fetch('/api/config-status');
        if (response.ok) {
          const data = await response.json();
          setConfigStatus(data);
        }
      } catch (error) {
        console.error('Failed to check configuration status:', error);
      }
    }

    checkConfig();
  }, []);

  // Check Qdrant database status
  const checkQdrantStatus = async () => {
    setIsLoadingQdrantStatus(true);
    setQdrantStatus(null);

    try {
      const response = await fetch('/api/qdrant-status');
      const data = await response.json();
      setQdrantStatus(data);
    } catch (error) {
      setQdrantStatus({
        error: error instanceof Error ? error.message : 'Failed to check Qdrant status',
      });
    } finally {
      setIsLoadingQdrantStatus(false);
    }
  };

  // Check Google Drive folder status
  const checkDriveStatus = async () => {
    if (!folderIdInput.trim()) {
      setDriveStatus({
        error: 'Please enter a Google Drive folder ID',
      });
      return;
    }

    setIsLoadingDriveStatus(true);
    setDriveStatus(null);

    try {
      const response = await fetch(`/api/drive-debug?folderId=${encodeURIComponent(folderIdInput.trim())}`);
      const data = await response.json();
      setDriveStatus(data);
    } catch (error) {
      setDriveStatus({
        error: error instanceof Error ? error.message : 'Failed to check Google Drive status',
      });
    } finally {
      setIsLoadingDriveStatus(false);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!folderId.trim()) {
      setResult({ success: false, error: 'Please enter a Google Drive folder ID' });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderId }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: data.message || 'Documents ingested successfully!' });
      } else {
        setResult({ success: false, error: data.error || 'Failed to ingest documents' });
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Document Q&A Admin</h1>
        <Link
          href="/"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Chat
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Configuration Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`p-4 rounded-lg ${configStatus.googleDrive ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${configStatus.googleDrive ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <h3 className="font-medium">Google Drive API</h3>
            </div>
            <p className="mt-1 text-sm">
              {configStatus.googleDrive ? 'Configured' : 'Not configured'}
            </p>
          </div>

          <div className={`p-4 rounded-lg ${configStatus.openai ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${configStatus.openai ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <h3 className="font-medium">OpenAI API</h3>
            </div>
            <p className="mt-1 text-sm">
              {configStatus.openai ? 'Configured' : 'Not configured'}
            </p>
          </div>

          <div className={`p-4 rounded-lg ${configStatus.qdrant ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${configStatus.qdrant ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <h3 className="font-medium">Qdrant Database</h3>
            </div>
            <p className="mt-1 text-sm">
              {configStatus.qdrant ? 'Connected' : 'Not connected'}
            </p>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-4">Google Drive Diagnostics</h2>
        <div className="mb-6">
          <div className="flex items-end gap-2 mb-4">
            <div className="flex-grow">
              <label htmlFor="driveFolderId" className="block text-sm font-medium text-gray-700 mb-1">
                Google Drive Folder ID
              </label>
              <input
                type="text"
                id="driveFolderId"
                value={folderIdInput}
                onChange={(e) => setFolderIdInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter Google Drive folder ID"
              />
            </div>
            <button
              onClick={checkDriveStatus}
              disabled={isLoadingDriveStatus}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {isLoadingDriveStatus ? 'Checking...' : 'Check Drive Access'}
            </button>
          </div>

          {driveStatus && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Google Drive Status</h3>
              {driveStatus.error ? (
                <div className="text-red-600">{driveStatus.error}</div>
              ) : (
                <div>
                  <div className="mb-2">
                    <span className="font-semibold">Service Account:</span> {driveStatus.serviceAccount.email}
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold">Project ID:</span> {driveStatus.serviceAccount.projectId}
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold">Folder Name:</span> {driveStatus.folder?.name || 'Unknown'}
                  </div>
                  <div className="mb-4">
                    <span className="font-semibold">Access:</span> {driveStatus.folder?.capabilities?.canReadRevisions ? 'Read Access' : 'No Access'}
                  </div>

                  <h4 className="font-medium mb-2">Files in Folder ({driveStatus.files.length}):</h4>
                  {driveStatus.files.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supported</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {driveStatus.files.map((file: any, index: number) => {
                            const isSupported = driveStatus.supportedTypes.includes(file.mimeType);
                            return (
                              <tr key={index} className={isSupported ? '' : 'bg-gray-50 text-gray-500'}>
                                <td className="px-3 py-2 text-sm">{file.name}</td>
                                <td className="px-3 py-2 text-xs">{file.mimeType}</td>
                                <td className="px-3 py-2">
                                  {isSupported ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Yes</span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">No</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-yellow-600">No files found in this folder.</div>
                  )}

                  {driveStatus.files.length > 0 && !driveStatus.files.some((file: any) => driveStatus.supportedTypes.includes(file.mimeType)) && (
                    <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded">
                      <p className="font-medium">Warning: No supported file types found in this folder.</p>
                      <p className="text-sm mt-1">The system can only ingest text files (.txt) and PDF files (.pdf).</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <h2 className="text-xl font-semibold mb-4">Vector Database Diagnostics</h2>
        <div className="mb-6">
          <button
            onClick={checkQdrantStatus}
            disabled={isLoadingQdrantStatus}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
          >
            {isLoadingQdrantStatus ? 'Checking...' : 'Check Qdrant Status'}
          </button>

          {qdrantStatus && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Qdrant Status</h3>
              {qdrantStatus.error ? (
                <div className="text-red-600">{qdrantStatus.error}</div>
              ) : (
                <div>
                  <div className="mb-2">
                    <span className="font-semibold">Collection:</span> {qdrantStatus.collection.name}
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold">Vector Size:</span> {qdrantStatus.collection.vectorSize}
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold">Distance Metric:</span> {qdrantStatus.collection.vectorDistance}
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold">Document Count:</span> {qdrantStatus.collection.pointsCount}
                  </div>

                  {qdrantStatus.collection.pointsCount > 0 ? (
                    <div>
                      <h4 className="font-medium mt-4 mb-2">Sample Documents:</h4>
                      <div className="max-h-60 overflow-y-auto">
                        {qdrantStatus.samplePoints.map((point: any, index: number) => (
                          <div key={index} className="p-2 mb-2 bg-white border border-gray-200 rounded">
                            <div className="font-semibold text-sm">{point.payload.metadata.filename}, Chunk {point.payload.metadata.chunkIndex}</div>
                            <div className="text-xs text-gray-600 mt-1 line-clamp-2">{point.payload.text.substring(0, 100)}...</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-yellow-600 mt-2">No documents found in the vector database. Please ingest documents first.</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <h2 className="text-xl font-semibold mb-4">Ingest Documents</h2>
        <form onSubmit={handleIngest}>
          <div className="mb-4">
            <label htmlFor="folderId" className="block text-sm font-medium text-gray-700 mb-1">
              Google Drive Folder ID
            </label>
            <input
              type="text"
              id="folderId"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Google Drive folder ID"
              disabled={isLoading}
            />
            <p className="mt-1 text-sm text-gray-500">
              The ID is the part of the Google Drive folder URL after "folders/"
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Ingesting...' : 'Start Ingestion'}
          </button>
        </form>

        {result && (
          <div className={`mt-4 p-3 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <p className="font-medium">{result.success ? result.message : `Error: ${result.error}`}</p>
            {result.details && <p className="mt-2 text-sm">{result.details}</p>}
          </div>
        )}

        {isLoading && (
          <div className="mt-4">
            <p className="text-gray-600">
              Ingestion is running in the background. This may take several minutes depending on the number and size of documents.
            </p>
            <div className="mt-2 flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
              <span>Processing...</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Instructions</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Make sure your Google Drive service account has access to the folder you want to ingest.</li>
          <li>Enter the folder ID (found in the URL of your Google Drive folder).</li>
          <li>Click "Start Ingestion" to begin processing the documents.</li>
          <li>Once ingestion is complete, you can go to the chat interface to ask questions about your documents.</li>
        </ol>
      </div>
    </div>
  );
}
