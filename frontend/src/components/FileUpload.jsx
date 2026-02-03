import { useState, useCallback } from 'react';

function FileUpload({ apiBase, onSuccess }) {
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState(null);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    }, []);

    const handleChange = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleFile = async (file) => {
        // Validate file type
        const allowedTypes = ['.csv', '.json', '.txt'];
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(ext)) {
            setMessage({ type: 'error', text: `File type not allowed. Use: ${allowedTypes.join(', ')}` });
            return;
        }

        setUploading(true);
        setProgress(0);
        setMessage(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Simulated progress (actual progress requires XMLHttpRequest)
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const res = await fetch(`${apiBase}/upload`, {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setProgress(100);

            const data = await res.json();

            if (data.success) {
                setMessage({
                    type: 'success',
                    text: `✅ Successfully uploaded "${file.name}" with ${data.data.chunks} data chunks`
                });
                onSuccess?.(data.data);
            } else {
                setMessage({ type: 'error', text: data.error || 'Upload failed' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: `Upload error: ${err.message}` });
        } finally {
            setUploading(false);
            setTimeout(() => setProgress(0), 1000);
        }
    };

    return (
        <div className="upload-container">
            <div
                className={`dropzone ${dragActive ? 'active' : ''} ${uploading ? 'uploading' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <div className="dropzone-content">
                    <div className="dropzone-icon">
                        {uploading ? '⏳' : '📁'}
                    </div>
                    <h3>{uploading ? 'Uploading...' : 'Drag & Drop your file here'}</h3>
                    <p>or click to browse</p>
                    <input
                        type="file"
                        accept=".csv,.json,.txt"
                        onChange={handleChange}
                        disabled={uploading}
                    />
                    <div className="file-types">
                        <span className="file-type">CSV</span>
                        <span className="file-type">JSON</span>
                        <span className="file-type">TXT</span>
                    </div>
                </div>

                {progress > 0 && (
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>

            {message && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="upload-help">
                <h4>📋 Supported Formats</h4>
                <ul>
                    <li><strong>CSV:</strong> Product data with headers (name, price, stock, category, etc.)</li>
                    <li><strong>JSON:</strong> Array of product objects or structured data</li>
                    <li><strong>TXT:</strong> Text content split by paragraphs</li>
                </ul>
                <div className="example-box">
                    <p><strong>Example CSV:</strong></p>
                    <code>name,price,stock,category<br />Apples,2.99,150,Fruits<br />Bread,3.49,50,Bakery</code>
                </div>
            </div>
        </div>
    );
}

export default FileUpload;
