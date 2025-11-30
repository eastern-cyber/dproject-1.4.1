// src/app/users/page.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

interface User {
  id: number;
  user_id: string;
  referrer_id: string | null;
  email: string | null;
  name: string | null;
  token_id: string | null;
  plan_a: {
    dateTime?: string;
    POL?: number;
    rateTHBPOL?: number;
    txHash?: string;
    status?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

// Add interface for API response data
interface ApiUser {
  id: number;
  user_id: string;
  referrer_id: string | null;
  email: string | null;
  name: string | null;
  token_id: string | null;
  plan_a: {
    dateTime?: string;
    POL?: number;
    rateTHBPOL?: number;
    txHash?: string;
    status?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

type SortField = 'token_id' | 'user_id' | 'email' | 'name' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({ total: 0, loading: true });
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchUsers();
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.details || `HTTP error! status: ${response.status}`
        );
      }
      
      const data = await response.json();
      
      // FIXED: Use proper typing instead of 'any'
      const usersWithPlan = data.map((user: ApiUser) => ({
        ...user,
        plan_a: user.plan_a || null
      }));
      
      setUsers(usersWithPlan || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setStats({ ...data, loading: false });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle retry
  const handleRetry = () => {
    fetchUsers();
    fetchStats();
  };
  
  // Add status filter state
  const [statusFilter, _setStatusFilter] = useState('all');

  // Download CSV function
  const downloadCSV = async () => {
    try {
      setDownloading(true);
      
      // If we already have all users, use them. Otherwise, fetch all users for download
      let usersToDownload = users;
      
      // If we have filtered users (due to search), use all users from the database for complete export
      if (searchTerm || statusFilter !== 'all') {
        const response = await fetch('/api/users');
        if (!response.ok) {
          throw new Error('Failed to fetch users for export');
        }
        const data = await response.json();
        usersToDownload = data.map((user: ApiUser) => ({
          ...user,
          plan_a: user.plan_a || null
        }));
      }
      
      // Define CSV headers
      const headers = [
        'ID',
        'User ID',
        'Token ID',
        'Email',
        'Name',
        'Referrer ID',
        'Plan A Date',
        'Plan A POL',
        'Plan A Rate (THB/POL)',
        'Plan A TX Hash',
        'Plan A Status',
        'Created At',
        'Updated At'
      ];
      
      // Convert users to CSV rows
      const csvRows = usersToDownload.map(user => [
        user.id,
        `"${user.user_id}"`, // Wrap in quotes to handle special characters
        `"${user.token_id || ''}"`,
        `"${user.email || ''}"`,
        `"${user.name || ''}"`,
        `"${user.referrer_id || ''}"`,
        `"${user.plan_a?.dateTime || ''}"`,
        user.plan_a?.POL || '',
        user.plan_a?.rateTHBPOL || '',
        `"${user.plan_a?.txHash || ''}"`,
        `"${user.plan_a?.status || ''}"`,
        `"${new Date(user.created_at).toLocaleString()}"`,
        `"${new Date(user.updated_at).toLocaleString()}"`
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
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
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

  // Update filteredUsers to include status filtering
  // Make sure to actually use statusFilter in your filteredUsers logic
  const filteredUsers = useMemo(() => {
    if (!users || users.length === 0) return [];
    
    let filtered = users;
    
    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => {
        const userIdMatch = user.user_id?.toLowerCase().includes(term) || false;
        const emailMatch = user.email?.toLowerCase().includes(term) || false;
        const nameMatch = user.name?.toLowerCase().includes(term) || false;
        const tokenIdMatch = user.token_id?.toLowerCase().includes(term) || false;
        const referrerMatch = user.referrer_id?.toLowerCase().includes(term) || false;
        
        return userIdMatch || emailMatch || nameMatch || tokenIdMatch || referrerMatch;
      });
    }
    
    // Apply status filter - ACTUALLY USE statusFilter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => 
        user.plan_a?.status === statusFilter
      );
    }
  
    return filtered;
  }, [users, searchTerm, statusFilter]); // Add statusFilter to dependencies

  // Sort users
  const sortedUsers = useMemo(() => {
    if (!filteredUsers || filteredUsers.length === 0) return [];
    
    return [...filteredUsers].sort((a, b) => {
      let aValue: string | number | null = a[sortField];
      let bValue: string | number | null = b[sortField];
      
      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      // Handle null values
      if (aValue === null) aValue = '';
      if (bValue === null) bValue = '';
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedUsers, currentPage, itemsPerPage]);

  // Helper function to safely convert to number and format
  const formatNumber = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return '0.00';
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  // MODIFIED: Calculate average POL per user instead of total POL
  const calculateAveragePOL = () => {
    if (!users || users.length === 0) return '0.00';
    
    const total = users.reduce((sum, user) => {
      let userPol = 0;
      
      // Add POL from plan_a if it exists
      if (user.plan_a && user.plan_a.POL) {
        userPol += typeof user.plan_a.POL === 'string' ? parseFloat(user.plan_a.POL) : user.plan_a.POL;
      }
      
      return sum + userPol;
    }, 0);
    
    // Calculate average by dividing total by number of users
    const average = total / users.length;
    return average.toFixed(2);
  };

  // Helper function to safely calculate average rate from plan_a
  const calculateAverageRate = () => {
    if (!users || users.length === 0) return '0.00';
    
    let totalRate = 0;
    let rateCount = 0;
    
    users.forEach(user => {
      // Add rate from plan_a if it exists
      if (user.plan_a && user.plan_a.rateTHBPOL) {
        const rate = typeof user.plan_a.rateTHBPOL === 'string' ? 
          parseFloat(user.plan_a.rateTHBPOL) : user.plan_a.rateTHBPOL;
        totalRate += rate;
        rateCount++;
      }
    });
    
    if (rateCount === 0) return '0.00';
    return (totalRate / rateCount).toFixed(2);
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

  if (!mounted || stats.loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8"><Link href="/">รายละเอียดและสถิติผู้ใช้งาน</Link></h1>
      
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
          Loading users...
        </div>
      )}

      {/* Rest of the component remains exactly the same */}
      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users by email, name, token, or referrer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Show:</span>
              <span className="font-medium">{filteredUsers.length} users</span>
            </div>
            {/* <button
              onClick={downloadCSV}
              disabled={downloading || users.length === 0}
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
            </button> */}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Users</h2>
        
        {!loading && users.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No users found in the database</p>
            <button
              onClick={handleRetry}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        )}
        
        {users.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th 
                      className="px-4 py-2 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('token_id')}
                    >
                      Token ID {sortField === 'token_id' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('user_id')}
                    >
                      User ID <br />&#9655;WalletAddress {sortField === 'user_id' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('email')}
                    >
                      Email {sortField === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('name')}
                    >
                      Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-2 text-left">Referrer</th>
                    
                    {/* Plan A Header with Sub-columns - Removed Plan B */}
                    <th colSpan={4} className="px-4 py-2 text-center bg-gray-100 dark:bg-gray-600">
                      PlanA Details
                    </th>
                    
                    <th 
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('created_at')}
                    >
                      Created {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                  
                  {/* Sub-header row for Plan details */}
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    {/* Empty cells for previous columns */}
                    <th colSpan={5} className="px-4 py-2"></th>
                    
                    {/* Plan Sub-columns */}
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-600 dark:text-gray-300">POL</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Rate</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Date</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-600 dark:text-gray-300">Status</th>
                    
                    {/* Empty cell for remaining column */}
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">
                      <td className="px-4 py-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer text-left"
                        >
                          {user.token_id || 'N/A'}
                        </button>
                      </td>
                      <td className="px-4 py-2 font-mono text-sm">{user.user_id}</td>
                      <td className="px-4 py-2">{user.email || 'N/A'}</td>
                      <td className="px-4 py-2">{user.name || 'N/A'}</td>
                      <td className="px-4 py-2 font-mono text-sm">
                        {user.referrer_id || 'None'}
                      </td>
                      
                      {/* Plan Data Cells - Removed Plan B */}
                      <td className="px-2 py-2 text-sm">
                        {user.plan_a ? formatNumber(user.plan_a.POL) : 'N/A'}
                      </td>
                      <td className="px-2 py-2 text-sm">
                        {user.plan_a ? formatNumber(user.plan_a.rateTHBPOL) : 'N/A'}
                      </td>
                      <td className="px-2 py-2 text-sm">
                        {user.plan_a?.dateTime ? new Date(user.plan_a.dateTime).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-2 py-2 text-sm">
                        {user.plan_a?.status || 'N/A'}
                      </td>
                      
                      <td className="px-4 py-2">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {paginatedUsers.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                {searchTerm ? 'No users match your search' : 'No users found'}
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
                  
                  {/* Page number buttons - Show max 10 pages */}
                  {(() => {
                    const maxVisiblePages = 3;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                    
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

      {/* User Detail Modal */}
      {selectedUser && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedUser(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">User Details</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 underline">Basic Information</h3>
                  <dl className="mt-2 space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Token ID</dt>
                      <dd className="text-sm font-mono">{selectedUser.token_id || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">User ID &#9655;WalletAddress</dt>
                      <dd className="font-mono text-sm">{selectedUser.user_id}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Email</dt>
                      <dd className="text-sm">{selectedUser.email || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Name</dt>
                      <dd className="text-sm">{selectedUser.name || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Referrer</dt>
                      <dd className="font-mono text-sm">{selectedUser.referrer_id || 'None'}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 underline">Timestamps</h3>
                  <dl className="mt-2 space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Created At</dt>
                      <dd className="text-sm">{new Date(selectedUser.created_at).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Updated At</dt>
                      <dd className="text-sm">{new Date(selectedUser.updated_at).toLocaleString()}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              
              {selectedUser.plan_a && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 underline">Plan A Details</h3>
                  <dl className="mt-2 space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Date Time</dt>
                      <dd className="text-sm">{selectedUser.plan_a.dateTime || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">POL</dt>
                      <dd className="text-sm">{formatNumber(selectedUser.plan_a.POL)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Rate THB/POL</dt>
                      <dd className="text-sm">{formatNumber(selectedUser.plan_a.rateTHBPOL)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Transaction Hash</dt>
                      <dd className="text-sm font-mono">{selectedUser.plan_a.txHash || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Users</h2>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          {/* MODIFIED: Changed title from "Total POL" to "Average POL" */}
          <h2 className="text-xl font-semibold mb-2">Average POL</h2>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {/* MODIFIED: Using calculateAveragePOL instead of calculateTotalPOL */}
            {calculateAveragePOL()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Avg Rate</h2>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {calculateAverageRate()}
          </p>
        </div>
      </div>

      {/* Data Visualization */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Data Visualization</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">POL Distribution</h3>
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