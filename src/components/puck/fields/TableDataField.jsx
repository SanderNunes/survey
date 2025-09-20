// import React, { useState, useCallback, useMemo } from 'react';
// import { Upload, Plus, Trash2, Download, Database, PlusIcon, Type, Code } from 'lucide-react';
// import * as XLSX from 'xlsx';
// import TiptapRichTextEditor from './components/TiptapRichTextEditor ';
// import { TableComponent } from '../components';

// export const TableDataField = ({ field, onChange, value }) => {
//   const [activeTab, setActiveTab] = useState('manual');
//   const [manualData, setManualData] = useState(
//     value || { headers: ['Column 1', 'Column 2'], rows: [['Data 1', 'Data 2']] }
//   );
//   const [availableSheets, setAvailableSheets] = useState([]);
//   const [selectedSheet, setSelectedSheet] = useState('');
//   const [excelWorkbook, setExcelWorkbook] = useState(null);
//   const [allSheetsData, setAllSheetsData] = useState({});
//   const [importMode, setImportMode] = useState('single'); // 'single' or 'multiple'
//   const [isManualModalOpen, setIsManualModalOpen] = useState(false);
//   const [richTextMode, setRichTextMode] = useState(false); // Toggle between rich text and plain text
//   const [editingCell, setEditingCell] = useState(null); // Track which cell is being edited

//   const handleFileUpload = useCallback((event) => {
//     const file = event.target.files[0];
//     if (!file) return;

//     const reader = new FileReader();
//     reader.onload = (e) => {
//       try {
//         const data = new Uint8Array(e.target.result);
//         const workbook = XLSX.read(data, { type: 'array' });

//         setExcelWorkbook(workbook);
//         setAvailableSheets(workbook.SheetNames);
//         setSelectedSheet(workbook.SheetNames[0]);

//         if (importMode === 'single') {
//           loadSheetData(workbook, workbook.SheetNames[0]);
//         } else {
//           loadAllSheetsData(workbook);
//         }
//       } catch (error) {
//         alert('Error reading file. Please make sure it\'s a valid Excel file.');
//       }
//     };
//     reader.readAsArrayBuffer(file);
//     event.target.value = '';
//   }, [importMode]);

//   const loadSheetData = (workbook, sheetName) => {
//     if (!workbook || !sheetName) return;

//     const worksheet = workbook.Sheets[sheetName];
//     const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

//     if (jsonData.length > 0) {
//       const headers = jsonData[0] || [];
//       const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));

//       const tableData = { headers, rows };
//       setManualData(tableData);
//       onChange(tableData);
//     }
//   };

//   const loadAllSheetsData = (workbook) => {
//     if (!workbook) return;

//     const allData = {};
//     let allHeadersSet = new Set();

//     // First pass: collect all headers from all sheets
//     workbook.SheetNames.forEach(sheetName => {
//       const worksheet = workbook.Sheets[sheetName];
//       const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

//       if (jsonData.length > 0) {
//         const headers = jsonData[0] || [];
//         headers.forEach(h => allHeadersSet.add(h));
//         const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));
//         allData[sheetName] = { headers, rows };
//       }
//     });

//     const allHeaders = Array.from(allHeadersSet);

//     setAllSheetsData(allData);

//     // Combined data with dynamic headers
//     const combinedData = {
//       headers: [...allHeaders], // no "Sheet" column here for rendering
//       rows: [],
//       sheetsData: allData,
//       isMultiSheet: true,
//       hiddenSheetColumn: true // flag for TableComponent
//     };

//     // Second pass: add rows with missing columns filled
//     Object.entries(allData).forEach(([sheetName, sheetData]) => {
//       sheetData.rows.forEach(row => {
//         const rowObj = {};
//         sheetData.headers.forEach((h, i) => {
//           rowObj[h] = row[i] ?? '';
//         });

//         // Fill missing headers
//         const fullRow = allHeaders.map(h => rowObj[h] ?? '');
//         combinedData.rows.push([sheetName, ...fullRow]); // sheetName in col 0 for filtering only
//       });
//     });

//     setManualData(combinedData);
//     onChange(combinedData);
//   };

//   const handleSheetChange = (sheetName) => {
//     setSelectedSheet(sheetName);
//     if (importMode === 'single') {
//       loadSheetData(excelWorkbook, sheetName);
//     }
//   };

