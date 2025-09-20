import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Download, FileArchive, Play, CheckCircle, AlertCircle } from 'lucide-react';

// Simple SCORM API wrapper
class SimpleSCORM {
  constructor() {
    this.api = null;
    this.findAPI();
  }

  findAPI() {
    let api = null;
    let win = window;

    while (win && !api) {
      try {
        if (win.API) api = win.API;
        else if (win.API_1484_11) api = win.API_1484_11;
      } catch (e) {}

      if (win === win.parent) break;
      win = win.parent;
    }

    this.api = api;
    return api !== null;
  }

  initialize() {
    if (this.api) {
      return this.api.Initialize ? this.api.Initialize('') : this.api.LMSInitialize('');
    }
    return 'false';
  }

  setValue(param, value) {
    if (this.api) {
      return this.api.SetValue ? this.api.SetValue(param, value) : this.api.LMSSetValue(param, value);
    }
    return 'false';
  }

  getValue(param) {
    if (this.api) {
      return this.api.GetValue ? this.api.GetValue(param) : this.api.LMSGetValue(param);
    }
    return '';
  }

  commit() {
    if (this.api) {
      return this.api.Commit ? this.api.Commit('') : this.api.LMSCommit('');
    }
    return 'false';
  }

  finish() {
    if (this.api) {
      return this.api.Finish ? this.api.Finish('') : this.api.LMSFinish('');
    }
    return 'false';
  }
}

