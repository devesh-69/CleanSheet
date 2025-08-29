
import { ParsedFile } from '../types';

declare const XLSX: any;
declare const Papa: any;

const parseExcel = (file: File): Promise<ParsedFile> => {
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

          resolve({
            name: file.name,
            size: file.size,
            headers: headers,
            data: [],
            rowCount: 0,
            columnCount: headers.length,
          });
          return;
        }

        const headers = Object.keys(jsonData[0]);
        resolve({
          name: file.name,
          size: file.size,
          headers,
          data: jsonData,
          rowCount: jsonData.length,
          columnCount: headers.length,
        });
      } catch (error) {
        reject(new Error('Failed to parse Excel file. The file may be corrupt or in an unsupported format.'));
      }
    };
    reader.onerror = (error) => reject(new Error('Error reading file content. Please check the file and try again.'));
    reader.readAsArrayBuffer(file);
  });
};

const parseCsv = (file: File): Promise<ParsedFile> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        if (results.errors && results.errors.length > 0) {
          const firstError = results.errors[0];
          // Adding 2 to row index: 1 for 0-based index, 1 for header row.
          return reject(new Error(`CSV parsing error: ${firstError.message} (at row ${firstError.row + 2})`));
        }

        const data = results.data;
        const headers = results.meta.fields || [];

        if (data.length === 0) {
            resolve({
              name: file.name,
              size: file.size,
              headers: headers,
              data: [],
              rowCount: 0,
              columnCount: headers.length,
            });
            return;
        }

        resolve({
          name: file.name,
          size: file.size,
          headers,
          data,
          rowCount: data.length,
          columnCount: headers.length,
        });
      },
      error: (error: Error) => {
        reject(new Error('Failed to read CSV file. Please check the file and try again.'));
      },
    });
  });
};

export const processFile = (file: File): Promise<ParsedFile> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file);
  } else if (extension === 'csv') {
    return parseCsv(file);
  } else {
    return Promise.reject(new Error('Unsupported file format. Please upload .xlsx, .xls, or .csv'));
  }
};

export const exportFile = (data: Record<string, any>[], fileName: string, format: 'xlsx' | 'csv') => {
    if (data.length === 0) {
        console.warn("Export attempted with no data.");
        return;
    }

    if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cleaned Data");
        XLSX.writeFile(workbook, fileName);
    } else if (format === 'csv') {
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
