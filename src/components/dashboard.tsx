'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { StudyBlock } from '@/lib/mongodb';

interface DashboardProps {
  onSignOut: () => void;
}

export function Dashboard({ onSignOut }: DashboardProps) {
  const [blocks, setBlocks] = useState<StudyBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBlock, setNewBlock] = useState({
    startTime: '',
    endTime: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage('Please sign in to view your blocks');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/blocks', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBlocks(data.blocks);
      }
    } catch (error) {
      console.error('Error fetching blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/blocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(newBlock),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Study block created successfully!');
        setNewBlock({ startTime: '', endTime: '' });
        setShowCreateForm(false);
        fetchBlocks();
      } else {
        setMessage(data.error || 'Failed to create block');
      }
    } catch (error) {
      setMessage('Error creating block');
    }
  };

  const deleteBlock = async (blockId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/blocks/${blockId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        setMessage('Block deleted successfully!');
        fetchBlocks();
      } else {
        setMessage('Failed to delete block');
      }
    } catch (error) {
      setMessage('Error deleting block');
    }
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDuration = (start: Date, end: Date) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.round(diff / (1000 * 60));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🔕 Quiet Hours Scheduler
              </h1>
              <p className="text-gray-600">Manage your study blocks</p>
            </div>
            <button
              onClick={onSignOut}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {message && (
            <div className={`mb-4 p-4 rounded-md ${message.includes('successfully') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Study Blocks</h2>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  {showCreateForm ? 'Cancel' : 'Create New Block'}
                </button>
              </div>

              {showCreateForm && (
                <form onSubmit={createBlock} className="mb-6 p-4 border rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        id="startTime"
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={newBlock.startTime}
                        onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                        End Time
                      </label>
                      <input
                        type="datetime-local"
                        id="endTime"
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={newBlock.endTime}
                        onChange={(e) => setNewBlock({ ...newBlock, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Create Block
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-4">
                {blocks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📚</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No study blocks yet</h3>
                    <p className="text-gray-500">Create your first study block to get started!</p>
                  </div>
                ) : (
                  blocks.map((block) => (
                    <div
                      key={block.blockId}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                📅 {formatDateTime(block.startTime)} → {formatDateTime(block.endTime)}
                              </p>
                              <p className="text-sm text-gray-500">
                                Duration: {getDuration(block.startTime, block.endTime)} minutes
                              </p>
                              <div className="flex items-center space-x-2 mt-2">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    block.reminderSent
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {block.reminderSent ? '✅ Reminder Sent' : '⏰ Reminder Pending'}
                                </span>
                                {new Date(block.startTime) <= new Date() && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    🔕 In Progress
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteBlock(block.blockId)}
                          className="ml-4 text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}