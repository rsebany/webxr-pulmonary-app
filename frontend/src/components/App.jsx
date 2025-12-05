// frontend/src/components/App.jsx
import React, { useState, useEffect } from 'react';
import Login from './Login';
import MedecinView from './MedecinView';
import PatientView from './PatientView';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Vérifier si l'utilisateur est déjà connecté
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setIsLoading(false);
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    if (isLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Chargement...</p>
            </div>
        );
    }

    // Non connecté -> afficher login
    if (!user) {
        return <Login onLogin={handleLogin} />;
    }

    // Afficher la vue selon le rôle
    if (user.role === 'medecin') {
        return <MedecinView user={user} onLogout={handleLogout} />;
    }

    return <PatientView user={user} onLogout={handleLogout} />;
}

export default App;
