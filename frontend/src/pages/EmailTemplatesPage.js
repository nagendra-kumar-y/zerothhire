import React, { useEffect, useState } from 'react';
import { emailTemplatesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FiEdit2, FiCopy, FiTrash2 } from 'react-icons/fi';

const EmailTemplatesPage = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await emailTemplatesAPI.getAll();
      setTemplates(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async (id) => {
    try {
      await emailTemplatesAPI.clone(id);
      toast.success('Template cloned');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to clone template');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    
    try {
      await emailTemplatesAPI.delete(id);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Email Templates</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + New Template
        </button>
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No templates found</div>
        ) : (
          templates.map((template) => (
            <div key={template._id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{template.name}</h3>
                  <p className="text-sm text-gray-600">
                    Sector: <span className="font-semibold">{template.sector}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                    <FiEdit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleClone(template._id)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                  >
                    <FiCopy size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(template._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-4 line-clamp-2">{template.subject}</p>

              {template.performanceMetrics && (
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Sent</p>
                    <p className="font-semibold">{template.performanceMetrics.sent || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Open Rate</p>
                    <p className="font-semibold">{template.performanceMetrics.openRate || 0}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Click Rate</p>
                    <p className="font-semibold">{template.performanceMetrics.clickRate || 0}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Reply Rate</p>
                    <p className="font-semibold">{template.performanceMetrics.replyRate || 0}%</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EmailTemplatesPage;
