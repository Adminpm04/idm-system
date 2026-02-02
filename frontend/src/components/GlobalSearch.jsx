import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestsAPI } from '../services/api';
import { format } from 'date-fns';
import { SystemIcon, SubsystemIcon, UserIcon, RoleIcon, RequestIcon, StatsIcon, SearchIcon } from './Icons';
import { useLanguage } from '../App';

function GlobalSearch() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState('suggestions');
  const [totalResults, setTotalResults] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setSuggestions([]);
      setSearchMode('suggestions');
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await requestsAPI.searchSuggestions(query);
        setSuggestions(response.data.suggestions || []);
        setSearchMode('suggestions');
        setShowDropdown(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (query.length < 2) return;

    setLoading(true);
    setSearchMode('results');
    try {
      const response = await requestsAPI.globalSearch({ q: query });
      setResults(response.data.requests || []);
      setTotalResults(response.data.total || 0);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion) => {
    if (suggestion.type === 'request') {
      navigate(`/requests/${suggestion.id}`);
      setShowDropdown(false);
      setQuery('');
      return;
    }

    setLoading(true);
    setSearchMode('results');
    try {
      const params = {};
      if (suggestion.type === 'system') params.system_id = suggestion.id;
      if (suggestion.type === 'subsystem') params.subsystem_id = suggestion.id;
      if (suggestion.type === 'user') params.user_id = suggestion.id;
      if (suggestion.type === 'role') params.role_id = suggestion.id;
      if (suggestion.type === 'status') params.status_filter = suggestion.value;

      const response = await requestsAPI.globalSearch(params);
      setResults(response.data.requests || []);
      setTotalResults(response.data.total || 0);
      setQuery(suggestion.value);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
      submitted: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
      in_review: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
      approved: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
      rejected: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
      implemented: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
      expired: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
    };
    const labels = {
      draft: t('statusDraft'),
      submitted: t('statusSubmitted'),
      in_review: t('statusInReview'),
      approved: t('statusApproved'),
      rejected: t('statusRejected'),
      implemented: t('statusImplemented'),
      expired: t('statusExpired'),
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 dark:bg-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'system': return <SystemIcon size={20} />;
      case 'subsystem': return <SubsystemIcon size={20} />;
      case 'user': return <UserIcon size={20} />;
      case 'role': return <RoleIcon size={20} />;
      case 'request': return <RequestIcon size={20} />;
      case 'status': return <StatsIcon size={20} />;
      default: return <SearchIcon size={20} />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd.MM.yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="relative w-full max-w-xl">
      <form onSubmit={handleSearch} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          placeholder={t('searchRequests')}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
        />
        <span className="absolute left-2 top-1/2 -translate-y-1/2">
          <SearchIcon size={18} />
        </span>
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </form>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-[70vh] overflow-hidden"
        >
          {searchMode === 'suggestions' && suggestions.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                {t('suggestions')}
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.id || index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 text-gray-900 dark:text-gray-100"
                >
                  <span className="flex-shrink-0">{getSuggestionIcon(suggestion.type)}</span>
                  <span className="flex-1 text-sm">{suggestion.label}</span>
                </button>
              ))}
              {query.length >= 2 && (
                <button
                  onClick={handleSearch}
                  className="w-full px-3 py-2 text-left hover:bg-primary/10 dark:hover:bg-primary/20 text-primary dark:text-blue-400 font-medium text-sm border-t border-gray-200 dark:border-gray-700"
                >
                  <SearchIcon size={16} className="inline mr-1" /> {t('searchInAll')}
                </button>
              )}
            </div>
          )}

          {searchMode === 'results' && (
            <div>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('found')}: {totalResults} {t('requests')}
                </span>
                <button
                  onClick={() => {
                    setSearchMode('suggestions');
                    setQuery('');
                    setSuggestions([]);
                    setResults([]);
                  }}
                  className="text-xs text-primary dark:text-blue-400 hover:underline"
                >
                  {t('clear')}
                </button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto">
                {results.length === 0 ? (
                  <div className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                    {t('noRequestsFoundSearch')}
                  </div>
                ) : (
                  results.map((request) => (
                    <button
                      key={request.id}
                      onClick={() => {
                        navigate(`/requests/${request.id}`);
                        setShowDropdown(false);
                        setQuery('');
                      }}
                      className="w-full px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-primary dark:text-blue-400 text-sm">
                          {request.request_number}
                        </span>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                        <div className="flex justify-between">
                          <span>{request.system_name}</span>
                          {request.subsystem_name && (
                            <span className="text-gray-400 dark:text-gray-500">-&gt; {request.subsystem_name}</span>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span>For: {request.target_user_name}</span>
                          <span>{formatDate(request.created_at)}</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {searchMode === 'suggestions' && suggestions.length === 0 && query.length >= 2 && !loading && (
            <div className="py-4">
              <button
                onClick={handleSearch}
                className="w-full px-3 py-2 text-left hover:bg-primary/10 dark:hover:bg-primary/20 text-primary dark:text-blue-400 font-medium text-sm"
              >
                <SearchIcon size={16} className="inline mr-1" /> {t('searchInAll')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;
