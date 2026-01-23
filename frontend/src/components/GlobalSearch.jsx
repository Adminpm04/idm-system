import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestsAPI } from '../services/api';
import { format } from 'date-fns';
import { SystemIcon, SubsystemIcon, UserIcon, RoleIcon, RequestIcon, StatsIcon, SearchIcon } from './Icons';

function GlobalSearch() {
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
      draft: 'bg-gray-100 text-gray-700',
      submitted: 'bg-blue-100 text-blue-700',
      in_review: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      implemented: 'bg-purple-100 text-purple-700',
    };
    const labels = {
      draft: 'Черновик',
      submitted: 'Отправлено',
      in_review: 'На согласовании',
      approved: 'Согласовано',
      rejected: 'Отклонено',
      implemented: 'Реализовано',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100'}`}>
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
          placeholder="Поиск заявок..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm bg-white text-gray-900"
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
          className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[70vh] overflow-hidden"
        >
          {searchMode === 'suggestions' && suggestions.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
                Подсказки
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.id || index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 text-gray-900"
                >
                  <span className="flex-shrink-0">{getSuggestionIcon(suggestion.type)}</span>
                  <span className="flex-1 text-sm">{suggestion.label}</span>
                </button>
              ))}
              {query.length >= 2 && (
                <button
                  onClick={handleSearch}
                  className="w-full px-3 py-2 text-left hover:bg-primary/10 text-primary font-medium text-sm border-t"
                >
                  <SearchIcon size={16} className="inline mr-1" /> Искать "{query}" во всех заявках...
                </button>
              )}
            </div>
          )}

          {searchMode === 'results' && (
            <div>
              <div className="px-3 py-2 bg-gray-50 border-b flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  Найдено: {totalResults} заявок
                </span>
                <button
                  onClick={() => {
                    setSearchMode('suggestions');
                    setQuery('');
                    setSuggestions([]);
                    setResults([]);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Очистить
                </button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto">
                {results.length === 0 ? (
                  <div className="px-3 py-8 text-center text-gray-500">
                    Заявок не найдено
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
                      className="w-full px-3 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-primary text-sm">
                          {request.request_number}
                        </span>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <div className="flex justify-between">
                          <span>{request.system_name}</span>
                          {request.subsystem_name && (
                            <span className="text-gray-400">→ {request.subsystem_name}</span>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span>Для: {request.target_user_name}</span>
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
                className="w-full px-3 py-2 text-left hover:bg-primary/10 text-primary font-medium text-sm"
              >
                <SearchIcon size={16} className="inline mr-1" /> Искать "{query}" во всех заявках...
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;
