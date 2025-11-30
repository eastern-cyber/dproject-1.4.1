// src/app/users/a1/page.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

// Interface for A1 table data
interface A1Data {
  id: number;
  a1_id: string | null;
  user_id: string;
  rate_thb_pol: number | string;
  append_pol: number | string;
  append_pol_tx_hash: string | null;
  append_pol_date_time: string | null;
  remark: any | null;
  created_at: string;
  updated_at: string;
}

type SortField = 'a1_id' | 'user_id' | 'rate_thb_pol' | 'append_pol' | 'append_pol_date_time' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function A1Dashboard() {
  const [a1Data, setA1Data] = useState<A1Data[]>([]);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<A1Data | null>(null);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchA1Data();
  }, []);

  const fetchA1Data = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/a1-data');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.details || `HTTP error! status: ${response.status}`
        );
      }
      
      const data = await response.json();
      setA1Data(data || []);
    } catch (error) {
      console.error('Error fetching A1 data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch A1 data');
      setA1Data([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle retry
  const handleRetry = () => {
    fetchA1Data();
  };

  // Download CSV function
  const downloadCSV = async () => {
    try {
      setDownloading(true);
      
      let dataToDownload = a1Data;
      
      // If we have filtered data, fetch all data for complete export
      if (searchTerm) {
        const response = await fetch('/api/a1-data');
        if (!response.ok) {
          throw new Error('Failed to fetch A1 data for export');
        }
        const data = await response.json();
        dataToDownload = data || [];
      }
      
      // Define CSV headers for A1 data
      const headers = [
        'ID',
        'A1 ID',
        'User ID',
        'Rate THB/POL',
        'Append POL',
        'Append POL TX Hash',
        'Append POL Date Time',
        'Remark',
        'Created At',
        'Updated At'
      ];
      
      // Convert data to CSV rows
      const csvRows = dataToDownload.map((item) => [
        item.id,
        `"${item.a1_id || ''}"`,
        `"${item.user_id}"`,
        formatNumber(item.rate_thb_pol),
        formatNumber(item.append_pol),
        `"${item.append_pol_tx_hash || ''}"`,
        `"${item.append_pol_date_time ? new Date(item.append_pol_date_time).toLocaleString() : ''}"`,
        `"${JSON.stringify(item.remark) || ''}"`,
        `"${new Date(item.created_at).toLocaleString()}"`,
        `"${new Date(item.updated_at).toLocaleString()}"`
      ]);
      
      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `a1_data_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error downloading CSV:', error);
      setError(error instanceof Error ? error.message : 'Failed to download CSV');
    } finally {
      setDownloading(false);
    }
  };

  // Filter A1 data
  const filteredData = useMemo(() => {
    if (!a1Data || a1Data.length === 0) return [];
    
    let filtered = a1Data;
    
    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(record => {
        const a1IdMatch = record.a1_id?.toLowerCase().includes(term) || false;
        const userIdMatch = record.user_id?.toLowerCase().includes(term) || false;
        const txHashMatch = record.append_pol_tx_hash?.toLowerCase().includes(term) || false;
        
        return a1IdMatch || userIdMatch || txHashMatch;
      });
    }
    
    return filtered;
  }, [a1Data, searchTerm]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    
    return [...filteredData].sort((a, b) => {
      let aValue: any = a[sortField as keyof typeof a];
      let bValue: any = b[sortField as keyof typeof b];
      
      // Handle numeric fields that might be strings
      if (sortField === 'rate_thb_pol' || sortField === 'append_pol') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }
      
      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      // Handle null values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  // Helper function to safely convert to number and format
  const formatNumber = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return '0.00';
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  // Helper function to safely calculate total append POL from A1 data
  const calculateTotalAppendPOL = (): string => {
    if (!a1Data || a1Data.length === 0) return '0.00';
    
    const total = a1Data.reduce((sum, record) => {
      const appendPol = typeof record.append_pol === 'string' 
        ? parseFloat(record.append_pol) 
        : record.append_pol;
      return sum + (appendPol || 0);
    }, 0);
    
    return typeof total === 'number' ? total.toFixed(2) : '0.00';
  };

  // Helper function to safely calculate average rate from A1 data
  const calculateAverageRate = (): string => {
    if (!a1Data || a1Data.length === 0) return '0.00';
    
    let totalRate = 0;
    let rateCount = 0;
    
    a1Data.forEach(record => {
      const rate = typeof record.rate_thb_pol === 'string'
        ? parseFloat(record.rate_thb_pol)
        : record.rate_thb_pol;
      
      if (rate && !isNaN(rate)) {
        totalRate += rate;
        rateCount++;
      }
    });
    
    if (rateCount === 0) return '0.00';
    const average = totalRate / rateCount;
    return typeof average === 'number' ? average.toFixed(2) : '0.00';
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (!mounted) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">
        <Link href="/users" className="text-blue-600 hover:underline">← Back to Users</Link>
        <br />
        A1 Data Records (Avatar Plan A)
      </h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button
            onClick={handleRetry}
            className="ml-4 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}
      
      {loading && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-6">
          Loading A1 data...
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Records</h2>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {a1Data.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Append POL</h2>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {calculateTotalAppendPOL()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Avg Rate THB/POL</h2>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {calculateAverageRate()}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search A1 records by A1 ID, user ID or transaction hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Show:</span>
              <span className="font-medium">{filteredData.length} records</span>
            </div>
            {/* <button
              onClick={downloadCSV}
              disabled={downloading || a1Data.length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {downloading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Download CSV
                </>
              )}
            </button> */}
          </div>
        </div>
      </div>

      {/* A1 Data Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">A1 Records (Avatar Plan A)</h2>
        
        {!loading && a1Data.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No A1 data found in the database</p>
            <button
              onClick={handleRetry}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        )}
        
        {a1Data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th 
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('a1_id')}
                    >
                      A1 ID {sortField === 'a1_id' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('user_id')}
                    >
                      User ID {sortField === 'user_id' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('rate_thb_pol')}
                    >
                      Rate THB/POL {sortField === 'rate_thb_pol' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('append_pol')}
                    >
                      Append POL {sortField === 'append_pol' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-2 text-left">TX Hash</th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('append_pol_date_time')}
                    >
                      Date {sortField === 'append_pol_date_time' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-2 text-left">Remark</th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('created_at')}
                    >
                      Created {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">
                      <td className="px-4 py-2 font-mono text-sm">
                        {record.a1_id || 'N/A'}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer text-left font-mono text-sm"
                        >
                          {record.user_id}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {formatNumber(record.rate_thb_pol)}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {formatNumber(record.append_pol)}
                      </td>
                      <td className="px-4 py-2 font-mono text-sm">
                        {record.append_pol_tx_hash || 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {record.append_pol_date_time ? new Date(record.append_pol_date_time).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {record.remark ? JSON.stringify(record.remark) : 'N/A'}
                      </td>
                      <td className="px-4 py-2">
                        {new Date(record.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {paginatedData.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                {searchTerm ? 'No records match your search' : 'No records found'}
              </p>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <nav className="flex items-center gap-1">
                  {/* First Page Button */}
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    aria-label="First page"
                  >
                    &lt;&lt;
                  </button>
                  
                  {/* Previous Page Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    aria-label="Previous page"
                  >
                    &lt;
                  </button>
                  
                  {/* Page number buttons - Show max 3 pages */}
                  {(() => {
                    const maxVisiblePages = 3;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                    
                    // Adjust if we're near the end
                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }
                    
                    const pages = [];
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          className={`px-3 py-1 rounded-md text-sm ${
                            currentPage === i
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                          }`}
                          aria-label={`Page ${i}`}
                          aria-current={currentPage === i ? 'page' : undefined}
                        >
                          {i}
                        </button>
                      );
                    }
                    return pages;
                  })()}
                  
                  {/* Next Page Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    aria-label="Next page"
                  >
                    &gt;
                  </button>
                  
                  {/* Last Page Button */}
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    aria-label="Last page"
                  >
                    &gt;&gt;
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedRecord(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">A1 Record Details (Avatar Plan A)</h2>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 underline">Basic Information</h3>
                  <dl className="mt-2 space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">ID</dt>
                      <dd className="text-sm">{selectedRecord.id}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">A1 ID</dt>
                      <dd className="font-mono text-sm">{selectedRecord.a1_id || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">User ID</dt>
                      <dd className="font-mono text-sm">{selectedRecord.user_id}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Rate THB/POL</dt>
                      <dd className="text-sm">{formatNumber(selectedRecord.rate_thb_pol)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Append POL</dt>
                      <dd className="text-sm">{formatNumber(selectedRecord.append_pol)}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 underline">Transaction Details</h3>
                  <dl className="mt-2 space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">TX Hash</dt>
                      <dd className="font-mono text-sm break-all">{selectedRecord.append_pol_tx_hash || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Date Time</dt>
                      <dd className="text-sm">
                        {selectedRecord.append_pol_date_time 
                          ? new Date(selectedRecord.append_pol_date_time).toLocaleString()
                          : 'N/A'
                        }
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Remark</dt>
                      <dd className="text-sm font-mono text-xs break-all">
                        {selectedRecord.remark ? JSON.stringify(selectedRecord.remark, null, 2) : 'N/A'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 underline">Timestamps</h3>
                <dl className="mt-2 space-y-2">
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Created At</dt>
                    <dd className="text-sm">{new Date(selectedRecord.created_at).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Updated At</dt>
                    <dd className="text-sm">{new Date(selectedRecord.updated_at).toLocaleString()}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Visualization */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Data Visualization</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Append POL Distribution</h3>
            <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">POL Chart Visualization</p>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Rate Distribution</h3>
            <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Rate Chart Visualization</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className='w-full mt-8'>
        <Footer />
      </div>
    </div>
  );
}