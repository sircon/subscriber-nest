'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect, useCallback, } from 'react';
import { authApi } from '@/lib/api';
const AuthContext = createContext(undefined);
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user';
// Helper functions to set/clear cookies
function setCookie(name, value, days = 30) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}
function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax`;
}
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    // Load token and user from storage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);
        if (storedToken && storedUser) {
            try {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
                // Also set cookies for middleware access
                setCookie(TOKEN_KEY, storedToken);
                setCookie(USER_KEY, storedUser);
            }
            catch (error) {
                // Invalid stored data, clear it
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
                deleteCookie(TOKEN_KEY);
                deleteCookie(USER_KEY);
                setLoading(false);
            }
        }
        else {
            // No stored token, set loading to false
            setLoading(false);
        }
    }, []);
    const logout = useCallback(() => {
        const currentToken = token;
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        deleteCookie(TOKEN_KEY);
        deleteCookie(USER_KEY);
        // Optionally call logout endpoint to invalidate session on server
        if (currentToken) {
            authApi.logout(currentToken).catch(() => {
                // Ignore errors on logout
            });
        }
    }, [token]);
    const checkAuth = useCallback(async () => {
        const currentToken = token;
        if (!currentToken) {
            setLoading(false);
            return;
        }
        try {
            const data = await authApi.getCurrentUser(currentToken, () => {
                // Token is invalid, clear auth state
                setToken(null);
                setUser(null);
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
                deleteCookie(TOKEN_KEY);
                deleteCookie(USER_KEY);
                setLoading(false);
            });
            setUser(data.user);
            // Update stored user data
            const userJson = JSON.stringify(data.user);
            localStorage.setItem(USER_KEY, userJson);
            setCookie(USER_KEY, userJson);
        }
        catch (error) {
            // Network error or other issue, clear auth state
            setToken(null);
            setUser(null);
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            deleteCookie(TOKEN_KEY);
            deleteCookie(USER_KEY);
        }
        finally {
            setLoading(false);
        }
    }, [token]);
    // Check auth status on mount and when token changes
    useEffect(() => {
        if (token) {
            checkAuth();
        }
        else {
            setLoading(false);
        }
    }, [token, checkAuth]);
    const login = useCallback((newToken, newUser) => {
        setToken(newToken);
        setUser(newUser);
        const userJson = JSON.stringify(newUser);
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(USER_KEY, userJson);
        // Also set cookies for middleware access
        setCookie(TOKEN_KEY, newToken);
        setCookie(USER_KEY, userJson);
    }, []);
    const isAuthenticated = !!user && !!token;
    return (_jsx(AuthContext.Provider, { value: {
            user,
            token,
            loading,
            isAuthenticated,
            login,
            logout,
            checkAuth,
        }, children: children }));
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
