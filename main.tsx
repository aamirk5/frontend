import React, { useState } from 'react';
import { Upload, FileText, Package, Loader2, Copy, CheckCircle } from 'lucide-react';

const App = () => {
  const [file, setFile] = useState(null);
  const [asin, setAsin] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [copiedItems, setCopiedItems] = useState({});

  // Replace with your n8n webhook URL
  const WEBHOOK_URL = 'http://localhost:5678/webhook/review-ingest';

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ['text/csv', 'application/pdf'];
      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setAsin('');
        setError('');
      } else {
        setError('Please upload a CSV or PDF file');
        setFile(null);
      }
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setResults(null);

    try {
      let payload = {};

      if (file) {
        const base64Content = await fileToBase64(file);
        const fileType = file.type === 'text/csv' ? 'csv' : 'pdf';
        payload = {
          fileType,
          fileContent: base64Content,
          filename: file.name
        };
      } else if (asin) {
        payload = { asin };
      } else {
        throw new Error('Please provide either a file or ASIN');
      }

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message || 'An error occurred while processing your request');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, itemId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems({ ...copiedItems, [itemId]: true });
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [itemId]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">ReviewSEO AI</h1>
          
          {/* Input Form */}
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                      Upload CSV or PDF
                    </span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".csv,.pdf"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>
                  {file && (
                    <div className="mt-3 flex items-center justify-center text-sm text-gray-600">
                      <FileText className="h-4 w-4 mr-1" />
                      {file.name}
                    </div>
                  )}
                </div>
              </div>

              {/* ASIN Input */}
              <div className="border-2 border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <label htmlFor="asin" className="block text-sm font-medium text-gray-700 mb-2">
                    Or enter ASIN
                  </label>
                  <input
                    type="text"
                    id="asin"
                    value={asin}
                    onChange={(e) => {
                      setAsin(e.target.value);
                      setFile(null);
                    }}
                    placeholder="B08N5WRWNW"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!file && !asin)}
              className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Processing...
                </>
              ) : (
                'Analyze Reviews'
              )}
            </button>
          </form>

          {/* Results */}
          {results && results.success && (
            <div className="space-y-8">
              {/* Analysis Section */}
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Review Analysis</h2>
                
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Themes */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Top Themes</h3>
                    <div className="space-y-2">
                      {results.analysis.themes.slice(0, 5).map(([theme, count]) => (
                        <div key={theme} className="flex justify-between items-center">
                          <span className="text-gray-600 capitalize">{theme.replace('_', ' ')}</span>
                          <span className="text-sm font-medium text-gray-500">{count} mentions</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sentiment */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Sentiment Analysis</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Positive</span>
                        <div className="flex items-center">
                          <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{width: `${(results.analysis.sentiments.positive / (results.analysis.sentiments.positive + results.analysis.sentiments.negative + results.analysis.sentiments.neutral)) * 100}%`}}
                            />
                          </div>
                          <span className="text-sm font-medium">{results.analysis.sentiments.positive}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Negative</span>
                        <div className="flex items-center">
                          <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full"
                              style={{width: `${(results.analysis.sentiments.negative / (results.analysis.sentiments.positive + results.analysis.sentiments.negative + results.analysis.sentiments.neutral)) * 100}%`}}
                            />
                          </div>
                          <span className="text-sm font-medium">{results.analysis.sentiments.negative}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Neutral</span>
                        <div className="flex items-center">
                          <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-gray-500 h-2 rounded-full"
                              style={{width: `${(results.analysis.sentiments.neutral / (results.analysis.sentiments.positive + results.analysis.sentiments.negative + results.analysis.sentiments.neutral)) * 100}%`}}
                            />
                          </div>
                          <span className="text-sm font-medium">{results.analysis.sentiments.neutral}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Keywords */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Top Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {results.analysis.topKeywords.map(({keyword, frequency}) => (
                      <span key={keyword} className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-600">
                        {keyword} ({frequency})
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* SEO Content */}
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Generated SEO Content</h2>
                
                {/* Title */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium text-gray-700">Product Title</h3>
                    <button
                      onClick={() => copyToClipboard(results.seoContent.title, 'title')}
                      className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      {copiedItems.title ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-white border border-gray-300 rounded-md p-4">
                    <p className="text-gray-800">{results.seoContent.title}</p>
                  </div>
                </div>

                {/* Bullets */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium text-gray-700">Bullet Points</h3>
                    <button
                      onClick={() => copyToClipboard(results.seoContent.bullets.join('\n• '), 'bullets')}
                      className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      {copiedItems.bullets ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy All
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-white border border-gray-300 rounded-md p-4">
                    <ul className="space-y-2">
                      {results.seoContent.bullets.map((bullet, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-gray-400 mr-2">•</span>
                          <span className="text-gray-800">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium text-gray-700">Product Description</h3>
                    <button
                      onClick={() => copyToClipboard(results.seoContent.description, 'description')}
                      className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      {copiedItems.description ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-white border border-gray-300 rounded-md p-4">
                    <p className="text-gray-800 whitespace-pre-wrap">{results.seoContent.description}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
