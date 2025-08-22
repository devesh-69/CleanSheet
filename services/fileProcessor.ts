
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
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          resolve({
            name: file.name,
            size: file.size,
            headers: [],
            data: [],
            rowCount: 0,
            columnCount: 0,
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
        reject(new Error('Failed to parse Excel file.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

const parseCsv = (file: File): Promise<ParsedFile> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const data = results.data;
        if (data.length === 0) {
            resolve({
              name: file.name,
              size: file.size,
              headers: [],
              data: [],
              rowCount: 0,
              columnCount: 0,
            });
            return;
        }
        const headers = results.meta.fields;
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
        reject(new Error('Failed to parse CSV file: ' + error.message));
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
