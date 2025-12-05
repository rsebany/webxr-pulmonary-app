// frontend/src/components/Login.jsx
import React, { useState } from 'react';
import API_BASE_URL from '../config/api';

const Login = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        full_name: '',
        role: 'patient'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const body = isLogin 
                ? { username: formData.username, password: formData.password }
                : formData;

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Erreur de connexion');
            }

            if (isLogin) {
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
                onLogin(data.user);
            } else {
                setIsLogin(true);
                setFormData({ ...formData, password: '' });
                alert('Compte créé avec succès! Vous pouvez maintenant vous connecter.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">🫁</div>
                    <h1>Pulmonary WebXR</h1>
                    <p>Suivi de fibrose pulmonaire</p>
                </div>

                <div className="login-tabs">
                    <button 
                        className={isLogin ? 'active' : ''} 
                        onClick={() => setIsLogin(true)}
                    >
                        Connexion
                    </button>
                    <button 
                        className={!isLogin ? 'active' : ''} 
                        onClick={() => setIsLogin(false)}
                    >
                        Inscription
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <>
                            <div className="form-group">
                                <label>Nom complet</label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                    placeholder="Dr. Jean Dupont"
                                    required={!isLogin}
                                />
                            </div>
                            <div className="form-group">
                                <label>Rôle</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                                >
                                    <option value="patient">Patient</option>
                                    <option value="medecin">Médecin</option>
                                </select>
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label>Nom d'utilisateur</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                            placeholder="Entrez votre identifiant"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Mot de passe</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : 'Créer un compte')}
                    </button>
                </form>

                <div className="demo-accounts">
                    <p>Comptes de démonstration :</p>
                    <div className="demo-list">
                        <span><strong>Médecin:</strong> dr_martin / medecin123</span>
                        <span><strong>Patient:</strong> patient_001 / patient123</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;



