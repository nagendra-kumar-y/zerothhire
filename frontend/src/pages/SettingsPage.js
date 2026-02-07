import React, { useState } from 'react';
import { FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: 587,
    SMTP_USER: '',
    SMTP_PASSWORD: '',
    HUNTER_API_KEY: '',
    ROCKETREACH_API_KEY: '',
    JOB_SCRAPE_INTERVAL: '*/30 * * * *',
    EMAIL_SEND_DELAY: 60000
  });

  const handleSave = () => {
    // This would be saved to backend
    toast.success('Settings saved successfully');
  };

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-6">Email Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">SMTP Host</label>
            <input
              type="text"
              value={settings.SMTP_HOST}
              onChange={(e) => handleChange('SMTP_HOST', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">SMTP Port</label>
            <input
              type="number"
              value={settings.SMTP_PORT}
              onChange={(e) => handleChange('SMTP_PORT', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={settings.SMTP_USER}
              onChange={(e) => handleChange('SMTP_USER', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={settings.SMTP_PASSWORD}
              onChange={(e) => handleChange('SMTP_PASSWORD', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-6">API Keys</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Hunter.io API Key</label>
            <input
              type="password"
              value={settings.HUNTER_API_KEY}
              onChange={(e) => handleChange('HUNTER_API_KEY', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">RocketReach API Key</label>
            <input
              type="password"
              value={settings.ROCKETREACH_API_KEY}
              onChange={(e) => handleChange('ROCKETREACH_API_KEY', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-6">Automation</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Job Scrape Interval (Cron)</label>
            <input
              type="text"
              value={settings.JOB_SCRAPE_INTERVAL}
              onChange={(e) => handleChange('JOB_SCRAPE_INTERVAL', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="*/30 * * * *"
            />
            <p className="text-xs text-gray-600 mt-2">
              Format: minute hour day month day-of-week
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email Send Delay (ms)</label>
            <input
              type="number"
              value={settings.EMAIL_SEND_DELAY}
              onChange={(e) => handleChange('EMAIL_SEND_DELAY', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-600 mt-2">
              Delay between sending emails to avoid rate limiting
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <FiSave size={20} /> Save Settings
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
