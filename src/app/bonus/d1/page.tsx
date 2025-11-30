// src/app/bonus/d1/page.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface BonusRecord {
  id: number;
  user_id: string;
  pr: number;
  ar: number;
  bonus_date: string;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

type SortField = 'id' | 'user_id' | 'pr' | 'ar' | 'bonus_date' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function BonusDashboard() {
  const [bonusRecords, setBonusRecords] = useState<BonusRecord[]>([]);
  const [stats, setStats] = useState({ 
    total: 0, 
    totalPR: 0, 
    totalAR: 0,
    loading: true 
  });
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<BonusRecord | null>(null);
  const [itemsPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchBonusRecords();
  }, []);

  const fetchBonusRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/bonus/d1');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.details || `HTTP error! status: ${response.status}`
        );
      }
      
      const data = await response.json();
      setBonusRecords(data.records || []);
      
      // Calculate stats with proper number conversion
      if (data.records && data.records.length > 0) {
        const totalPR = data.records.reduce((sum: number, record: BonusRecord) => {
          const prValue = typeof record.pr === 'string' ? parseFloat(record.pr) : record.pr;
          return sum + (isNaN(prValue) ? 0 : prValue);
        }, 0);
        
        const totalAR = data.records.reduce((sum: number, record: BonusRecord) => {
          const arValue = typeof record.ar === 'string' ? parseFloat(record.ar) : record.ar;
          return sum + (isNaN(arValue) ? 0 : arValue);
        }, 0);
        
        setStats({
          total: data.records.length,
          totalPR,
          totalAR,
          loading: false
        });
      } else {
        setStats(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error fetching bonus records:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch bonus records');
      setBonusRecords([]);
      setStats(prev => ({ ...prev, loading: false }));
    } finally {
      setLoading(false);
    }
  };

  // Handle retry
  const handleRetry = () => {
    fetchBonusRecords();
  };

  // Download CSV function
  const downloadCSV = async () => {
    try {
      setDownloading(true);
      
      // If we already have all records, use them. Otherwise, fetch all records for download
      let recordsToDownload = bonusRecords;
      
      // If we have filtered records (due to search), use all records from the database for complete export
      if (searchTerm) {
        const response = await fetch('/api/bonus/d1');
        if (!response.ok) {
          throw new Error('Failed to fetch bonus records for export');
        }
        const data = await response.json();
        recordsToDownload = data.records || [];
      }
      
      // Define CSV headers
      const headers = [
        'ID',
        'User ID',
        'PR Bonus',
        'AR Bonus',
        'Total Bonus',
        'Bonus Date',
        'Calculated At',
        'Created At',
        'Updated At'
      ];
      
      // Convert records to CSV rows
      const csvRows = recordsToDownload.map(record => [
        record.id,
        `"${record.user_id}"`, // Wrap in quotes to handle special characters
        record.pr,
        record.ar,
        (record.pr + record.ar).toFixed(4),
        `"${new Date(record.bonus_date).toLocaleDateString()}"`,
        `"${new Date(record.calculated_at).toLocaleString()}"`,
        `"${new Date(record.created_at).toLocaleString()}"`,
        `"${new Date(record.updated_at).toLocaleString()}"`
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
      link.setAttribute('download', `bonus_records_export_${new Date().toISOString().split('T')[0]}.csv`);
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

  // Filter records based on search term
  const filteredRecords = useMemo(() => {
    if (!bonusRecords || bonusRecords.length === 0) return [];
    
    if (!searchTerm) return bonusRecords;
    
    const term = searchTerm.toLowerCase();
    return bonusRecords.filter(record => {
      const userIdMatch = record.user_id?.toLowerCase().includes(term) || false;
      const idMatch = record.id.toString().includes(term);
      
      return userIdMatch || idMatch;
    });
  }, [bonusRecords, searchTerm]);

  // Sort records
  const sortedRecords = useMemo(() => {
    if (!filteredRecords || filteredRecords.length === 0) return [];
    
    return [...filteredRecords].sort((a, b) => {
      let aValue: string | number | null = a[sortField];
      let bValue: string | number | null = b[sortField];
      
      // Handle numeric comparison for PR and AR
      if (sortField === 'pr' || sortField === 'ar') {
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
      
      // Handle string comparison for other fields
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      // Handle date comparison
      if (sortField === 'bonus_date' || sortField === 'created_at') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }
      
      // Handle null values
      if (aValue === null) aValue = '';
      if (bValue === null) bValue = '';
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedRecords, currentPage, itemsPerPage]);

  // Format currency
  const formatCurrency = (value: number | string): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue as number)) {
      return '0.00';
    }
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue as number);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format datetime
  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  // Calculate totals for current page
  const pageTotals = useMemo(() => {
    const pagePR = paginatedRecords.reduce((sum, record) => {
      const prValue = typeof record.pr === 'string' ? parseFloat(record.pr) : record.pr;
      return sum + (isNaN(prValue) ? 0 : prValue);
    }, 0);
    
    const pageAR = paginatedRecords.reduce((sum, record) => {
      const arValue = typeof record.ar === 'string' ? parseFloat(record.ar) : record.ar;
      return sum + (isNaN(arValue) ? 0 : arValue);
    }, 0);
    
    return { pagePR, pageAR };
  }, [paginatedRecords]);

  if (!mounted) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link 
          href="/bonus" 
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to Bonus
        </Link>
        <h1 className="text-3xl font-bold">D1 Bonus Records</h1>
      </div>
      
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
          Loading bonus records...
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Records</h2>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {stats.loading ? '...' : stats.total}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total PR</h2>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats.loading ? '...' : formatCurrency(stats.totalPR)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total AR</h2>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {stats.loading ? '...' : formatCurrency(stats.totalAR)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Bonus</h2>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {stats.loading ? '...' : formatCurrency(stats.totalPR + stats.totalAR)}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by user ID or record ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Show:</span>
              <span className="font-medium">{filteredRecords.length} records</span>
            </div>
            <button
              onClick={downloadCSV}
              disabled={downloading || bonusRecords.length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            </button>
            <button
              onClick={fetchBonusRecords}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Bonus Records Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Bonus Records</h2>
        </div>
        
        {!loading && bonusRecords.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4 text-lg">No bonus records found</p>
            <button
              onClick={handleRetry}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Refresh Data
            </button>
          </div>
        )}
        
        {bonusRecords.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('id')}
                    >
                      ID {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('user_id')}
                    >
                      User ID {sortField === 'user_id' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('pr')}
                    >
                      PR Bonus {sortField === 'pr' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('ar')}
                    >
                      AR Bonus {sortField === 'ar' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Total Bonus
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('bonus_date')}
                    >
                      Bonus Date {sortField === 'bonus_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('created_at')}
                    >
                      Created {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedRecords.map((record) => (
                    <tr 
                      key={record.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {record.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-700 dark:text-gray-300">
                        {record.user_id}
                      </td>
                      {/* In the table row, update the PR and AR cells: */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400 font-medium">
                        {formatCurrency(record.pr)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-orange-600 dark:text-orange-400 font-medium">
                        {formatCurrency(record.ar)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-purple-600 dark:text-purple-400 font-bold">
                        {(() => {
                          const prValue = typeof record.pr === 'string' ? parseFloat(record.pr) : record.pr;
                          const arValue = typeof record.ar === 'string' ? parseFloat(record.ar) : record.ar;
                          const total = (isNaN(prValue) ? 0 : prValue) + (isNaN(arValue) ? 0 : arValue);
                          return formatCurrency(total);
                        })()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(record.bonus_date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(record.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Page Totals Footer */}
                {paginatedRecords.length > 0 && (
                  <tfoot className="bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-200 dark:border-gray-600">
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white" colSpan={2}>
                        Page Totals:
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(pageTotals.pagePR)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-orange-600 dark:text-orange-400">
                        {formatCurrency(pageTotals.pageAR)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-purple-600 dark:text-purple-400">
                        {formatCurrency(pageTotals.pagePR + pageTotals.pageAR)}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            
            {paginatedRecords.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'No records match your search' : 'No records to display'}
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, sortedRecords.length)}
                    </span> of{' '}
                    <span className="font-medium">{sortedRecords.length}</span> results
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      &lt;
                    </button>
                    <span className="px-3 py-1 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
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
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Bonus Record Details</h2>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-gray-700 dark:text-gray-300 border-b pb-2">
                    Record Information
                  </h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Record ID</dt>
                      <dd className="text-lg font-mono font-bold">{selectedRecord.id}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">User ID</dt>
                      <dd className="text-sm font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded break-all">
                        {selectedRecord.user_id}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Bonus Date</dt>
                      <dd className="text-lg">{formatDate(selectedRecord.bonus_date)}</dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-gray-700 dark:text-gray-300 border-b pb-2">
                    Bonus Amounts
                  </h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">PR Bonus</dt>
                      <dd className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(selectedRecord.pr)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">AR Bonus</dt>
                      <dd className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {formatCurrency(selectedRecord.ar)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Bonus</dt>
                      <dd className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {formatCurrency(selectedRecord.pr + selectedRecord.ar)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-3 text-gray-700 dark:text-gray-300 border-b pb-2">
                  Timestamps
                </h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Calculated At</dt>
                    <dd className="text-sm">{formatDateTime(selectedRecord.calculated_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</dt>
                    <dd className="text-sm">{formatDateTime(selectedRecord.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Updated At</dt>
                    <dd className="text-sm">{formatDateTime(selectedRecord.updated_at)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}