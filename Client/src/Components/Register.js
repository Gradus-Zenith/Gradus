"use client";
import { createUserWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { auth, db } from "./Firebase";
import { setDoc, doc } from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRouter } from "next/navigation";
import { BookOpen, Mail, Lock, CheckCircle } from "lucide-react";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [Cnfpassword, setCnfPassword] = useState("");

  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== Cnfpassword) {
      toast.error("Passwords do not match!", { position: "bottom-center" });
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "Users", user.uid), {
        email: user.email,
        photo: ""
      });

      toast.success("User Registered Successfully!!", { position: "top-center" });
      router.push("/personal-details");

    } catch (error) {
      toast.error(error.message, { position: "bottom-center" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black px-4">
      <div className="w-full max-w-md">
        {/* Registration Card */}
        <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="relative h-32 border-b-2 border-green-200 flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 bg-[url('/grid-pattern.svg')]"></div>
            <div className="flex items-center z-10">
            <img className="w-50 h-50" src='https://res.cloudinary.com/dlsgdlo8u/image/upload/v1742127578/gradus_logo-rbg_wuzawn.png' alt="Logo" width={150} height={70} />
             
            </div>
          </div>

          {/* Form Section */}
          <div className="px-8 py-6">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Create Account</h2>
            
            <form onSubmit={handleRegister}>
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
              <div className="mb-5">
                <label className="block text-gray-400 text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#18cb96] transition-all duration-300"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="mb-6">
                <label className="block text-gray-400 text-sm font-medium mb-2">Confirm Password</label>
                <div className="relative">
                  <CheckCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#18cb96] transition-all duration-300"
                    placeholder="Confirm your password"
                    value={Cnfpassword}
                    onChange={(e) => setCnfPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Register Button */}
              <button
                type="submit"
                className="w-full bg-[#18cb96] hover:bg-[#15b789] text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-[#18cb9640] transition-all duration-300 flex items-center justify-center"
              >
                <span className="mr-2">Create Account</span>
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Login Link */}
              <div className="mt-6 text-center">
                <p className="text-gray-400">
                  Already have an account? <a href="/login" className="text-[#18cb96] hover:text-[#15b789] font-medium">Log in</a>
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Cool tagline */}
        <p className="text-gray-500 text-center mt-6 text-sm">Join thousands of students on their learning journey</p>
      </div>

      {/* Toast Container for notifications */}
      <ToastContainer />
    </div>
  );
}

export default Register;