// frontend/src/components/MedecinView.jsx
import React, { useState, useEffect } from 'react';
import WebXRViewer from './WebXRViewer';
import PatientPanel from './PatientPanel';
import PredictionControls from './PredictionControls';
import API_BASE_URL from '../config/api';

const MedecinView = ({ user, onLogout }) => {
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientData, setPatientData] = useState(null);
    const [dicomVolume, setDicomVolume] = useState(null);
    const [predictions, setPredictions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/medecin/patients`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPatients(data.patients);
            }
        } catch (error) {
            console.error('Erreur chargement patients:', error);
        }
    };

    const loadPatientData = async (patientId) => {
        setIsLoading(true);
        setLoadingMessage('Chargement des données patient...');
        try {
            const response = await fetch(`${API_BASE_URL}/patient-history/${patientId}`);
            if (response.ok) {
                const data = await response.json();
                setPatientData(data);
                setSelectedPatient(patientId);
                
                // Générer prédiction initiale
                const fvcHistory = data.fvc_history || [];
                const fvcValues = fvcHistory.map(e => e.fvc);
                const fvcMean = fvcValues.length > 0 
                    ? fvcValues.reduce((a, b) => a + b, 0) / fvcValues.length 
                    : 2800;
                
                const latestEntry = fvcHistory[fvcHistory.length - 1] || { week: 0, fvc: fvcMean };
                
                const predResponse = await fetch(`${API_BASE_URL}/predict`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        weeks: latestEntry.week || 0,
                        percent: 70,
                        age: data.age || 65,
                        fvc_mean: fvcMean,
                        fvc_std: 150
                    })
                });
                
                if (predResponse.ok) {
                    const predData = await predResponse.json();
                    setPredictions([{ week: latestEntry.week || 0, ...predData }]);
                }
            }
        } catch (error) {
            console.error('Erreur:', error);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleDicomUpload = async (files) => {
        setIsLoading(true);
        
        try {
            // Si plusieurs fichiers, utiliser l'endpoint volume
            if (Array.isArray(files) && files.length > 1) {
                setLoadingMessage(`Création du volume 3D à partir de ${files.length} slices...`);
                
                const formData = new FormData();
                files.forEach((file) => {
                    formData.append('files', file);
                });
                
                const response = await fetch(`${API_BASE_URL}/analyze-dicom-volume`, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log(`📊 Volume créé: ${result.num_slices} slices, shape: ${result.shape}`);
                    
                    if (result.data && result.shape) {
                        setDicomVolume({
                            data: result.data,
                            shape: result.shape,
                            num_slices: result.num_slices,
                            hu_range: result.hu_range,
                            radiomic_features: result.radiomic_features,
                            patient_id: result.patient_id
                        });
                        
                        // Mettre à jour le patient data si disponible
                        if (result.patient_id && result.patient_id !== 'unknown') {
                            setPatientData(prev => ({
                                ...prev,
                                patient_id: result.patient_id
                            }));
                        }
                    }
                } else {
                    const error = await response.json();
                    throw new Error(error.detail || 'Erreur lors de l\'analyse');
                }
            } else {
                // Un seul fichier, utiliser l'ancien endpoint
                setLoadingMessage('Analyse du fichier DICOM...');
                
                const file = Array.isArray(files) ? files[0] : files;
                const formData = new FormData();
                formData.append('file', file);
                
                const response = await fetch(`${API_BASE_URL}/analyze-dicom`, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.data && result.shape) {
                        setDicomVolume({
                            data: result.data,
                            shape: result.shape,
                            hu_range: result.hu_range,
                            radiomic_features: result.radiomic_features,
                            patient_id: result.patient_id
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Erreur DICOM:', error);
            throw error;
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    return (
        <div className="dashboard medecin-view">
            <header className="dashboard-header">
                <div className="header-left">
                    <span className="logo">🫁</span>
                    <h1>Pulmonary WebXR</h1>
                    <span className="role-badge medecin">Médecin</span>
                </div>
                <div className="header-right">
                    <span className="user-name">👨‍⚕️ {user.full_name}</span>
                    <button onClick={onLogout} className="logout-btn">Déconnexion</button>
                </div>
            </header>

            <div className="dashboard-content">
                <aside className="sidebar">
                    <div className="patients-list">
                        <h3>Mes Patients</h3>
                        {patients.map(p => (
                            <div 
                                key={p.username}
                                className={`patient-item ${selectedPatient === p.patient_id ? 'active' : ''}`}
                                onClick={() => loadPatientData(p.patient_id)}
                            >
                                <span className="patient-icon">👤</span>
                                <div>
                                    <div className="patient-name">{p.full_name}</div>
                                    <div className="patient-id">{p.patient_id}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <PatientPanel 
                        onPatientSelect={loadPatientData}
                        onDicomUpload={handleDicomUpload}
                        patientData={patientData}
                    />
                    
                    <PredictionControls 
                        predictions={predictions}
                        onPredictionUpdate={setPredictions}
                        patientData={patientData}
                    />
                </aside>

                <main className="viewer-container">
                    {isLoading ? (
                        <div className="loading">
                            <div className="loading-spinner"></div>
                            <div>{loadingMessage || 'Chargement...'}</div>
                        </div>
                    ) : (
                        <WebXRViewer 
                            patientData={patientData}
                            dicomVolume={dicomVolume}
                            predictions={predictions}
                        />
                    )}
                </main>
            </div>
        </div>
    );
};

export default MedecinView;
