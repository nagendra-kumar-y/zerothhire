import React, { useEffect, useState } from 'react';
import { FiActivity, FiMail, FiBriefcase, FiUsers, FiPlay, FiPause } from 'react-icons/fi';
import { automationAPI, jobsAPI } from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [automationStatus, setAutomationStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, automationRes] = await Promise.all([
        jobsAPI.getStats(),
        automationAPI.getStatus()
      ]);
      
      setStats(statsRes.data.data);
      setAutomationStatus(automationRes.data.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAutomation = async () => {
    try {
      await automationAPI.start('*/30 * * * *');
      toast.success('Automation started');
      fetchData();
    } catch (error) {
      toast.error('Failed to start automation');
    }
  };

  const handleStopAutomation = async () => {
    try {
      await automationAPI.stop();
      toast.success('Automation stopped');
      fetchData();
    } catch (error) {
      toast.error('Failed to stop automation');
    }
  };

  const handleTrigger = async () => {
    try {
      await automationAPI.trigger();
      toast.success('Job scraping triggered');
    } catch (error) {
      toast.error('Failed to trigger scraping');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const StatCard = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white rounded-lg shadow-md p-6 flex items-center gap-4">
      <div className={`${color} p-3 rounded-lg`}>
        <Icon className="text-white" size={28} />
      </div>
      <div>
        <p className="text-gray-600 text-sm">{title}</p>
        <p className="text-2xl font-bold">{value || '0'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">ZerothHire CEO Outreach Dashboard</p>
        </div>
        
        <div className="flex gap-3">
          {automationStatus?.isRunning ? (
            <button
              onClick={handleStopAutomation}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              <FiPause size={18} /> Stop
            </button>
          ) : (
            <button
              onClick={handleStartAutomation}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <FiPlay size={18} /> Start
            </button>
          )}
          
          <button
            onClick={handleTrigger}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <FiActivity size={18} /> Trigger
          </button>
        </div>
      </div>

      {/* Automation Status */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Automation Status</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">Status:</p>
            <p className="text-xl font-bold">
              {automationStatus?.isRunning ? (
                <span className="text-green-600">● Running</span>
              ) : (
                <span className="text-red-600">● Stopped</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-600">Active Jobs:</p>
            <p className="text-xl font-bold">{automationStatus?.jobs?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={FiBriefcase}
          title="Total Jobs"
          value={stats?.total}
          color="bg-blue-500"
        />
        <StatCard
          icon={FiActivity}
          title="Processed"
          value={stats?.processed}
          color="bg-green-500"
        />
        <StatCard
          icon={FiMail}
          title="Emails Sent"
          value={stats?.emailsSent}
          color="bg-purple-500"
        />
        <StatCard
          icon={FiUsers}
          title="Responses"
          value={stats?.responses}
          color="bg-orange-500"
        />
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Success Metrics</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Processing Rate</span>
                <span className="font-semibold">{stats?.successRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${stats?.successRate || 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Response Rate</span>
                <span className="font-semibold">{stats?.responseRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${stats?.responseRate || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3 text-sm">
            <p className="text-gray-600">
              Last sync: Just now
            </p>
            <p className="text-gray-600">
              Next scheduled run: In 30 minutes
            </p>
            <p className="text-gray-600">
              Total processed this session: {stats?.processed || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
