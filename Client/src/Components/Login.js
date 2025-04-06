"use client";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { auth } from "./Firebase";
import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
import SignInwithGoogle from "./SignInWithGoogle";
import { BookOpen, Mail, Lock } from "lucide-react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid; // Get Firebase UID (Unique User ID)

      localStorage.setItem("user", userId);
      window.location.href = "/welcome";
      toast.success("User logged in Successfully", { position: "top-center" });

      // Send user ID to server to save it in UserId.txt
      await fetch("/api/saveUserId", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      toast.error(error.message || "Invalid Credentials", { position: "top-center" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black px-4">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="relative h-32 border-b-2 border-green-200  flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 bg-[url('/grid-pattern.svg')]"></div>
            <div className="flex items-center z-10">
            <img className="w-50 h-50" src='https://res.cloudinary.com/dlsgdlo8u/image/upload/v1742127578/gradus_logo-rbg_wuzawn.png' alt="Logo" width={150} height={70} />
              {/* <BookOpen className="text-white w-8 h-8 mr-3" />
              <h1 className="text-3xl font-bold text-white">EduZone</h1> */}
            </div>
          </div>

          {/* Form Section */}
          <div className="px-8 py-6">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Welcome back!</h2>
            
            <form onSubmit={handleSubmit}>
              {/* Email Input */}
              <div className="mb-5">
                <label className="block text-gray-400 text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#18cb96] transition-all duration-300"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="mb-6">
                <label className="block text-gray-400 text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#18cb96] transition-all duration-300"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                className="w-full bg-[#18cb96] hover:bg-[#15b789] text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-[#18cb9640] transition-all duration-300 flex items-center justify-center"
              >
                <span className="mr-2">Log In</span>
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Signup Link */}
              <div className="mt-6 text-center">
                <p className="text-gray-400">
                  New to Gradus? <a href="/register" className="text-[#18cb96] hover:text-[#15b789] font-medium">Create an account</a>
                </p>
              </div>
            </form>

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-gray-600"></div>
              <div className="px-4 text-sm text-gray-400">or continue with</div>
              <div className="flex-1 border-t border-gray-600"></div>
            </div>

            {/* Google Sign In */}
            <div className="flex justify-center">
              <SignInwithGoogle />
            </div>
          </div>
        </div>

        {/* Cool tagline */}
        <p className="text-gray-500 text-center mt-6 text-sm">Learn, Connect, Grow – Your educational journey starts here</p>
      </div>

      {/* Toast Container for notifications */}
      <ToastContainer />
    </div>
  );
}

export default Login;