import React, { useEffect, useState, useCallback } from 'react';
import { jobsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FiSearch, FiMail, FiCheck, FiTrash2 } from 'react-icons/fi';

const JobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter === 'processed') params.processed = true;
      else if (filter === 'unprocessed') params.processed = false;
      if (filter === 'sent') params.emailSent = true;

      const response = await jobsAPI.getAll(params);
      setJobs(response.data.data);
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const eligibleIds = jobs
      .filter((j) => j.processingStatus === 'success' && j.ceoContact?.ceoEmail)
      .map((j) => j._id);

    if (selectedIds.length === eligibleIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(eligibleIds);
    }
  };

  const handleSendEmails = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one job');
      return;
    }

    if (!window.confirm(`Send emails for ${selectedIds.length} selected job(s)?`)) return;

    setSending(true);
    try {
      const response = await jobsAPI.sendBatch(selectedIds);
      const { successCount, failureCount } = response.data.data;
      toast.success(`Sent ${successCount} email(s), ${failureCount} failed`);
      setSelectedIds([]);
      fetchJobs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send emails');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await jobsAPI.delete(id);
      toast.success('Job deleted');
      fetchJobs();
    } catch (error) {
      toast.error('Failed to delete job');
    }
  };

  const filteredJobs = search
    ? jobs.filter(
        (j) =>
          j.title?.toLowerCase().includes(search.toLowerCase()) ||
          j.company?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : jobs;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Job Postings</h1>

        {selectedIds.length > 0 && (
          <button
            onClick={handleSendEmails}
            disabled={sending}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <FiMail size={18} />
            {sending
              ? 'Sending...'
              : `Send Email (${selectedIds.length})`}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Jobs</option>
            <option value="unprocessed">Unprocessed</option>
            <option value="processed">Processed</option>
            <option value="sent">Email Sent</option>
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.length > 0 &&
                    selectedIds.length ===
                      jobs.filter((j) => j.processingStatus === 'success' && j.ceoContact?.ceoEmail).length
                  }
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Job Title</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Company</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Location</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">CEO / Founder</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="px-6 py-8 text-center">Loading...</td>
              </tr>
            ) : filteredJobs.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-8 text-center text-gray-500">No jobs found</td>
              </tr>
            ) : (
              filteredJobs.map((job) => {
                const canSelect = job.processingStatus === 'success' && job.ceoContact?.ceoEmail;
                const isSelected = selectedIds.includes(job._id);

                return (
                  <tr
                    key={job._id}
                    className={`border-b hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-4">
                      {canSelect ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(job._id)}
                          className="w-4 h-4 rounded"
                        />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-sm">{job.title}</p>
                    </td>
                    <td className="px-4 py-4 text-sm">{job.company?.name}</td>
                    <td className="px-4 py-4 text-sm">{job.location}</td>
                    <td className="px-4 py-4 text-sm">
                      {job.ceoContact?.ceoName || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          job.processingStatus === 'success'
                            ? 'bg-green-100 text-green-700'
                            : job.processingStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {job.processingStatus || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {job.emailSent ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                          <FiCheck size={14} /> Sent
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Not Sent</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleDelete(job._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && filteredJobs.length > 0 && (
        <div className="flex justify-between items-center">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default JobsPage;
