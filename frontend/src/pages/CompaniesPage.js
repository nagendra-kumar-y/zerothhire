import React, { useEffect, useState } from 'react';
import { companiesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FiSearch, FiTrash2 } from 'react-icons/fi';

const CompaniesPage = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await companiesAPI.getAll();
      setCompanies(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    
    try {
      await companiesAPI.delete(id);
      toast.success('Company deleted');
      fetchCompanies();
    } catch (error) {
      toast.error('Failed to delete company');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Companies</h1>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search companies..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Company Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">CEO</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Industry</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Jobs Posted</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Conversions</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center">Loading...</td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No companies found</td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr key={company._id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold">{company.name}</td>
                  <td className="px-6 py-4">{company.ceo?.name || '-'}</td>
                  <td className="px-6 py-4">{company.industry || '-'}</td>
                  <td className="px-6 py-4">{company.jobsPosted || 0}</td>
                  <td className="px-6 py-4">{company.conversions || 0}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(company._id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CompaniesPage;
