'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { StudyBlock } from '@/lib/mongodb';
import { Sun, Shield, Calendar, Clock, Plus, X, RefreshCw, Trash2, CheckCircle, AlertCircle, Heart, BookOpen } from 'lucide-react';

interface DashboardProps {
  onSignOut: () => void;
}
interface LoaderProps {
  color?: string;
}

const Loader: React.FC<LoaderProps> = ({ color = "text-white" }) => {
  return (
    <RefreshCw className={`animate-spin h-5 w-5 ${color}`} />
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

      if (blocks.length > 0) {
        const overlappingBlock = blocks.find(block =>
          (new Date(newBlock.startTime) < new Date(block.endTime)) &&
          (new Date(newBlock.endTime) > new Date(block.startTime))
        );
        console.log(overlappingBlock);
        
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
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-r from-yellow-400 to-rose-400 shadow-lg mb-6">
            <RefreshCw className="h-10 w-10 text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-rose-600 bg-clip-text text-transparent">
            Loading your schedule...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-rose-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b-2 border-yellow-200/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between flex-wrap items-center py-6">
            <div className="flex items-center">
              <div className="flex items-center mr-6">
                <div className="p-3 bg-gradient-to-r from-yellow-400 to-rose-400 rounded-2xl shadow-lg mr-3">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <Sun className="h-8 w-8 text-yellow-500" />
              </div>
              <div>
                <h1 className="text-3xl small:bg-black font-bold bg-gradient-to-r from-yellow-600 to-rose-600 bg-clip-text text-transparent">
                  Quiet Hours Scheduler
                </h1>
                <div className="flex items-center space-x-4 text-gray-600 text-lg">
                  <span>Manage your study blocks</span>
                  {isPolling && (
                    <div className="flex items-center text-green-600">
                      <div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-sm font-medium">Live</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleManualRefresh}
                className="flex items-center px-4 py-3 bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 shadow-lg"
                title="Manual refresh"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Refresh
              </button>
              <button
                onClick={onSignOut}
                className="flex items-center px-4 py-3 bg-white hover:bg-rose-50 border-2 border-rose-200 hover:border-rose-300 text-gray-700 font-medium rounded-xl transition-all duration-200 hover:scale-105 shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Message Display */}
        {message && (
          <div className="mb-6">
            <div className={`p-4 rounded-xl text-lg font-medium border-2 ${
              message.includes('successfully') || message.includes('sent') || message.includes('Updated')
                ? 'bg-green-50 text-green-700 border-green-200'
                : message.includes('Refreshing')
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <div className="flex items-center">
                {message.includes('successfully') || message.includes('sent') || message.includes('Updated') ? (
                  <CheckCircle className="w-5 h-5 mr-2" />
                ) : message.includes('Refreshing') ? (
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <AlertCircle className="w-5 h-5 mr-2" />
                )}
                {message}
              </div>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="relative">
          {/* Background blur effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/20 to-rose-200/20 rounded-3xl blur-3xl"></div>
          
          <div className="relative bg-white/90 backdrop-blur-md border-2 border-yellow-200/50 rounded-3xl shadow-xl">
            <div className="px-8 py-6">
              {/* Card Header */}
              <div className="flex flex-wrap justify-between items-center mb-8">
                <div>
                  <div className="flex items-center mb-2">
                    <BookOpen className="h-7 w-7 text-yellow-500 mr-3" />
                    <h2 className="text-2xl font-bold text-gray-800">Study Blocks</h2>
                  </div>
                  <p className="text-gray-600 text-lg">
                    Auto-refreshes every 30 seconds to show reminder status
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => deleteAllBlocks()}
                    disabled={deleteLoading === 'all'}
                    className="flex items-center px-4 py-3 bg-white hover:bg-rose-50 border-2 border-rose-200 hover:border-rose-300 text-rose-600 font-medium rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 shadow-sm"
                  >
                    {deleteLoading === 'all' ? (
                      <Loader color="text-rose-600" />
                    ) : (
                      <Trash2 className="w-5 h-5 mr-2" />
                    )}
                    Remove All
                  </button>
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="flex items-center px-4 py-3 bg-gradient-to-r from-yellow-400 to-rose-400 hover:from-yellow-500 hover:to-rose-500 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 shadow-lg"
                  >
                    {showCreateForm ? (
                      <>
                        <X className="w-5 h-5 mr-2" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 mr-2" />
                        Add Block
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Create Form */}
              {showCreateForm && (
                <div className="mb-8">
                  <div className="bg-gradient-to-r from-yellow-50 to-rose-50 border-2 border-yellow-200/50 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <Calendar className="w-6 h-6 mr-2 text-yellow-500" />
                      Create New Study Block
                    </h3>
                    <form onSubmit={createBlock} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="startTime" className="block text-sm font-semibold text-gray-700 mb-2">
                            Start Time *
                          </label>
                          <input
                            type="datetime-local"
                            id="startTime"
                            required
                            className="block w-full px-4 py-3 border-2 border-yellow-200 focus:border-rose-400 focus:ring-rose-200 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 text-lg transition-all"
                            value={newBlock.startTime}
                            onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
                          />
                        </div>
                        <div>
                          <label htmlFor="endTime" className="block text-sm font-semibold text-gray-700 mb-2">
                            End Time *
                          </label>
                          <input
                            type="datetime-local"
                            id="endTime"
                            required
                            className="block w-full px-4 py-3 border-2 border-yellow-200 focus:border-rose-400 focus:ring-rose-200 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 text-lg transition-all"
                            value={newBlock.endTime}
                            onChange={(e) => setNewBlock({ ...newBlock, endTime: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <button
                          type="submit"
                          disabled={NewBlockLoading}
                          className="flex items-center px-6 py-3 bg-gradient-to-r from-yellow-400 to-rose-400 hover:from-yellow-500 hover:to-rose-500 text-white font-bold rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                          {NewBlockLoading ? (
                            <>
                              <Loader />
                              <span className="ml-2">Creating...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-5 h-5 mr-2" />
                              Create Block
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Blocks List */}
              <div className="space-y-4">
                {blocks.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-r from-yellow-400 to-rose-400 shadow-lg mb-6">
                      <BookOpen className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">No study blocks yet</h3>
                    <p className="text-gray-600 text-lg">Create your first study block to get started on your productive journey!</p>
                  </div>
                ) : (
                  blocks.map((block) => (
                    <div
                      key={block.blockId}
                      className="bg-gradient-to-r from-yellow-50/50 to-rose-50/50 border-2 border-yellow-200/30 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                    >
                      <div className="flex justify-between flex-wrap items-start">
                        <div className="flex-1">
                          <div className="flex items-start space-x-4">
                            <div className="p-2 bg-gradient-to-r from-yellow-400 to-rose-400 rounded-lg">
                              <Clock className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-lg font-semibold text-gray-900 mb-1">
                                {formatDateTime(block.startTime)} → {formatDateTime(block.endTime)}
                              </p>
                              <p className="text-gray-600 mb-3">
                                Duration: {getDuration(block.startTime, block.endTime)} minutes
                              </p>
                              <div className="flex items-center space-x-3">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 ${
                                    block.reminderSent
                                      ? 'bg-green-50 text-green-700 border-green-200'
                                      : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                  }`}
                                >
                                  {block.reminderSent ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Reminder Sent
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-4 h-4 mr-1" />
                                      Reminder Pending
                                    </>
                                  )}
                                </span>
                                {new Date(block.startTime) <= new Date() && new Date() <= new Date(block.endTime) && (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border-2 border-blue-200">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                                    In Progress
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteBlock(block.blockId)}
                          disabled={deleteLoading === block.blockId}
                          className="ml-4 flex items-center px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deleteLoading === block.blockId ? (
                            <Loader color="text-rose-600" />
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-1" />
                              Remove
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600">
          <p className="flex items-center justify-center text-lg">
            Built with <Heart className="h-5 w-5 text-rose-500 mx-2" /> for peaceful productivity
          </p>
        </div>
      </main>
    </div>
  );
}