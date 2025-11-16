"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import toast, { Toaster } from "react-hot-toast"
import { FaEye, FaEyeSlash } from "react-icons/fa"

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const res = await window.api.login({ username, password })
      if (res.success) {
        localStorage.setItem("userRole", res.role)
        localStorage.setItem("username", username)
        toast.success(res.message)
        navigate("/file")
      } else {
        toast.error(res.message)
      }
    } catch (err) {
      console.error(err)
      toast.error("Something went wrong")
    }
  }

  // Determine greeting based on time of day
  const hour = new Date().getHours()
  const greeting =
    hour >= 6 && hour < 12
      ? "Good Morning!"
      : hour >= 12 && hour < 18
      ? "Good Afternoon!"
      : "Good Evening!"

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <Toaster position="top-center" />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md mx-4 p-8 bg-zinc-800/50 backdrop-blur-xl rounded-2xl border border-zinc-700/50 shadow-2xl animate-slideUp"
      >
        <div
          className="flex justify-center mb-6 opacity-0 animate-fadeIn"
          style={{ animationDelay: "0.2s", animationFillMode: "both" }}
        >
          <img src="./imgs/app-icon.png" alt="Logo" className="w-20 h-20 object-contain" />
        </div>

        <h1
          className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent opacity-0 animate-fadeIn"
          style={{ animationDelay: "0.3s", animationFillMode: "both" }}
        >
          {greeting}
        </h1>

        <p
          className="text-zinc-400 text-center mb-8 opacity-0 animate-fadeIn"
          style={{ animationDelay: "0.4s", animationFillMode: "both" }}
        >
          Sign in to your account
        </p>

        <div className="space-y-4">
          <div className="opacity-0 animate-fadeIn" style={{ animationDelay: "0.5s", animationFillMode: "both" }}>
            <label htmlFor="username" className="block text-sm font-medium text-zinc-300 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-white placeholder-zinc-500"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="opacity-0 animate-fadeIn" style={{ animationDelay: "0.6s", animationFillMode: "both" }}>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-white placeholder-zinc-500"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-200"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-lg hover:from-teal-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-800 transition-all shadow-lg hover:shadow-teal-500/50 opacity-0 animate-fadeIn"
          style={{ animationDelay: "0.7s", animationFillMode: "both" }}
        >
          Sign In
        </button>

        {/* <p
          className="mt-6 text-center text-sm text-zinc-400 opacity-0 animate-fadeIn"
          style={{ animationDelay: "0.8s", animationFillMode: "both" }}
        >
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
          >
            Sign up
          </button>
        </p> */}
      </form>
    </div>
  )
}