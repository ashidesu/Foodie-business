import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase'; // Added db import (assuming it's exported from '../firebase')
import {
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signInAnonymously,
    sendPasswordResetEmail,
    signOut  // Added signOut import
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // Added Firestore imports
import './Auth.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isFormValid, setIsFormValid] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        setIsFormValid(email && password);
    }, [email, password]);

    const checkBusinessRole = async () => {
        const user = auth.currentUser;
        if (!user) return false;
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            // Assuming roles is a map/object with business as a boolean inside
            return userDoc.exists() && userDoc.data().roles?.business === true;
        } catch (error) {
            console.error('Error checking business role:', error);
            return false;
        }
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            await signInWithEmailAndPassword(auth, email, password);
            const isBusiness = await checkBusinessRole();
            if (!isBusiness) {
                await signOut(auth);
                setError('Access denied. Business account required.');
                return;
            }
            navigate('/home');  // Redirect to /home if login and role check are successful
        } catch (error) {
            setError(error.message);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');

        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            const isBusiness = await checkBusinessRole();
            if (!isBusiness) {
                await signOut(auth);
                setError('Access denied. Business account required.');
                return;
            }
            navigate('/home');  // Redirect to /home if login and role check are successful
        } catch (error) {
            setError(error.message);
        }
    };

    const handleAnonymousLogin = async () => {
        setError('');

        try {
            await signInAnonymously(auth);
            const isBusiness = await checkBusinessRole();
            if (!isBusiness) {
                await signOut(auth);
                setError('Access denied. Business account required.');
                return;
            }
            navigate('/home');  // Redirect to /home if login and role check are successful
        } catch (error) {
            setError(error.message);
        }
    };

    const handlePasswordReset = async () => {
        if (!email) {
            setError('Please enter your email address first');
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            alert('Password reset email sent! Check your inbox.');
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className='auth'>
            <div className="auth-wrapper">
                <div className="auth-container">
                    <h1>Log in</h1>

                    <form onSubmit={handleEmailLogin}>
                        <div className="field-label">
                            <span>Email or username</span>
                        </div>

                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ marginBottom: '16px' }}
                        />

                        <div className="field-label" style={{ marginBottom: '8px' }}>
                            <span>Password</span>
                        </div>

                        <div className="input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <div
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    {showPassword ? (
                                        <>
                                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                            <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
                                        </>
                                    ) : (
                                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                    )}
                                </svg>
                            </div>
                        </div>

                        <a href="#" className="forgot-password" onClick={handlePasswordReset}>
                            Forgot password?
                        </a>

                        {error && (
                            <div className="error-message show">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className={`auth-btn ${isFormValid ? 'active' : ''}`}
                            disabled={!isFormValid}
                        >
                            Log in
                        </button>
                    </form>

                    <div className="divider">Or</div>

                    <button className="google-auth-btn" onClick={handleGoogleLogin}>
                        <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: '8px' }} xmlns="http://www.w3.org/2000/svg" >
                            <path fill="#4285F4"
                                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                            <path fill="#34A853"
                                d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
                            <path fill="#FBBC05"
                                d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z" />
                            <path fill="#EA4335"
                                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
                        </svg>
                        Continue with Google
                    </button>
                    

                    <div className="auth-switch">
                        Don't have an account? <Link to="/signup">Sign up</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