const ClientSideSCORMExtractor = ({
  courseTitle = "SCORM Course",
  sharePointPackageUrl = "", // URL to the SCORM zip file in SharePoint
  accessToken = "", // SharePoint access token
  onBack = () => {},
  onProgress = () => {},
  userId = "user-123"
}) => {
  const [extractionStep, setExtractionStep] = useState('ready'); // ready, downloading, extracting, extracted, error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [extractedFiles, setExtractedFiles] = useState({});
  const [launchUrl, setLaunchUrl] = useState(null);
  const [scormStatus, setScormStatus] = useState('not-attempted');
  const [scormScore, setScormScore] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const iframeRef = useRef(null);
  const scormRef = useRef(null);

  useEffect(() => {
    scormRef.current = new SimpleSCORM();
  }, []);

  const downloadFromSharePoint = async (url, token) => {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/octet-stream'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      // Fallback: try without auth (for public URLs)
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }
      return await response.arrayBuffer();
    }
  };

  const extractSCORMPackage = async () => {
    if (!sharePointPackageUrl) {
      setError('No SCORM package URL provided');
      return;
    }

    try {
      setExtractionStep('downloading');
      setProgress(10);
      setError(null);

      // Download the SCORM package
      const arrayBuffer = await downloadFromSharePoint(sharePointPackageUrl, accessToken);
      setProgress(30);

      setExtractionStep('extracting');

      // Load JSZip dynamically
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Load the zip content
      const zipContent = await zip.loadAsync(arrayBuffer);
      setProgress(50);

      // Find the launch file from imsmanifest.xml
      let launchFile = null;
      const manifestFile = zipContent.file('imsmanifest.xml');

      if (manifestFile) {
        try {
          const manifestContent = await manifestFile.async('string');
          const parser = new DOMParser();
          const manifestDoc = parser.parseFromString(manifestContent, 'text/xml');

          // Look for the launch URL in the manifest
          const resourceElement = manifestDoc.querySelector('resource[type="webcontent"]');
          if (resourceElement) {
            launchFile = resourceElement.getAttribute('href');
          }
        } catch (manifestError) {
          console.warn('Could not parse manifest:', manifestError);
        }
      }

      setProgress(60);

      // Fallback: look for common launch files
      if (!launchFile) {
        const possibleLaunchFiles = [
          'index.html', 'index.htm',
          'launch.html', 'launch.htm',
          'start.html', 'start.htm',
          'main.html', 'main.htm'
        ];

        for (const fileName of possibleLaunchFiles) {
          if (zipContent.file(fileName)) {
            launchFile = fileName;
            break;
          }
        }
      }

      if (!launchFile) {
        throw new Error('No launch file found in SCORM package. Expected index.html or similar.');
      }

      setProgress(70);

      // Extract all files and create blob URLs
      const files = {};
      const filePromises = [];

      zipContent.forEach((relativePath, file) => {
        if (!file.dir) {
          filePromises.push(
            file.async('blob').then(blob => {
              // Create blob URL for each file
              files[relativePath] = URL.createObjectURL(blob);
            })
          );
        }
      });

      await Promise.all(filePromises);
      setProgress(90);

      // Store extracted files
      setExtractedFiles(files);
      setLaunchUrl(files[launchFile]);
      setProgress(100);
      setExtractionStep('extracted');





    } catch (err) {
      console.error('Extraction error:', err);
      setError(err.message);
      setExtractionStep('error');
    }
  };

  const handleIframeLoad = () => {
    // Try to initialize SCORM after iframe loads
    setTimeout(() => {
      initializeSCORM();
    }, 1000);
  };

  const initializeSCORM = () => {
    if (scormRef.current && scormRef.current.findAPI()) {
      const initResult = scormRef.current.initialize();

      if (initResult === 'true' || initResult === true) {
        setIsConnected(true);

        // Set initial values
        scormRef.current.setValue('cmi.core.student_id', userId);
        scormRef.current.setValue('cmi.core.student_name', 'Student');
        scormRef.current.setValue('cmi.core.lesson_location', '0');

        // Get current status
        const currentStatus = scormRef.current.getValue('cmi.core.lesson_status');
        const currentScore = scormRef.current.getValue('cmi.core.score.raw');

        setScormStatus(currentStatus || 'not-attempted');
        if (currentScore) {
          setScormScore(parseFloat(currentScore));
        }

        scormRef.current.commit();


        // Start monitoring
        startProgressMonitoring();
      }
    }
  };

  const startProgressMonitoring = () => {
    const checkProgress = () => {
      if (scormRef.current && isConnected) {
        const status = scormRef.current.getValue('cmi.core.lesson_status');
        const score = scormRef.current.getValue('cmi.core.score.raw');

        if (status && status !== scormStatus) {
          setScormStatus(status);
          onProgress({ status, score: score ? parseFloat(score) : null });
        }

        if (score && parseFloat(score) !== scormScore) {
          setScormScore(parseFloat(score));
        }
      }
    };

    const interval = setInterval(checkProgress, 5000);
    return () => clearInterval(interval);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'passed':
        return 'text-green-600 bg-green-100';
      case 'incomplete':
      case 'browsed':
        return 'text-primary-600 bg-primary-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const resetExtraction = () => {
    // Clean up blob URLs
    Object.values(extractedFiles).forEach(url => {
      URL.revokeObjectURL(url);
    });

    setExtractionStep('ready');
    setProgress(0);
    setError(null);
    setExtractedFiles({});
    setLaunchUrl(null);
  };

  // Render different views based on extraction step
  if (extractionStep === 'extracted' && launchUrl) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <button
                  onClick={onBack}
                  className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{courseTitle}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Extracted SCORM
                    </span>
                    {isConnected && (
                      <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded flex items-center gap-1">
                        <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                        SCORM Connected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getStatusColor(scormStatus)}`}>
                  <CheckCircle className="w-4 h-4" />
                  <span className="capitalize font-medium">
                    {scormStatus.replace('-', ' ')}
                  </span>
                </div>

                {scormScore !== null && (
                  <div className="text-sm text-gray-600">
                    Score: <span className="font-semibold">{scormScore}%</span>
                  </div>
                )}

                <button
                  onClick={resetExtraction}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Course Content */}
        <div className="h-[calc(100vh-4rem)]">
          <iframe
            ref={iframeRef}
            src={launchUrl}
            title={courseTitle}
            className="w-full h-full border-0"
            onLoad={handleIframeLoad}
            allow="autoplay; fullscreen; microphone; camera"
          />
        </div>
      </div>
    );
  }

  // Extraction interface
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={onBack}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{courseTitle}</h2>
              <p className="text-sm text-gray-600">SCORM Package Extractor</p>
            </div>
          </div>

          {/* Error State */}
          {extractionStep === 'error' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-900">Extraction Failed</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <button
                    onClick={resetExtraction}
                    className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          {(extractionStep === 'downloading' || extractionStep === 'extracting') && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <FileArchive className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-gray-900">
                  {extractionStep === 'downloading' ? 'Downloading package...' : 'Extracting files...'}
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="text-sm text-gray-600 mt-2">{progress}% complete</p>
            </div>
          )}

          {/* Ready State */}
          {extractionStep === 'ready' && (
            <div className="text-center">
              <div className="mb-6">
                <FileArchive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Ready to Extract SCORM Package
                </h3>
                <p className="text-gray-600 text-sm">
                  This will download and extract your SCORM course from SharePoint,
                  then display it in an embedded player.
                </p>
              </div>

              <button
                onClick={extractSCORMPackage}
                disabled={!sharePointPackageUrl}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Extract & Launch Course
              </button>

              {!sharePointPackageUrl && (
                <p className="text-red-600 text-sm mt-2">
                  No SharePoint package URL provided
                </p>
              )}
            </div>
          )}
        </div>

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 bg-white rounded-lg shadow p-4">
            <h4 className="font-semibold text-sm mb-2">Debug Info</h4>
            <div className="text-xs space-y-1 text-gray-600">
              <div>Step: {extractionStep}</div>
              <div>Progress: {progress}%</div>
              <div>Files extracted: {Object.keys(extractedFiles).length}</div>
              <div>Launch URL: {launchUrl ? 'Ready' : 'Not set'}</div>
              <div>Package URL: {sharePointPackageUrl || 'Not provided'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientSideSCORMExtractor;
