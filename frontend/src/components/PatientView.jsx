// frontend/src/components/PatientView.jsx
import React, { useState, useEffect } from 'react';
import WebXRViewer from './WebXRViewer';
import API_BASE_URL from '../config/api';

const PatientView = ({ user, onLogout }) => {
    const [myData, setMyData] = useState(null);
    const [predictions, setPredictions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadMyData();
    }, []);

    const loadMyData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/patient/my-data`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setMyData(data);
                
                // Générer les prédictions futures
                await generatePredictions(data);
            }
        } catch (error) {
            console.error('Erreur:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const generatePredictions = async (data) => {
        const fvcHistory = data.fvc_history || [];
        const fvcValues = fvcHistory.map(e => e.fvc);
        const fvcMean = fvcValues.length > 0 
            ? fvcValues.reduce((a, b) => a + b, 0) / fvcValues.length 
            : 2800;
        
        const latestEntry = fvcHistory[fvcHistory.length - 1] || { week: 0, fvc: fvcMean };
        const futurePreds = [];
        
        for (let week = latestEntry.week; week <= latestEntry.week + 52; week += 8) {
            try {
                const response = await fetch(`${API_BASE_URL}/predict`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        weeks: week,
                        percent: 70,
                        age: data.age || 58,
                        fvc_mean: fvcMean,
                        fvc_std: 150
                    })
                });
                
                if (response.ok) {
                    const pred = await response.json();
                    futurePreds.push({ week, ...pred });
                }
            } catch (e) {
                console.error(e);
            }
        }
        
        setPredictions(futurePreds);
    };

    const getStatusColor = () => {
        if (!myData?.fvc_history?.length) return 'neutral';
        const history = myData.fvc_history;
        const first = history[0].fvc;
        const last = history[history.length - 1].fvc;
        const change = ((last - first) / first) * 100;
        if (change > -5) return 'good';
        if (change > -15) return 'warning';
        return 'danger';
    };

    if (isLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Chargement de vos données...</p>
            </div>
        );
    }

    return (
        <div className="dashboard patient-view">
            <header className="dashboard-header">
                <div className="header-left">
                    <span className="logo">🫁</span>
                    <h1>Mon Suivi Pulmonaire</h1>
                </div>
                <div className="header-right">
                    <span className="user-name">👤 {user.full_name}</span>
                    <button onClick={onLogout} className="logout-btn">Déconnexion</button>
                </div>
            </header>

            <div className="dashboard-content patient-layout">
                <aside className="patient-sidebar">
                    <div className="patient-card">
                        <h3>Mon Profil</h3>
                        <div className="profile-info">
                            <div className="info-row">
                                <span>ID Patient:</span>
                                <strong>{myData?.patient_id}</strong>
                            </div>
                            <div className="info-row">
                                <span>Âge:</span>
                                <strong>{myData?.age} ans</strong>
                            </div>
                        </div>
                    </div>

                    <div className={`status-card ${getStatusColor()}`}>
                        <h3>État Actuel</h3>
                        <div className="current-fvc">
                            <span className="fvc-value">
                                {myData?.fvc_history?.[myData.fvc_history.length - 1]?.fvc || '—'}
                            </span>
                            <span className="fvc-unit">mL</span>
                        </div>
                        <p>Capacité Vitale Forcée</p>
                    </div>

                    <div className="history-card">
                        <h3>Mon Historique</h3>
                        <div className="history-list">
                            {myData?.fvc_history?.map((entry, idx) => (
                                <div key={idx} className="history-item">
                                    <span>Semaine {entry.week}</span>
                                    <strong>{entry.fvc} mL</strong>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="predictions-card">
                        <h3>Projections</h3>
                        <p className="predictions-info">
                            Évolution estimée de votre capacité pulmonaire sur les prochaines semaines.
                        </p>
                        <div className="predictions-list">
                            {predictions.slice(0, 5).map((pred, idx) => (
                                <div key={idx} className="prediction-item">
                                    <span>Semaine {pred.week}</span>
                                    <strong>{pred.fvc_predicted?.toFixed(0)} mL</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                <main className="viewer-container">
                    <div className="viewer-header">
                        <h2>Visualisation 3D de vos Poumons</h2>
                        <p>Utilisez la souris pour explorer le modèle</p>
                    </div>
                    <WebXRViewer 
                        patientData={myData}
                        predictions={predictions}
                    />
                </main>
            </div>
        </div>
    );
};

export default PatientView;



