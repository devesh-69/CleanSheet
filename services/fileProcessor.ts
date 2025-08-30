import { ParsedFile, ParsedWorkbook, ParsedSheet } from '../types';
import { analyzeColumnTypes } from './dataTypeAnalyzer';

declare const XLSX: any;
declare const Papa: any;
declare const jschardet: any;
declare const JSZip: any;

const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB

const parseExcel = (file: File): Promise<ParsedFile> => {
  if (file.size > LARGE_FILE_THRESHOLD) {
    return Promise.reject(new Error(`Excel file is too large (${(file.size / (1024*1024)).toFixed(1)}MB). For files over 50MB, please use CSV or TSV for better performance.`));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
          return reject(new Error('The Excel file appears to be empty or contains no sheets.'));
        }
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          // Handle sheets with only headers and no data rows
          const headerRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const headers = (headerRows[0] as string[]) || [];
          const columnTypes = analyzeColumnTypes([], headers);

          resolve({
            name: file.name,
            size: file.size,
            headers: headers,
            data: [],
            rowCount: 0,
            columnCount: headers.length,
            columnTypes,
          });
          return;
        }

        const headers = Object.keys(jsonData[0]);
        const columnTypes = analyzeColumnTypes(jsonData, headers);
        resolve({
          name: file.name,
          size: file.size,
          headers,
          data: jsonData,
          rowCount: jsonData.length,
          columnCount: headers.length,
          columnTypes,
        });
      } catch (error) {
        reject(new Error('Failed to parse Excel file. The file may be corrupt or in an unsupported format.'));
      }
    };
    reader.onerror = (error) => reject(new Error('Error reading file content. Please check the file and try again.'));
    reader.readAsArrayBuffer(file);
  });
};

const parseCsv = (file: File, customDelimiter?: string): Promise<ParsedFile> => {
    if (file.size > LARGE_FILE_THRESHOLD) {
      return Promise.reject(new Error(`CSV file is too large (${(file.size / (1024*1024)).toFixed(1)}MB). Max size is 50MB.`));
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const buffer = e.target?.result as ArrayBuffer;
                const detection = jschardet.detect(new Uint8Array(buffer));
                const decoder = new TextDecoder(detection.encoding);
                const text = decoder.decode(buffer);

                const delimitersToTry = customDelimiter ? [customDelimiter] : [',', ';', '|', '\t'];
                let successfulParse: ParsedFile | null = null;

                for (let delimiter of delimitersToTry) {
                    // Allow user to type 'Tab' to mean '\t'
                    if (delimiter.toLowerCase() === 'tab') {
                        delimiter = '\t';
                    }
                    
                    let parseError = false;
                    let resultsData: any[] = [];
                    let headers: string[] = [];
                    
                    Papa.parse(text, {
                        header: true,
                        skipEmptyLines: true,
                        delimiter: delimiter,
                        error: () => { parseError = true; },
                        complete: (results: any) => {
                            if (results.errors.length > 0) {
                               // Don't set parseError for row-level errors, but we can check results.meta.fields
                            }
                            headers = results.meta.fields || [];
                            resultsData = results.data;
                        }
                    });

                    // A successful parse should have no critical errors and more than one column.
                    if (!parseError && headers.length > 1) {
                        const columnTypes = analyzeColumnTypes(resultsData, headers);
                        successfulParse = {
                            name: file.name,
                            size: file.size,
                            headers,
                            data: resultsData,
                            rowCount: resultsData.length,
                            columnCount: headers.length,
                            columnTypes,
                        };
                        break; // Exit the loop on first successful parse
                    }
                }
                
                if (successfulParse) {
                    resolve(successfulParse);
                } else {
                    const finalError = customDelimiter 
                        ? `Failed to parse CSV with delimiter "${customDelimiter}". Please check the file and delimiter.`
                        : "Automatic parsing failed. Please check the file's delimiter and try specifying a custom one.";
                    reject(new Error(finalError));
                }

            } catch (error) {
                 reject(new Error('Failed to decode or parse CSV file. It may be corrupt or have an unsupported character encoding.'));
            }
        };
        reader.onerror = (error) => reject(new Error('Error reading file content. Please check the file and try again.'));
        reader.readAsArrayBuffer(file);
    });
};

