import { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ import navigate
import toast, { Toaster } from "react-hot-toast";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate(); // ✅ initialize navigate

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const res = await window.api.login({ username, password });
            if (res.success) {
                toast.success(res.message);
                navigate("/file"); // redirect after login
            } else {
                toast.error(res.message);
            }
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong");
        }
    }


    return (
        <div className="flex items-center justify-center h-screen bg-darknavy text-white">
            <Toaster />
            <form
                onSubmit={handleSubmit}
                className="bg-gray-800 p-8 rounded-2xl shadow-lg w-96 flex flex-col items-center"
            >
                {/* Logo */}
                <img
                    src="/imgs/app-icon.png"
                    alt="Logo"
                    className="w-24 mb-6"
                />

                <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>

                <input
                    className="w-full p-3 mb-4 rounded bg-gray-700 focus:outline-none"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input
                    type="password"
                    className="w-full p-3 mb-4 rounded bg-gray-700 focus:outline-none"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button
                    type="submit"
                    className="w-full p-3 bg-tealgreen rounded font-bold"
                >
                    Sign In
                </button>
            </form>
        </div>
    );
}
