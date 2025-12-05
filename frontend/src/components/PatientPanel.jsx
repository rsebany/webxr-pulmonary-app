// frontend/src/components/PatientPanel.jsx
import React, { useState } from 'react';

const PatientPanel = ({ onPatientSelect, onDicomUpload, patientData }) => {
    const [patientId, setPatientId] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (patientId.trim()) {
            onPatientSelect(patientId.trim());
            setUploadStatus('');
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            // Vérifier les extensions
            const validFiles = files.filter(file => {
                const fileName = file.name.toLowerCase();
                return fileName.endsWith('.dcm') || fileName.endsWith('.dicom') || !fileName.includes('.');
            });
            
            if (validFiles.length === 0) {
                setUploadStatus('Erreur: Les fichiers doivent être au format DICOM (.dcm ou .dicom)');
                return;
            }
            
            setSelectedFiles(validFiles);
            setUploadStatus(`${validFiles.length} fichier(s) sélectionné(s)`);
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            setUploadStatus('Erreur: Aucun fichier sélectionné');
            return;
        }
        
        setUploadStatus(`Téléversement de ${selectedFiles.length} fichier(s)...`);
        
        try {
            await onDicomUpload(selectedFiles);
            setUploadStatus(`✅ ${selectedFiles.length} fichier(s) chargé(s) avec succès!`);
            setSelectedFiles([]);
            // Réinitialiser l'input
            const input = document.getElementById('dicom-upload');
            if (input) input.value = '';
        } catch (error) {
            setUploadStatus('❌ Erreur lors du téléversement');
        }
    };

    // Calculer les statistiques FVC
    const calculateStats = () => {
        if (!patientData?.fvc_history || patientData.fvc_history.length === 0) {
            return null;
        }
        
        const fvcValues = patientData.fvc_history.map(entry => entry.fvc);
        const latest = fvcValues[fvcValues.length - 1];
        const first = fvcValues[0];
        const change = latest - first;
        const changePercent = ((change / first) * 100).toFixed(1);
        const trend = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
        
        return {
            latest,
            first,
            change,
            changePercent,
            trend,
            count: fvcValues.length
        };
    };

    const stats = calculateStats();

    return (
        <div className="patient-panel">
            <h3>Gestion des Patients</h3>
            
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>ID Patient</label>
                    <input 
                        type="text" 
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        placeholder="Entrez l'ID du patient"
                        required
                    />
                </div>
                <button type="submit">Charger les Données</button>
            </form>

            <div className="upload-section">
                <label>📁 Téléverser des Fichiers DICOM (Volume 3D)</label>
                <p style={{ fontSize: '12px', color: '#888', margin: '5px 0 10px 0' }}>
                    Sélectionnez plusieurs fichiers DICOM pour créer un volume 3D complet
                </p>
                <input 
                    type="file" 
                    accept=".dcm,.dicom,*"
                    multiple
                    onChange={handleFileChange}
                    id="dicom-upload"
                    style={{ marginBottom: '10px' }}
                />
                
                {selectedFiles.length > 0 && (
                    <div style={{ 
                        marginBottom: '10px', 
                        padding: '10px', 
                        background: 'rgba(126, 200, 227, 0.1)', 
                        borderRadius: '8px',
                        border: '1px solid rgba(126, 200, 227, 0.3)'
                    }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#7ec8e3' }}>
                            📊 {selectedFiles.length} fichier(s) sélectionné(s)
                        </div>
                        <div style={{ fontSize: '11px', maxHeight: '80px', overflowY: 'auto' }}>
                            {selectedFiles.slice(0, 5).map((f, i) => (
                                <div key={i} style={{ color: '#aaa' }}>• {f.name}</div>
                            ))}
                            {selectedFiles.length > 5 && (
                                <div style={{ color: '#666' }}>... et {selectedFiles.length - 5} autre(s)</div>
                            )}
                        </div>
                    </div>
                )}
                
                <button 
                    type="button"
                    onClick={handleUpload}
                    disabled={selectedFiles.length === 0}
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: selectedFiles.length > 0 ? '#7ec8e3' : '#333',
                        color: selectedFiles.length > 0 ? '#000' : '#666',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: selectedFiles.length > 0 ? 'pointer' : 'not-allowed',
                        fontWeight: 'bold'
                    }}
                >
                    🚀 Charger le Volume 3D
                </button>
                
                {uploadStatus && (
                    <div className={`upload-status ${uploadStatus.includes('Erreur') ? 'error' : uploadStatus.includes('succès') ? 'success' : ''}`}
                         style={{ marginTop: '10px' }}>
                        {uploadStatus}
                    </div>
                )}
            </div>

            {patientData && (
                <div className="patient-info">
                    <h4>Patient {patientData.patient_id}</h4>
                    
                    {patientData.age && (
                        <div className="patient-detail">
                            <strong>Âge:</strong> {patientData.age} ans
                        </div>
                    )}
                    
                    {stats && (
                        <div className="fvc-stats">
                            <div className="stat-item">
                                <span className="stat-label">Dernière FVC:</span>
                                <span className="stat-value">{stats.latest} mL</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Évolution:</span>
                                <span className={`stat-value ${stats.change >= 0 ? 'positive' : 'negative'}`}>
                                    {stats.trend} {stats.changePercent}%
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Mesures:</span>
                                <span className="stat-value">{stats.count}</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="fvc-history">
                        <h5>Historique FVC</h5>
                        {patientData.fvc_history?.length > 0 ? (
                            <div className="fvc-entries">
                                {patientData.fvc_history.map((entry, idx) => (
                                    <div key={idx} className="fvc-entry">
                                        <span className="fvc-week">Semaine {entry.week}</span>
                                        <span className="fvc-value-display">
                                            <strong>{entry.fvc} mL</strong>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-data">Aucun historique disponible</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientPanel;