const parseTsv = (file: File): Promise<ParsedFile> => {
  if (file.size > LARGE_FILE_THRESHOLD) {
    return Promise.reject(new Error(`TSV file is too large (${(file.size / (1024*1024)).toFixed(1)}MB). Max size is 50MB.`));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const buffer = e.target?.result as ArrayBuffer;
            const detection = jschardet.detect(new Uint8Array(buffer));
            const decoder = new TextDecoder(detection.encoding);
            const text = decoder.decode(buffer);

            const data: Record<string, any>[] = [];
            let headers: string[] = [];
            let rowCount = 0;

            Papa.parse(text, {
              header: true,
              skipEmptyLines: true,
              delimiter: '\t',
              step: (results: any, parser: any) => {
                if (results.errors && results.errors.length > 0) {
                    const firstError = results.errors[0];
                    parser.abort();
                    return reject(new Error(`TSV parsing error: ${firstError.message} (at row ${firstError.row + 2})`));
                }
                if (rowCount === 0) {
                    headers = results.meta.fields || [];
                }
                data.push(results.data);
                rowCount++;
              },
              complete: () => {
                const columnTypes = analyzeColumnTypes(data, headers);
                resolve({
                  name: file.name,
                  size: file.size,
                  headers,
                  data,
                  rowCount: data.length,
                  columnCount: headers.length,
                  columnTypes,
                });
              },
              error: (error: Error) => {
                reject(new Error('Failed to read TSV file. Please check the file and try again.'));
              },
            });
        } catch (error) {
             reject(new Error('Failed to decode or parse TSV file. It may be corrupt or have an unsupported character encoding.'));
        }
    };
    reader.onerror = (error) => reject(new Error('Error reading file content. Please check the file and try again.'));
    reader.readAsArrayBuffer(file);
  });
};

const parseJson = (file: File): Promise<ParsedFile> => {
  if (file.size > LARGE_FILE_THRESHOLD) {
    return Promise.reject(new Error(`JSON file is too large (${(file.size / (1024*1024)).toFixed(1)}MB). Max size is 50MB.`));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const detection = jschardet.detect(new Uint8Array(buffer));
        const decoder = new TextDecoder(detection.encoding);
        const text = decoder.decode(buffer);

        const data = JSON.parse(text);

        if (!Array.isArray(data)) {
          return reject(new Error('Invalid JSON format. The file must contain an array of objects.'));
        }
        
        if (data.length === 0) {
            resolve({
                name: file.name,
                size: file.size,
                headers: [],
                data: [],
                rowCount: 0,
                columnCount: 0,
                columnTypes: {},
            });
            return;
        }

        // A quick check to ensure it's an array of objects
        if (typeof data[0] !== 'object' || data[0] === null) {
            return reject(new Error('Invalid JSON format. The array must contain objects.'));
        }

        const headers = Object.keys(data[0]);
        const columnTypes = analyzeColumnTypes(data, headers);
        resolve({
          name: file.name,
          size: file.size,
          headers,
          data,
          rowCount: data.length,
          columnCount: headers.length,
          columnTypes,
        });
      } catch (error) {
        reject(new Error('Failed to parse JSON file. The file may be corrupt or contain invalid syntax.'));
      }
    };
    reader.onerror = (error) => reject(new Error('Error reading file content. Please check the file and try again.'));
    reader.readAsArrayBuffer(file);
  });
};

export const processFile = (file: File, delimiter?: string): Promise<ParsedFile> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file);
  } else if (extension === 'csv') {
    return parseCsv(file, delimiter);
  } else if (extension === 'tsv') {
    return parseTsv(file);
  } else if (extension === 'json') {
    return parseJson(file);
  } else {
    return Promise.reject(new Error('Unsupported file format. Please upload .xlsx, .xls, .csv, .tsv, or .json. Note: All files are limited to 50MB.'));
  }
};

export const processWorkbook = (file: File): Promise<ParsedWorkbook> => {
    return new Promise((resolve, reject) => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension !== 'xlsx' && extension !== 'xls') {
            return reject(new Error('Unsupported file format for dashboards. Please upload an Excel (.xlsx, .xls) file.'));
        }
        
        if (file.size > LARGE_FILE_THRESHOLD) {
            return reject(new Error(`Excel file is too large (${(file.size / (1024*1024)).toFixed(1)}MB). Please split it into smaller files or use a CSV export under 50MB.`));
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheets: ParsedSheet[] = workbook.SheetNames.map(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);
                    
                    if (jsonData.length === 0) {
                        const headerRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                        const headers = (headerRows[0] as string[]) || [];
                        const columnTypes = analyzeColumnTypes([], headers);
                        return { sheetName, headers, data: [], columnTypes };
                    }
                    
                    const headers = Object.keys(jsonData[0] || {});
                    const columnTypes = analyzeColumnTypes(jsonData, headers);
                    return { sheetName, headers, data: jsonData, columnTypes };
                });

                if (sheets.length === 0) {
                    return reject(new Error('The Excel file contains no sheets.'));
                }

                resolve({
                    fileName: file.name,
                    size: file.size,
                    sheets,
                });
            } catch (error) {
                reject(new Error('Failed to parse Excel file. It may be corrupt or in an unsupported format.'));
            }
        };
        reader.onerror = () => reject(new Error('Error reading file content.'));
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Manually converts an array of objects to a delimited string (CSV, TSV), handling special characters and quoting.
 */
