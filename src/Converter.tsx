import React, { useState, useEffect } from 'react';

const JsonCsvConverter = () => {
  const [jsonText, setJsonText] = useState('[\n  {\n    "name": "John",\n    "age": 30,\n    "city": "New York"\n  },\n  {\n    "name": "Alice",\n    "age": 25,\n    "city": "Los Angeles"\n  }\n]');
  const [csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState([]);
  const [selectedHeaders, setSelectedHeaders] = useState({});
  const [error, setError] = useState('');

  // Convert JSON to CSV when jsonText changes or headers selection changes
  useEffect(() => {
    try {
      if (!jsonText.trim()) {
        setCsvText('');
        setHeaders([]);
        setSelectedHeaders({});
        return;
      }

      const jsonData = JSON.parse(jsonText);

      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        setCsvText('');
        setHeaders([]);
        setSelectedHeaders({});
        return;
      }

      // Extract all possible headers from the JSON data
      const allHeaders = Array.from(
        new Set(
          jsonData.flatMap(item => Object.keys(item))
        )
      );

      // Initialize selected headers if needed
      if (Object.keys(selectedHeaders).length === 0 ||
        !allHeaders.every(h => h in selectedHeaders)) {
        const newSelectedHeaders = { ...selectedHeaders };
        allHeaders.forEach(header => {
          if (!(header in newSelectedHeaders)) {
            newSelectedHeaders[header] = true;
          }
        });
        setSelectedHeaders(newSelectedHeaders);
      }

      // Set headers
      setHeaders(allHeaders);

      // Generate CSV based on selected headers
      const activeHeaders = allHeaders.filter(h => selectedHeaders[h]);

      if (activeHeaders.length === 0) {
        setCsvText('');
        return;
      }

      const csvHeader = activeHeaders.join(',');
      const csvRows = jsonData.map(item => {
        return activeHeaders.map(header => {
          const value = item[header] !== undefined ? item[header] : '';
          // Handle commas and quotes in values
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',');
      });

      setCsvText([csvHeader, ...csvRows].join('\n'));
      setError('');
    } catch (err) {
      setError(`Error converting JSON to CSV: ${err.message}`);
      setCsvText('');
    }
  }, [jsonText, selectedHeaders]);

  // Convert CSV to JSON
  const handleCsvChange = (csvValue) => {
    setCsvText(csvValue);
    try {
      if (!csvValue.trim()) {
        setJsonText('');
        return;
      }

      const lines = csvValue.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        setJsonText('');
        return;
      }

      const headers = parseCSVLine(lines[0]);
      const result = [];

      for (let i = 1; i < lines.length; i++) {
        const obj = {};
        const values = parseCSVLine(lines[i]);

        headers.forEach((header, index) => {
          if (index < values.length) {
            // Try to parse numbers and booleans
            let value = values[index];
            if (value === 'true') {
              value = true;
            } else if (value === 'false') {
              value = false;
            } else if (!isNaN(value) && value.trim() !== '') {
              value = Number(value);
            }
            obj[header] = value;
          }
        });

        result.push(obj);
      }

      setJsonText(JSON.stringify(result, null, 2));

      // Update headers and selected headers
      setHeaders(headers);
      const newSelectedHeaders = {};
      headers.forEach(h => newSelectedHeaders[h] = true);
      setSelectedHeaders(newSelectedHeaders);

      setError('');
    } catch (err) {
      setError(`Error converting CSV to JSON: ${err.message}`);
    }
  };

  // Parse CSV line handling quoted values with commas
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // Double quotes inside quoted string means escaped quote
          current += '"';
          i++; // Skip the next quote
        } else {
          // Toggle quotes state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    // Add the last field
    result.push(current);
    return result;
  };

  // Copy selected content to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy to clipboard. Please try again.');
      });
  };

  // Toggle header selection
  const toggleHeader = (header) => {
    setSelectedHeaders(prev => ({
      ...prev,
      [header]: !prev[header]
    }));
  };

  // Select or deselect all headers
  const toggleAllHeaders = (selectAll) => {
    const newSelectedHeaders = {};
    headers.forEach(header => {
      newSelectedHeaders[header] = selectAll;
    });
    setSelectedHeaders(newSelectedHeaders);
  };

  return (
    <div className="flex flex-col p-2 min-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">JSON ⟷ CSV Converter</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        {/* JSON Column */}
        <div className="flex-1">
          <div className="flex justify-between mb-2">
            <h2 className="text-lg font-semibold">JSON</h2>
            <button
              onClick={() => copyToClipboard(jsonText)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Copy JSON
            </button>
          </div>
          <div className="h-[52px]">
            {/* Empty space to match height with CSV column header area */}
          </div>
          <textarea
            className="w-full h-96 p-2 border border-gray-300 rounded font-mono text-sm"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="Paste JSON here..."
          />
        </div>

        {/* CSV Column */}
        <div className="flex-1">
          <div className="flex justify-between mb-2">
            <h2 className="text-lg font-semibold">CSV</h2>
            <button
              onClick={() => {
                // Only copy selected columns
                if (headers.length === 0) return;

                const activeHeaders = headers.filter(h => selectedHeaders[h]);
                if (activeHeaders.length === 0) {
                  alert('No columns selected to copy!');
                  return;
                }

                const lines = csvText.split('\n');
                const filteredLines = lines.map(line => {
                  const values = parseCSVLine(line);
                  return headers.map((h, i) => selectedHeaders[h] ? values[i] || '' : null)
                    .filter(v => v !== null)
                    .join(',');
                });

                copyToClipboard(filteredLines.join('\n'));
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Copy CSV
            </button>
          </div>

          {/* Column Selection - Fixed height container */}
          <div className="h-[52px] overflow-y-auto">
            {headers.length > 0 ? (
              <div className="flex flex-wrap gap-2 items-center border border-gray-200 rounded p-2 ">
                <div className="flex items-center mr-2">
                  <button
                    className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded mr-1"
                    onClick={() => toggleAllHeaders(true)}
                  >
                    Select All
                  </button>
                  <button
                    className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                    onClick={() => toggleAllHeaders(false)}
                  >
                    Deselect All
                  </button>
                </div>
                {headers.map(header => (
                  <label key={header} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={selectedHeaders[header] || false}
                      onChange={() => toggleHeader(header)}
                      className="mr-1"
                    />
                    {header}
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <textarea
            className="w-full h-96 p-2 border border-gray-300 rounded font-mono text-sm"
            value={csvText}
            onChange={(e) => handleCsvChange(e.target.value)}
            placeholder="Paste CSV here..."
          />
        </div>
      </div>
    </div>
  );
};

export default JsonCsvConverter;
