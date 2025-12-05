// frontend/src/components/PredictionControls.jsx
import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config/api';

const PredictionControls = ({ predictions, onPredictionUpdate, patientData }) => {
    const [timeRange, setTimeRange] = useState(52);
    const [isGenerating, setIsGenerating] = useState(false);
    const [baseParams, setBaseParams] = useState({
        weeks: 0,
        percent: 70,
        age: 65,
        fvc_mean: 2800,
        fvc_std: 150
    });

    // Mettre à jour les paramètres de base à partir des données patient
    useEffect(() => {
        if (patientData?.fvc_history && patientData.fvc_history.length > 0) {
            const fvcValues = patientData.fvc_history.map(entry => entry.fvc);
            const fvcMean = fvcValues.reduce((a, b) => a + b, 0) / fvcValues.length;
            const fvcStd = Math.sqrt(
                fvcValues.reduce((sum, val) => sum + Math.pow(val - fvcMean, 2), 0) / fvcValues.length
            );
            
            const latestEntry = patientData.fvc_history[patientData.fvc_history.length - 1];
            const percent = (latestEntry.fvc / fvcMean) * 100;
            
            setBaseParams({
                weeks: latestEntry.week || 0,
                percent: percent,
                age: patientData.age || 65,
                fvc_mean: fvcMean,
                fvc_std: fvcStd
            });
        }
    }, [patientData]);

    const generateFuturePredictions = async () => {
        setIsGenerating(true);
        const futurePredictions = [];
        
        try {
            // Calculer le taux de dégradation estimé
            let degradationRate = 0.1; // Par défaut
            if (patientData?.fvc_history && patientData.fvc_history.length >= 2) {
                const history = patientData.fvc_history;
                const firstFvc = history[0].fvc;
                const lastFvc = history[history.length - 1].fvc;
                const totalWeeks = history[history.length - 1].week - history[0].week;
                if (totalWeeks > 0) {
                    degradationRate = ((firstFvc - lastFvc) / firstFvc) / totalWeeks * 4; // Par 4 semaines
                }
            }
            
            for (let week = baseParams.weeks; week <= baseParams.weeks + timeRange; week += 4) {
                const weeksFromBase = week - baseParams.weeks;
                const estimatedPercent = Math.max(10, baseParams.percent - (degradationRate * weeksFromBase));
                
                try {
                    const response = await fetch(`${API_BASE_URL}/predict`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            weeks: week,
                            percent: estimatedPercent,
                            age: baseParams.age,
                            fvc_mean: baseParams.fvc_mean,
                            fvc_std: baseParams.fvc_std
                        })
                    });
                    
                    if (response.ok) {
                        const prediction = await response.json();
                        futurePredictions.push({
                            week,
                            ...prediction
                        });
                    }
                } catch (error) {
                    console.error(`Erreur pour la semaine ${week}:`, error);
                }
            }
            
            onPredictionUpdate(futurePredictions);
        } catch (error) {
            console.error('Erreur lors de la génération des prédictions:', error);
            alert('Erreur lors de la génération des prédictions');
        } finally {
            setIsGenerating(false);
        }
    };

    // Calculer les statistiques des prédictions
    const getPredictionStats = () => {
        if (!predictions || predictions.length === 0) return null;
        
        const fvcValues = predictions.map(p => p.fvc_predicted || p.fvc || 0);
        const first = fvcValues[0];
        const last = fvcValues[fvcValues.length - 1];
        const change = last - first;
        const changePercent = ((change / first) * 100).toFixed(1);
        const min = Math.min(...fvcValues);
        const max = Math.max(...fvcValues);
        
        return { first, last, change, changePercent, min, max };
    };

    const stats = getPredictionStats();

    return (
        <div className="prediction-controls">
            <h3>Simulation Prédictive</h3>
            
            <div className="control-group">
                <label>Période de projection</label>
                <input 
                    type="range" 
                    min="12" 
                    max="104" 
                    step="4"
                    value={timeRange}
                    onChange={(e) => setTimeRange(parseInt(e.target.value))}
                />
                <span>{timeRange} semaines</span>
            </div>
            
            <button 
                onClick={generateFuturePredictions}
                disabled={isGenerating}
            >
                {isGenerating ? 'Génération...' : 'Générer les Projections'}
            </button>
            
            {stats && (
                <div className="prediction-stats">
                    <div className="stat-item">
                        <span className="stat-label">FVC initiale:</span>
                        <span className="stat-value">{stats.first.toFixed(0)} mL</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">FVC finale:</span>
                        <span className="stat-value">{stats.last.toFixed(0)} mL</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Évolution prévue:</span>
                        <span className={`stat-value ${stats.change >= 0 ? 'positive' : 'negative'}`}>
                            {stats.changePercent}%
                        </span>
                    </div>
                </div>
            )}
            
            {predictions.length > 0 && (
                <div className="predictions-list">
                    <div className="predictions-header">
                        <span>Semaine</span>
                        <span>FVC Prédite</span>
                        <span>Confiance</span>
                    </div>
                    {predictions.map((pred, index) => {
                        const fvc = pred.fvc_predicted || pred.fvc || 0;
                        const week = pred.week !== undefined ? pred.week : index * 4;
                        const confidence = pred.confidence || 95;
                        
                        return (
                            <div key={index} className="prediction-item">
                                <div className="pred-week">Semaine {week}</div>
                                <div className="fvc-value">{fvc.toFixed(0)} mL</div>
                                <div className="confidence">±{confidence.toFixed(1)}%</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PredictionControls;