const manualUnparse = (data: Record<string, any>[], headers: string[], delimiter: string = ','): string => {
    const EOL = '\r\n'; // RFC 4180 specifies CRLF line endings

    const escapeField = (field: any): string => {
        const str = String(field ?? '');
        // If the field contains the delimiter, a double quote, or a newline, it must be enclosed in double quotes.
        const needsQuotes = str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r');
        if (needsQuotes) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const headerRow = headers.map(escapeField).join(delimiter);
    const bodyRows = data.map(row => 
        headers.map(header => escapeField(row[header])).join(delimiter)
    );

    return [headerRow, ...bodyRows].join(EOL);
};


interface SheetExport {
    title: string;
    data: Record<string, any>[];
}

export const exportTabsAsZip = async (tabs: SheetExport[], baseFileName: string): Promise<void> => {
    try {
        const zip = new JSZip();
        const validTabs = tabs.filter(tab => tab.data.length > 0);

        if (validTabs.length === 0) {
            console.warn("ZIP export cancelled because there was no data to export.");
            return;
        }

        for (const tab of validTabs) {
            const sanitizedTitle = tab.title.replace(/[\/*?:"<>|]/g, '').replace(/\s+/g, '_');
            const fileName = `${sanitizedTitle}.csv`;
            
            const allHeaders = Array.from(new Set(tab.data.flatMap(row => Object.keys(row))));
            const csvContent = manualUnparse(tab.data, allHeaders, ',');
            
            // Add BOM for better Excel compatibility with UTF-8
            zip.file(fileName, "\uFEFF" + csvContent);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement("a");
        const url = URL.createObjectURL(zipBlob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${baseFileName}_export.zip`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Error creating ZIP file:", error);
        alert("An error occurred while creating the ZIP file. Please check the console for details.");
    }
};

export const exportFile = (
    activeTabData: Record<string, any>[],
    fileName: string,
    format: 'xlsx' | 'csv' | 'tsv' | 'json',
    allTabs?: SheetExport[]
) => {
    if (format === 'xlsx') {
        const workbook = XLSX.utils.book_new();
        const tabsToExport = allTabs && allTabs.length > 0 ? allTabs : [{ title: "Processed Data", data: activeTabData }];
        
        tabsToExport.forEach(tab => {
            if (tab.data.length === 0) return; // Skip empty tabs

            const sanitizedSheetName = tab.title.replace(/[\/*?:"<>|]/g, '').substring(0, 31);
            const worksheet = XLSX.utils.json_to_sheet(tab.data);

            // Auto-calculate column widths
            const headers = Object.keys(tab.data[0] || {});
            const columnWidths = headers.map(header => {
                const maxLength = Math.max(
                    header.length,
                    ...tab.data.map(row => String(row[header] ?? '').length)
                );
                return { wch: Math.min(maxLength + 2, 60) }; // Set width, cap at 60 chars
            });
            worksheet['!cols'] = columnWidths;

            // Apply professional header styling
            const headerStyle = {
                font: { bold: true, color: { rgb: "FFFFFFFF" } },
                fill: { fgColor: { rgb: "FF4338CA" } }, // Indigo-700
                alignment: { vertical: 'center', horizontal: 'center' }
            };
            
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const address = XLSX.utils.encode_cell({ c: C, r: range.s.r });
                if (worksheet[address]) {
                    worksheet[address].s = headerStyle;
                }
            }

            XLSX.utils.book_append_sheet(workbook, worksheet, sanitizedSheetName);
        });
        
        if (workbook.SheetNames.length > 0) {
            XLSX.writeFile(workbook, fileName);
        } else {
            console.warn("XLSX export was cancelled because there was no data to export.");
        }

    } else if (format === 'csv' || format === 'tsv') {
        if (activeTabData.length === 0) {
            console.warn("Export attempted with no data.");
            return;
        }
        try {
            const delimiter = format === 'tsv' ? '\t' : ',';
            const allHeaders = Array.from(new Set(activeTabData.flatMap(row => Object.keys(row))));
            const content = manualUnparse(activeTabData, allHeaders, delimiter);

            const mimeType = format === 'tsv' ? 'text/tab-separated-values;charset=utf-8;' : 'text/csv;charset=utf-8;';
            const blob = new Blob(["\uFEFF" + content], { type: mimeType });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", fileName);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(`Error exporting to ${format.toUpperCase()}:`, error);
            alert(`An error occurred while creating the ${format.toUpperCase()} file. Please check the console for details.`);
        }
    } else if (format === 'json') {
        if (activeTabData.length === 0) {
            console.warn("Export attempted with no data.");
            return;
        }
        try {
            const jsonContent = JSON.stringify(activeTabData, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", fileName);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting to JSON:", error);
            alert("An error occurred while creating the JSON file. Please check the console for details.");
        }
    }
};