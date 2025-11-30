// src/app/bonus/page.tsx

'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

interface BonusUser {
  id: number;
  user_id: string;
  pr_a: number | string;
  pr_b: number | string;
  cr: number | string;
  rt: number | string;
  ar: number | string;
  token_id: string | null;
  name: string | null;
  email: string | null;
  referrer_id: string | null;
  bonus_date: string;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

type SortField = 'token_id' | 'user_id' | 'name' | 'email' | 'ar' | 'cr' | 'rt' | 'pr_a' | 'pr_b';
type SortDirection = 'asc' | 'desc';

export default function BonusPage() {
  const [bonusUsers, setBonusUsers] = useState<BonusUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Changed default sort field to token_id
  const [sortField, setSortField] = useState<SortField>('token_id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedUser, setSelectedUser] = useState<BonusUser | null>(null);
  const [mounted, setMounted] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    setMounted(true);
    fetchBonusData();
  }, []);

  const fetchBonusData = async (page: number = 1, search: string = '') => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        ...(search && { search })
      });

      const response = await fetch(`/api/bonus?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.details || `HTTP error! status: ${response.status}`
        );
      }
      
      const data = await response.json();
      
      setBonusUsers(Array.isArray(data.data) ? data.data : []);
      
      setPagination({
        currentPage: data.pagination?.currentPage || 1,
        totalPages: data.pagination?.totalPages || 1,
        totalCount: data.pagination?.totalCount || 0,
        hasNext: data.pagination?.hasNext || false,
        hasPrev: data.pagination?.hasPrev || false
      });
      
    } catch (error) {
      console.error('Error fetching bonus data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch bonus data');
      setBonusUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchBonusData(1, term);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc'); // Default to ascending when changing sort field
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
    fetchBonusData(page, searchTerm);
  };

  const sortedUsers = useMemo(() => {
    const usersArray = Array.isArray(bonusUsers) ? bonusUsers : [];
    
    return [...usersArray].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';
      
      // Handle numeric fields
      if (['pr_a', 'pr_b', 'cr', 'rt', 'ar'].includes(sortField)) {
        aValue = typeof aValue === 'string' ? parseFloat(aValue) : aValue;
        bValue = typeof bValue === 'string' ? parseFloat(bValue) : bValue;
        
        if (isNaN(aValue as number)) aValue = 0;
        if (isNaN(bValue as number)) bValue = 0;
        
        // Numeric comparison
        if (sortDirection === 'asc') {
          return (aValue as number) - (bValue as number);
        } else {
          return (bValue as number) - (aValue as number);
        }
      }
      
      // Handle string comparison for text fields (token_id, user_id, name, email)
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [bonusUsers, sortField, sortDirection]);

  const formatNumber = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return '0.0000';
    
    try {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      
      if (isNaN(numValue) || !isFinite(numValue)) return '0.0000';
      
      return numValue.toFixed(4);
    } catch (error) {
      return '0.0000';
    }
  };

  const formatCurrency = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return '0.00';
    
    try {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      
      if (isNaN(numValue) || !isFinite(numValue)) return '0.00';
      
      return numValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } catch (error) {
      return '0.00';
    }
  };

  const totalPR_A = useMemo(() => {
    const usersArray = Array.isArray(bonusUsers) ? bonusUsers : [];
    return usersArray.reduce((sum, user) => {
      const pr_aValue = typeof user.pr_a === 'string' ? parseFloat(user.pr_a) : user.pr_a;
      return sum + (pr_aValue || 0);
    }, 0);
  }, [bonusUsers]);

  const totalPR_B = useMemo(() => {
    const usersArray = Array.isArray(bonusUsers) ? bonusUsers : [];
    return usersArray.reduce((sum, user) => {
      const pr_bValue = typeof user.pr_b === 'string' ? parseFloat(user.pr_b) : user.pr_b;
      return sum + (pr_bValue || 0);
    }, 0);
  }, [bonusUsers]);

  const totalCR = useMemo(() => {
    const usersArray = Array.isArray(bonusUsers) ? bonusUsers : [];
    return usersArray.reduce((sum, user) => {
      const crValue = typeof user.cr === 'string' ? parseFloat(user.cr) : user.cr;
      return sum + (crValue || 0);
    }, 0);
  }, [bonusUsers]);

  const totalRT = useMemo(() => {
    const usersArray = Array.isArray(bonusUsers) ? bonusUsers : [];
    return usersArray.reduce((sum, user) => {
      const rtValue = typeof user.rt === 'string' ? parseFloat(user.rt) : user.rt;
      return sum + (rtValue || 0);
    }, 0);
  }, [bonusUsers]);

  const totalAR = useMemo(() => {
    const usersArray = Array.isArray(bonusUsers) ? bonusUsers : [];
    return usersArray.reduce((sum, user) => {
      const arValue = typeof user.ar === 'string' ? parseFloat(user.ar) : user.ar;
      return sum + (arValue || 0);
    }, 0);
  }, [bonusUsers]);

  if (!mounted) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">
        <Link href="/">Bonus Distribution Dashboard</Link>
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button
            onClick={() => fetchBonusData()}
            className="ml-4 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total <br /> Bonus Receivers</h2>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {pagination.totalCount}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total <br /> PR Bonus <br /> Plan A</h2>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {formatCurrency(totalPR_A)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total <br /> PR Bonus <br /> Plan B</h2>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {formatCurrency(totalPR_B)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total CR <br /> Caring <br /> Bonus</h2>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {formatCurrency(totalCR)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total RT <br /> Return <br /> Bonus</h2>
          <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">
            {formatCurrency(totalRT)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total AR <br /> AutoRun Bonus</h2>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalAR)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by Token ID, Name, Email, or Wallet Address..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Total:</span>
            <span className="font-medium">{pagination.totalCount} users</span>
          </div>
        </div>
      </div>

      {/* Bonus Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Bonus Distribution</h2>
        
        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Loading bonus data...</p>
          </div>
        )}

        {!loading && bonusUsers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm ? 'No bonus records match your search' : 'No bonus records found'}
            </p>
            <button
              onClick={() => fetchBonusData()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        )}

        {!loading && bonusUsers.length > 0 && (
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
                      Wallet Address {sortField === 'user_id' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('name')}
                    >
                      Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('email')}
                    >
                      Email {sortField === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="w-12 px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('pr_a')}
                    >
                      PR PlanA {sortField === 'pr_a' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="w-12 px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('pr_b')}
                    >
                      PR PlanB {sortField === 'pr_b' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('cr')}
                    >
                      CR {sortField === 'cr' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('rt')}
                    >
                      RT {sortField === 'rt' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('ar')}
                    >
                      AR {sortField === 'ar' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((user) => (
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
                      <td className="px-4 py-2">{user.name || 'N/A'}</td>
                      <td className="px-4 py-2">{user.email || 'N/A'}</td>
                      <td className="px-4 py-2 text-right">{formatNumber(user.pr_a)}</td>
                      <td className="px-4 py-2 text-right">{formatNumber(user.pr_b)}</td>
                      <td className="px-4 py-2 text-right">{formatNumber(user.cr)}</td>
                      <td className="px-4 py-2 text-right">{formatNumber(user.rt)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-green-600 dark:text-green-400">
                        {formatNumber(user.ar)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <nav className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.currentPage === 1}
                    className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    &lt;&lt;
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    &lt;
                  </button>
                  
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(pagination.currentPage - 2, pagination.totalPages - 4)) + i;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 rounded-md text-sm ${
                          pagination.currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    &gt;
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Bonus Details</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">User Information</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Token ID</dt>
                      <dd className="text-sm">{selectedUser.token_id || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Wallet Address</dt>
                      <dd className="text-sm font-mono">{selectedUser.user_id}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Name</dt>
                      <dd className="text-sm">{selectedUser.name || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Email</dt>
                      <dd className="text-sm">{selectedUser.email || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Bonus Details</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">PR Plan A</dt>
                      <dd className="text-sm">{formatNumber(selectedUser.pr_a)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">PR Plan B</dt>
                      <dd className="text-sm">{formatNumber(selectedUser.pr_b)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">CR</dt>
                      <dd className="text-sm">{formatNumber(selectedUser.cr)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">RT</dt>
                      <dd className="text-sm">{formatNumber(selectedUser.rt)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">AR</dt>
                      <dd className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatNumber(selectedUser.ar)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Bonus Date</dt>
                      <dd className="text-sm">{selectedUser.bonus_date}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Calculated At</dt>
                      <dd className="text-sm">{new Date(selectedUser.calculated_at).toLocaleString()}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className='w-full mt-8'>
        <Footer />
      </div>
    </div>
  );
}