//   const handleImportModeChange = (mode) => {
//     setImportMode(mode);
//     if (excelWorkbook) {
//       if (mode === 'single') {
//         loadSheetData(excelWorkbook, selectedSheet || availableSheets[0]);
//       } else {
//         loadAllSheetsData(excelWorkbook);
//       }
//     }
//   };

//   const addColumn = () => {
//     const newHeaders = [...manualData.headers, `Column ${manualData.headers.length + 1}`];
//     const newRows = manualData.rows.map(row => [...row, '']);
//     const newData = { headers: newHeaders, rows: newRows };
//     setManualData(newData);
//     onChange(newData);
//   };

//   const addRow = () => {
//     const newRow = new Array(manualData.headers.length).fill('');
//     const newData = { ...manualData, rows: [...manualData.rows, newRow] };
//     setManualData(newData);
//     onChange(newData);
//   };

//   const removeColumn = (index) => {
//     if (manualData.headers.length <= 1) return;
//     const newHeaders = manualData.headers.filter((_, i) => i !== index);
//     const newRows = manualData.rows.map(row => row.filter((_, i) => i !== index));
//     const newData = { headers: newHeaders, rows: newRows };
//     setManualData(newData);
//     onChange(newData);
//   };

//   const removeRow = (index) => {
//     if (manualData.rows.length <= 1) return;
//     const newRows = manualData.rows.filter((_, i) => i !== index);
//     const newData = { ...manualData, rows: newRows };
//     setManualData(newData);
//     onChange(newData);
//   };

//   const updateHeader = (index, value) => {
//     const newHeaders = [...manualData.headers];
//     newHeaders[index] = value;
//     const newData = { ...manualData, headers: newHeaders };
//     setManualData(newData);
//     onChange(newData);
//   };

//   const updateCell = (rowIndex, cellIndex, value) => {
//     const newRows = [...manualData.rows];
//     newRows[rowIndex] = [...newRows[rowIndex]];
//     newRows[rowIndex][cellIndex] = value;
//     const newData = { ...manualData, rows: newRows };
//     setManualData(newData);
//     onChange(newData);
//   };

//   const exportToExcel = () => {
//     // Convert HTML content to plain text for Excel export
//     const plainTextData = {
//       headers: manualData.headers,
//       rows: manualData.rows.map(row =>
//         row.map(cell => {
//           if (typeof cell === 'string' && cell.includes('<')) {
//             // Strip HTML tags for Excel export
//             const div = document.createElement('div');
//             div.innerHTML = cell;
//             return div.textContent || div.innerText || '';
//           }
//           return cell;
//         })
//       )
//     };

//     const ws = XLSX.utils.aoa_to_sheet([plainTextData.headers, ...plainTextData.rows]);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, 'Table Data');
//     XLSX.writeFile(wb, 'table-data.xlsx');
//   };

//   // Preview data (limited to 5 rows)
//   const previewData = useMemo(() => {
//     return {
//       ...manualData,
//       rows: manualData.rows.slice(0, 5)
//     };
//   }, [manualData]);

//   const handleCellEdit = (rowIndex, cellIndex) => {
//     setEditingCell({ rowIndex, cellIndex });
//   };

//   const handleCellBlur = () => {
//     setEditingCell(null);
//   };

//   return (
//     <div className="w-full space-y-4">
//       <label className="block text-sm font-medium text-gray-700 mb-2">
//         {field.label}
//       </label>

//       {/* Tab Navigation */}
//       <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
//         <button
//           type="button"
//           onClick={() => setActiveTab('manual')}
//           className={`px-3 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'manual'
//             ? 'bg-white text-primary-600 shadow-sm'
//             : 'text-gray-600 hover:text-gray-900'
//             }`}
//         >
//           Manual Entry
//         </button>
//         <button
//           type="button"
//           onClick={() => setActiveTab('import')}
//           className={`px-3 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'import'
//             ? 'bg-white text-primary-600 shadow-sm'
//             : 'text-gray-600 hover:text-gray-900'
//             }`}
//         >
//           Import Excel
//         </button>
//       </div>

