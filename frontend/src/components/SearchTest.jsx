import { useState } from 'react';

function SearchTest({ apiBase }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setSearching(true);
        setSearched(false);

        try {
            const res = await fetch(`${apiBase}/search?q=${encodeURIComponent(query)}&k=5`);
            const data = await res.json();

            if (data.success) {
                setResults(data.results);
            } else {
                setResults([]);
            }
        } catch (err) {
            console.error('Search error:', err);
            setResults([]);
        } finally {
            setSearching(false);
            setSearched(true);
        }
    };

    const exampleQueries = [
        "price of apples",
        "available products",
        "bread stock",
        "organic vegetables"
    ];

    return (
        <div className="search-container">
            <div className="search-header">
                <h3>🔍 Test RAG Search</h3>
                <p>Search the vector store to see what context will be retrieved for AI responses</p>
            </div>

            <form onSubmit={handleSearch} className="search-form">
                <div className="search-input-wrapper">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Enter your search query..."
                        disabled={searching}
                    />
                    <button type="submit" disabled={searching || !query.trim()}>
                        {searching ? '⏳' : '🔍'} Search
                    </button>
                </div>
            </form>

            <div className="example-queries">
                <span>Try:</span>
                {exampleQueries.map((eq, idx) => (
                    <button
                        key={idx}
                        className="example-query"
                        onClick={() => setQuery(eq)}
                    >
                        {eq}
                    </button>
                ))}
            </div>

            {searched && (
                <div className="search-results">
                    <h4>Results ({results.length})</h4>

                    {results.length === 0 ? (
                        <div className="no-results">
                            <p>😕 No matching documents found.</p>
                            <p>Make sure you've uploaded data files first.</p>
                        </div>
                    ) : (
                        <div className="results-list">
                            {results.map((result, idx) => (
                                <div key={idx} className="result-card">
                                    <div className="result-header">
                                        <span className="result-rank">#{idx + 1}</span>
                                        <span className="result-score">
                                            Score: {(result.score * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="result-content">
                                        {result.text}
                                    </div>
                                    {result.metadata?.source && (
                                        <div className="result-meta">
                                            📁 From: {result.metadata.source}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="search-info">
                <h4>ℹ️ How it works</h4>
                <p>
                    When a customer sends a WhatsApp message, the RAG system searches your uploaded data
                    for relevant information. The top matching results are injected into the AI prompt,
                    allowing it to answer questions about prices, stock, and products accurately.
                </p>
            </div>
        </div>
    );
}

export default SearchTest;
