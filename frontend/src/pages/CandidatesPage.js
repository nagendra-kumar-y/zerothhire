import React, { useEffect, useState, useCallback } from 'react';
import { candidatesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FiStar, FiTrash2 } from 'react-icons/fi';

const CandidatesPage = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sector, setSector] = useState('all');

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (sector !== 'all') params.sector = sector;

      const response = await candidatesAPI.getAll(params);
      setCandidates(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  }, [sector]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    
    try {
      await candidatesAPI.delete(id);
      toast.success('Candidate deleted');
      fetchCandidates();
    } catch (error) {
      toast.error('Failed to delete candidate');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Founding Engineers</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + Add Candidate
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Sectors</option>
          <option value="fintech">Fintech</option>
          <option value="saas">SaaS</option>
          <option value="ai">AI</option>
          <option value="healthtech">HealthTech</option>
          <option value="edtech">EdTech</option>
        </select>
      </div>

      {/* Candidates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="text-center py-8 col-span-full">Loading...</div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-8 col-span-full text-gray-500">No candidates found</div>
        ) : (
          candidates.map((candidate) => (
            <div key={candidate._id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{candidate.name}</h3>
                  <p className="text-sm text-gray-600">{candidate.title}</p>
                </div>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <FiStar
                      key={i}
                      size={16}
                      className={i < (candidate.rating || 3) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                    />
                  ))}
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-2">{candidate.currentCompany}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {candidate.skills?.slice(0, 3).map((skill, i) => (
                  <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {skill}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <a
                  href={candidate.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 text-center"
                >
                  View Profile
                </a>
                <button
                  onClick={() => handleDelete(candidate._id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CandidatesPage;