//       {activeTab === 'import' && (
//         <div className="space-y-4">
//           {/* Import Mode Selection */}
//           <div className="space-y-2">
//             <label className="block text-sm font-medium text-gray-700">
//               Import Mode
//             </label>
//             <div className="flex space-x-4">
//               <label className="flex items-center">
//                 <input
//                   type="radio"
//                   name="importMode"
//                   value="single"
//                   checked={importMode === 'single'}
//                   onChange={(e) => handleImportModeChange(e.target.value)}
//                   className="mr-2"
//                 />
//                 <span className="text-sm">Single Sheet</span>
//               </label>
//               <label className="flex items-center">
//                 <input
//                   type="radio"
//                   name="importMode"
//                   value="multiple"
//                   checked={importMode === 'multiple'}
//                   onChange={(e) => handleImportModeChange(e.target.value)}
//                   className="mr-2"
//                 />
//                 <span className="text-sm">All Sheets (Combined)</span>
//               </label>
//             </div>
//             <p className="text-xs text-gray-500">
//               {importMode === 'single'
//                 ? 'Import data from a single sheet'
//                 : 'Import data from all sheets with sheet name as first column'
//               }
//             </p>
//           </div>

//           <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
//             <div className="text-center">
//               <Upload className="mx-auto h-12 w-12 text-gray-400" />
//               <div className="mt-4">
//                 <label htmlFor="excel-upload" className="cursor-pointer">
//                   <span className="mt-2 block text-sm font-medium text-gray-900">
//                     Upload Excel File
//                   </span>
//                   <span className="mt-1 block text-sm text-gray-500">
//                     Supports .xlsx, .xls files
//                   </span>
//                   <input
//                     id="excel-upload"
//                     type="file"
//                     className="sr-only"
//                     accept=".xlsx,.xls"
//                     onChange={handleFileUpload}
//                   />
//                   <span className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-600 hover:bg-primary-100">
//                     Choose File
//                   </span>
//                 </label>
//               </div>
//             </div>
//           </div>

//           {/* Sheet Selection - Only show for single mode */}
//           {availableSheets.length > 0 && importMode === 'single' && (
//             <div className="space-y-2">
//               <label className="block text-sm font-medium text-gray-700">
//                 Select Sheet
//               </label>
//               <select
//                 value={selectedSheet}
//                 onChange={(e) => handleSheetChange(e.target.value)}
//                 className="w-full text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
//               >
//                 {availableSheets.map((sheetName) => (
//                   <option key={sheetName} value={sheetName}>
//                     {sheetName}
//                   </option>
//                 ))}
//               </select>
//               <p className="text-xs text-gray-500">
//                 {availableSheets.length} sheet{availableSheets.length !== 1 ? 's' : ''} available
//               </p>
//             </div>
//           )}

//           {/* Multi-sheet info */}
//           {availableSheets.length > 0 && importMode === 'multiple' && (
//             <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
//               <div className="flex items-center">
//                 <Database className="h-4 w-4 text-primary-600 mr-2" />
//                 <span className="text-sm text-primary-800 font-medium">
//                   Importing {availableSheets.length} sheets: {availableSheets.join(', ')}
//                 </span>
//               </div>
//               <p className="text-xs text-primary-600 mt-1">
//                 Data from all sheets will be combined with sheet names in the first column
//               </p>
//             </div>
//           )}
//         </div>
//       )}

//       {activeTab === 'manual' && (
//         <div className="space-y-4">
//           <button
//             type="button"
//             onClick={() => setIsManualModalOpen(true)}
//             className="px-4 py-2 text-primary-500 hover:bg-primary-100 rounded-md"
//           >
//             Open Manual Entry Editor
//           </button>

//           {/* Modal */}
//           {isManualModalOpen && (
//             <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
//               <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full p-6 overflow-auto max-h-[90vh]">

//                 {/* Header */}
//                 <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
//                   <h4 className="text-lg font-semibold text-gray-800">
//                     Manual Table Editor
//                   </h4>
//                   <button
//                     onClick={() => setIsManualModalOpen(false)}
//                     className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800"
//                     aria-label="Close modal"
//                   >
//                     ✕
//                   </button>
//                 </div>

//                 {/* Toolbar */}
//                 <div className="flex justify-between items-center mb-4">
//                   <div className="flex space-x-2">
//                     <button
//                       type="button"
//                       onClick={exportToExcel}
//                       className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md text-gray-700 hover:bg-gray-100"
//                     >
//                       <Download className='w-5 h-5' /> Export
//                     </button>
//                     <button
//                       type="button"
//                       onClick={addColumn}
//                       className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md text-primary hover:bg-primary-100"
//                     >
//                       <PlusIcon className='w-5 h-5' /> Column
//                     </button>
//                     <button
//                       type="button"
//                       onClick={addRow}
//                       className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md text-alternative hover:bg-alternative-100"
//                     >
//                       <PlusIcon className='w-5 h-5' /> Row
//                     </button>
//                   </div>

