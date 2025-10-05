/* eslint-disable no-unused-vars */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const res = await window.api.login({ username, password });
            if (res.success) {
                toast.success(res.message);
                navigate("/file");
            } else {
                toast.error(res.message);
            }
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong");
        }
    }

    const getRandomBgColor = (index) => {
        const shouldHaveColor = Math.random() < 0.3;
        if (!shouldHaveColor) return '';
        
        const colors = [
            'bg-blue-500/50',
            'bg-green-500/50', 
            'bg-purple-500/50',
            'bg-red-500/50',
            'bg-yellow-500/50',
            'bg-pink-500/50',
            'bg-indigo-500/50',
            'bg-orange-500/50',
            'bg-teal-500/50'
        ];
        
        return colors[Math.floor(Math.random() * colors.length)];
    };

    return (
        <div className="relative flex items-center justify-center h-screen bg-zinc-900 text-white overflow-hidden">
            {/* Calendar Grid Background */}
            <div className="absolute inset-0 opacity-10">
                <div className="grid grid-cols-7 h-full w-full">
                    {Array.from({ length: 35 }, (_, i) => {
                        const randomBg = getRandomBgColor(i);
                        return (
                            <div
                                key={i}
                                className={`border border-white/50 flex items-start justify-start text-lg font-bold font-sans p-2 ${randomBg}`}
                            >
                                {((i % 31) + 1).toString().padStart(2, '0')}
                            </div>
                        );
                    })}
                </div>
            </div>

            <Toaster />
            
            {/* Login Container with Animation */}
            <form
                onSubmit={handleSubmit}
                className="bg-gray-800 p-8 rounded-2xl w-96 flex flex-col items-center relative z-10 animate-slideUp"
                style={{
                    animation: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                }}
            >
                {/* Logo */}
                <img
                    src="/imgs/app-icon.png"
                    alt="Logo"
                    className="w-24 mb-6 animate-fadeIn"
                    style={{
                        animation: 'fadeIn 1s ease-out 0.3s both'
                    }}
                />

                <h1 className="text-2xl font-bold mb-6 text-center animate-fadeIn"
                    style={{
                        animation: 'fadeIn 1s ease-out 0.5s both'
                    }}>
                    Login
                </h1>

                <input
                    className="w-full p-3 mb-4 rounded bg-gray-700 focus:outline-none animate-fadeIn"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                        animation: 'fadeIn 1s ease-out 0.7s both'
                    }}
                />
                
                <input
                    type="password"
                    className="w-full p-3 mb-4 rounded bg-gray-700 focus:outline-none animate-fadeIn"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                        animation: 'fadeIn 1s ease-out 0.9s both'
                    }}
                />
                
                <button
                    type="submit"
                    className="w-full p-3 bg-tealgreen rounded font-bold animate-fadeIn"
                    style={{
                        animation: 'fadeIn 1s ease-out 1.1s both'
                    }}
                >
                    Sign In
                </button>
            </form>

            <style jsx>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(40px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}