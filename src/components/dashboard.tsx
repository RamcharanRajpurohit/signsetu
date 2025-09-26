'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { StudyBlock } from '@/lib/mongodb';

interface DashboardProps {
  onSignOut: () => void;
}
interface LoaderProps {
  color?: string;
}

const Loader: React.FC<LoaderProps> = ({ color }) => {
  return (
    <svg className={`animate-spin h-5 w-5 ${color}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
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
  const [isPolling, setIsPolling] = useState(true);

  // Use ref to store the latest blocks for comparison
  const blocksRef = useRef<StudyBlock[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized fetchBlocks function to prevent unnecessary re-renders
  const fetchBlocks = useCallback(async (showLoadingState = false) => {
    try {
      if (showLoadingState) {
        setLoading(true);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessageText('Please sign in to view your blocks');
        if (showLoadingState) {
          setLoading(false);
        }
        return;
      }

      const response = await fetch('/api/blocks', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const newBlocks = data.blocks;

        // Only update state if blocks have actually changed
        if (JSON.stringify(newBlocks) !== JSON.stringify(blocksRef.current)) {
          console.log(newBlocks);
          setBlocks(newBlocks);
          blocksRef.current = newBlocks;

          // Show a brief success message if reminder status changed
          const hadPendingReminders = blocksRef.current.some(block => !block.reminderSent);
          const hasPendingReminders = newBlocks.some((block: StudyBlock) => !block.reminderSent);

          if (hadPendingReminders && !hasPendingReminders) {
            setMessageText('Reminder sent successfully!');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching blocks:', error);
      // Don't show error message during polling to avoid spam
    } finally {
      if (showLoadingState) {
        setLoading(false);
      }
    }
  }, []);
  const setMessageText = async (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  }
  // Start polling
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 30 seconds to check for reminder status updates
    pollingIntervalRef.current = setInterval(() => {
      if (isPolling) {
        fetchBlocks(false);
      }
    }, 30000);

    console.log('📡 Started polling for block updates every 30 seconds');
  }, [fetchBlocks, isPolling]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('📡 Stopped polling for block updates');
    }
  }, []);

  // Initial load and setup polling
  useEffect(() => {
    fetchBlocks(true);
    startPolling();

    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, [fetchBlocks, startPolling, stopPolling]);

  // Handle visibility change to pause/resume polling when tab is not active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPolling(false);
        console.log('📡 Paused polling (tab not visible)');
      } else {
        setIsPolling(true);
        // Immediately fetch when tab becomes visible again
        fetchBlocks(false);
        console.log('📡 Resumed polling (tab visible)');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchBlocks]);

  const [NewBlockLoading, setNewBlockLoading] = useState(false);
  const createBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewBlockLoading(true);
    setMessageText('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      console.log(newBlock);  

      // Basic validation
      if (new Date(newBlock.startTime) >= new Date(newBlock.endTime)) {
        setMessageText('End time must be after start time');
        setNewBlockLoading(false);
        return;
      }

      const now = new Date();
      if (new Date(newBlock.startTime) < now) {
        setMessageText('Start time must be in the future');
        setNewBlockLoading(false);
        return;
      }

      if ( blocks.length > 0 ) {
        const overlappingBlock = blocks.find(block =>
          (new Date(newBlock.startTime) < new Date(block.endTime)) &&
          (new Date(newBlock.endTime) > new Date(block.startTime))
        );
        if (overlappingBlock) {
          setMessageText('New block overlaps with an existing block');
          setNewBlockLoading(false);
          return;
        }
      }

      // Create the new block

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
        setMessageText('Study block created successfully!');
        setNewBlock({ startTime: '', endTime: '' });
        setShowCreateForm(false);
        // Immediately fetch to update the UI
        await fetchBlocks(false);
      } else {
        setMessageText(data.error || 'Failed to create block');
      }
    } catch (error) {
      setMessageText('Error creating block');
    }
    finally {
      setNewBlockLoading(false);
    }
  };
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const deleteAllBlocks = async () => {
    const confirmation = confirm('Are you sure you want to delete all study blocks? This action cannot be undone.');
    if (!confirmation) return;
    try {
      setDeleteLoading('all');
      setMessageText('');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/blocks`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        setMessageText('All blocks deleted successfully!');
        // Immediately fetch to update the UI
        await fetchBlocks(false);
      } else {
        setMessageText('Failed to delete blocks');
      }
    } catch (error) {
      setMessageText('Error deleting blocks');
    }
    finally {
      setDeleteLoading(null);
    }
  }
  const deleteBlock = async (blockId: string) => {
    try {
      setDeleteLoading(blockId);
      setMessageText('');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/blocks/${blockId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        setMessageText('Block deleted successfully!');
        // Immediately fetch to update the UI
        await fetchBlocks(false);
      } else {
        setMessageText('Failed to delete block');
      }
    } catch (error) {
      setMessageText('Error deleting block');
    }
    finally {
      setDeleteLoading(null);
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    setMessageText('Refreshing...');
    await fetchBlocks(false);
    setMessageText('Updated!');
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
                Quiet Hours Scheduler
              </h1>
              <p className="text-gray-600">
                Manage your study blocks
                {isPolling && <span className="ml-2 text-green-600">● Live</span>}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleManualRefresh}
                className="bg-blue-600 hover:bg-blue-700 hover:cursor-pointer text-white px-3 py-2 rounded-md text-sm font-medium"
                title="Manual refresh"
              >
                🔄 Refresh
              </button>
              <button
                onClick={onSignOut}
                className="bg-gray-600 hover:bg-gray-700 hover:cursor-pointer text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {message && (
            <div className={`mb-4 p-4 rounded-md ${message.includes('successfully') || message.includes('sent') || message.includes('Updated') ? 'bg-green-50 text-green-800' : message.includes('Refreshing') ? 'bg-blue-50 text-blue-800' : 'bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Study Blocks</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Auto-refreshes every 30 seconds to show reminder status
                  </p>
                </div>
                <div className='flex space-x-2'>

                  <button
                    onClick={()=>deleteAllBlocks()}
                    className="bg-indigo-600 hover:bg-indigo-700 hover:cursor-pointer text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Remove All
                  </button>
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="bg-indigo-600 hover:bg-indigo-700 hover:cursor-pointer text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    {showCreateForm ? 'Cancel' : 'Add'}
                  </button>
                </div>
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
                      className="bg-indigo-600 hover:bg-indigo-700 hover:cursor-pointer text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      {
                        NewBlockLoading ? <Loader color="text-white" /> : 'Create Block'
                      }
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
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${block.reminderSent
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                >
                                  {block.reminderSent ? 'Reminder Sent' : 'Reminder Pending'}
                                </span>
                                {new Date(block.startTime) <= new Date() && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    In Progress
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteBlock(block.blockId)}
                          className="ml-4 text-red-600 hover:cursor-pointer hover:text-red-900 text-sm font-medium"
                        >
                          {
                            deleteLoading &&
                              deleteLoading === block.blockId ? (
                              <Loader />
                            ) : (
                              'Remove'
                            )
                          }
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