//                   {/* Rich Text Toggle */}
//                   <div className="flex items-center gap-2">
//                     <button
//                       type="button"
//                       onClick={() => setRichTextMode(!richTextMode)}
//                       className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
//                         richTextMode
//                           ? 'bg-primary-100 text-primary-700 border border-primary-300'
//                           : 'bg-gray-100 text-gray-700 border border-gray-300'
//                       }`}
//                     >
//                       {richTextMode ? <Type className='w-4 h-4' /> : <Code className='w-4 h-4' />}
//                       {richTextMode ? 'Rich Text' : 'Plain Text'}
//                     </button>
//                   </div>
//                 </div>

//                 {/* Table */}
//                 <div className="overflow-x-auto border border-gray-200 rounded-lg">
//                   <table className="min-w-full divide-y divide-gray-200 text-sm">
//                     <thead className="bg-gray-50">
//                       <tr>
//                         {manualData.headers.map((header, index) => (
//                           <th key={index} className="px-3 py-2 text-left">
//                             <div className="flex items-center space-x-2">
//                               <input
//                                 type="text"
//                                 value={header}
//                                 onChange={(e) => updateHeader(index, e.target.value)}
//                                 className="w-full border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
//                                 placeholder="Header"
//                               />
//                               {manualData.headers.length > 1 && (
//                                 <button
//                                   type="button"
//                                   onClick={() => removeColumn(index)}
//                                   className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
//                                   aria-label="Remove column"
//                                 >
//                                   ✕
//                                 </button>
//                               )}
//                             </div>
//                           </th>
//                         ))}
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {manualData.rows.map((row, rowIndex) => (
//                         <tr key={rowIndex}>
//                           {row.map((cell, cellIndex) => (
//                             <td key={cellIndex} className="px-3 py-2 align-top">
//                               <div className="flex items-start space-x-2">
//                                 {richTextMode ? (
//                                   <div className="w-full">
//                                     <TiptapRichTextEditor
//                                       value={cell || ''}
//                                       onChange={(value) => updateCell(rowIndex, cellIndex, value)}
//                                       placeholder="Enter rich text..."
//                                       className="min-h-[60px]"
//                                     />
//                                   </div>
//                                 ) : (
//                                   <textarea
//                                     value={cell || ''}
//                                     onChange={(e) => updateCell(rowIndex, cellIndex, e.target.value)}
//                                     className="w-full border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y min-h-[40px]"
//                                     placeholder="Enter text..."
//                                     rows={2}
//                                   />
//                                 )}
//                                 {cellIndex === row.length - 1 && manualData.rows.length > 1 && (
//                                   <button
//                                     type="button"
//                                     onClick={() => removeRow(rowIndex)}
//                                     className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50 mt-1 flex-shrink-0"
//                                     aria-label="Remove row"
//                                   >
//                                     ✕
//                                   </button>
//                                 )}
//                               </div>
//                             </td>
//                           ))}
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>

//                 {/* Footer */}
//                 <div className="mt-6 flex justify-between items-center">
//                   <div className="text-sm text-gray-600">
//                     {richTextMode ? (
//                       <div className="flex items-center gap-2">
//                         <div className="w-2 h-2 bg-alternative-500 rounded-full"></div>
//                         Rich text mode enabled - HTML formatting will be preserved
//                       </div>
//                     ) : (
//                       <div className="flex items-center gap-2">
//                         <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
//                         Plain text mode - Basic text input only
//                       </div>
//                     )}
//                   </div>
//                   <button
//                     onClick={() => setIsManualModalOpen(false)}
//                     className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm transition-colors"
//                   >
//                     Save & Close
//                   </button>
//                 </div>
//               </div>
//             </div>
//           )}

//         </div>
//       )}


//     </div>
//   );
// };

import React, { useState, useCallback, useMemo } from 'react';
import { Upload, Plus, Trash2, Download, Database, PlusIcon, Type, Code, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import TiptapRichTextEditor from './components/TiptapRichTextEditor ';
import { TableComponent } from '../components';

export const TableDataField = ({ field, onChange, value }) => {
  const [activeTab, setActiveTab] = useState('manual');
  const [manualData, setManualData] = useState(
    value || { headers: ['Column 1', 'Column 2'], rows: [['Data 1', 'Data 2']] }
  );
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [excelWorkbook, setExcelWorkbook] = useState(null);
  const [allSheetsData, setAllSheetsData] = useState({});
  const [importMode, setImportMode] = useState('single'); // 'single' or 'multiple'
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [richTextMode, setRichTextMode] = useState(false); // Toggle between rich text and plain text
  const [editingCell, setEditingCell] = useState(null); // Track which cell is being edited
  const [activeSheetTab, setActiveSheetTab] = useState(''); // For multi-sheet editing

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        setExcelWorkbook(workbook);
        setAvailableSheets(workbook.SheetNames);
        setSelectedSheet(workbook.SheetNames[0]);
        setActiveSheetTab(workbook.SheetNames[0]); // Set first sheet as active tab

        if (importMode === 'single') {
          loadSheetData(workbook, workbook.SheetNames[0]);
        } else {
          loadAllSheetsData(workbook);
        }
      } catch (error) {
        alert('Error reading file. Please make sure it\'s a valid Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  }, [importMode]);

  const loadSheetData = (workbook, sheetName) => {
    if (!workbook || !sheetName) return;

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length > 0) {
      const headers = jsonData[0] || [];
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));

      const tableData = { headers, rows };
      setManualData(tableData);
      onChange(tableData);
    }
  };

  const loadAllSheetsData = (workbook) => {
    if (!workbook) return;

    const allData = {};
    let allHeadersSet = new Set();

    // First pass: collect all headers from all sheets
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length > 0) {
        const headers = jsonData[0] || [];
        headers.forEach(h => allHeadersSet.add(h));
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));
        allData[sheetName] = { headers, rows };
      }
    });

    const allHeaders = Array.from(allHeadersSet);

    setAllSheetsData(allData);

    // Combined data with dynamic headers
    const combinedData = {
      headers: [...allHeaders], // no "Sheet" column here for rendering
      rows: [],
      sheetsData: allData,
      isMultiSheet: true,
      hiddenSheetColumn: true // flag for TableComponent
    };

    // Second pass: add rows with missing columns filled
    Object.entries(allData).forEach(([sheetName, sheetData]) => {
      sheetData.rows.forEach(row => {
        const rowObj = {};
        sheetData.headers.forEach((h, i) => {
          rowObj[h] = row[i] ?? '';
        });

        // Fill missing headers
        const fullRow = allHeaders.map(h => rowObj[h] ?? '');
        combinedData.rows.push([sheetName, ...fullRow]); // sheetName in col 0 for filtering only
      });
    });

    setManualData(combinedData);
    onChange(combinedData);
  };

  const handleSheetChange = (sheetName) => {
    setSelectedSheet(sheetName);
    if (importMode === 'single') {
      loadSheetData(excelWorkbook, sheetName);
    }
  };

  const handleImportModeChange = (mode) => {
    setImportMode(mode);
    if (excelWorkbook) {
      if (mode === 'single') {
        loadSheetData(excelWorkbook, selectedSheet || availableSheets[0]);
      } else {
        loadAllSheetsData(excelWorkbook);
      }
    }
  };

  const addColumn = () => {
    if (manualData.isMultiSheet) {
      // Add column to specific sheet
      const updatedSheetsData = { ...allSheetsData };
      const sheetData = updatedSheetsData[activeSheetTab];
      const newHeaders = [...sheetData.headers, `Column ${sheetData.headers.length + 1}`];
      const newRows = sheetData.rows.map(row => [...row, '']);
      updatedSheetsData[activeSheetTab] = { headers: newHeaders, rows: newRows };

      setAllSheetsData(updatedSheetsData);
      rebuildCombinedData(updatedSheetsData);
    } else {
      // Single sheet logic
      const newHeaders = [...manualData.headers, `Column ${manualData.headers.length + 1}`];
      const newRows = manualData.rows.map(row => [...row, '']);
      const newData = { headers: newHeaders, rows: newRows };
      setManualData(newData);
      onChange(newData);
    }
  };

  const addRow = () => {
    if (manualData.isMultiSheet) {
      // Add row to specific sheet
      const updatedSheetsData = { ...allSheetsData };
      const sheetData = updatedSheetsData[activeSheetTab];
      const newRow = new Array(sheetData.headers.length).fill('');
      updatedSheetsData[activeSheetTab] = {
        ...sheetData,
        rows: [...sheetData.rows, newRow]
      };

      setAllSheetsData(updatedSheetsData);
      rebuildCombinedData(updatedSheetsData);
    } else {
      // Single sheet logic
      const newRow = new Array(manualData.headers.length).fill('');
      const newData = { ...manualData, rows: [...manualData.rows, newRow] };
      setManualData(newData);
      onChange(newData);
    }
  };

  const removeColumn = (index) => {
    if (manualData.isMultiSheet) {
      const updatedSheetsData = { ...allSheetsData };
      const sheetData = updatedSheetsData[activeSheetTab];
      if (sheetData.headers.length <= 1) return;

      const newHeaders = sheetData.headers.filter((_, i) => i !== index);
      const newRows = sheetData.rows.map(row => row.filter((_, i) => i !== index));
      updatedSheetsData[activeSheetTab] = { headers: newHeaders, rows: newRows };

      setAllSheetsData(updatedSheetsData);
      rebuildCombinedData(updatedSheetsData);
    } else {
      if (manualData.headers.length <= 1) return;
      const newHeaders = manualData.headers.filter((_, i) => i !== index);
      const newRows = manualData.rows.map(row => row.filter((_, i) => i !== index));
      const newData = { headers: newHeaders, rows: newRows };
      setManualData(newData);
      onChange(newData);
    }
  };

  const removeRow = (index) => {
    if (manualData.isMultiSheet) {
      const updatedSheetsData = { ...allSheetsData };
      const sheetData = updatedSheetsData[activeSheetTab];
      if (sheetData.rows.length <= 1) return;

      const newRows = sheetData.rows.filter((_, i) => i !== index);
      updatedSheetsData[activeSheetTab] = { ...sheetData, rows: newRows };

      setAllSheetsData(updatedSheetsData);
      rebuildCombinedData(updatedSheetsData);
    } else {
      if (manualData.rows.length <= 1) return;
      const newRows = manualData.rows.filter((_, i) => i !== index);
      const newData = { ...manualData, rows: newRows };
      setManualData(newData);
      onChange(newData);
    }
  };

  const updateHeader = (index, value) => {
    if (manualData.isMultiSheet) {
      const updatedSheetsData = { ...allSheetsData };
      const sheetData = updatedSheetsData[activeSheetTab];
      const newHeaders = [...sheetData.headers];
      newHeaders[index] = value;
      updatedSheetsData[activeSheetTab] = { ...sheetData, headers: newHeaders };

      setAllSheetsData(updatedSheetsData);
      rebuildCombinedData(updatedSheetsData);
    } else {
      const newHeaders = [...manualData.headers];
      newHeaders[index] = value;
      const newData = { ...manualData, headers: newHeaders };
      setManualData(newData);
      onChange(newData);
    }
  };

  const updateCell = (rowIndex, cellIndex, value) => {
    if (manualData.isMultiSheet) {
      const updatedSheetsData = { ...allSheetsData };
      const sheetData = updatedSheetsData[activeSheetTab];
      const newRows = [...sheetData.rows];
      newRows[rowIndex] = [...newRows[rowIndex]];
      newRows[rowIndex][cellIndex] = value;
      updatedSheetsData[activeSheetTab] = { ...sheetData, rows: newRows };

      setAllSheetsData(updatedSheetsData);
      rebuildCombinedData(updatedSheetsData);
    } else {
      const newRows = [...manualData.rows];
      newRows[rowIndex] = [...newRows[rowIndex]];
      newRows[rowIndex][cellIndex] = value;
      const newData = { ...manualData, rows: newRows };
      setManualData(newData);
      onChange(newData);
    }
  };

  const rebuildCombinedData = (updatedSheetsData) => {
    let allHeadersSet = new Set();

    // Collect all headers from all sheets
    Object.values(updatedSheetsData).forEach(sheetData => {
      sheetData.headers.forEach(h => allHeadersSet.add(h));
    });

    const allHeaders = Array.from(allHeadersSet);

    const combinedData = {
      headers: [...allHeaders],
      rows: [],
      sheetsData: updatedSheetsData,
      isMultiSheet: true,
      hiddenSheetColumn: true
    };

    // Rebuild combined rows
    Object.entries(updatedSheetsData).forEach(([sheetName, sheetData]) => {
      sheetData.rows.forEach(row => {
        const rowObj = {};
        sheetData.headers.forEach((h, i) => {
          rowObj[h] = row[i] ?? '';
        });

        const fullRow = allHeaders.map(h => rowObj[h] ?? '');
        combinedData.rows.push([sheetName, ...fullRow]);
      });
    });




    setManualData(combinedData);
    onChange(combinedData);
  };



  const exportToExcel = () => {
    if (manualData.isMultiSheet) {
      // Export all sheets to separate sheets in Excel
      const wb = XLSX.utils.book_new();

      Object.entries(allSheetsData).forEach(([sheetName, sheetData]) => {
        const plainTextData = {
          headers: sheetData.headers,
          rows: sheetData.rows.map(row =>
            row.map(cell => {
              if (typeof cell === 'string' && cell.includes('<')) {
                const div = document.createElement('div');
                div.innerHTML = cell;
                return div.textContent || div.innerText || '';
              }
              return cell;
            })
          )
        };

        const ws = XLSX.utils.aoa_to_sheet([plainTextData.headers, ...plainTextData.rows]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      XLSX.writeFile(wb, 'multi-sheet-data.xlsx');
    } else {
      // Single sheet export
      const plainTextData = {
        headers: manualData.headers,
        rows: manualData.rows.map(row =>
          row.map(cell => {
            if (typeof cell === 'string' && cell.includes('<')) {
              const div = document.createElement('div');
              div.innerHTML = cell;
              return div.textContent || div.innerText || '';
            }
            return cell;
          })
        )
      };

      const ws = XLSX.utils.aoa_to_sheet([plainTextData.headers, ...plainTextData.rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Table Data');
      XLSX.writeFile(wb, 'table-data.xlsx');
    }
  };

  // Get current sheet data for editing
  const getCurrentSheetData = () => {
    if (manualData.isMultiSheet && activeSheetTab) {
      return allSheetsData[activeSheetTab] || { headers: [], rows: [] };
    }
    return manualData;
  };

  // Preview data (limited to 5 rows)
  const previewData = useMemo(() => {
    return {
      ...manualData,
      rows: manualData.rows.slice(0, 5)
    };
  }, [manualData]);

  const handleCellEdit = (rowIndex, cellIndex) => {
    setEditingCell({ rowIndex, cellIndex });
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  return (
    <div className="w-full space-y-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
      </label>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`px-3 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'manual'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          Manual Entry
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('import')}
          className={`px-3 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'import'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          Import Excel
        </button>
      </div>

      {activeTab === 'import' && (
        <div className="space-y-4">
          {/* Import Mode Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Import Mode
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="importMode"
                  value="single"
                  checked={importMode === 'single'}
                  onChange={(e) => handleImportModeChange(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">Single Sheet</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="importMode"
                  value="multiple"
                  checked={importMode === 'multiple'}
                  onChange={(e) => handleImportModeChange(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">All Sheets (Combined)</span>
              </label>
            </div>
            <p className="text-xs text-gray-500">
              {importMode === 'single'
                ? 'Import data from a single sheet'
                : 'Import data from all sheets with sheet name as first column'
              }
            </p>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="excel-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Upload Excel File
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">
                    Supports .xlsx, .xls files
                  </span>
                  <input
                    id="excel-upload"
                    type="file"
                    className="sr-only"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                  />
                  <span className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-blue-600 hover:bg-blue-100">
                    Choose File
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Sheet Selection - Only show for single mode */}
          {availableSheets.length > 0 && importMode === 'single' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Sheet
              </label>
              <select
                value={selectedSheet}
                onChange={(e) => handleSheetChange(e.target.value)}
                className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {availableSheets.map((sheetName) => (
                  <option key={sheetName} value={sheetName}>
                    {sheetName}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                {availableSheets.length} sheet{availableSheets.length !== 1 ? 's' : ''} available
              </p>
            </div>
          )}

          {/* Multi-sheet info */}
          {availableSheets.length > 0 && importMode === 'multiple' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center">
                <Database className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-sm text-blue-800 font-medium">
                  Importing {availableSheets.length} sheets: {availableSheets.join(', ')}
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Data from all sheets will be combined with sheet names in the first column
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="px-4 py-2 text-blue-500 hover:bg-blue-100 rounded-md"
          >
            Open Manual Entry Editor
          </button>

          {/* Modal */}
          {isManualModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full p-6 overflow-auto max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">
                    Manual Table Editor
                    {manualData.isMultiSheet && (
                      <span className="ml-2 text-sm text-gray-500">
                        (Multi-Sheet Mode)
                      </span>
                    )}
                  </h4>
                  <button
                    onClick={() => setIsManualModalOpen(false)}
                    className="px-4 py-2 text-primary-600 rounded-md hover:bg-primary-100 text-sm transition-colors"
                  >
                    Save & Close
                  </button>
                </div>

                {/* Sheet Tabs - Only show for multi-sheet mode */}
                {manualData.isMultiSheet && Object.keys(allSheetsData).length > 0 && (
                  <div className="mb-4">
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
                      {Object.keys(allSheetsData).map((sheetName) => (
                        <button
                          key={sheetName}
                          type="button"
                          onClick={() => setActiveSheetTab(sheetName)}
                          className={`px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeSheetTab === sheetName
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                          <FileText className="w-4 h-4" />
                          {sheetName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Toolbar */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={exportToExcel}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md text-gray-700 hover:bg-gray-100"
                    >
                      <Download className='w-5 h-5' /> Export
                    </button>
                    <button
                      type="button"
                      onClick={addColumn}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md text-primary-600 hover:bg-primary-100"
                    >
                      <PlusIcon className='w-5 h-5' /> Column
                    </button>
                    <button
                      type="button"
                      onClick={addRow}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md text-alternative-500 hover:bg-alternative-100"
                    >
                      <PlusIcon className='w-5 h-5' /> Row
                    </button>
                  </div>

                  {/* Rich Text Toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRichTextMode(!richTextMode)}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${richTextMode
                        ? 'bg-primary-100 text-primary-700 border border-primary-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}
                    >
                      {richTextMode ? <Type className='w-4 h-4' /> : <Code className='w-4 h-4' />}
                      {richTextMode ? 'Rich Text' : 'Plain Text'}
                    </button>
                  </div>
                </div>

                {/* Current Sheet Info */}
                {manualData.isMultiSheet && activeSheetTab && (
                  <div className="mb-4 bg-primary-50 border-b-2 border-gray-50 p-3">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-primary-600 mr-2" />
                      <span className="text-sm text-primary-800 font-medium">
                        Editing: {activeSheetTab}
                      </span>
                      <span className="ml-4 text-xs text-primary-600">
                        {getCurrentSheetData().rows.length} rows, {getCurrentSheetData().headers.length} columns
                      </span>
                    </div>
                  </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {getCurrentSheetData().headers.map((header, index) => (
                          <th key={index} className="px-3 py-2 text-left">
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={header}
                                onChange={(e) => updateHeader(index, e.target.value)}
                                className="w-full border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                placeholder="Header"
                              />
                              {getCurrentSheetData().headers.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeColumn(index)}
                                  className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                                  aria-label="Remove column"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getCurrentSheetData().rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-3 py-2 align-top">
                              <div className="flex items-start space-x-2">
                                {richTextMode ? (
                                  <div className="w-full">
                                    <TiptapRichTextEditor
                                      value={cell || ''}
                                      onChange={(value) => updateCell(rowIndex, cellIndex, value)}
                                      placeholder="Enter rich text..."
                                      className="min-h-[60px]"
                                    />
                                  </div>
                                ) : (
                                  <textarea
                                    value={cell || ''}
                                    onChange={(e) => updateCell(rowIndex, cellIndex, e.target.value)}
                                    className="w-full border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y min-h-[40px]"
                                    placeholder="Enter text..."
                                    rows={2}
                                  />
                                )}
                                {cellIndex === row.length - 1 && getCurrentSheetData().rows.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeRow(rowIndex)}
                                    className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50 mt-1 flex-shrink-0"
                                    aria-label="Remove row"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="mt-6 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {richTextMode ? (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-alternative-500 rounded-full"></div>
                        Rich text mode enabled - HTML formatting will be preserved
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        Plain text mode - Basic text input only
                      </div>
                    )}
                    {manualData.isMultiSheet && (
                      <div className="mt-1 text-xs text-gray-500">
                        Changes will be applied to all sheets when saving
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setIsManualModalOpen(false)}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800"
                    aria-label="Close modal"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          )
          }
        </div>
      )
      }
    </div>)
}
